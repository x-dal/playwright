import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getSuiteById, getAllRuns, getRunById, upsertRun } from '../db/database';
import { runSuite } from '../services/playwright.service';
import type { TestRun } from '../db/models';

const router = Router();

// In-memory map of active runs for SSE streaming
const activeStreams = new Map<string, Response[]>();

// AbortControllers for in-flight runs so DELETE can stop execution mid-suite
const activeControllers = new Map<string, AbortController>();

// GET /api/runs?suiteId=...
router.get('/', (req: Request, res: Response) => {
  const { suiteId } = req.query;
  res.json(getAllRuns(suiteId as string | undefined));
});

// GET /api/runs/:id
router.get('/:id', (req: Request, res: Response) => {
  const run = getRunById(req.params.id);
  if (!run) return res.status(404).json({ error: 'Run not found' });
  return res.json(run);
});

// GET /api/runs/:id/stream – SSE for live progress
router.get('/:id/stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const { id } = req.params;
  const streams = activeStreams.get(id) ?? [];
  streams.push(res);
  activeStreams.set(id, streams);

  // Send current state immediately if already exists
  const run = getRunById(id);
  if (run) {
    res.write(`data: ${JSON.stringify(run)}\n\n`);
    if (run.status === 'passed' || run.status === 'failed' || run.status === 'cancelled') {
      res.end();
      return;
    }
  }

  req.on('close', () => {
    const remaining = (activeStreams.get(id) ?? []).filter(r => r !== res);
    if (remaining.length > 0) activeStreams.set(id, remaining);
    else activeStreams.delete(id);
  });
});

// POST /api/runs – trigger a run
// Body: { suiteId, testId?: string, preview?: boolean }
//   testId  — run only that one test (omit to run all)
//   preview — override headless to false so a real browser window opens
router.post('/', async (req: Request, res: Response) => {
  const { suiteId, testId, preview } = req.body;
  if (!suiteId) return res.status(400).json({ error: 'suiteId is required' });

  const suite = getSuiteById(suiteId);
  if (!suite) return res.status(404).json({ error: 'Suite not found' });

  if (testId && !suite.tests.find(t => t.id === testId)) {
    return res.status(404).json({ error: 'Test not found in suite' });
  }

  // Return the run ID immediately; execution is async
  const placeholder: TestRun = {
    id: uuid(),
    suiteId: suite.id,
    suiteName: suite.name,
    status: 'pending',
    startedAt: new Date().toISOString(),
    results: [],
  };
  upsertRun(placeholder);
  res.status(202).json(placeholder);

  // Execute asynchronously and broadcast progress via SSE
  const controller = new AbortController();
  activeControllers.set(placeholder.id, controller);

  runSuite(suite, (updatedRun: TestRun) => {
    updatedRun.id = placeholder.id;
    upsertRun(updatedRun);
    broadcast(updatedRun.id, updatedRun);
  }, controller.signal, { testId: testId ?? undefined, preview: !!preview })
    .then(finalRun => {
      finalRun.id = placeholder.id;
      upsertRun(finalRun);
      broadcast(finalRun.id, finalRun);
      closeStreams(finalRun.id);
    })
    .catch(err => {
      // If aborted, the run is already marked cancelled — don't overwrite with 'failed'
      const current = getRunById(placeholder.id);
      if (current?.status === 'cancelled') { closeStreams(placeholder.id); return; }
      const failedRun: TestRun = {
        ...placeholder,
        status: 'failed',
        completedAt: new Date().toISOString(),
        results: [{ testId: 'error', testName: 'Execution Error', browser: 'chromium', status: 'failed', duration: 0, steps: [], logs: [String(err?.message ?? err)], error: String(err?.message ?? err) }],
      };
      upsertRun(failedRun);
      broadcast(failedRun.id, failedRun);
      closeStreams(failedRun.id);
    })
    .finally(() => { activeControllers.delete(placeholder.id); });

  return;
});

// DELETE /api/runs/:id (cancel or remove)
router.delete('/:id', (req: Request, res: Response) => {
  const run = getRunById(req.params.id);
  if (!run) return res.status(404).json({ error: 'Run not found' });
  // If still running, abort execution and mark as cancelled
  if (run.status === 'running' || run.status === 'pending') {
    activeControllers.get(run.id)?.abort();
    activeControllers.delete(run.id);
    run.status = 'cancelled';
    run.completedAt = new Date().toISOString();
    upsertRun(run);
    broadcast(run.id, run);
    closeStreams(run.id);
  }
  return res.status(204).send();
});

// ─── SSE helpers ───────────────────────────────────────────────────────────────

function broadcast(runId: string, run: TestRun): void {
  const streams = activeStreams.get(runId) ?? [];
  const payload = `data: ${JSON.stringify(run)}\n\n`;
  for (const stream of streams) {
    try { stream.write(payload); } catch { /* client disconnected */ }
  }
}

function closeStreams(runId: string): void {
  for (const stream of activeStreams.get(runId) ?? []) {
    try { stream.end(); } catch { /* ignore */ }
  }
  activeStreams.delete(runId);
}

export default router;
