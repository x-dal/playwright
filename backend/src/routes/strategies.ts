import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getAllTestStrategies, getTestStrategyById, upsertTestStrategy, deleteTestStrategy } from '../db/database';
import type { TestStrategy } from '../db/models';

const router = Router();

router.get('/', (_req, res) => {
  res.json(getAllTestStrategies());
});

router.get('/:id', (req, res) => {
  const strategy = getTestStrategyById(req.params.id);
  if (!strategy) return res.status(404).json({ error: 'Test strategy not found' });
  res.json(strategy);
});

router.post('/', (req, res) => {
  const { name, approach, testLevels, tools, riskAnalysis, notes } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });

  const now = new Date().toISOString();
  const strategy: TestStrategy = {
    id: uuidv4(),
    name: name.trim(),
    approach: approach ?? '',
    testLevels: testLevels ?? [],
    tools: tools ?? '',
    riskAnalysis: riskAnalysis ?? '',
    notes: notes ?? '',
    createdAt: now,
    updatedAt: now,
  };
  upsertTestStrategy(strategy);
  res.status(201).json(strategy);
});

router.put('/:id', (req, res) => {
  const existing = getTestStrategyById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Test strategy not found' });

  const updated: TestStrategy = {
    ...existing,
    ...req.body,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };
  upsertTestStrategy(updated);
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  if (!getTestStrategyById(req.params.id)) return res.status(404).json({ error: 'Test strategy not found' });
  deleteTestStrategy(req.params.id);
  res.status(204).send();
});

export default router;
