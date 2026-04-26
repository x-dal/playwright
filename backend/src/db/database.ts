import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import type { TestSuite, TestRun } from './models';

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
