"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSuiteCode = generateSuiteCode;
exports.generateTestCode = generateTestCode;
exports.parseCodegenOutput = parseCodegenOutput;
const locator_1 = require("./locator");
// ─── Main entry point ──────────────────────────────────────────────────────────
function generateSuiteCode(suite) {
    const lines = [];
    lines.push(`import { test, expect, devices } from '@playwright/test';`);
    lines.push('');
    if (suite.pageObjects.length > 0) {
        lines.push(generatePageObjects(suite.pageObjects));
    }
    lines.push(`test.describe('${(0, locator_1.esc)(suite.name)}', () => {`);
    for (const pw of suite.pageObjects) {
        lines.push(generatePageObjectHelpers(pw));
    }
    for (const t of suite.tests) {
        lines.push(generateTest(t, suite));
    }
    lines.push('});');
    return lines.join('\n');
}
function generateTestCode(test, suite) {
    const lines = [];
    lines.push(`import { test, expect } from '@playwright/test';`);
    lines.push('');
    if (suite.pageObjects.length > 0) {
        lines.push(generatePageObjects(suite.pageObjects));
    }
    lines.push(generateTest(test, suite));
    return lines.join('\n');
}
// ─── Page Object helpers ───────────────────────────────────────────────────────
function generatePageObjects(pageObjects) {
    return pageObjects
        .map(po => {
        const params = po.params.length > 0
            ? po.params.map(p => `${p}: string`).join(', ')
            : '';
        const body = po.steps.map(s => `  ${renderStep(s, po.params)}`).join('\n');
        return `async function ${toCamelCase(po.name)}(page: any${params ? ', ' + params : ''}) {\n${body}\n}`;
    })
        .join('\n\n');
}
function generatePageObjectHelpers(po) {
    return '';
}
// ─── Test generation ───────────────────────────────────────────────────────────
function generateTest(test, suite) {
    const lines = [];
    const dataSet = test.dataSetId
        ? suite.dataSets.find(d => d.id === test.dataSetId)
        : undefined;
    if (dataSet && dataSet.columns.length > 0) {
        const rowCount = Math.max(...dataSet.columns.map(c => c.values.length));
        const colNames = dataSet.columns.map(c => c.key);
        lines.push(`  const testData = [`);
        for (let i = 0; i < rowCount; i++) {
            const row = Object.fromEntries(dataSet.columns.map(c => [c.key, c.values[i] ?? '']));
            lines.push(`    ${JSON.stringify(row)},`);
        }
        lines.push(`  ];`);
        lines.push('');
        lines.push(`  for (const data of testData) {`);
        lines.push(`    test(\`${(0, locator_1.esc)(test.name)} - \${JSON.stringify(data)}\`, async ({ page }) => {`);
        lines.push(renderSteps(test.steps, dataSet.columns.map(c => c.key), 6));
        lines.push(`    });`);
        lines.push(`  }`);
    }
    else {
        lines.push(`  test('${(0, locator_1.esc)(test.name)}', async ({ page }) => {`);
        lines.push(renderSteps(test.steps, [], 4));
        lines.push(`  });`);
    }
    return lines.join('\n');
}
// ─── Step rendering ────────────────────────────────────────────────────────────
function renderSteps(steps, dataKeys, indent) {
    const pad = ' '.repeat(indent);
    return steps
        .filter(s => !s.disabled)
        .map(s => `${pad}${renderStep(s, dataKeys)}`)
        .join('\n');
}
function renderStep(step, dataKeys) {
    switch (step.type) {
        case 'navigate': return renderNavigate(step);
        case 'click': return renderClick(step);
        case 'type': return renderType(step, dataKeys);
        case 'select': return renderSelect(step, dataKeys);
        case 'wait': return renderWait(step);
        case 'assert': return renderAssert(step);
        case 'pageObject': return renderPageObjectCall(step);
        case 'conditional': return renderConditional(step, dataKeys);
        case 'hover': return renderHover(step);
        case 'keyboard': return renderKeyboard(step);
        case 'scroll': return renderScroll(step);
        case 'screenshot': return renderScreenshot(step);
        default: return `// unknown step type: ${step.type}`;
    }
}
function renderNavigate(s) {
    return `await page.goto('${(0, locator_1.esc)(s.url)}');`;
}
function renderClick(s) {
    const opts = {};
    if (s.button && s.button !== 'left')
        opts.button = s.button;
    if (s.clickCount && s.clickCount > 1)
        opts.clickCount = s.clickCount;
    const optsStr = Object.keys(opts).length > 0 ? `, ${JSON.stringify(opts)}` : '';
    return `await ${(0, locator_1.buildLocatorCode)(s.locatorType, s.selector, s.locatorOptions)}.click(${optsStr.slice(2) || ''});`;
}
function renderType(s, dataKeys) {
    const value = interpolateDataKeys(s.value, dataKeys);
    const fill = s.clearFirst === false
        ? `await ${(0, locator_1.buildLocatorCode)(s.locatorType, s.selector, s.locatorOptions)}.pressSequentially(${value});`
        : `await ${(0, locator_1.buildLocatorCode)(s.locatorType, s.selector, s.locatorOptions)}.fill(${value});`;
    return fill;
}
function renderSelect(s, dataKeys) {
    const value = interpolateDataKeys(s.value, dataKeys);
    return `await ${(0, locator_1.buildLocatorCode)(s.locatorType, s.selector, s.locatorOptions)}.selectOption(${value});`;
}
function renderWait(s) {
    switch (s.waitType) {
        case 'timeout':
            return `await page.waitForTimeout(${s.timeout});`;
        case 'navigation':
            return `await page.waitForNavigation({ timeout: ${s.timeout} });`;
        case 'selector':
        default: {
            const core = `await page.locator('${(0, locator_1.esc)(s.selector ?? '')}').waitFor({ timeout: ${s.timeout} });`;
            if (s.onTimeout === 'skip') {
                return `try {\n  ${core}\n} catch { /* timeout – step skipped */ }`;
            }
            return core;
        }
    }
}
function renderAssert(s) {
    const loc = (0, locator_1.buildLocatorCode)(s.locatorType, s.selector, s.locatorOptions);
    switch (s.assertType) {
        case 'containsText': return `await expect(${loc}).toContainText('${(0, locator_1.esc)(s.expected)}');`;
        case 'notContainsText': return `await expect(${loc}).not.toContainText('${(0, locator_1.esc)(s.expected)}');`;
        case 'isVisible': return `await expect(${loc}).toBeVisible();`;
        case 'isHidden': return `await expect(${loc}).toBeHidden();`;
        case 'hasValue': return `await expect(${loc}).toHaveValue('${(0, locator_1.esc)(s.expected)}');`;
        case 'hasCount': return `await expect(${loc}).toHaveCount(${Number(s.expected)});`;
        case 'urlContains': return `await expect(page).toHaveURL(/${(0, locator_1.esc)(s.expected)}/);`;
        case 'titleContains': return `await expect(page).toHaveTitle(/${(0, locator_1.esc)(s.expected)}/);`;
        case 'isChecked': return `await expect(${loc}).toBeChecked();`;
        case 'isEnabled': return `await expect(${loc}).toBeEnabled();`;
        case 'isDisabled': return `await expect(${loc}).toBeDisabled();`;
        default: return `await expect(${loc}).toBeVisible();`;
    }
}
function renderPageObjectCall(s) {
    const paramValues = Object.values(s.params).map(v => `'${(0, locator_1.esc)(v)}'`).join(', ');
    const sep = paramValues ? ', ' : '';
    return `await ${toCamelCase(s.pageObjectId)}(page${sep}${paramValues});`;
}
function renderConditional(s, dataKeys) {
    const cond = s.condition;
    let check;
    switch (cond.type) {
        case 'elementVisible':
            check = `await ${(0, locator_1.buildLocatorCode)(cond.locatorType, cond.selector ?? '', cond.locatorOptions)}.isVisible()`;
            break;
        case 'elementContainsText':
            check = `(await ${(0, locator_1.buildLocatorCode)(cond.locatorType, cond.selector ?? '', cond.locatorOptions)}.textContent() ?? '').includes('${(0, locator_1.esc)(cond.value ?? '')}')`;
            break;
        case 'urlContains':
            check = `page.url().includes('${(0, locator_1.esc)(cond.value ?? '')}')`;
            break;
        default:
            check = 'true';
    }
    const thenBody = s.thenSteps.map(st => `  ${renderStep(st, dataKeys)}`).join('\n');
    const elseBody = s.elseSteps.length > 0
        ? ` else {\n${s.elseSteps.map(st => `  ${renderStep(st, dataKeys)}`).join('\n')}\n}`
        : '';
    return `if (${check}) {\n${thenBody}\n}${elseBody}`;
}
function renderHover(s) {
    return `await ${(0, locator_1.buildLocatorCode)(s.locatorType, s.selector, s.locatorOptions)}.hover();`;
}
function renderKeyboard(s) {
    const press = `await page.keyboard.press('${(0, locator_1.esc)(s.key)}');`;
    if (['Enter', 'Return', 'NumpadEnter'].includes(s.key)) {
        return `${press}\n  await page.waitForLoadState('domcontentloaded');`;
    }
    return press;
}
function renderScroll(s) {
    if (s.selector) {
        return `await ${(0, locator_1.buildLocatorCode)(s.locatorType, s.selector, s.locatorOptions)}.scrollIntoViewIfNeeded();`;
    }
    return `await page.evaluate(() => window.scrollTo(${s.x ?? 0}, ${s.y ?? 0}));`;
}
function renderScreenshot(s) {
    const name = s.screenshotName ? `'${(0, locator_1.esc)(s.screenshotName)}.png'` : `\`screenshot-\${Date.now()}.png\``;
    return `await page.screenshot({ path: ${name}, fullPage: true });`;
}
// ─── Utilities ─────────────────────────────────────────────────────────────────
// esc is imported from './locator'
function toCamelCase(str) {
    return str
        .replace(/[^a-zA-Z0-9 ]/g, '')
        .split(' ')
        .map((w, i) => (i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
        .join('');
}
function interpolateDataKeys(value, dataKeys) {
    if (dataKeys.length === 0)
        return `'${(0, locator_1.esc)(value)}'`;
    let result = value;
    let hasInterp = false;
    for (const key of dataKeys) {
        if (result.includes(`{{${key}}}`)) {
            result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), `\${data.${key}}`);
            hasInterp = true;
        }
    }
    return hasInterp ? `\`${result}\`` : `'${(0, locator_1.esc)(value)}'`;
}
// ─── Parse recorded Playwright codegen output into Steps ──────────────────────
const METHOD_TO_LOCATOR = {
    locator: 'css', getByRole: 'role', getByLabel: 'label',
    getByPlaceholder: 'placeholder', getByText: 'text',
    getByTestId: 'testId', getByAltText: 'altText', getByTitle: 'title',
};
function parseCodegenOutput(code) {
    const steps = [];
    let idCounter = 0;
    const nextId = () => `imported-${++idCounter}`;
    const LOCATOR_METHODS = Object.keys(METHOD_TO_LOCATOR).join('|');
    const LOCATOR_PREFIX_RE = new RegExp(`page\\.(${LOCATOR_METHODS})\\(`);
    for (const raw of code.split('\n')) {
        const line = raw.trim();
        // Skip think-time waits recorded during codegen session
        if (/await page\.waitForTimeout\(/.test(line))
            continue;
        // navigate
        const gotoM = line.match(/await page\.goto\(['"`]([^'"`]+)['"`]\)/);
        if (gotoM) {
            steps.push({ id: nextId(), type: 'navigate', name: `Navigate to ${gotoM[1]}`, url: gotoM[1] });
            continue;
        }
        // keyboard press: await page.keyboard.press('Enter')
        const keyM = line.match(/await page\.keyboard\.press\(['"`]([^'"`]+)['"`]\)/);
        if (keyM) {
            steps.push({ id: nextId(), type: 'keyboard', name: `Press ${keyM[1]}`, key: keyM[1] });
            continue;
        }
        // locator keyboard: await page.locator(...).press('Enter')
        const locKeyPrefixM = LOCATOR_PREFIX_RE.exec(line);
        if (locKeyPrefixM && line.startsWith('await page.') && line.includes('.press(')) {
            const openIdx2 = (locKeyPrefixM.index ?? 0) + locKeyPrefixM[0].length - 1;
            const argsResult2 = scanBalancedArgs(line, openIdx2);
            if (argsResult2) {
                const after2 = line.slice(argsResult2.closeIdx + 1);
                const pressM = after2.match(/^\.press\(['"`]([^'"`]+)['"`]\)/);
                if (pressM) {
                    steps.push({ id: nextId(), type: 'keyboard', name: `Press ${pressM[1]}`, key: pressM[1] });
                    continue;
                }
            }
        }
        // Simple single-locator-method pattern: await page.METHOD(ARGS).ACTION(...)
        // Handles: page.getByRole(...).click(), page.getByLabel(...).fill(...), etc.
        const prefixM = LOCATOR_PREFIX_RE.exec(line);
        if (prefixM && line.startsWith('await page.')) {
            const methodName = prefixM[1];
            const openIdx = (prefixM.index ?? 0) + prefixM[0].length - 1;
            const argsResult = scanBalancedArgs(line, openIdx);
            if (argsResult) {
                const { raw: argsRaw, closeIdx } = argsResult;
                const after = line.slice(closeIdx + 1);
                const { selector, options } = parseLocatorArgs(argsRaw);
                const locatorType = METHOD_TO_LOCATOR[methodName] ?? 'css';
                const locPatch = { selector, locatorType, ...(options ? { locatorOptions: options } : {}) };
                if (/^\.click\(\s*\)/.test(after)) {
                    steps.push({ id: nextId(), type: 'click', name: `Click ${describeLocator(locatorType, selector, options)}`, ...locPatch });
                    continue;
                }
                if (/^\.hover\(\s*\)/.test(after)) {
                    steps.push({ id: nextId(), type: 'hover', name: `Hover ${describeLocator(locatorType, selector, options)}`, ...locPatch });
                    continue;
                }
                const fillM = after.match(/^\.fill\(['"`](.*?)['"`]\)/s);
                if (fillM) {
                    steps.push({ id: nextId(), type: 'type', name: `Type into ${describeLocator(locatorType, selector, options)}`, ...locPatch, value: fillM[1] });
                    continue;
                }
                const selM = after.match(/^\.selectOption\((['"`])(.*?)\1\)/s);
                if (selM) {
                    steps.push({ id: nextId(), type: 'select', name: `Select in ${describeLocator(locatorType, selector, options)}`, ...locPatch, value: selM[2] });
                    continue;
                }
                // `after` starts with another locator method — falls through to general parser below
            }
        }
        // expect assertions: await expect(page.METHOD(ARGS)).toXxx(...)
        if (line.startsWith('await expect(page.')) {
            const innerPrefixM = LOCATOR_PREFIX_RE.exec(line);
            if (innerPrefixM) {
                const innerOpenIdx = (innerPrefixM.index ?? 0) + innerPrefixM[0].length - 1;
                const innerArgs = scanBalancedArgs(line, innerOpenIdx);
                if (innerArgs) {
                    const afterLocator = line.slice(innerArgs.closeIdx + 1);
                    const { selector, options } = parseLocatorArgs(innerArgs.raw);
                    const locatorType = METHOD_TO_LOCATOR[innerPrefixM[1]] ?? 'css';
                    const locPatch = { selector, locatorType, ...(options ? { locatorOptions: options } : {}) };
                    const textM = afterLocator.match(/\)\.toContainText\(['"`]([^'"`]+)['"`]\)/);
                    if (textM) {
                        steps.push({ id: nextId(), type: 'assert', assertType: 'containsText', name: `Assert text in ${describeLocator(locatorType, selector, options)}`, ...locPatch, expected: textM[1] });
                        continue;
                    }
                    if (afterLocator.includes(').toBeVisible()')) {
                        steps.push({ id: nextId(), type: 'assert', assertType: 'isVisible', name: `Assert visible ${describeLocator(locatorType, selector, options)}`, ...locPatch, expected: '' });
                        continue;
                    }
                    if (afterLocator.includes(').toBeHidden()')) {
                        steps.push({ id: nextId(), type: 'assert', assertType: 'isHidden', name: `Assert hidden ${describeLocator(locatorType, selector, options)}`, ...locPatch, expected: '' });
                        continue;
                    }
                }
            }
            continue; // skip unparsed expect lines
        }
        // General fallback: handles chained locators like
        //   page.locator('x').filter({hasText:'y'}).getByLabel('z').selectOption(...)
        //   page.getByRole('group').filter({...}).getByLabel('...').click()
        if (line.startsWith('await ')) {
            const parsed = splitLocatorAction(line);
            if (parsed && parsed.locatorExpr.startsWith('page.')) {
                const { locatorExpr, action, argsRaw } = parsed;
                const raw_patch = { selector: locatorExpr, locatorType: 'raw' };
                const label = describeRaw(locatorExpr);
                const firstArg = extractFirstStringArg(argsRaw);
                switch (action) {
                    case 'click':
                        steps.push({ id: nextId(), type: 'click', name: `Click ${label}`, ...raw_patch });
                        break;
                    case 'hover':
                        steps.push({ id: nextId(), type: 'hover', name: `Hover ${label}`, ...raw_patch });
                        break;
                    case 'fill':
                    case 'pressSequentially':
                    case 'type':
                        steps.push({ id: nextId(), type: 'type', name: `Type into ${label}`, ...raw_patch, value: firstArg });
                        break;
                    case 'selectOption':
                        steps.push({ id: nextId(), type: 'select', name: `Select in ${label}`, ...raw_patch, value: firstArg });
                        break;
                    case 'check':
                    case 'uncheck':
                        steps.push({ id: nextId(), type: 'click', name: `${action === 'check' ? 'Check' : 'Uncheck'} ${label}`, ...raw_patch });
                        break;
                }
            }
        }
    }
    // Remove raw-type duplicates: when Playwright codegen records both a chained variant
    // and a simpler equivalent on the next line, keep only the simpler one.
    return deduplicateRawSteps(steps);
}
/**
 * Splits `await LOCATOR_CHAIN.ACTION(ARGS);` into its parts.
 * Scans at paren-depth 0 to find the LAST known action method.
 */
function splitLocatorAction(line) {
    const stripped = line.replace(/^await\s+/, '').replace(/;\s*$/, '').trim();
    const ACTIONS = ['click', 'hover', 'fill', 'selectOption', 'check', 'uncheck',
        'press', 'dblclick', 'pressSequentially', 'type', 'tap', 'waitFor'];
    let depth = 0;
    let inStr = null;
    let lastDotIdx = -1;
    let lastAction = '';
    for (let i = 0; i < stripped.length; i++) {
        const ch = stripped[i];
        if (inStr) {
            if (ch === inStr && stripped[i - 1] !== '\\')
                inStr = null;
            continue;
        }
        if (ch === '"' || ch === "'" || ch === '`') {
            inStr = ch;
            continue;
        }
        if (ch === '(') {
            depth++;
            continue;
        }
        if (ch === ')') {
            depth--;
            continue;
        }
        if (depth === 0 && ch === '.') {
            for (const action of ACTIONS) {
                const end = i + 1 + action.length;
                if (stripped.slice(i + 1, end) === action && stripped[end] === '(') {
                    lastDotIdx = i;
                    lastAction = action;
                    break;
                }
            }
        }
    }
    if (lastDotIdx === -1)
        return null;
    const locatorExpr = stripped.slice(0, lastDotIdx);
    const argsOpenIdx = lastDotIdx + 1 + lastAction.length; // index of '('
    if (stripped[argsOpenIdx] !== '(')
        return null;
    const argsResult = scanBalancedArgs(stripped, argsOpenIdx);
    if (!argsResult)
        return null;
    return { locatorExpr, action: lastAction, argsRaw: argsResult.raw };
}
/** Extracts the first string argument from a raw args string, handling JSON-array strings. */
function extractFirstStringArg(argsRaw) {
    const t = argsRaw.trim();
    // String wrapping a JSON array: '["a","b"]' or "['a','b']"
    const arrayM = t.match(/^(['"`])(\[[\s\S]*\])\1/);
    if (arrayM)
        return arrayM[2];
    // Plain string
    const strM = t.match(/^(['"`])([\s\S]*?)\1/);
    if (strM)
        return strM[2];
    return t;
}
/** Human-readable label for a raw locator expression. */
function describeRaw(expr) {
    const getByLabel = expr.match(/\.getByLabel\(['"`]([^'"`]+)['"`]\)\s*$/);
    if (getByLabel)
        return `label:"${getByLabel[1]}"`;
    const getByRole = expr.match(/\.getByRole\(['"`]([^'"`]+)['"`](?:,\s*\{[^}]*name['"`\s:]+['"`]([^'"`]+)['"`][^}]*\})?\)\s*$/);
    if (getByRole)
        return getByRole[2] ? `[${getByRole[1]}] "${getByRole[2]}"` : `[${getByRole[1]}]`;
    const getByText = expr.match(/\.getByText\(['"`]([^'"`]+)['"`]/);
    if (getByText)
        return `"${getByText[1]}"`;
    const getByPlaceholder = expr.match(/\.getByPlaceholder\(['"`]([^'"`]+)['"`]/);
    if (getByPlaceholder)
        return `placeholder:"${getByPlaceholder[1]}"`;
    const locator = expr.match(/\.locator\(['"`]([^'"`]+)['"`]\)\s*$/);
    if (locator)
        return locator[1];
    // Fallback: last meaningful segment
    return expr.replace(/^page\./, '').slice(0, 50);
}
/**
 * When Playwright codegen emits both a chained variant and a simpler equivalent
 * on consecutive lines (e.g. getByLabel(...).getByRole(...).click() followed by
 * getByRole(...).click()), remove the raw-type duplicate and keep the simpler one.
 */
function deduplicateRawSteps(steps) {
    const result = [];
    for (let i = 0; i < steps.length; i++) {
        const curr = steps[i];
        const next = steps[i + 1];
        // If current is raw-type and the very next step is the same action with a
        // specific (non-raw) locator type, the raw one is the chained duplicate — skip it.
        if ('locatorType' in curr && curr.locatorType === 'raw' &&
            next && next.type === curr.type &&
            'locatorType' in next && next.locatorType !== 'raw') {
            continue;
        }
        result.push(curr);
    }
    return result;
}
function describeLocator(t, sel, opts) {
    if (t === 'role')
        return opts?.name ? `[${sel}] "${opts.name}"` : `[${sel}]`;
    if (t === 'css')
        return sel;
    return `${t}:"${sel}"`;
}
/**
 * Scans from openParenIdx (the '(' char) and returns the full content
 * between the outer parens, handling nested parens and quoted strings.
 */
function scanBalancedArgs(line, openIdx) {
    let depth = 0;
    let inStr = null;
    for (let i = openIdx; i < line.length; i++) {
        const ch = line[i];
        if (inStr) {
            if (ch === inStr && line[i - 1] !== '\\')
                inStr = null;
            continue;
        }
        if (ch === '"' || ch === "'" || ch === '`') {
            inStr = ch;
            continue;
        }
        if (ch === '(') {
            depth++;
            continue;
        }
        if (ch === ')') {
            if (--depth === 0)
                return { raw: line.slice(openIdx + 1, i), closeIdx: i };
        }
    }
    return null;
}
/**
 * Parses the raw args string from a locator call into selector + options.
 * e.g. "'searchbox', { name: 'Search' }" → { selector: 'searchbox', options: { name: 'Search' } }
 */
function parseLocatorArgs(raw) {
    const trimmed = raw.trim();
    // Single/double/backtick string only → simple CSS/role value
    const simpleMatch = trimmed.match(/^(['"`])(.*?)\1$/s);
    if (simpleMatch)
        return { selector: simpleMatch[2] };
    // "firstArg, { ...options }" form
    const quoteChar = trimmed[0];
    if (quoteChar !== "'" && quoteChar !== '"' && quoteChar !== '`')
        return { selector: trimmed };
    const firstQuoteEnd = trimmed.indexOf(quoteChar, 1);
    if (firstQuoteEnd === -1)
        return { selector: trimmed };
    const selector = trimmed.slice(1, firstQuoteEnd);
    const optionsPart = trimmed.slice(firstQuoteEnd + 1).replace(/^\s*,\s*/, '');
    const options = {};
    const kvRe = /(\w+)\s*:\s*(?:(['"`])(.*?)\2|(true|false|\d+))/g;
    let m;
    while ((m = kvRe.exec(optionsPart)) !== null) {
        const key = m[1];
        if (m[3] !== undefined)
            options[key] = m[3];
        else if (m[4] === 'true')
            options[key] = true;
        else if (m[4] === 'false')
            options[key] = false;
        else if (m[4])
            options[key] = Number(m[4]);
    }
    return { selector, options: Object.keys(options).length ? options : undefined };
}
//# sourceMappingURL=codegen.service.js.map