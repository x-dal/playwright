"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DATA_DIR = exports.ARTIFACTS_DIR = void 0;
exports.ensureDirectories = ensureDirectories;
exports.getDb = getDb;
exports.getAllSuites = getAllSuites;
exports.getSuiteById = getSuiteById;
exports.upsertSuite = upsertSuite;
exports.deleteSuite = deleteSuite;
exports.getAllRuns = getAllRuns;
exports.getRunById = getRunById;
exports.upsertRun = upsertRun;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const DATA_DIR = path_1.default.join(__dirname, '../../data');
exports.DATA_DIR = DATA_DIR;
const DB_PATH = path_1.default.join(DATA_DIR, 'automation.db');
const ARTIFACTS_DIR = path_1.default.join(DATA_DIR, 'artifacts');
exports.ARTIFACTS_DIR = ARTIFACTS_DIR;
function ensureDirectories() {
    [DATA_DIR, ARTIFACTS_DIR, path_1.default.join(ARTIFACTS_DIR, 'screenshots'), path_1.default.join(ARTIFACTS_DIR, 'traces'), path_1.default.join(ARTIFACTS_DIR, 'reports'), path_1.default.join(DATA_DIR, 'recordings')].forEach(dir => {
        if (!fs_1.default.existsSync(dir))
            fs_1.default.mkdirSync(dir, { recursive: true });
    });
}
let db;
function getDb() {
    if (!db) {
        ensureDirectories();
        db = new better_sqlite3_1.default(DB_PATH);
        db.pragma('journal_mode = WAL');
        db.pragma('foreign_keys = ON');
        initSchema(db);
    }
    return db;
}
function initSchema(db) {
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
function getAllSuites() {
    return getDb()
        .prepare('SELECT data FROM test_suites ORDER BY updated_at DESC')
        .all()
        .map((row) => JSON.parse(row.data));
}
function getSuiteById(id) {
    const row = getDb()
        .prepare('SELECT data FROM test_suites WHERE id = ?')
        .get(id);
    return row ? JSON.parse(row.data) : undefined;
}
function upsertSuite(suite) {
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
function deleteSuite(id) {
    getDb().prepare('DELETE FROM test_suites WHERE id = ?').run(id);
}
// ─── Run helpers ───────────────────────────────────────────────────────────────
function getAllRuns(suiteId) {
    const query = suiteId
        ? 'SELECT data FROM test_runs WHERE suite_id = ? ORDER BY started_at DESC'
        : 'SELECT data FROM test_runs ORDER BY started_at DESC LIMIT 100';
    const rows = suiteId
        ? getDb().prepare(query).all(suiteId)
        : getDb().prepare(query).all();
    return rows.map(r => JSON.parse(r.data));
}
function getRunById(id) {
    const row = getDb()
        .prepare('SELECT data FROM test_runs WHERE id = ?')
        .get(id);
    return row ? JSON.parse(row.data) : undefined;
}
function upsertRun(run) {
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
//# sourceMappingURL=database.js.map