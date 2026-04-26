import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import {
  getAllSuites, getSuiteById, upsertSuite, deleteSuite,
} from '../db/database';
import { generateSuiteCode, generateTestCode } from '../services/codegen.service';
import type { TestSuite, ExecutionOptions } from '../db/models';

const router = Router();

const DEFAULT_OPTS: ExecutionOptions = {
  browsers: ['chromium'],
  headless: true,
  viewport: { width: 1280, height: 720 },
  timeout: 30000,
  retries: 1,
};

// GET /api/suites[?projectId=]
router.get('/', (req: Request, res: Response) => {
  res.json(getAllSuites(req.query.projectId as string | undefined));
});

// GET /api/suites/:id
router.get('/:id', (req: Request, res: Response) => {
  const suite = getSuiteById(req.params.id);
  if (!suite) return res.status(404).json({ error: 'Suite not found' });
  return res.json(suite);
});

// POST /api/suites
router.post('/', (req: Request, res: Response) => {
  const { name, description, projectId } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  const now = new Date().toISOString();
  const suite: TestSuite = {
    id: uuid(),
    name,
    projectId: projectId ?? undefined,
    description: description ?? '',
    tests: [],
    pageObjects: [],
    dataSets: [],
    executionOptions: DEFAULT_OPTS,
    createdAt: now,
    updatedAt: now,
  };
  upsertSuite(suite);
  return res.status(201).json(suite);
});

// PUT /api/suites/:id
router.put('/:id', (req: Request, res: Response) => {
  const existing = getSuiteById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Suite not found' });

  const updated: TestSuite = {
    ...existing,
    ...req.body,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };
  upsertSuite(updated);
  return res.json(updated);
});

// DELETE /api/suites/:id
router.delete('/:id', (req: Request, res: Response) => {
  if (!getSuiteById(req.params.id)) return res.status(404).json({ error: 'Suite not found' });
  deleteSuite(req.params.id);
  return res.status(204).send();
});

// POST /api/suites/:id/tests
router.post('/:id/tests', (req: Request, res: Response) => {
  const suite = getSuiteById(req.params.id);
  if (!suite) return res.status(404).json({ error: 'Suite not found' });

  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  const test = {
    id: uuid(),
    name,
    description: description ?? '',
    steps: [],
  };
  suite.tests.push(test);
  suite.updatedAt = new Date().toISOString();
  upsertSuite(suite);
  return res.status(201).json(test);
});

// PUT /api/suites/:id/tests/:testId
router.put('/:id/tests/:testId', (req: Request, res: Response) => {
  const suite = getSuiteById(req.params.id);
  if (!suite) return res.status(404).json({ error: 'Suite not found' });

  const idx = suite.tests.findIndex(t => t.id === req.params.testId);
  if (idx === -1) return res.status(404).json({ error: 'Test not found' });

  suite.tests[idx] = { ...suite.tests[idx], ...req.body, id: req.params.testId };
  suite.updatedAt = new Date().toISOString();
  upsertSuite(suite);
  return res.json(suite.tests[idx]);
});

// DELETE /api/suites/:id/tests/:testId
router.delete('/:id/tests/:testId', (req: Request, res: Response) => {
  const suite = getSuiteById(req.params.id);
  if (!suite) return res.status(404).json({ error: 'Suite not found' });

  suite.tests = suite.tests.filter(t => t.id !== req.params.testId);
  suite.updatedAt = new Date().toISOString();
  upsertSuite(suite);
  return res.status(204).send();
});

// GET /api/suites/:id/code – generate full suite code
router.get('/:id/code', (req: Request, res: Response) => {
  const suite = getSuiteById(req.params.id);
  if (!suite) return res.status(404).json({ error: 'Suite not found' });
  return res.json({ code: generateSuiteCode(suite) });
});

// GET /api/suites/:id/tests/:testId/code
router.get('/:id/tests/:testId/code', (req: Request, res: Response) => {
  const suite = getSuiteById(req.params.id);
  if (!suite) return res.status(404).json({ error: 'Suite not found' });
  const test = suite.tests.find(t => t.id === req.params.testId);
  if (!test) return res.status(404).json({ error: 'Test not found' });
  return res.json({ code: generateTestCode(test, suite) });
});

// PUT /api/suites/:id/tests/:testId/code – save custom code back to test
router.put('/:id/tests/:testId/code', (req: Request, res: Response) => {
  const suite = getSuiteById(req.params.id);
  if (!suite) return res.status(404).json({ error: 'Suite not found' });
  const idx = suite.tests.findIndex(t => t.id === req.params.testId);
  if (idx === -1) return res.status(404).json({ error: 'Test not found' });

  suite.tests[idx].generatedCode = req.body.code;
  suite.updatedAt = new Date().toISOString();
  upsertSuite(suite);
  return res.json({ ok: true });
});

export default router;
