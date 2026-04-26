import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  getAllProjects, getProjectById, upsertProject, deleteProject, getProjectStats,
  getAllSuites, getSuiteById,
  getAllIssues, getAllTestPlans, getAllTestStrategies, getAllApiCollections, getAllRequirements,
} from '../db/database';
import type { Project } from '../db/models';

const router = Router();

// ─── Project CRUD ─────────────────────────────────────────────────────────────

router.get('/', (_req, res) => {
  const projects = getAllProjects();
  // Attach stats to each project
  const withStats = projects.map(p => ({ ...p, stats: getProjectStats(p.id) }));
  res.json(withStats);
});

router.get('/:id', (req, res) => {
  const project = getProjectById(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  res.json({ ...project, stats: getProjectStats(project.id) });
});

router.post('/', (req, res) => {
  const { name, description } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
  const now = new Date().toISOString();
  const project: Project = {
    id: uuidv4(),
    name: name.trim(),
    description: description ?? '',
    createdAt: now,
    updatedAt: now,
  };
  upsertProject(project);
  res.status(201).json(project);
});

router.put('/:id', (req, res) => {
  const existing = getProjectById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Project not found' });
  const updated: Project = {
    ...existing,
    ...req.body,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };
  upsertProject(updated);
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  if (!getProjectById(req.params.id)) return res.status(404).json({ error: 'Project not found' });
  deleteProject(req.params.id);
  res.status(204).send();
});

// ─── Nested convenience routes ────────────────────────────────────────────────

router.get('/:id/suites', (req, res) => {
  if (!getProjectById(req.params.id)) return res.status(404).json({ error: 'Project not found' });
  res.json(getAllSuites(req.params.id));
});

router.get('/:id/issues', (req, res) => {
  if (!getProjectById(req.params.id)) return res.status(404).json({ error: 'Project not found' });
  res.json(getAllIssues(req.params.id));
});

router.get('/:id/plans', (req, res) => {
  if (!getProjectById(req.params.id)) return res.status(404).json({ error: 'Project not found' });
  res.json(getAllTestPlans(req.params.id));
});

router.get('/:id/strategies', (req, res) => {
  if (!getProjectById(req.params.id)) return res.status(404).json({ error: 'Project not found' });
  res.json(getAllTestStrategies(req.params.id));
});

router.get('/:id/collections', (req, res) => {
  if (!getProjectById(req.params.id)) return res.status(404).json({ error: 'Project not found' });
  res.json(getAllApiCollections(req.params.id));
});

router.get('/:id/requirements', (req, res) => {
  if (!getProjectById(req.params.id)) return res.status(404).json({ error: 'Project not found' });
  res.json(getAllRequirements(req.params.id));
});

router.get('/:id/stats', (req, res) => {
  if (!getProjectById(req.params.id)) return res.status(404).json({ error: 'Project not found' });
  res.json(getProjectStats(req.params.id));
});

export default router;
