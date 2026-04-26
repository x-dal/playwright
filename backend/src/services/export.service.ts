import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import { PassThrough } from 'stream';
import type { TestSuite } from '../db/models';
import { generateSuiteCode, generateTestCode } from './codegen.service';

export function createExportArchive(suite: TestSuite): PassThrough {
  const archive = archiver('zip', { zlib: { level: 9 } });
  const pass = new PassThrough();
  archive.pipe(pass);

  // package.json
  archive.append(JSON.stringify(buildPackageJson(suite), null, 2), { name: 'package.json' });

  // playwright.config.ts
  archive.append(buildPlaywrightConfig(suite), { name: 'playwright.config.ts' });

  // .gitignore
  archive.append(buildGitignore(), { name: '.gitignore' });

  // tsconfig
  archive.append(JSON.stringify(buildTsconfig(), null, 2), { name: 'tsconfig.json' });

  // GitHub Actions workflow
  archive.append(buildGHActionsWorkflow(suite), { name: '.github/workflows/playwright.yml' });

  // tests/
  for (const test of suite.tests) {
    const code = generateTestCode(test, suite);
    const fileName = `tests/${sanitizeFilename(test.name)}.spec.ts`;
    archive.append(code, { name: fileName });
  }

  // page-objects/
  for (const po of suite.pageObjects) {
    archive.append(buildPageObjectFile(po, suite), { name: `page-objects/${sanitizeFilename(po.name)}.ts` });
  }

  // full suite file
  archive.append(generateSuiteCode(suite), { name: 'tests/full-suite.spec.ts' });

  // README
  archive.append(buildReadme(suite), { name: 'README.md' });

  archive.finalize();
  return pass;
}

// ─── File builders ─────────────────────────────────────────────────────────────

function buildPackageJson(suite: TestSuite): object {
  return {
    name: sanitizeFilename(suite.name).toLowerCase().replace(/\s+/g, '-'),
    version: '1.0.0',
    description: `Playwright tests for ${suite.name}`,
    scripts: {
      test: 'npx playwright test',
      'test:headed': 'npx playwright test --headed',
      'test:chromium': 'npx playwright test --project=chromium',
      'test:firefox': 'npx playwright test --project=firefox',
      'test:webkit': 'npx playwright test --project=webkit',
      report: 'npx playwright show-report',
    },
    devDependencies: {
      '@playwright/test': '^1.44.1',
      typescript: '^5.4.5',
    },
  };
}

function buildPlaywrightConfig(suite: TestSuite): string {
  const opts = suite.executionOptions;
  const projects = opts.browsers
    .map(b => `    { name: '${b}', use: { ...devices['Desktop ${b.charAt(0).toUpperCase() + b.slice(1)}'] } }`)
    .join(',\n');
  return `import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? ${opts.retries} : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html'], ['list']],
  timeout: ${opts.timeout},
  use: {
    baseURL: ${opts.baseUrl ? `'${opts.baseUrl}'` : "process.env.BASE_URL || 'http://localhost:3000'"},
    headless: ${opts.headless},
    viewport: { width: ${opts.viewport.width}, height: ${opts.viewport.height} },
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    video: 'on-first-retry',
  },
  projects: [
${projects}
  ],
});
`;
}

function buildGitignore(): string {
  return `node_modules/
/test-results/
/playwright-report/
/blob-report/
/playwright/.cache/
*.zip
`;
}

function buildTsconfig(): object {
  return {
    compilerOptions: {
      target: 'ES2020',
      module: 'commonjs',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
    },
    include: ['tests/**/*', 'page-objects/**/*'],
  };
}

function buildGHActionsWorkflow(suite: TestSuite): string {
  const browsers = suite.executionOptions.browsers;
  return `name: Playwright Tests

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]

jobs:
  test:
    name: Run Playwright tests (${browsers.join(', ')})
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps ${browsers.join(' ')}

      - name: Run Playwright tests
        run: npx playwright test
        env:
          CI: true

      - name: Upload HTML report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
`;
}

function buildPageObjectFile(po: any, suite: TestSuite): string {
  const params = po.params.length > 0
    ? po.params.map((p: string) => `${p}: string`).join(', ')
    : '';
  return `import type { Page } from '@playwright/test';

export async function ${toCamelCase(po.name)}(page: Page${params ? ', ' + params : ''}) {
  // ${po.description || po.name}
  // Steps are inlined here; expand for full implementation
}
`;
}

function buildReadme(suite: TestSuite): string {
  return `# ${suite.name}

${suite.description || 'Generated by Playwright Automation Framework'}

## Setup

\`\`\`bash
npm install
npx playwright install
\`\`\`

## Running tests

\`\`\`bash
# Run all tests (all browsers)
npm test

# Run headed (visible browser window)
npm run test:headed

# Run on specific browser
npm run test:chromium
npm run test:firefox
npm run test:webkit

# Show HTML report
npm run report
\`\`\`

## Tests

${suite.tests.map(t => `- **${t.name}**: ${t.description || ''}  (${t.steps.length} steps)`).join('\n')}

## Page Objects

${suite.pageObjects.length > 0 ? suite.pageObjects.map(p => `- **${p.name}**: ${p.description}`).join('\n') : '_None defined_'}

---

*Generated on ${new Date().toISOString()} by Playwright Automation Framework*
`;
}

// ─── Utilities ─────────────────────────────────────────────────────────────────

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\- ]/g, '').replace(/\s+/g, '-');
}

function toCamelCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .split(' ')
    .map((w, i) => (i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join('');
}
