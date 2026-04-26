"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uuid_1 = require("uuid");
const database_1 = require("../db/database");
const codegen_service_1 = require("../services/codegen.service");
const router = (0, express_1.Router)();
const DEFAULT_OPTS = {
    browsers: ['chromium'],
    headless: true,
    viewport: { width: 1280, height: 720 },
    timeout: 30000,
    retries: 1,
};
// GET /api/suites
router.get('/', (_req, res) => {
    res.json((0, database_1.getAllSuites)());
});
// GET /api/suites/:id
router.get('/:id', (req, res) => {
    const suite = (0, database_1.getSuiteById)(req.params.id);
    if (!suite)
        return res.status(404).json({ error: 'Suite not found' });
    return res.json(suite);
});
// POST /api/suites
router.post('/', (req, res) => {
    const { name, description } = req.body;
    if (!name)
        return res.status(400).json({ error: 'name is required' });
    const now = new Date().toISOString();
    const suite = {
        id: (0, uuid_1.v4)(),
        name,
        description: description ?? '',
        tests: [],
        pageObjects: [],
        dataSets: [],
        executionOptions: DEFAULT_OPTS,
        createdAt: now,
        updatedAt: now,
    };
    (0, database_1.upsertSuite)(suite);
    return res.status(201).json(suite);
});
// PUT /api/suites/:id
router.put('/:id', (req, res) => {
    const existing = (0, database_1.getSuiteById)(req.params.id);
    if (!existing)
        return res.status(404).json({ error: 'Suite not found' });
    const updated = {
        ...existing,
        ...req.body,
        id: existing.id,
        createdAt: existing.createdAt,
        updatedAt: new Date().toISOString(),
    };
    (0, database_1.upsertSuite)(updated);
    return res.json(updated);
});
// DELETE /api/suites/:id
router.delete('/:id', (req, res) => {
    if (!(0, database_1.getSuiteById)(req.params.id))
        return res.status(404).json({ error: 'Suite not found' });
    (0, database_1.deleteSuite)(req.params.id);
    return res.status(204).send();
});
// POST /api/suites/:id/tests
router.post('/:id/tests', (req, res) => {
    const suite = (0, database_1.getSuiteById)(req.params.id);
    if (!suite)
        return res.status(404).json({ error: 'Suite not found' });
    const { name, description } = req.body;
    if (!name)
        return res.status(400).json({ error: 'name is required' });
    const test = {
        id: (0, uuid_1.v4)(),
        name,
        description: description ?? '',
        steps: [],
    };
    suite.tests.push(test);
    suite.updatedAt = new Date().toISOString();
    (0, database_1.upsertSuite)(suite);
    return res.status(201).json(test);
});
// PUT /api/suites/:id/tests/:testId
router.put('/:id/tests/:testId', (req, res) => {
    const suite = (0, database_1.getSuiteById)(req.params.id);
    if (!suite)
        return res.status(404).json({ error: 'Suite not found' });
    const idx = suite.tests.findIndex(t => t.id === req.params.testId);
    if (idx === -1)
        return res.status(404).json({ error: 'Test not found' });
    suite.tests[idx] = { ...suite.tests[idx], ...req.body, id: req.params.testId };
    suite.updatedAt = new Date().toISOString();
    (0, database_1.upsertSuite)(suite);
    return res.json(suite.tests[idx]);
});
// DELETE /api/suites/:id/tests/:testId
router.delete('/:id/tests/:testId', (req, res) => {
    const suite = (0, database_1.getSuiteById)(req.params.id);
    if (!suite)
        return res.status(404).json({ error: 'Suite not found' });
    suite.tests = suite.tests.filter(t => t.id !== req.params.testId);
    suite.updatedAt = new Date().toISOString();
    (0, database_1.upsertSuite)(suite);
    return res.status(204).send();
});
// GET /api/suites/:id/code – generate full suite code
router.get('/:id/code', (req, res) => {
    const suite = (0, database_1.getSuiteById)(req.params.id);
    if (!suite)
        return res.status(404).json({ error: 'Suite not found' });
    return res.json({ code: (0, codegen_service_1.generateSuiteCode)(suite) });
});
// GET /api/suites/:id/tests/:testId/code
router.get('/:id/tests/:testId/code', (req, res) => {
    const suite = (0, database_1.getSuiteById)(req.params.id);
    if (!suite)
        return res.status(404).json({ error: 'Suite not found' });
    const test = suite.tests.find(t => t.id === req.params.testId);
    if (!test)
        return res.status(404).json({ error: 'Test not found' });
    return res.json({ code: (0, codegen_service_1.generateTestCode)(test, suite) });
});
// PUT /api/suites/:id/tests/:testId/code – save custom code back to test
router.put('/:id/tests/:testId/code', (req, res) => {
    const suite = (0, database_1.getSuiteById)(req.params.id);
    if (!suite)
        return res.status(404).json({ error: 'Suite not found' });
    const idx = suite.tests.findIndex(t => t.id === req.params.testId);
    if (idx === -1)
        return res.status(404).json({ error: 'Test not found' });
    suite.tests[idx].generatedCode = req.body.code;
    suite.updatedAt = new Date().toISOString();
    (0, database_1.upsertSuite)(suite);
    return res.json({ ok: true });
});
exports.default = router;
//# sourceMappingURL=suites.js.map