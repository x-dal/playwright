import express from 'express';
import cors from 'cors';
import path from 'path';
import { ensureDirectories } from './db/database';
import suitesRouter from './routes/suites';
import runsRouter from './routes/runs';
import recorderRouter from './routes/recorder';
import exportRouter from './routes/export';
import issuesRouter from './routes/issues';
import plansRouter from './routes/plans';
import strategiesRouter from './routes/strategies';
import apiCollectionsRouter from './routes/api-collections';
import requirementsRouter from './routes/requirements';
import projectsRouter from './routes/projects';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

// ─── Middleware ────────────────────────────────────────────────────────────────

app.use(cors({ origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Static artifacts ──────────────────────────────────────────────────────────

app.use('/artifacts', express.static(path.join(__dirname, '../data/artifacts')));

// ─── Routes ────────────────────────────────────────────────────────────────────

app.use('/api/suites', suitesRouter);
app.use('/api/runs', runsRouter);
app.use('/api/recorder', recorderRouter);
app.use('/api/export', exportRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/issues', issuesRouter);
app.use('/api/plans', plansRouter);
app.use('/api/strategies', strategiesRouter);
app.use('/api/collections', apiCollectionsRouter);
app.use('/api/requirements', requirementsRouter);

// ─── Health check ──────────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Error handler ─────────────────────────────────────────────────────────────

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Error]', err.message);
  res.status(500).json({ error: err.message });
});

// ─── Start ─────────────────────────────────────────────────────────────────────

ensureDirectories();
app.listen(PORT, () => {
  console.log(`\n🚀 API server running at http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health\n`);
});

export default app;
