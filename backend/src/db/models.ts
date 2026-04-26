// ─── Step types ───────────────────────────────────────────────────────────────

export type StepType =
  | 'navigate'
  | 'click'
  | 'type'
  | 'select'
  | 'wait'
  | 'assert'
  | 'pageObject'
  | 'conditional'
  | 'hover'
  | 'keyboard'
  | 'scroll'
  | 'screenshot';

export type LocatorType =
  | 'css' | 'xpath' | 'role' | 'label' | 'placeholder'
  | 'text' | 'testId' | 'altText' | 'title' | 'raw';

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

export type AssertType =
  | 'containsText'
  | 'notContainsText'
  | 'isVisible'
  | 'isHidden'
  | 'hasValue'
  | 'hasCount'
  | 'urlContains'
  | 'titleContains'
  | 'isChecked'
  | 'isEnabled'
  | 'isDisabled';

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

export type Step =
  | NavigateStep
  | ClickStep
  | TypeStep
  | SelectStep
  | WaitStep
  | AssertStep
  | PageObjectStep
  | ConditionalStep
  | HoverStep
  | KeyboardStep
  | ScrollStep
  | ScreenshotStep;

// ─── Page Objects ──────────────────────────────────────────────────────────────

export interface PageObject {
  id: string;
  name: string;
  description: string;
  steps: Step[];
  params: string[];
}

// ─── Test Data ─────────────────────────────────────────────────────────────────

export interface DataColumn {
  key: string;
  values: string[];
}

export interface TestDataSet {
  id: string;
  name: string;
  columns: DataColumn[];
}

// ─── Execution Options ─────────────────────────────────────────────────────────

export type BrowserName = 'chromium' | 'firefox' | 'webkit';

export interface ExecutionOptions {
  browsers: BrowserName[];
  headless: boolean;
  viewport: { width: number; height: number };
  device?: string;
  timeout: number;
  retries: number;
  slowMo?: number;
  baseUrl?: string;
}

// ─── Test ──────────────────────────────────────────────────────────────────────

export interface Test {
  id: string;
  name: string;
  description: string;
  steps: Step[];
  dataSetId?: string;
  executionOptions?: Partial<ExecutionOptions>;
  generatedCode?: string;
}

// ─── Test Suite ────────────────────────────────────────────────────────────────

export interface TestSuite {
  id: string;
  name: string;
  projectId?: string;
  description: string;
  tests: Test[];
  pageObjects: PageObject[];
  dataSets: TestDataSet[];
  executionOptions: ExecutionOptions;
  createdAt: string;
  updatedAt: string;
}

// ─── Test Run ──────────────────────────────────────────────────────────────────

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

// ─── Recorder Session ─────────────────────────────────────────────────────────

export interface RecorderSession {
  id: string;
  url: string;
  status: 'recording' | 'stopped' | 'error';
  outputPath: string;
  startedAt: string;
  stoppedAt?: string;
  recordedSteps?: Step[];
}

// ─── Project ──────────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Issue Tracker ────────────────────────────────────────────────────────────

export type IssueStatus = 'open' | 'in-progress' | 'resolved' | 'closed';
export type IssuePriority = 'low' | 'medium' | 'high' | 'critical';
export type IssueSeverity = 'minor' | 'major' | 'critical' | 'blocker';

export interface Issue {
  id: string;
  title: string;
  description: string;
  status: IssueStatus;
  priority: IssuePriority;
  severity: IssueSeverity;
  createdAt: string;
  updatedAt: string;
  projectId?: string;
  testRunId?: string;
  testName?: string;
  errorMessage?: string;
  screenshotPath?: string;
  // TODO: GitHub Issues / Jira integration — store external issue URL here
  externalUrl?: string;
}

// ─── Test Plan ────────────────────────────────────────────────────────────────

export interface TestPlan {
  id: string;
  name: string;
  projectId?: string;
  objective: string;
  scope: string;
  entryCriteria: string;
  exitCriteria: string;
  resources: string;
  schedule: string;
  associatedSuiteIds: string[];
  createdAt: string;
  updatedAt: string;
}

// ─── Test Strategy ────────────────────────────────────────────────────────────

export type TestLevel = 'unit' | 'integration' | 'system' | 'acceptance';

export interface TestStrategy {
  id: string;
  name: string;
  projectId?: string;
  approach: string;
  testLevels: TestLevel[];
  tools: string;
  riskAnalysis: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

// ─── API Collections ──────────────────────────────────────────────────────────

export interface ApiEnvironment {
  name: string;
  variables: Record<string, string>;
}

export interface ApiCollection {
  id: string;
  name: string;
  projectId?: string;
  description: string;
  environments: ApiEnvironment[];
  activeEnvironment?: string;
  createdAt: string;
  updatedAt: string;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export interface ApiHeader {
  key: string;
  value: string;
  enabled: boolean;
}

export interface ApiRequestTest {
  id: string;
  name: string;
  type: 'assertStatus' | 'assertBodyField' | 'assertHeader' | 'assertBodyContains';
  value: string;
  field?: string;
}

export interface ApiRequest {
  id: string;
  collectionId: string;
  name: string;
  method: HttpMethod;
  url: string;
  headers: ApiHeader[];
  body?: string;
  bodyType: 'none' | 'json' | 'form' | 'text';
  tests: ApiRequestTest[];
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  duration: number;
  size: number;
  testResults?: { id: string; name: string; passed: boolean; message?: string }[];
}

// ─── Requirements ─────────────────────────────────────────────────────────────

export type RequirementStatus = 'draft' | 'approved' | 'implemented' | 'verified';
export type RequirementPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Requirement {
  id: string;
  title: string;
  projectId?: string;
  description: string;
  priority: RequirementPriority;
  status: RequirementStatus;
  tags: string[];
  linkedTestIds: string[];
  linkedApiCollectionIds: string[];
  createdAt: string;
  updatedAt: string;
}
