"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildLocatorCode = buildLocatorCode;
exports.getLocator = getLocator;
exports.esc = esc;
/** Returns a Playwright locator expression string for code generation */
function buildLocatorCode(locatorType, selector, options) {
    const type = locatorType ?? 'css';
    const s = esc(selector);
    switch (type) {
        case 'css': return `page.locator('${s}')`;
        case 'xpath': return `page.locator('xpath=${s}')`;
        case 'role': {
            const opts = serializeRoleOptions(options);
            return opts ? `page.getByRole('${s}', ${opts})` : `page.getByRole('${s}')`;
        }
        case 'label': return withExact(`page.getByLabel('${s}'`, options);
        case 'placeholder': return withExact(`page.getByPlaceholder('${s}'`, options);
        case 'text': return withExact(`page.getByText('${s}'`, options);
        case 'testId': return `page.getByTestId('${s}')`;
        case 'altText': return withExact(`page.getByAltText('${s}'`, options);
        case 'title': return withExact(`page.getByTitle('${s}'`, options);
    }
}
/** Returns the live Playwright Locator object for test execution */
function getLocator(page, locatorType, selector, options) {
    const type = locatorType ?? 'css';
    const clean = stripUndefined(options);
    switch (type) {
        case 'css': return page.locator(selector);
        case 'xpath': return page.locator(`xpath=${selector}`);
        case 'role': return page.getByRole(selector, clean);
        case 'label': return page.getByLabel(selector, clean);
        case 'placeholder': return page.getByPlaceholder(selector, clean);
        case 'text': return page.getByText(selector, clean);
        case 'testId': return page.getByTestId(selector);
        case 'altText': return page.getByAltText(selector, clean);
        case 'title': return page.getByTitle(selector, clean);
    }
}
// ─── Private helpers ───────────────────────────────────────────────────────────
function esc(s) {
    return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}
function withExact(prefix, options) {
    return options?.exact ? `${prefix}, { exact: true })` : `${prefix})`;
}
function serializeRoleOptions(o) {
    if (!o)
        return undefined;
    const fields = {};
    for (const [k, v] of Object.entries(o)) {
        if (v !== undefined)
            fields[k] = v;
    }
    if (!Object.keys(fields).length)
        return undefined;
    return JSON.stringify(fields);
}
function stripUndefined(o) {
    if (!o)
        return undefined;
    const out = {};
    for (const [k, v] of Object.entries(o)) {
        if (v !== undefined)
            out[k] = v;
    }
    return Object.keys(out).length ? out : undefined;
}
//# sourceMappingURL=locator.js.map