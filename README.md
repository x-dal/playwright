# Playwright Automation Studio

A full-stack, no-code/low-code end-to-end test automation platform. Non-coding testers can visually build, record, and run Playwright tests through a browser UI while engineers can drop into a Monaco code editor for full control.

## Architecture

```
playwright-automation/
├── backend/          # Node.js + Express + SQLite
│   └── src/
│       ├── db/       # SQLite schema + helpers (better-sqlite3)
│       ├── routes/   # REST endpoints
│       └── services/ # Playwright executor, code generator, zip exporter
└── frontend/         # React 18 + Vite + Tailwind CSS
    └── src/
        ├── components/   # All UI components
        ├── store/        # Zustand global state
        ├── api/          # Axios API client
        └── types/        # Shared TypeScript types
```

## Prerequisites

- **Node.js 20 LTS** — [download](https://nodejs.org/)
- **npm 10+** (ships with Node 20)
- Playwright browsers (installed in the setup step)

## Quick Start

### 1 — Install dependencies

```bash
# From the repo root
npm install
npm install --workspace=backend
npm install --workspace=frontend
```

### 2 — Install Playwright browsers

```bash
cd backend
npx playwright install chromium firefox webkit
# Or install with OS-level dependencies (Linux):
npx playwright install --with-deps chromium firefox webkit
```

### 3 — Start development servers

```bash
# From repo root — starts both servers concurrently
npm run dev
```

| Server   | URL                        | Purpose                        |
|----------|----------------------------|--------------------------------|
| Frontend | http://localhost:5173      | React UI (Vite dev server)     |
| Backend  | http://localhost:3001      | REST API + Playwright executor |

Open **http://localhost:5173** in your browser.

---

## Feature Guide

### Dashboard

The home screen shows all test suites with pass-rate stats and recent run history.
Click **New Suite** to create one, then **Open Builder** to enter the test editor.

### Test Builder

The builder has five tabs:

| Tab            | Description |
|----------------|-------------|
| **Test Steps** | Drag-and-drop step canvas with a step palette on the left and a configuration panel on the right |
| **Recorder**   | Launches a real Chromium window via `playwright codegen`; captured steps import into any test |
| **Page Objects** | Group reusable step sequences (e.g., "Login Flow") with named parameters |
| **Test Data**  | Spreadsheet-style table; columns become `{{variable}}` placeholders in step values |
| **Run Options** | Browser selection, headless/headful, viewport, device emulation, timeouts, retries |

#### Available step types

| Step       | What it does |
|------------|--------------|
| Navigate   | `page.goto(url)` |
| Click      | `locator.click()` with button/count options |
| Type       | `locator.fill()` or `pressSequentially()` |
| Select     | `locator.selectOption()` |
| Wait       | Wait for selector / timeout / navigation, with skip-on-timeout option |
| Assert     | 11 assertion types: visible, hidden, text, value, count, URL, title, checked, enabled, disabled |
| Hover      | `locator.hover()` |
| Keyboard   | `page.keyboard.press()` |
| Scroll     | Scroll window to coordinates or element into view |
| Screenshot | Capture a full-page PNG to artifacts |
| Conditional | If/else branch based on element visibility, text, or URL |
| Page Object | Inline a named page-object flow |

#### Test Parameterization

1. Go to **Test Data** and create a data set with columns (e.g., `username`, `password`).
2. Add rows — each row becomes one test iteration.
3. In a **Type** step, set value to `{{username}}` — it resolves from the data row at runtime.
4. In the test list sidebar, assign the data set to the test (via the updateTest API or directly editing).

### Code Editor

Click `</> Code` in the builder header to open the Monaco editor.

- **Full Suite** view: read-only — shows the complete generated TypeScript.
- **Active Test** view: editable — save custom code that overrides the generated version.
- **Regenerate**: re-generates from the current visual steps (discards manual edits).
- **Download Project**: downloads a GitHub-ready zip (see below).

### Running Tests

Click **▶ Run Suite** in the builder header or on the Runs page. Results stream back in real time via Server-Sent Events. Each run captures:

- Pass / fail / skip per step
- Console logs
- Full-page screenshots on failure (and for screenshot steps)
- Playwright trace `.zip` (open with `npx playwright show-trace trace.zip`)
- An HTML report served at `/api/export/<suiteId>/report/<runId>`

### Exporting as a GitHub-ready project

Click the **↓** icon on any suite card (Dashboard) or **Download Project** in the code editor.

The zip contains:

```
your-suite-playwright-tests.zip
├── package.json                # @playwright/test devDependency
├── playwright.config.ts        # Configured for selected browsers/options
├── tsconfig.json
├── .gitignore
├── tests/
│   ├── full-suite.spec.ts      # All tests combined
│   └── <test-name>.spec.ts     # One file per test
├── page-objects/
│   └── <page-object>.ts
├── .github/
│   └── workflows/
│       └── playwright.yml      # GitHub Actions CI workflow
└── README.md
```

To use the exported project:

```bash
unzip your-suite.zip && cd your-suite
npm install
npx playwright install chromium firefox webkit
npm test                           # headless, all browsers
npm run test:headed               # visible browser
npm run test:chromium             # single browser
npx playwright show-report        # open HTML report
```

---

## REST API Reference

### Test Suites

| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/suites` | List all suites |
| POST   | `/api/suites` | Create suite `{name, description}` |
| GET    | `/api/suites/:id` | Get suite with full definition |
| PUT    | `/api/suites/:id` | Update suite (any fields) |
| DELETE | `/api/suites/:id` | Delete suite |
| POST   | `/api/suites/:id/tests` | Add test `{name, description}` |
| PUT    | `/api/suites/:id/tests/:testId` | Update test (steps, options, etc.) |
| DELETE | `/api/suites/:id/tests/:testId` | Remove test |
| GET    | `/api/suites/:id/code` | Generate TypeScript for full suite |
| GET    | `/api/suites/:id/tests/:testId/code` | Generate TypeScript for single test |
| PUT    | `/api/suites/:id/tests/:testId/code` | Save custom code `{code}` |

### Test Runs

| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/runs?suiteId=...` | List runs (optionally filtered) |
| POST   | `/api/runs` | Trigger run `{suiteId}` — returns 202 immediately |
| GET    | `/api/runs/:id` | Get run result |
| GET    | `/api/runs/:id/stream` | SSE stream of live run updates |
| DELETE | `/api/runs/:id` | Cancel a pending/running run |

### Recorder

| Method | Path | Description |
|--------|------|-------------|
| POST   | `/api/recorder/start` | Start codegen session `{url}` |
| POST   | `/api/recorder/:id/stop` | Stop session, returns `{session, steps}` |
| GET    | `/api/recorder/:id/steps` | Poll captured steps while recording |
| DELETE | `/api/recorder/:id` | Discard session |

### Export

| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/export/:suiteId` | Download GitHub-ready project as `.zip` |
| GET    | `/api/export/:suiteId/report/:runId` | View HTML test report |

---

## Running tests across browsers

By default suites run on Chromium only. To change:

1. Open the suite → **Run Options** tab.
2. Toggle Chromium / Firefox / WebKit.
3. Save options.
4. The next run executes each test once per selected browser.

In the exported project, edit `playwright.config.ts` to add/remove projects.

---

## Production Build

```bash
# Build backend
cd backend && npm run build

# Build frontend
cd frontend && npm run build   # outputs to frontend/dist/

# Serve frontend static files from Express (optional — add express.static to backend)
PORT=3001 node backend/dist/index.js
```

---

## Data Storage

By default all data lives in `backend/data/`:

```
backend/data/
├── automation.db           # SQLite (suite/run definitions)
└── artifacts/
    ├── screenshots/        # PNG captures
    ├── traces/             # Playwright trace .zip files
    └── reports/            # HTML run reports
```

SQLite can be swapped for PostgreSQL or Firestore by replacing `backend/src/db/database.ts` — the rest of the code is DB-agnostic.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `playwright: command not found` | Run `npm install` in `backend/` then `npx playwright install` |
| Recording doesn't open a browser | Make sure the backend is running and you're on a machine with a display (not SSH) |
| CORS error in the frontend | The backend allows `http://localhost:5173` by default; set `FRONTEND_ORIGIN` env var if your port differs |
| `better-sqlite3` native build fails | Run `npm rebuild better-sqlite3` after switching Node versions |
| Monaco editor blank | Clear browser cache; the editor loads lazily from CDN |
