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
exports.getAllIssues = getAllIssues;
exports.getIssueById = getIssueById;
exports.upsertIssue = upsertIssue;
exports.deleteIssue = deleteIssue;
exports.getAllTestPlans = getAllTestPlans;
exports.getTestPlanById = getTestPlanById;
exports.upsertTestPlan = upsertTestPlan;
exports.deleteTestPlan = deleteTestPlan;
exports.getAllTestStrategies = getAllTestStrategies;
exports.getTestStrategyById = getTestStrategyById;
exports.upsertTestStrategy = upsertTestStrategy;
exports.deleteTestStrategy = deleteTestStrategy;
exports.getAllApiCollections = getAllApiCollections;
exports.getApiCollectionById = getApiCollectionById;
exports.upsertApiCollection = upsertApiCollection;
exports.deleteApiCollection = deleteApiCollection;
exports.getRequestsByCollection = getRequestsByCollection;
exports.getApiRequestById = getApiRequestById;
exports.upsertApiRequest = upsertApiRequest;
exports.deleteApiRequest = deleteApiRequest;
exports.getAllRequirements = getAllRequirements;
exports.getRequirementById = getRequirementById;
exports.upsertRequirement = upsertRequirement;
exports.deleteRequirement = deleteRequirement;
exports.getAllProjects = getAllProjects;
exports.getProjectById = getProjectById;
exports.upsertProject = upsertProject;
exports.deleteProject = deleteProject;
exports.getProjectStats = getProjectStats;
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

    CREATE TABLE IF NOT EXISTS projects (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      data        TEXT NOT NULL,
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL
    );
  `);
    // Add project_id column to existing tables if not already present (idempotent migration)
    for (const table of ['test_suites', 'issues', 'test_plans', 'test_strategies', 'api_collections', 'requirements']) {
        try {
            db.exec(`ALTER TABLE ${table} ADD COLUMN project_id TEXT`);
        }
        catch { /* column already exists */ }
    }
}
// ─── Suite helpers ─────────────────────────────────────────────────────────────
function getAllSuites(projectId) {
    const rows = projectId
        ? getDb().prepare('SELECT data FROM test_suites WHERE project_id = ? ORDER BY updated_at DESC').all(projectId)
        : getDb().prepare('SELECT data FROM test_suites ORDER BY updated_at DESC').all();
    return rows.map(row => JSON.parse(row.data));
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
      INSERT INTO test_suites (id, name, project_id, data, created_at, updated_at)
      VALUES (@id, @name, @project_id, @data, @created_at, @updated_at)
      ON CONFLICT(id) DO UPDATE SET
        name = @name,
        project_id = @project_id,
        data = @data,
        updated_at = @updated_at
    `)
        .run({
        id: suite.id,
        name: suite.name,
        project_id: suite.projectId ?? null,
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
// ─── Issue helpers ─────────────────────────────────────────────────────────────
function getAllIssues(projectId) {
    const rows = projectId
        ? getDb().prepare('SELECT data FROM issues WHERE project_id = ? ORDER BY created_at DESC').all(projectId)
        : getDb().prepare('SELECT data FROM issues ORDER BY created_at DESC').all();
    return rows.map(r => JSON.parse(r.data));
}
function getIssueById(id) {
    const row = getDb().prepare('SELECT data FROM issues WHERE id = ?').get(id);
    return row ? JSON.parse(row.data) : undefined;
}
function upsertIssue(issue) {
    getDb().prepare(`
    INSERT INTO issues (id, title, status, priority, severity, project_id, data, created_at, updated_at)
    VALUES (@id, @title, @status, @priority, @severity, @project_id, @data, @created_at, @updated_at)
    ON CONFLICT(id) DO UPDATE SET
      title = @title, status = @status, priority = @priority,
      severity = @severity, project_id = @project_id, data = @data, updated_at = @updated_at
  `).run({
        id: issue.id, title: issue.title, status: issue.status,
        priority: issue.priority, severity: issue.severity,
        project_id: issue.projectId ?? null,
        data: JSON.stringify(issue),
        created_at: issue.createdAt, updated_at: issue.updatedAt,
    });
}
function deleteIssue(id) {
    getDb().prepare('DELETE FROM issues WHERE id = ?').run(id);
}
// ─── Test Plan helpers ─────────────────────────────────────────────────────────
function getAllTestPlans(projectId) {
    const rows = projectId
        ? getDb().prepare('SELECT data FROM test_plans WHERE project_id = ? ORDER BY updated_at DESC').all(projectId)
        : getDb().prepare('SELECT data FROM test_plans ORDER BY updated_at DESC').all();
    return rows.map(r => JSON.parse(r.data));
}
function getTestPlanById(id) {
    const row = getDb().prepare('SELECT data FROM test_plans WHERE id = ?').get(id);
    return row ? JSON.parse(row.data) : undefined;
}
function upsertTestPlan(plan) {
    getDb().prepare(`
    INSERT INTO test_plans (id, name, project_id, data, created_at, updated_at)
    VALUES (@id, @name, @project_id, @data, @created_at, @updated_at)
    ON CONFLICT(id) DO UPDATE SET name = @name, project_id = @project_id, data = @data, updated_at = @updated_at
  `).run({ id: plan.id, name: plan.name, project_id: plan.projectId ?? null, data: JSON.stringify(plan), created_at: plan.createdAt, updated_at: plan.updatedAt });
}
function deleteTestPlan(id) {
    getDb().prepare('DELETE FROM test_plans WHERE id = ?').run(id);
}
// ─── Test Strategy helpers ────────────────────────────────────────────────────
function getAllTestStrategies(projectId) {
    const rows = projectId
        ? getDb().prepare('SELECT data FROM test_strategies WHERE project_id = ? ORDER BY updated_at DESC').all(projectId)
        : getDb().prepare('SELECT data FROM test_strategies ORDER BY updated_at DESC').all();
    return rows.map(r => JSON.parse(r.data));
}
function getTestStrategyById(id) {
    const row = getDb().prepare('SELECT data FROM test_strategies WHERE id = ?').get(id);
    return row ? JSON.parse(row.data) : undefined;
}
function upsertTestStrategy(strategy) {
    getDb().prepare(`
    INSERT INTO test_strategies (id, name, project_id, data, created_at, updated_at)
    VALUES (@id, @name, @project_id, @data, @created_at, @updated_at)
    ON CONFLICT(id) DO UPDATE SET name = @name, project_id = @project_id, data = @data, updated_at = @updated_at
  `).run({ id: strategy.id, name: strategy.name, project_id: strategy.projectId ?? null, data: JSON.stringify(strategy), created_at: strategy.createdAt, updated_at: strategy.updatedAt });
}
function deleteTestStrategy(id) {
    getDb().prepare('DELETE FROM test_strategies WHERE id = ?').run(id);
}
// ─── API Collection helpers ───────────────────────────────────────────────────
function getAllApiCollections(projectId) {
    const rows = projectId
        ? getDb().prepare('SELECT data FROM api_collections WHERE project_id = ? ORDER BY updated_at DESC').all(projectId)
        : getDb().prepare('SELECT data FROM api_collections ORDER BY updated_at DESC').all();
    return rows.map(r => JSON.parse(r.data));
}
function getApiCollectionById(id) {
    const row = getDb().prepare('SELECT data FROM api_collections WHERE id = ?').get(id);
    return row ? JSON.parse(row.data) : undefined;
}
function upsertApiCollection(col) {
    getDb().prepare(`
    INSERT INTO api_collections (id, name, project_id, data, created_at, updated_at)
    VALUES (@id, @name, @project_id, @data, @created_at, @updated_at)
    ON CONFLICT(id) DO UPDATE SET name = @name, project_id = @project_id, data = @data, updated_at = @updated_at
  `).run({ id: col.id, name: col.name, project_id: col.projectId ?? null, data: JSON.stringify(col), created_at: col.createdAt, updated_at: col.updatedAt });
}
function deleteApiCollection(id) {
    getDb().prepare('DELETE FROM api_collections WHERE id = ?').run(id);
    getDb().prepare('DELETE FROM api_requests WHERE collection_id = ?').run(id);
}
// ─── API Request helpers ──────────────────────────────────────────────────────
function getRequestsByCollection(collectionId) {
    return getDb()
        .prepare('SELECT data FROM api_requests WHERE collection_id = ? ORDER BY created_at ASC')
        .all(collectionId)
        .map((r) => JSON.parse(r.data));
}
function getApiRequestById(id) {
    const row = getDb().prepare('SELECT data FROM api_requests WHERE id = ?').get(id);
    return row ? JSON.parse(row.data) : undefined;
}
function upsertApiRequest(req) {
    getDb().prepare(`
    INSERT INTO api_requests (id, collection_id, name, method, data, created_at, updated_at)
    VALUES (@id, @collection_id, @name, @method, @data, @created_at, @updated_at)
    ON CONFLICT(id) DO UPDATE SET
      name = @name, method = @method, data = @data, updated_at = @updated_at
  `).run({ id: req.id, collection_id: req.collectionId, name: req.name, method: req.method, data: JSON.stringify(req), created_at: req.createdAt, updated_at: req.updatedAt });
}
function deleteApiRequest(id) {
    getDb().prepare('DELETE FROM api_requests WHERE id = ?').run(id);
}
// ─── Requirement helpers ──────────────────────────────────────────────────────
function getAllRequirements(projectId) {
    const rows = projectId
        ? getDb().prepare('SELECT data FROM requirements WHERE project_id = ? ORDER BY updated_at DESC').all(projectId)
        : getDb().prepare('SELECT data FROM requirements ORDER BY updated_at DESC').all();
    return rows.map(r => JSON.parse(r.data));
}
function getRequirementById(id) {
    const row = getDb().prepare('SELECT data FROM requirements WHERE id = ?').get(id);
    return row ? JSON.parse(row.data) : undefined;
}
function upsertRequirement(req) {
    getDb().prepare(`
    INSERT INTO requirements (id, title, status, priority, project_id, data, created_at, updated_at)
    VALUES (@id, @title, @status, @priority, @project_id, @data, @created_at, @updated_at)
    ON CONFLICT(id) DO UPDATE SET
      title = @title, status = @status, priority = @priority,
      project_id = @project_id, data = @data, updated_at = @updated_at
  `).run({ id: req.id, title: req.title, status: req.status, priority: req.priority, project_id: req.projectId ?? null, data: JSON.stringify(req), created_at: req.createdAt, updated_at: req.updatedAt });
}
function deleteRequirement(id) {
    getDb().prepare('DELETE FROM requirements WHERE id = ?').run(id);
}
// ─── Project helpers ──────────────────────────────────────────────────────────
function getAllProjects() {
    return getDb().prepare('SELECT data FROM projects ORDER BY updated_at DESC').all()
        .map(r => JSON.parse(r.data));
}
function getProjectById(id) {
    const row = getDb().prepare('SELECT data FROM projects WHERE id = ?').get(id);
    return row ? JSON.parse(row.data) : undefined;
}
function upsertProject(project) {
    getDb().prepare(`
    INSERT INTO projects (id, name, description, data, created_at, updated_at)
    VALUES (@id, @name, @description, @data, @created_at, @updated_at)
    ON CONFLICT(id) DO UPDATE SET name = @name, description = @description, data = @data, updated_at = @updated_at
  `).run({
        id: project.id, name: project.name, description: project.description,
        data: JSON.stringify(project),
        created_at: project.createdAt, updated_at: project.updatedAt,
    });
}
function deleteProject(id) {
    getDb().prepare('DELETE FROM projects WHERE id = ?').run(id);
}
// Returns aggregate counts for a project (used by ProjectsDashboard cards)
function getProjectStats(projectId) {
    const count = (table, extra = '') => getDb().prepare(`SELECT COUNT(*) as n FROM ${table} WHERE project_id = ? ${extra}`).get(projectId).n;
    return {
        suites: count('test_suites'),
        requirements: count('requirements'),
        plans: count('test_plans'),
        strategies: count('test_strategies'),
        collections: count('api_collections'),
        openIssues: count('issues', `AND (json_extract(data,'$.status')='open' OR json_extract(data,'$.status')='in-progress')`),
        totalIssues: count('issues'),
    };
}
//# sourceMappingURL=database.js.map