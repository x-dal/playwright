import { chromium, firefox, webkit, Browser, BrowserContext } from 'playwright';
import fs from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';
import type {
  TestSuite, Test, TestRun, TestResult, StepResult,
  BrowserName, ExecutionOptions, Step, TestDataSet,
} from '../db/models';
import { generateSuiteCode } from './codegen.service';
import { getLocator } from './locator';
import { ARTIFACTS_DIR, DATA_DIR } from '../db/database';

const BROWSER_MAP = { chromium, firefox, webkit };

// ─── Run a full test suite ─────────────────────────────────────────────────────

export async function runSuite(
  suite: TestSuite,
  onProgress: (run: TestRun) => void,
  signal?: AbortSignal,
  runOptions?: { testId?: string; preview?: boolean },
): Promise<TestRun> {
  const run: TestRun = {
    id: uuid(),
    suiteId: suite.id,
    suiteName: suite.name,
    status: 'running',
    startedAt: new Date().toISOString(),
    results: [],
  };
  onProgress(run);

  const opts = suite.executionOptions;
  const testsToRun = runOptions?.testId
    ? suite.tests.filter(t => t.id === runOptions.testId)
    : suite.tests;
  // preview=true overrides headless so the user can watch the browser
  const headless = runOptions?.preview ? false : opts.headless;

  outer: for (const browserName of opts.browsers) {
    if (signal?.aborted) break outer;

    const browser = await BROWSER_MAP[browserName].launch({
      headless,
      slowMo: opts.slowMo ?? 0,
    });

    try {
      for (const test of testsToRun) {
        if (signal?.aborted) break outer;

        const testOpts = { ...opts, ...(test.executionOptions ?? {}) };
        const dataRows = getDataRows(test.dataSetId, suite.dataSets);

        if (dataRows.length > 0) {
          for (let rowIdx = 0; rowIdx < dataRows.length; rowIdx++) {
            if (signal?.aborted) break outer;
            const result = await runSingleTest(browser, test, suite, testOpts, browserName, dataRows[rowIdx], rowIdx);
            run.results.push(result);
            onProgress({ ...run, results: [...run.results] });
          }
        } else {
          const result = await runSingleTest(browser, test, suite, testOpts, browserName, {}, undefined);
          run.results.push(result);
          onProgress({ ...run, results: [...run.results] });
        }
      }
    } finally {
      await browser.close();
    }
  }

  if (signal?.aborted) {
    run.status = 'cancelled';
    run.completedAt = new Date().toISOString();
    return run;
  }

  const allPassed = run.results.every(r => r.status === 'passed');
  run.status = allPassed ? 'passed' : 'failed';
  run.completedAt = new Date().toISOString();

  // Generate HTML report stub
  await writeHtmlReport(run);
  onProgress(run);
  return run;
}

// ─── Run a single test ─────────────────────────────────────────────────────────

async function runSingleTest(
  browser: Browser,
  test: Test,
  suite: TestSuite,
  opts: ExecutionOptions,
  browserName: BrowserName,
  dataRow: Record<string, string>,
  rowIdx: number | undefined,
): Promise<TestResult> {
  const runId = uuid();
  const screenshotDir = path.join(ARTIFACTS_DIR, 'screenshots');
  const tracePath = path.join(ARTIFACTS_DIR, 'traces', `${runId}.zip`);
  const logs: string[] = [];
  const stepResults: StepResult[] = [];
  let finalStatus: 'passed' | 'failed' | 'skipped' = 'passed';
  let errorMsg: string | undefined;
  let screenshotPath: string | undefined;

  const contextOpts: Parameters<Browser['newContext']>[0] = {
    viewport: opts.viewport,
  };
  if (opts.device) {
    // device emulation is applied by merging devices config
    const { devices } = await import('playwright');
    const deviceDesc = devices[opts.device];
    if (deviceDesc) Object.assign(contextOpts, deviceDesc);
  }

  const context: BrowserContext = await browser.newContext(contextOpts);
  await context.tracing.start({ screenshots: true, snapshots: true });

  context.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));

  const page = await context.newPage();
  const start = Date.now();

  try {
    for (const step of test.steps) {
      if (step.disabled) continue;
      const stepStart = Date.now();
      let stepStatus: 'passed' | 'failed' | 'skipped' = 'passed';
      let stepError: string | undefined;

      try {
        logs.push(`Step: ${step.name}`);
        await executeStep(page, step, suite, dataRow, opts.timeout);
      } catch (err: any) {
        stepStatus = 'failed';
        stepError = err?.message ?? String(err);
        finalStatus = 'failed';
        errorMsg = stepError;
        logs.push(`FAILED: ${stepError}`);
        // Capture failure screenshot
        try {
          const p = path.join(screenshotDir, `${runId}-fail-${step.id}.png`);
          await page.screenshot({ path: p, fullPage: true });
          screenshotPath = p;
          stepResults.push({ stepId: step.id, stepName: step.name ?? step.type, status: stepStatus, duration: Date.now() - stepStart, error: stepError, screenshotPath: p });
        } catch { /* screenshot failed */ }
        break;
      }
      stepResults.push({ stepId: step.id, stepName: step.name ?? step.type, status: stepStatus, duration: Date.now() - stepStart, error: stepError });
    }
  } catch (err: any) {
    finalStatus = 'failed';
    errorMsg = err?.message ?? String(err);
  }

  // Capture final screenshot
  try {
    const p = path.join(screenshotDir, `${runId}-final.png`);
    await page.screenshot({ path: p, fullPage: true });
    if (!screenshotPath) screenshotPath = p;
  } catch { /* ignore */ }

  // Stop tracing
  try {
    await context.tracing.stop({ path: tracePath });
  } catch { /* ignore */ }

  await context.close();

  return {
    testId: test.id,
    testName: test.name,
    browser: browserName,
    dataRow: rowIdx,
    status: finalStatus,
    duration: Date.now() - start,
    steps: stepResults,
    logs,
    screenshotPath,
    tracePath,
    error: errorMsg,
  };
}

