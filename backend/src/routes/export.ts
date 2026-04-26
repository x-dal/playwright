import { Router, Request, Response } from 'express';
import { getSuiteById } from '../db/database';
import { createExportArchive } from '../services/export.service';
import path from 'path';
import fs from 'fs';
import { ARTIFACTS_DIR } from '../db/database';

const router = Router();

// GET /api/export/:suiteId – download as zip
router.get('/:suiteId', (req: Request, res: Response) => {
  const suite = getSuiteById(req.params.suiteId);
  if (!suite) return res.status(404).json({ error: 'Suite not found' });

  const safeName = suite.name.replace(/[^a-zA-Z0-9_-]/g, '-');
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}-playwright-tests.zip"`);

  const archive = createExportArchive(suite);
  archive.pipe(res);

  archive.on('error', (err: Error) => {
    console.error('Archive error:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Archive failed' });
  });

  return;
});

// GET /api/export/:suiteId/report/:runId – serve HTML report
router.get('/:suiteId/report/:runId', (req: Request, res: Response) => {
  const reportPath = path.join(ARTIFACTS_DIR, 'reports', req.params.runId, 'index.html');
  if (!fs.existsSync(reportPath)) {
    return res.status(404).json({ error: 'Report not found' });
  }
  return res.sendFile(reportPath);
});

// GET /api/export/screenshot/:filename
router.get('/screenshot/:filename', (req: Request, res: Response) => {
  const imgPath = path.join(ARTIFACTS_DIR, 'screenshots', req.params.filename);
  if (!fs.existsSync(imgPath)) return res.status(404).send();
  return res.sendFile(imgPath);
});

export default router;
