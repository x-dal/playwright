import type { LocatorType, LocatorOptions } from '../db/models';
/** Returns a Playwright locator expression string for code generation */
export declare function buildLocatorCode(locatorType: LocatorType | undefined, selector: string, options?: LocatorOptions): string;
/** Returns the live Playwright Locator object for test execution */
export declare function getLocator(page: any, locatorType: LocatorType | undefined, selector: string, options?: LocatorOptions): any;
export declare function esc(s: string): string;
//# sourceMappingURL=locator.d.ts.map