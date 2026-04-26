"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startCustomRecorder = startCustomRecorder;
const playwright_1 = require("playwright");
async function startCustomRecorder(url, onStep) {
    const browser = await playwright_1.chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();
    const steps = [];
    let idCounter = 0;
    const nextId = () => `rec-${Date.now()}-${++idCounter}`;
    const addStep = (s) => {
        const full = { ...s, id: nextId() };
        steps.push(full);
        onStep([...steps]);
    };
    // Expose before addInitScript so the injected script can call it immediately
    await context.exposeFunction('__pwRecord', (event) => {
        switch (event.type) {
            case 'hover':
                addStep({
                    type: 'hover',
                    name: `Hover ${describeEl(event)}`,
                    selector: event.selector ?? '',
                    locatorType: event.locatorType,
                    ...(event.locatorOptions ? { locatorOptions: event.locatorOptions } : {}),
                });
                addStep({
                    type: 'wait',
                    name: 'Wait for menu to open',
                    waitType: 'timeout',
                    timeout: 500,
                    onTimeout: 'fail',
                });
                break;
            case 'click':
                addStep({
                    type: 'click',
                    name: `Click ${describeEl(event)}`,
                    selector: event.selector ?? '',
                    locatorType: event.locatorType,
                    ...(event.locatorOptions ? { locatorOptions: event.locatorOptions } : {}),
                });
                break;
            case 'fill':
                addStep({
                    type: 'type',
                    name: `Type into ${describeEl(event)}`,
                    selector: event.selector ?? '',
                    locatorType: event.locatorType,
                    value: event.value ?? '',
                    ...(event.locatorOptions ? { locatorOptions: event.locatorOptions } : {}),
                });
                break;
            case 'select':
                addStep({
                    type: 'select',
                    name: `Select in ${describeEl(event)}`,
                    selector: event.selector ?? '',
                    locatorType: event.locatorType,
                    value: event.value ?? '',
                    ...(event.locatorOptions ? { locatorOptions: event.locatorOptions } : {}),
                });
                break;
        }
    });
    await context.addInitScript(RECORDER_SCRIPT);
    // Detect page navigations (SPA pushState + full navigations)
    let lastUrl = url;
    page.on('framenavigated', (frame) => {
        if (frame !== page.mainFrame())
            return;
        const newUrl = frame.url();
        if (newUrl !== lastUrl && !newUrl.startsWith('about:')) {
            lastUrl = newUrl;
            addStep({ type: 'navigate', name: `Navigate to ${newUrl}`, url: newUrl });
        }
    });
    // Record the initial navigation as step 1
    addStep({ type: 'navigate', name: `Navigate to ${url}`, url });
    await page.goto(url);
    return {
        getSteps: () => [...steps],
        stop: async () => {
            try {
                await browser.close();
            }
            catch { /* already closed */ }
            return [...steps];
        },
    };
}
function describeEl(ev) {
    const { locatorType, selector, locatorOptions } = ev;
    if (locatorType === 'role' && locatorOptions?.name)
        return `[${selector}] "${locatorOptions.name}"`;
    if (locatorType === 'role')
        return `[${selector}]`;
    if (locatorType === 'label')
        return `label:"${selector}"`;
    if (locatorType === 'text')
        return `"${selector}"`;
    if (locatorType === 'testId')
        return `testId:${selector}`;
    return selector ?? '?';
}
// ─── Browser-side recording script ────────────────────────────────────────────
// Injected into every page via context.addInitScript().
// Captures click, hover (only when hover causes a DOM change), fill, select.
// Sends events to Node via window.__pwRecord() (exposed via page.exposeFunction).
const RECORDER_SCRIPT = `(function () {
  if (window.__pwRecorderActive) return;
  window.__pwRecorderActive = true;

  // ── Implicit ARIA role map ────────────────────────────────────────────────

  var ROLE_MAP = {
    A: 'link', BUTTON: 'button', SELECT: 'combobox',
    TEXTAREA: 'textbox', IMG: 'img',
    H1: 'heading', H2: 'heading', H3: 'heading', H4: 'heading',
    NAV: 'navigation', FORM: 'form',
  };

  function getImplicitRole(el) {
    if (el.tagName === 'INPUT') {
      var t = (el.type || 'text').toLowerCase();
      if (t === 'checkbox') return 'checkbox';
      if (t === 'radio') return 'radio';
      if (t === 'submit' || t === 'button' || t === 'reset') return 'button';
      if (t === 'search') return 'searchbox';
      return 'textbox';
    }
    return ROLE_MAP[el.tagName] || el.getAttribute('role') || null;
  }

  function getLocatorInfo(el) {
    var role = el.getAttribute('role') || getImplicitRole(el);
    var ariaLabel = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby')
      && (document.getElementById(el.getAttribute('aria-labelledby')) || {}).textContent;
    var rawText = (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 80);
    var testId = el.getAttribute('data-testid') || el.getAttribute('data-test-id')
              || el.getAttribute('data-cy') || el.getAttribute('data-qa');
    var placeholder = el.placeholder || null;
    var labelEl = el.id ? document.querySelector('label[for="' + el.id + '"]') : null;
    var labelText = labelEl ? (labelEl.textContent || '').trim() : null;

    var name = ariaLabel || rawText || null;

    if (role && name) return { locatorType: 'role', selector: role, locatorOptions: { name: name } };
    if (testId) return { locatorType: 'testId', selector: testId };
    if (labelText) return { locatorType: 'label', selector: labelText };
    if (placeholder) return { locatorType: 'placeholder', selector: placeholder };
    if (rawText) return { locatorType: 'text', selector: rawText };
    // Fallback: short CSS path
    var css = el.tagName.toLowerCase();
    if (el.id) css += '#' + el.id;
    else if (el.className) css += '.' + el.className.trim().split(/\\s+/)[0];
    return { locatorType: 'css', selector: css };
  }

  // ── Hover detection via MutationObserver + mouseenter ─────────────────────

  var pendingHoverEl = null;
  var mutationSeen = false;

  var observer = new MutationObserver(function () { mutationSeen = true; });
  observer.observe(document.documentElement, {
    childList: true, subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style', 'hidden', 'aria-expanded', 'aria-hidden'],
  });

  document.addEventListener('mouseenter', function (e) {
    var el = e.target;
    if (!el || el === document || el === document.body) return;
    var role = el.getAttribute('role') || getImplicitRole(el);
    if (!role) return;

    pendingHoverEl = el;
    mutationSeen = false;

    setTimeout(function () {
      if (mutationSeen && pendingHoverEl === el) {
        window.__pwRecord(Object.assign({ type: 'hover' }, getLocatorInfo(el)));
      }
      if (pendingHoverEl === el) { pendingHoverEl = null; mutationSeen = false; }
    }, 150);
  }, true);

  // ── Click ─────────────────────────────────────────────────────────────────

  // Track the last hover step so we can skip a click on the same element
  // (hover already covers "I interacted with this element")
  var lastHoveredSelector = null;
  window.addEventListener('message', function(e) {
    if (e.data && e.data.__pwLastHover) lastHoveredSelector = e.data.__pwLastHover;
  });

  document.addEventListener('click', function (e) {
    var el = e.target.closest('a, button, [role], input[type="button"], input[type="submit"], input[type="checkbox"], input[type="radio"]');
    if (!el) return;
    window.__pwRecord(Object.assign({ type: 'click' }, getLocatorInfo(el)));
  }, true);

  // ── Fill (input / textarea) ───────────────────────────────────────────────

  document.addEventListener('change', function (e) {
    var el = e.target;
    if (!el) return;
    if (el.tagName === 'SELECT') {
      var opt = el.options[el.selectedIndex];
      window.__pwRecord(Object.assign({ type: 'select', value: opt ? opt.value : el.value }, getLocatorInfo(el)));
      return;
    }
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      var t2 = (el.type || 'text').toLowerCase();
      if (t2 === 'checkbox' || t2 === 'radio') return; // handled by click
      window.__pwRecord(Object.assign({ type: 'fill', value: el.value }, getLocatorInfo(el)));
    }
  }, true);

})();`;
//# sourceMappingURL=recorder-service.js.map