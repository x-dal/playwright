import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getAllTestPlans, getTestPlanById, upsertTestPlan, deleteTestPlan } from '../db/database';
import type { TestPlan } from '../db/models';

const router = Router();

router.get('/', (req, res) => {
  res.json(getAllTestPlans(req.query.projectId as string | undefined));
});

router.get('/:id', (req, res) => {
  const plan = getTestPlanById(req.params.id);
  if (!plan) return res.status(404).json({ error: 'Test plan not found' });
  res.json(plan);
});

router.post('/', (req, res) => {
  const { name, objective, scope, entryCriteria, exitCriteria, resources, schedule, associatedSuiteIds, projectId } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });

  const now = new Date().toISOString();
  const plan: TestPlan = {
    id: uuidv4(),
    name: name.trim(),
    projectId: projectId ?? undefined,
    objective: objective ?? '',
    scope: scope ?? '',
    entryCriteria: entryCriteria ?? '',
    exitCriteria: exitCriteria ?? '',
    resources: resources ?? '',
    schedule: schedule ?? '',
    associatedSuiteIds: associatedSuiteIds ?? [],
    createdAt: now,
    updatedAt: now,
  };
  upsertTestPlan(plan);
  res.status(201).json(plan);
});

router.put('/:id', (req, res) => {
  const existing = getTestPlanById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Test plan not found' });

  const updated: TestPlan = {
    ...existing,
    ...req.body,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };
  upsertTestPlan(updated);
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  if (!getTestPlanById(req.params.id)) return res.status(404).json({ error: 'Test plan not found' });
  deleteTestPlan(req.params.id);
  res.status(204).send();
});

// Import test plans from JSON or CSV (base64-encoded content in body)
router.post('/import', (req, res) => {
  const { format, content } = req.body;
  if (!content) return res.status(400).json({ error: 'content is required' });

  try {
    let records: Partial<TestPlan>[] = [];

    if (format === 'json') {
      const parsed = JSON.parse(Buffer.from(content, 'base64').toString('utf8'));
      records = Array.isArray(parsed) ? parsed : [parsed];
    } else {
      // CSV: first row = headers
      const text = Buffer.from(content, 'base64').toString('utf8');
      const [headerLine, ...rows] = text.split(/\r?\n/).filter(Boolean);
      const headers = headerLine.split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      records = rows.map(row => {
        const vals = row.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => { obj[h] = vals[i] ?? ''; });
        return obj as Partial<TestPlan>;
      });
    }

    const now = new Date().toISOString();
    const created = records.map(r => {
      const plan: TestPlan = {
        id: uuidv4(),
        name: r.name ?? 'Imported Plan',
        objective: r.objective ?? '',
        scope: r.scope ?? '',
        entryCriteria: r.entryCriteria ?? '',
        exitCriteria: r.exitCriteria ?? '',
        resources: r.resources ?? '',
        schedule: r.schedule ?? '',
        associatedSuiteIds: Array.isArray(r.associatedSuiteIds) ? r.associatedSuiteIds : [],
        createdAt: now,
        updatedAt: now,
      };
      upsertTestPlan(plan);
      return plan;
    });
    res.status(201).json({ imported: created.length, plans: created });
  } catch (err: any) {
    res.status(400).json({ error: `Import failed: ${err.message}` });
  }
});

// Export all test plans as JSON
router.get('/export/json', (_req, res) => {
  const plans = getAllTestPlans();
  res.setHeader('Content-Disposition', 'attachment; filename="test-plans.json"');
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(plans, null, 2));
});

// Export all test plans as CSV
router.get('/export/csv', (_req, res) => {
  const plans = getAllTestPlans();
  const headers = ['id', 'name', 'objective', 'scope', 'entryCriteria', 'exitCriteria', 'resources', 'schedule', 'createdAt'];
  const rows = plans.map(p =>
    headers.map(h => `"${String((p as any)[h] ?? '').replace(/"/g, '""')}"`).join(',')
  );
  res.setHeader('Content-Disposition', 'attachment; filename="test-plans.csv"');
  res.setHeader('Content-Type', 'text/csv');
  res.send([headers.join(','), ...rows].join('\n'));
});

export default router;
