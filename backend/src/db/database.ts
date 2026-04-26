import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import type { TestSuite, TestRun, Issue, TestPlan, TestStrategy, ApiCollection, ApiRequest, Requirement } from './models';

const DATA_DIR = path.join(__dirname, '../../data');
const DB_PATH = path.join(DATA_DIR, 'automation.db');
const ARTIFACTS_DIR = path.join(DATA_DIR, 'artifacts');

export function ensureDirectories(): void {
  [DATA_DIR, ARTIFACTS_DIR, path.join(ARTIFACTS_DIR, 'screenshots'), path.join(ARTIFACTS_DIR, 'traces'), path.join(ARTIFACTS_DIR, 'reports'), path.join(DATA_DIR, 'recordings')].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });
}

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    ensureDirectories();
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema(db);
  }
  return db;
}

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS test_suites (
      id        TEXT PRIMARY KEY,
      name      TEXT NOT NULL,
      data      TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS test_runs (
      id          TEXT PRIMARY KEY,
      suite_id    TEXT NOT NULL,
      suite_name  TEXT NOT NULL,
      status      TEXT NOT NULL DEFAULT 'pending',
      data        TEXT NOT NULL,
      started_at  TEXT NOT NULL,
      completed_at TEXT,
      FOREIGN KEY (suite_id) REFERENCES test_suites(id)
    );

    CREATE TABLE IF NOT EXISTS recorder_sessions (
      id         TEXT PRIMARY KEY,
      url        TEXT NOT NULL,
      status     TEXT NOT NULL DEFAULT 'recording',
      output_path TEXT NOT NULL,
      data       TEXT NOT NULL,
      started_at TEXT NOT NULL,
      stopped_at TEXT
    );

    CREATE TABLE IF NOT EXISTS issues (
      id         TEXT PRIMARY KEY,
      title      TEXT NOT NULL,
      status     TEXT NOT NULL DEFAULT 'open',
      priority   TEXT NOT NULL DEFAULT 'medium',
      severity   TEXT NOT NULL DEFAULT 'major',
      data       TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS test_plans (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      data       TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS test_strategies (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      data       TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS api_collections (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      data       TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS api_requests (
      id            TEXT PRIMARY KEY,
      collection_id TEXT NOT NULL,
      name          TEXT NOT NULL,
      method        TEXT NOT NULL DEFAULT 'GET',
      data          TEXT NOT NULL,
      created_at    TEXT NOT NULL,
      updated_at    TEXT NOT NULL,
      FOREIGN KEY (collection_id) REFERENCES api_collections(id)
    );

    CREATE TABLE IF NOT EXISTS requirements (
      id         TEXT PRIMARY KEY,
      title      TEXT NOT NULL,
      status     TEXT NOT NULL DEFAULT 'draft',
      priority   TEXT NOT NULL DEFAULT 'medium',
      data       TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}

// ─── Suite helpers ─────────────────────────────────────────────────────────────

export function getAllSuites(): TestSuite[] {
  return getDb()
    .prepare('SELECT data FROM test_suites ORDER BY updated_at DESC')
    .all()
    .map((row: any) => JSON.parse(row.data) as TestSuite);
}

export function getSuiteById(id: string): TestSuite | undefined {
  const row = getDb()
    .prepare('SELECT data FROM test_suites WHERE id = ?')
    .get(id) as { data: string } | undefined;
  return row ? (JSON.parse(row.data) as TestSuite) : undefined;
}

export function upsertSuite(suite: TestSuite): void {
  getDb()
    .prepare(`
      INSERT INTO test_suites (id, name, data, created_at, updated_at)
      VALUES (@id, @name, @data, @created_at, @updated_at)
      ON CONFLICT(id) DO UPDATE SET
        name = @name,
        data = @data,
        updated_at = @updated_at
    `)
    .run({
      id: suite.id,
      name: suite.name,
      data: JSON.stringify(suite),
      created_at: suite.createdAt,
      updated_at: suite.updatedAt,
    });
}

export function deleteSuite(id: string): void {
  getDb().prepare('DELETE FROM test_suites WHERE id = ?').run(id);
}

// ─── Run helpers ───────────────────────────────────────────────────────────────

export function getAllRuns(suiteId?: string): TestRun[] {
  const query = suiteId
    ? 'SELECT data FROM test_runs WHERE suite_id = ? ORDER BY started_at DESC'
    : 'SELECT data FROM test_runs ORDER BY started_at DESC LIMIT 100';
  const rows: any[] = suiteId
    ? (getDb().prepare(query).all(suiteId) as any[])
    : (getDb().prepare(query).all() as any[]);
  return rows.map(r => JSON.parse(r.data) as TestRun);
}

export function getRunById(id: string): TestRun | undefined {
  const row = getDb()
    .prepare('SELECT data FROM test_runs WHERE id = ?')
    .get(id) as { data: string } | undefined;
  return row ? (JSON.parse(row.data) as TestRun) : undefined;
}

export function upsertRun(run: TestRun): void {
  getDb()
    .prepare(`
      INSERT INTO test_runs (id, suite_id, suite_name, status, data, started_at, completed_at)
      VALUES (@id, @suite_id, @suite_name, @status, @data, @started_at, @completed_at)
      ON CONFLICT(id) DO UPDATE SET
        status = @status,
        data = @data,
        completed_at = @completed_at
    `)
    .run({
      id: run.id,
      suite_id: run.suiteId,
      suite_name: run.suiteName,
      status: run.status,
      data: JSON.stringify(run),
      started_at: run.startedAt,
      completed_at: run.completedAt ?? null,
    });
}

export { ARTIFACTS_DIR, DATA_DIR };

// ─── Issue helpers ─────────────────────────────────────────────────────────────

export function getAllIssues(): Issue[] {
  return getDb()
    .prepare('SELECT data FROM issues ORDER BY created_at DESC')
    .all()
    .map((r: any) => JSON.parse(r.data) as Issue);
}

export function getIssueById(id: string): Issue | undefined {
  const row = getDb().prepare('SELECT data FROM issues WHERE id = ?').get(id) as { data: string } | undefined;
  return row ? JSON.parse(row.data) : undefined;
}

export function upsertIssue(issue: Issue): void {
  getDb().prepare(`
    INSERT INTO issues (id, title, status, priority, severity, data, created_at, updated_at)
    VALUES (@id, @title, @status, @priority, @severity, @data, @created_at, @updated_at)
    ON CONFLICT(id) DO UPDATE SET
      title = @title, status = @status, priority = @priority,
      severity = @severity, data = @data, updated_at = @updated_at
  `).run({
    id: issue.id, title: issue.title, status: issue.status,
    priority: issue.priority, severity: issue.severity,
    data: JSON.stringify(issue),
    created_at: issue.createdAt, updated_at: issue.updatedAt,
  });
}

export function deleteIssue(id: string): void {
  getDb().prepare('DELETE FROM issues WHERE id = ?').run(id);
}

// ─── Test Plan helpers ─────────────────────────────────────────────────────────

export function getAllTestPlans(): TestPlan[] {
  return getDb()
    .prepare('SELECT data FROM test_plans ORDER BY updated_at DESC')
    .all()
    .map((r: any) => JSON.parse(r.data) as TestPlan);
}

export function getTestPlanById(id: string): TestPlan | undefined {
  const row = getDb().prepare('SELECT data FROM test_plans WHERE id = ?').get(id) as { data: string } | undefined;
  return row ? JSON.parse(row.data) : undefined;
}

export function upsertTestPlan(plan: TestPlan): void {
  getDb().prepare(`
    INSERT INTO test_plans (id, name, data, created_at, updated_at)
    VALUES (@id, @name, @data, @created_at, @updated_at)
    ON CONFLICT(id) DO UPDATE SET name = @name, data = @data, updated_at = @updated_at
  `).run({ id: plan.id, name: plan.name, data: JSON.stringify(plan), created_at: plan.createdAt, updated_at: plan.updatedAt });
}

export function deleteTestPlan(id: string): void {
  getDb().prepare('DELETE FROM test_plans WHERE id = ?').run(id);
}

// ─── Test Strategy helpers ────────────────────────────────────────────────────

export function getAllTestStrategies(): TestStrategy[] {
  return getDb()
    .prepare('SELECT data FROM test_strategies ORDER BY updated_at DESC')
    .all()
    .map((r: any) => JSON.parse(r.data) as TestStrategy);
}

export function getTestStrategyById(id: string): TestStrategy | undefined {
  const row = getDb().prepare('SELECT data FROM test_strategies WHERE id = ?').get(id) as { data: string } | undefined;
  return row ? JSON.parse(row.data) : undefined;
}

export function upsertTestStrategy(strategy: TestStrategy): void {
  getDb().prepare(`
    INSERT INTO test_strategies (id, name, data, created_at, updated_at)
    VALUES (@id, @name, @data, @created_at, @updated_at)
    ON CONFLICT(id) DO UPDATE SET name = @name, data = @data, updated_at = @updated_at
  `).run({ id: strategy.id, name: strategy.name, data: JSON.stringify(strategy), created_at: strategy.createdAt, updated_at: strategy.updatedAt });
}

export function deleteTestStrategy(id: string): void {
  getDb().prepare('DELETE FROM test_strategies WHERE id = ?').run(id);
}

// ─── API Collection helpers ───────────────────────────────────────────────────

export function getAllApiCollections(): ApiCollection[] {
  return getDb()
    .prepare('SELECT data FROM api_collections ORDER BY updated_at DESC')
    .all()
    .map((r: any) => JSON.parse(r.data) as ApiCollection);
}

export function getApiCollectionById(id: string): ApiCollection | undefined {
  const row = getDb().prepare('SELECT data FROM api_collections WHERE id = ?').get(id) as { data: string } | undefined;
  return row ? JSON.parse(row.data) : undefined;
}

export function upsertApiCollection(col: ApiCollection): void {
  getDb().prepare(`
    INSERT INTO api_collections (id, name, data, created_at, updated_at)
    VALUES (@id, @name, @data, @created_at, @updated_at)
    ON CONFLICT(id) DO UPDATE SET name = @name, data = @data, updated_at = @updated_at
  `).run({ id: col.id, name: col.name, data: JSON.stringify(col), created_at: col.createdAt, updated_at: col.updatedAt });
}

export function deleteApiCollection(id: string): void {
  getDb().prepare('DELETE FROM api_collections WHERE id = ?').run(id);
  getDb().prepare('DELETE FROM api_requests WHERE collection_id = ?').run(id);
}

// ─── API Request helpers ──────────────────────────────────────────────────────

export function getRequestsByCollection(collectionId: string): ApiRequest[] {
  return getDb()
    .prepare('SELECT data FROM api_requests WHERE collection_id = ? ORDER BY created_at ASC')
    .all(collectionId)
    .map((r: any) => JSON.parse(r.data) as ApiRequest);
}

export function getApiRequestById(id: string): ApiRequest | undefined {
  const row = getDb().prepare('SELECT data FROM api_requests WHERE id = ?').get(id) as { data: string } | undefined;
  return row ? JSON.parse(row.data) : undefined;
}

export function upsertApiRequest(req: ApiRequest): void {
  getDb().prepare(`
    INSERT INTO api_requests (id, collection_id, name, method, data, created_at, updated_at)
    VALUES (@id, @collection_id, @name, @method, @data, @created_at, @updated_at)
    ON CONFLICT(id) DO UPDATE SET
      name = @name, method = @method, data = @data, updated_at = @updated_at
  `).run({ id: req.id, collection_id: req.collectionId, name: req.name, method: req.method, data: JSON.stringify(req), created_at: req.createdAt, updated_at: req.updatedAt });
}

export function deleteApiRequest(id: string): void {
  getDb().prepare('DELETE FROM api_requests WHERE id = ?').run(id);
}

// ─── Requirement helpers ──────────────────────────────────────────────────────

export function getAllRequirements(): Requirement[] {
  return getDb()
    .prepare('SELECT data FROM requirements ORDER BY updated_at DESC')
    .all()
    .map((r: any) => JSON.parse(r.data) as Requirement);
}

export function getRequirementById(id: string): Requirement | undefined {
  const row = getDb().prepare('SELECT data FROM requirements WHERE id = ?').get(id) as { data: string } | undefined;
  return row ? JSON.parse(row.data) : undefined;
}

export function upsertRequirement(req: Requirement): void {
  getDb().prepare(`
    INSERT INTO requirements (id, title, status, priority, data, created_at, updated_at)
    VALUES (@id, @title, @status, @priority, @data, @created_at, @updated_at)
    ON CONFLICT(id) DO UPDATE SET
      title = @title, status = @status, priority = @priority,
      data = @data, updated_at = @updated_at
  `).run({ id: req.id, title: req.title, status: req.status, priority: req.priority, data: JSON.stringify(req), created_at: req.createdAt, updated_at: req.updatedAt });
}

export function deleteRequirement(id: string): void {
  getDb().prepare('DELETE FROM requirements WHERE id = ?').run(id);
}