// ─── Execute a step using Playwright's Page API ───────────────────────────────

async function executeStep(
  page: any,
  step: Step,
  suite: TestSuite,
  data: Record<string, string>,
  defaultTimeout: number,
): Promise<void> {
  const resolve = (val: string) => val.replace(/\{\{(\w+)\}\}/g, (_, k) => data[k] ?? '');

  switch (step.type) {
    case 'navigate':
      await page.goto(resolve(step.url), { timeout: defaultTimeout });
      break;

    case 'click':
      await getLocator(page, step.locatorType, step.selector, step.locatorOptions).click({
        button: step.button ?? 'left',
        clickCount: step.clickCount ?? 1,
        timeout: defaultTimeout,
      });
      break;

    case 'type':
      if (step.clearFirst !== false) {
        await getLocator(page, step.locatorType, step.selector, step.locatorOptions).fill(resolve(step.value), { timeout: defaultTimeout });
      } else {
        await getLocator(page, step.locatorType, step.selector, step.locatorOptions).pressSequentially(resolve(step.value));
      }
      break;

    case 'select':
      await getLocator(page, step.locatorType, step.selector, step.locatorOptions).selectOption(resolve(step.value), { timeout: defaultTimeout });
      break;

    case 'wait':
      if (step.waitType === 'timeout') {
        await page.waitForTimeout(step.timeout);
      } else if (step.waitType === 'navigation') {
        await page.waitForNavigation({ timeout: step.timeout });
      } else {
        try {
          await getLocator(page, step.locatorType, step.selector ?? '', step.locatorOptions).waitFor({ timeout: step.timeout });
        } catch (e) {
          if (step.onTimeout === 'skip') return;
          throw e;
        }
      }
      break;

    case 'assert': {
      const { expect } = await import('@playwright/test');
      const loc = getLocator(page, step.locatorType, step.selector, step.locatorOptions);
      switch (step.assertType) {
        case 'containsText':    await expect(loc).toContainText(step.expected, { timeout: defaultTimeout }); break;
        case 'notContainsText': await expect(loc).not.toContainText(step.expected, { timeout: defaultTimeout }); break;
        case 'isVisible':       await expect(loc).toBeVisible({ timeout: defaultTimeout }); break;
        case 'isHidden':        await expect(loc).toBeHidden({ timeout: defaultTimeout }); break;
        case 'hasValue':        await expect(loc).toHaveValue(step.expected, { timeout: defaultTimeout }); break;
        case 'hasCount':        await expect(loc).toHaveCount(Number(step.expected), { timeout: defaultTimeout }); break;
        case 'urlContains':     await expect(page).toHaveURL(new RegExp(step.expected), { timeout: defaultTimeout }); break;
        case 'titleContains':   await expect(page).toHaveTitle(new RegExp(step.expected), { timeout: defaultTimeout }); break;
        case 'isChecked':       await expect(loc).toBeChecked({ timeout: defaultTimeout }); break;
        case 'isEnabled':       await expect(loc).toBeEnabled({ timeout: defaultTimeout }); break;
        case 'isDisabled':      await expect(loc).toBeDisabled({ timeout: defaultTimeout }); break;
      }
      break;
    }

    case 'pageObject': {
      const po = suite.pageObjects.find(p => p.id === step.pageObjectId);
      if (!po) throw new Error(`Page object not found: ${step.pageObjectId}`);
      for (const poStep of po.steps) {
        await executeStep(page, poStep, suite, { ...data, ...step.params }, defaultTimeout);
      }
      break;
    }

    case 'conditional': {
      let condMet = false;
      try {
        switch (step.condition.type) {
          case 'elementVisible':
            condMet = await getLocator(page, step.condition.locatorType, step.condition.selector ?? '', step.condition.locatorOptions).isVisible();
            break;
          case 'elementContainsText': {
            const text = await getLocator(page, step.condition.locatorType, step.condition.selector ?? '', step.condition.locatorOptions).textContent();
            condMet = (text ?? '').includes(step.condition.value ?? '');
            break;
          }
          case 'urlContains':
            condMet = page.url().includes(step.condition.value ?? '');
            break;
        }
      } catch { condMet = false; }
      const branch = condMet ? step.thenSteps : step.elseSteps;
      for (const s of branch) {
        await executeStep(page, s, suite, data, defaultTimeout);
      }
      break;
    }

    case 'hover':
      await getLocator(page, step.locatorType, step.selector, step.locatorOptions).hover({ timeout: defaultTimeout });
      break;

    case 'keyboard':
      await page.keyboard.press(step.key);
      // After Enter/Return, wait for any triggered navigation to settle
      if (['Enter', 'Return', 'NumpadEnter'].includes(step.key)) {
        try { await page.waitForLoadState('domcontentloaded', { timeout: defaultTimeout }); } catch { /* no navigation, ignore */ }
      }
      break;

    case 'scroll':
      if (step.selector) {
        await getLocator(page, step.locatorType, step.selector, step.locatorOptions).scrollIntoViewIfNeeded();
      } else {
        await page.evaluate(({ x, y }: { x: number; y: number }) => { (globalThis as any).scrollTo(x, y); }, { x: step.x ?? 0, y: step.y ?? 0 });
      }
      break;

    case 'screenshot': {
      const name = step.screenshotName ?? `screenshot-${Date.now()}`;
      const p = path.join(ARTIFACTS_DIR, 'screenshots', `${name}.png`);
      await page.screenshot({ path: p, fullPage: true });
      break;
    }
  }
}

