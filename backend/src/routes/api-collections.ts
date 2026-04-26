import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  getAllApiCollections, getApiCollectionById, upsertApiCollection, deleteApiCollection,
  getRequestsByCollection, getApiRequestById, upsertApiRequest, deleteApiRequest,
} from '../db/database';
import { executeRequest } from '../services/api-runner.service';
import type { ApiCollection, ApiRequest } from '../db/models';

const router = Router();

// ─── Collections ──────────────────────────────────────────────────────────────

router.get('/', (req, res) => {
  res.json(getAllApiCollections(req.query.projectId as string | undefined));
});

router.get('/:id', (req, res) => {
  const col = getApiCollectionById(req.params.id);
  if (!col) return res.status(404).json({ error: 'Collection not found' });
  res.json(col);
});

router.post('/', (req, res) => {
  const { name, description, environments, activeEnvironment, projectId } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });

  const now = new Date().toISOString();
  const col: ApiCollection = {
    id: uuidv4(),
    name: name.trim(),
    projectId: projectId ?? undefined,
    description: description ?? '',
    environments: environments ?? [],
    activeEnvironment,
    createdAt: now,
    updatedAt: now,
  };
  upsertApiCollection(col);
  res.status(201).json(col);
});

router.put('/:id', (req, res) => {
  const existing = getApiCollectionById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Collection not found' });

  const updated: ApiCollection = {
    ...existing,
    ...req.body,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };
  upsertApiCollection(updated);
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  if (!getApiCollectionById(req.params.id)) return res.status(404).json({ error: 'Collection not found' });
  deleteApiCollection(req.params.id);
  res.status(204).send();
});

// ─── Requests ─────────────────────────────────────────────────────────────────

router.get('/:collectionId/requests', (req, res) => {
  if (!getApiCollectionById(req.params.collectionId)) return res.status(404).json({ error: 'Collection not found' });
  res.json(getRequestsByCollection(req.params.collectionId));
});

router.post('/:collectionId/requests', (req, res) => {
  if (!getApiCollectionById(req.params.collectionId)) return res.status(404).json({ error: 'Collection not found' });

  const { name, method, url, headers, body, bodyType, tests } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });

  const now = new Date().toISOString();
  const request: ApiRequest = {
    id: uuidv4(),
    collectionId: req.params.collectionId,
    name: name.trim(),
    method: method ?? 'GET',
    url: url ?? '',
    headers: headers ?? [],
    body: body ?? '',
    bodyType: bodyType ?? 'none',
    tests: tests ?? [],
    createdAt: now,
    updatedAt: now,
  };
  upsertApiRequest(request);
  res.status(201).json(request);
});

router.put('/:collectionId/requests/:requestId', (req, res) => {
  const existing = getApiRequestById(req.params.requestId);
  if (!existing || existing.collectionId !== req.params.collectionId) {
    return res.status(404).json({ error: 'Request not found' });
  }
  const updated: ApiRequest = {
    ...existing,
    ...req.body,
    id: existing.id,
    collectionId: existing.collectionId,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };
  upsertApiRequest(updated);
  res.json(updated);
});

router.delete('/:collectionId/requests/:requestId', (req, res) => {
  const existing = getApiRequestById(req.params.requestId);
  if (!existing || existing.collectionId !== req.params.collectionId) {
    return res.status(404).json({ error: 'Request not found' });
  }
  deleteApiRequest(req.params.requestId);
  res.status(204).send();
});

// ─── Execute a request ────────────────────────────────────────────────────────

router.post('/:collectionId/requests/:requestId/execute', async (req, res) => {
  const request = getApiRequestById(req.params.requestId);
  if (!request || request.collectionId !== req.params.collectionId) {
    return res.status(404).json({ error: 'Request not found' });
  }
  const collection = getApiCollectionById(req.params.collectionId)!;
  const activeEnv = collection.environments.find(e => e.name === collection.activeEnvironment);

  try {
    const response = await executeRequest(request, activeEnv);
    res.json(response);
  } catch (err: any) {
    res.status(502).json({ error: err.message });
  }
});

// ─── Postman collection import ────────────────────────────────────────────────

router.post('/import/postman', (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'content is required' });

  try {
    const postman = JSON.parse(Buffer.from(content, 'base64').toString('utf8'));
    const info = postman.info ?? {};
    const now = new Date().toISOString();

    const col: ApiCollection = {
      id: uuidv4(),
      name: info.name ?? 'Imported Collection',
      description: info.description ?? '',
      environments: [],
      createdAt: now,
      updatedAt: now,
    };
    upsertApiCollection(col);

    const items: any[] = postman.item ?? [];
    const requests = flattenPostmanItems(items, col.id, now);
    requests.forEach(r => upsertApiRequest(r));

    res.status(201).json({ collection: col, requestCount: requests.length });
  } catch (err: any) {
    res.status(400).json({ error: `Import failed: ${err.message}` });
  }
});

function flattenPostmanItems(items: any[], collectionId: string, now: string): ApiRequest[] {
  const result: ApiRequest[] = [];
  for (const item of items) {
    if (item.item) {
      // nested folder — recurse
      result.push(...flattenPostmanItems(item.item, collectionId, now));
    } else if (item.request) {
      const r = item.request;
      const headers = (r.header ?? []).map((h: any) => ({
        key: h.key ?? '',
        value: h.value ?? '',
        enabled: !h.disabled,
      }));
      const bodyType = r.body?.mode === 'raw' ? (r.body?.options?.raw?.language === 'json' ? 'json' : 'text')
        : r.body?.mode === 'urlencoded' ? 'form' : 'none';
      const body = r.body?.raw ?? '';
      result.push({
        id: uuidv4(),
        collectionId,
        name: item.name ?? 'Request',
        method: (r.method ?? 'GET').toUpperCase() as any,
        url: typeof r.url === 'string' ? r.url : (r.url?.raw ?? ''),
        headers,
        body,
        bodyType,
        tests: [],
        createdAt: now,
        updatedAt: now,
      });
    }
  }
  return result;
}

// ─── Export collection to Postman format ─────────────────────────────────────

router.get('/:id/export/postman', (req, res) => {
  const col = getApiCollectionById(req.params.id);
  if (!col) return res.status(404).json({ error: 'Collection not found' });
  const requests = getRequestsByCollection(col.id);

  const postman = {
    info: { name: col.name, description: col.description, schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
    item: requests.map(r => ({
      name: r.name,
      request: {
        method: r.method,
        url: { raw: r.url },
        header: r.headers.filter(h => h.enabled).map(h => ({ key: h.key, value: h.value })),
        body: r.bodyType !== 'none' ? { mode: 'raw', raw: r.body ?? '' } : undefined,
      },
    })),
  };

  res.setHeader('Content-Disposition', `attachment; filename="${col.name}-postman.json"`);
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(postman, null, 2));
});

export default router;
