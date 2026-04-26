import { Router, Request, Response } from 'express';
import { spawn, ChildProcess } from 'child_process';
import { v4 as uuid } from 'uuid';
import path from 'path';
import fs from 'fs';
import { DATA_DIR } from '../db/database';
import { parseCodegenOutput } from '../services/codegen.service';
import type { RecorderSession } from '../db/models';

const router = Router();
const sessions = new Map<string, { session: RecorderSession; proc: ChildProcess | null }>();
const RECORDINGS_DIR = path.join(DATA_DIR, 'recordings');

// Resolve the playwright CLI binary from node_modules – avoids shell: true entirely.
const BACKEND_DIR = path.resolve(__dirname, '../..');
function findPlaywrightBin(): string {
  const candidates = [
    path.join(BACKEND_DIR, 'node_modules', '.bin', 'playwright'),
    path.join(BACKEND_DIR, '..', 'node_modules', '.bin', 'playwright'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  console.warn('[recorder] playwright bin not found in node_modules, falling back to PATH');
  return 'playwright';
}
const PLAYWRIGHT_BIN = findPlaywrightBin();
console.log(`[recorder] Using playwright binary: ${PLAYWRIGHT_BIN}`);

// POST /api/recorder/start
router.post('/start', (req: Request, res: Response) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });

  if (!fs.existsSync(RECORDINGS_DIR)) {
    fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
  }

  const id = uuid();
  const outputPath = path.join(RECORDINGS_DIR, `${id}.js`);

  const session: RecorderSession = {
    id,
    url,
    status: 'recording',
    outputPath,
    startedAt: new Date().toISOString(),
  };

  // Spawn playwright codegen with shell: false — no concatenation, no DEP0190
  const proc = spawn(
    PLAYWRIGHT_BIN,
    ['codegen', '--output', outputPath, url],
    {
      cwd: BACKEND_DIR,
      shell: false,          // ← key fix: no shell, no DEP0190
      detached: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env },
    },
  );

  const stderrLines: string[] = [];

  proc.stdout?.on('data', (data: Buffer) => {
    console.log(`[recorder:${id}] stdout:`, data.toString().trim());
  });

  proc.stderr?.on('data', (data: Buffer) => {
    const text = data.toString().trim();
    stderrLines.push(text);
    console.log(`[recorder:${id}] stderr:`, text);
  });

  // Fires if the binary can't be found or fails to start at all
  proc.on('error', (err) => {
    console.error(`[recorder:${id}] process error:`, err.message);
    const entry = sessions.get(id);
    if (entry) {
      entry.session.status = 'error';
      (entry.session as any).errorMessage = err.message;
    }
  });

  proc.on('exit', (code, signal) => {
    console.log(`[recorder:${id}] process exited code=${code} signal=${signal}`);
    const entry = sessions.get(id);
    if (!entry) return;
    if (entry.session.status === 'recording') {
      // Exited on its own (user closed the browser window)
      entry.session.status = 'stopped';
      entry.session.stoppedAt = new Date().toISOString();
      // Try to parse whatever was written
      if (fs.existsSync(outputPath)) {
        try {
          const code = fs.readFileSync(outputPath, 'utf-8');
          entry.session.recordedSteps = parseCodegenOutput(code);
        } catch { /* ignore */ }
      }
    }
    if (code !== 0 && code !== null && entry.session.status !== 'stopped') {
      entry.session.status = 'error';
      (entry.session as any).errorMessage = stderrLines.slice(-5).join('\n') || `Process exited with code ${code}`;
    }
  });

  sessions.set(id, { session, proc });
  return res.status(201).json(session);
});

// POST /api/recorder/:id/stop
router.post('/:id/stop', (req: Request, res: Response) => {
  const entry = sessions.get(req.params.id);
  if (!entry) return res.status(404).json({ error: 'Session not found' });

  const { session, proc } = entry;

  if (proc && !proc.killed) {
    try {
      proc.kill('SIGTERM');
      setTimeout(() => {
        try { if (!proc.killed) proc.kill('SIGKILL'); } catch { /* ignore */ }
      }, 2000);
    } catch { /* ignore */ }
  }

  session.status = 'stopped';
  session.stoppedAt = new Date().toISOString();

  let recordedSteps = session.recordedSteps ?? [];
  if (fs.existsSync(session.outputPath)) {
    try {
      const code = fs.readFileSync(session.outputPath, 'utf-8');
      recordedSteps = parseCodegenOutput(code);
      session.recordedSteps = recordedSteps;
    } catch { /* parsing failed */ }
  }

  return res.json({ session, steps: recordedSteps });
});

// GET /api/recorder/:id — returns current session state including errors
router.get('/:id', (req: Request, res: Response) => {
  const entry = sessions.get(req.params.id);
  if (!entry) return res.status(404).json({ error: 'Session not found' });
  return res.json(entry.session);
});

// GET /api/recorder/:id/steps
router.get('/:id/steps', (req: Request, res: Response) => {
  const entry = sessions.get(req.params.id);
  if (!entry) return res.status(404).json({ error: 'Session not found' });

  // Always include current session status so the UI can detect errors
  if (!fs.existsSync(entry.session.outputPath)) {
    return res.json({ steps: [], status: entry.session.status, error: (entry.session as any).errorMessage });
  }

  try {
    const code = fs.readFileSync(entry.session.outputPath, 'utf-8');
    return res.json({
      steps: parseCodegenOutput(code),
      rawCode: code,
      status: entry.session.status,
    });
  } catch {
    return res.json({ steps: [], status: entry.session.status });
  }
});

// DELETE /api/recorder/:id
router.delete('/:id', (req: Request, res: Response) => {
  const entry = sessions.get(req.params.id);
  if (!entry) return res.status(404).json({ error: 'Session not found' });

  const { proc, session } = entry;
  if (proc && !proc.killed) {
    try { proc.kill('SIGKILL'); } catch { /* ignore */ }
  }
  try {
    if (fs.existsSync(session.outputPath)) fs.unlinkSync(session.outputPath);
  } catch { /* ignore */ }
  sessions.delete(req.params.id);
  return res.status(204).send();
});

export default router;