// ─── Data helpers ──────────────────────────────────────────────────────────────

function getDataRows(dataSetId: string | undefined, dataSets: TestDataSet[]): Record<string, string>[] {
  if (!dataSetId) return [];
  const ds = dataSets.find(d => d.id === dataSetId);
  if (!ds || ds.columns.length === 0) return [];
  const rowCount = Math.max(...ds.columns.map(c => c.values.length));
  const rows: Record<string, string>[] = [];
  for (let i = 0; i < rowCount; i++) {
    rows.push(Object.fromEntries(ds.columns.map(c => [c.key, c.values[i] ?? ''])));
  }
  return rows;
}

// ─── HTML report ───────────────────────────────────────────────────────────────

async function writeHtmlReport(run: TestRun): Promise<void> {
  const dir = path.join(ARTIFACTS_DIR, 'reports', run.id);
  fs.mkdirSync(dir, { recursive: true });
  const passed = run.results.filter(r => r.status === 'passed').length;
  const failed = run.results.filter(r => r.status === 'failed').length;
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Test Report – ${run.suiteName}</title>
<style>
  body { font-family: system-ui; background: #0f172a; color: #e2e8f0; padding: 2rem; }
  h1 { color: #38bdf8; }
  .badge { display:inline-block; padding:.2rem .6rem; border-radius:9999px; font-size:.8rem; font-weight:600; }
  .passed { background:#16a34a; } .failed { background:#dc2626; }
  table { width:100%; border-collapse:collapse; margin-top:1rem; }
  th,td { padding:.75rem 1rem; text-align:left; border-bottom:1px solid #334155; }
  th { background:#1e293b; }
  details summary { cursor:pointer; color:#94a3b8; }
  pre { background:#1e293b; padding:1rem; border-radius:.5rem; overflow:auto; font-size:.8rem; }
</style>
</head>
<body>
<h1>${run.suiteName} – Test Report</h1>
<p>Run ID: <code>${run.id}</code> &nbsp;|&nbsp; Started: ${run.startedAt} &nbsp;|&nbsp; Completed: ${run.completedAt ?? '–'}</p>
<p><span class="badge passed">${passed} passed</span> &nbsp;<span class="badge failed">${failed} failed</span></p>
<table>
  <thead><tr><th>Test</th><th>Browser</th><th>Status</th><th>Duration</th><th>Logs</th></tr></thead>
  <tbody>
    ${run.results.map(r => `<tr>
      <td>${r.testName}${r.dataRow !== undefined ? ` (row ${r.dataRow + 1})` : ''}</td>
      <td>${r.browser}</td>
      <td><span class="badge ${r.status}">${r.status}</span></td>
      <td>${(r.duration / 1000).toFixed(2)}s</td>
      <td><details><summary>${r.logs.length} lines</summary><pre>${r.logs.join('\n')}</pre></details></td>
    </tr>`).join('')}
  </tbody>
</table>
</body></html>`;
  fs.writeFileSync(path.join(dir, 'index.html'), html);
  run.htmlReportPath = path.join(dir, 'index.html');
}
