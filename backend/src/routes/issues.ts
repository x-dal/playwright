import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getAllIssues, getIssueById, upsertIssue, deleteIssue } from '../db/database';
import type { Issue } from '../db/models';

const router = Router();

router.get('/', (req, res) => {
  res.json(getAllIssues(req.query.projectId as string | undefined));
});

router.get('/:id', (req, res) => {
  const issue = getIssueById(req.params.id);
  if (!issue) return res.status(404).json({ error: 'Issue not found' });
  res.json(issue);
});

router.post('/', (req, res) => {
  const { title, description, status, priority, severity, projectId, testRunId, testName, errorMessage, screenshotPath, externalUrl } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'title is required' });

  const now = new Date().toISOString();
  const issue: Issue = {
    id: uuidv4(),
    title: title.trim(),
    description: description ?? '',
    status: status ?? 'open',
    priority: priority ?? 'medium',
    severity: severity ?? 'major',
    projectId: projectId ?? undefined,
    createdAt: now,
    updatedAt: now,
    testRunId,
    testName,
    errorMessage,
    screenshotPath,
    externalUrl,
    // TODO: GitHub Issues integration — POST to GitHub API here when externalUrl is absent and github config is present
    // TODO: Jira integration — create Jira issue here when jira config is present
  };
  upsertIssue(issue);
  res.status(201).json(issue);
});

router.put('/:id', (req, res) => {
  const existing = getIssueById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Issue not found' });

  const updated: Issue = {
    ...existing,
    ...req.body,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };
  upsertIssue(updated);
  // TODO: GitHub Issues integration — PATCH github issue when externalUrl is set
  // TODO: Jira integration — update Jira issue when jira config is present
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const existing = getIssueById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Issue not found' });
  deleteIssue(req.params.id);
  res.status(204).send();
});

export default router;
