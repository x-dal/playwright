export type StepType = 'navigate' | 'click' | 'type' | 'select' | 'wait' | 'assert' | 'pageObject' | 'conditional' | 'hover' | 'keyboard' | 'scroll' | 'screenshot';
export type LocatorType = 'css' | 'xpath' | 'role' | 'label' | 'placeholder' | 'text' | 'testId' | 'altText' | 'title';
export interface LocatorOptions {
    name?: string;
    exact?: boolean;
    checked?: boolean;
    disabled?: boolean;
    expanded?: boolean;
    level?: number;
    pressed?: boolean;
    selected?: boolean;
}
export interface BaseStep {
    id: string;
    type: StepType;
    name: string;
    disabled?: boolean;
}
export interface NavigateStep extends BaseStep {
    type: 'navigate';
    url: string;
}
export interface ClickStep extends BaseStep {
    type: 'click';
    selector: string;
    locatorType?: LocatorType;
    locatorOptions?: LocatorOptions;
    button?: 'left' | 'right' | 'middle';
    clickCount?: number;
}
export interface TypeStep extends BaseStep {
    type: 'type';
    selector: string;
    locatorType?: LocatorType;
    locatorOptions?: LocatorOptions;
    value: string;
    clearFirst?: boolean;
}
export interface SelectStep extends BaseStep {
    type: 'select';
    selector: string;
    locatorType?: LocatorType;
    locatorOptions?: LocatorOptions;
    value: string;
}
export interface WaitStep extends BaseStep {
    type: 'wait';
    waitType: 'selector' | 'timeout' | 'navigation';
    selector?: string;
    locatorType?: LocatorType;
    locatorOptions?: LocatorOptions;
    timeout: number;
    onTimeout: 'fail' | 'skip';
}
export type AssertType = 'containsText' | 'notContainsText' | 'isVisible' | 'isHidden' | 'hasValue' | 'hasCount' | 'urlContains' | 'titleContains' | 'isChecked' | 'isEnabled' | 'isDisabled';
export interface AssertStep extends BaseStep {
    type: 'assert';
    assertType: AssertType;
    selector: string;
    locatorType?: LocatorType;
    locatorOptions?: LocatorOptions;
    expected: string;
}
export interface PageObjectStep extends BaseStep {
    type: 'pageObject';
    pageObjectId: string;
    params: Record<string, string>;
}
export interface ConditionalStep extends BaseStep {
    type: 'conditional';
    condition: {
        type: 'elementVisible' | 'elementContainsText' | 'urlContains';
        selector?: string;
        locatorType?: LocatorType;
        locatorOptions?: LocatorOptions;
        value?: string;
    };
    thenSteps: Step[];
    elseSteps: Step[];
}
export interface HoverStep extends BaseStep {
    type: 'hover';
    selector: string;
    locatorType?: LocatorType;
    locatorOptions?: LocatorOptions;
}
export interface KeyboardStep extends BaseStep {
    type: 'keyboard';
    key: string;
}
export interface ScrollStep extends BaseStep {
    type: 'scroll';
    selector?: string;
    locatorType?: LocatorType;
    locatorOptions?: LocatorOptions;
    x?: number;
    y?: number;
}
export interface ScreenshotStep extends BaseStep {
    type: 'screenshot';
    screenshotName?: string;
}
export type Step = NavigateStep | ClickStep | TypeStep | SelectStep | WaitStep | AssertStep | PageObjectStep | ConditionalStep | HoverStep | KeyboardStep | ScrollStep | ScreenshotStep;
export interface PageObject {
    id: string;
    name: string;
    description: string;
    steps: Step[];
    params: string[];
}
export interface DataColumn {
    key: string;
    values: string[];
}
export interface TestDataSet {
    id: string;
    name: string;
    columns: DataColumn[];
}
export type BrowserName = 'chromium' | 'firefox' | 'webkit';
export interface ExecutionOptions {
    browsers: BrowserName[];
    headless: boolean;
    viewport: {
        width: number;
        height: number;
    };
    device?: string;
    timeout: number;
    retries: number;
    slowMo?: number;
    baseUrl?: string;
}
export interface Test {
    id: string;
    name: string;
    description: string;
    steps: Step[];
    dataSetId?: string;
    executionOptions?: Partial<ExecutionOptions>;
    generatedCode?: string;
}
export interface TestSuite {
    id: string;
    name: string;
    description: string;
    tests: Test[];
    pageObjects: PageObject[];
    dataSets: TestDataSet[];
    executionOptions: ExecutionOptions;
    createdAt: string;
    updatedAt: string;
}
export type RunStatus = 'pending' | 'running' | 'passed' | 'failed' | 'cancelled';
export interface StepResult {
    stepId: string;
    stepName: string;
    status: 'passed' | 'failed' | 'skipped';
    duration: number;
    error?: string;
    screenshotPath?: string;
}
export interface TestResult {
    testId: string;
    testName: string;
    browser: BrowserName;
    dataRow?: number;
    status: 'passed' | 'failed' | 'skipped';
    duration: number;
    steps: StepResult[];
    logs: string[];
    screenshotPath?: string;
    tracePath?: string;
    error?: string;
}
export interface TestRun {
    id: string;
    suiteId: string;
    suiteName: string;
    status: RunStatus;
    startedAt: string;
    completedAt?: string;
    results: TestResult[];
    htmlReportPath?: string;
}
export interface RecorderSession {
    id: string;
    url: string;
    status: 'recording' | 'stopped' | 'error';
    outputPath: string;
    startedAt: string;
    stoppedAt?: string;
    recordedSteps?: Step[];
}
//# sourceMappingURL=models.d.ts.map