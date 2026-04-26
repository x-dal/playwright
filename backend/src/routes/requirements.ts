import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getAllRequirements, getRequirementById, upsertRequirement, deleteRequirement } from '../db/database';
import type { Requirement } from '../db/models';

const router = Router();

router.get('/', (req, res) => {
  res.json(getAllRequirements(req.query.projectId as string | undefined));
});

router.get('/:id', (req, res) => {
  const req_ = getRequirementById(req.params.id);
  if (!req_) return res.status(404).json({ error: 'Requirement not found' });
  res.json(req_);
});

router.post('/', (req, res) => {
  const { title, description, priority, status, tags, linkedTestIds, linkedApiCollectionIds, projectId } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'title is required' });

  const now = new Date().toISOString();
  const requirement: Requirement = {
    id: uuidv4(),
    title: title.trim(),
    projectId: projectId ?? undefined,
    description: description ?? '',
    priority: priority ?? 'medium',
    status: status ?? 'draft',
    tags: tags ?? [],
    linkedTestIds: linkedTestIds ?? [],
    linkedApiCollectionIds: linkedApiCollectionIds ?? [],
    createdAt: now,
    updatedAt: now,
  };
  upsertRequirement(requirement);
  res.status(201).json(requirement);
});

router.put('/:id', (req, res) => {
  const existing = getRequirementById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Requirement not found' });

  const updated: Requirement = {
    ...existing,
    ...req.body,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };
  upsertRequirement(updated);
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  if (!getRequirementById(req.params.id)) return res.status(404).json({ error: 'Requirement not found' });
  deleteRequirement(req.params.id);
  res.status(204).send();
});

// ─── Import requirements from JSON or CSV ─────────────────────────────────────

router.post('/import', (req, res) => {
  const { format, content } = req.body;
  if (!content) return res.status(400).json({ error: 'content is required' });

  try {
    let records: Partial<Requirement>[] = [];

    if (format === 'json') {
      const parsed = JSON.parse(Buffer.from(content, 'base64').toString('utf8'));
      records = Array.isArray(parsed) ? parsed : [parsed];
    } else {
      const text = Buffer.from(content, 'base64').toString('utf8');
      const [headerLine, ...rows] = text.split(/\r?\n/).filter(Boolean);
      const headers = headerLine.split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      records = rows.map(row => {
        const vals = row.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => { obj[h] = vals[i] ?? ''; });
        return obj as Partial<Requirement>;
      });
    }

    const now = new Date().toISOString();
    const created = records.map(r => {
      const req_: Requirement = {
        id: uuidv4(),
        title: r.title ?? 'Imported Requirement',
        description: r.description ?? '',
        priority: (r.priority as any) ?? 'medium',
        status: (r.status as any) ?? 'draft',
        tags: Array.isArray(r.tags) ? r.tags : (typeof (r.tags as any) === 'string' ? (r.tags as any as string).split(';').filter(Boolean) : []),
        linkedTestIds: [],
        linkedApiCollectionIds: [],
        createdAt: now,
        updatedAt: now,
      };
      upsertRequirement(req_);
      return req_;
    });
    res.status(201).json({ imported: created.length, requirements: created });
  } catch (err: any) {
    res.status(400).json({ error: `Import failed: ${err.message}` });
  }
});

// ─── Export requirements ──────────────────────────────────────────────────────

router.get('/export/json', (_req, res) => {
  const reqs = getAllRequirements();
  res.setHeader('Content-Disposition', 'attachment; filename="requirements.json"');
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(reqs, null, 2));
});

router.get('/export/csv', (_req, res) => {
  const reqs = getAllRequirements();
  const headers = ['id', 'title', 'description', 'priority', 'status', 'tags', 'createdAt'];
  const rows = reqs.map(r =>
    headers.map(h => {
      const v = h === 'tags' ? (r.tags ?? []).join(';') : String((r as any)[h] ?? '');
      return `"${v.replace(/"/g, '""')}"`;
    }).join(',')
  );
  res.setHeader('Content-Disposition', 'attachment; filename="requirements.csv"');
  res.setHeader('Content-Type', 'text/csv');
  res.send([headers.join(','), ...rows].join('\n'));
});

export default router;
