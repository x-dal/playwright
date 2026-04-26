import axios from 'axios';
import type { TestSuite, Test, TestRun, Step } from '../types';

const api = axios.create({ baseURL: '/api', timeout: 30000 });

// ─── Suites ────────────────────────────────────────────────────────────────────

export const getSuites = () => api.get<TestSuite[]>('/suites').then(r => r.data);
export const getSuite = (id: string) => api.get<TestSuite>(`/suites/${id}`).then(r => r.data);
export const createSuite = (data: { name: string; description?: string }) =>
  api.post<TestSuite>('/suites', data).then(r => r.data);
export const updateSuite = (id: string, data: Partial<TestSuite>) =>
  api.put<TestSuite>(`/suites/${id}`, data).then(r => r.data);
export const deleteSuite = (id: string) => api.delete(`/suites/${id}`);

// ─── Tests ─────────────────────────────────────────────────────────────────────

export const createTest = (suiteId: string, data: { name: string; description?: string }) =>
  api.post<Test>(`/suites/${suiteId}/tests`, data).then(r => r.data);
export const updateTest = (suiteId: string, testId: string, data: Partial<Test>) =>
  api.put<Test>(`/suites/${suiteId}/tests/${testId}`, data).then(r => r.data);
export const deleteTest = (suiteId: string, testId: string) =>
  api.delete(`/suites/${suiteId}/tests/${testId}`);

// ─── Code ──────────────────────────────────────────────────────────────────────

export const getSuiteCode = (suiteId: string) =>
  api.get<{ code: string }>(`/suites/${suiteId}/code`).then(r => r.data.code);
export const getTestCode = (suiteId: string, testId: string) =>
  api.get<{ code: string }>(`/suites/${suiteId}/tests/${testId}/code`).then(r => r.data.code);
export const saveTestCode = (suiteId: string, testId: string, code: string) =>
  api.put(`/suites/${suiteId}/tests/${testId}/code`, { code });

// ─── Runs ──────────────────────────────────────────────────────────────────────

export const getRuns = (suiteId?: string) =>
  api.get<TestRun[]>('/runs', { params: suiteId ? { suiteId } : {} }).then(r => r.data);
export const getRun = (runId: string) => api.get<TestRun>(`/runs/${runId}`).then(r => r.data);
export const triggerRun = (suiteId: string, options?: { testId?: string; preview?: boolean }) =>
  api.post<TestRun>('/runs', { suiteId, ...options }).then(r => r.data);
export const cancelRun = (runId: string) => api.delete(`/runs/${runId}`);

export function streamRun(runId: string, onUpdate: (run: TestRun) => void, onDone?: () => void): EventSource {
  const es = new EventSource(`/api/runs/${runId}/stream`);
  es.onmessage = e => {
    try {
      const run: TestRun = JSON.parse(e.data);
      onUpdate(run);
      if (run.status === 'passed' || run.status === 'failed' || run.status === 'cancelled') {
        es.close();
        onDone?.();
      }
    } catch { /* ignore parse errors */ }
  };
  es.onerror = () => { es.close(); onDone?.(); };
  return es;
}

// ─── Recorder ─────────────────────────────────────────────────────────────────

export const startRecording = (url: string) =>
  api.post<{ id: string; url: string; status: string; outputPath: string; startedAt: string }>('/recorder/start', { url }).then(r => r.data);
export const stopRecording = (id: string) =>
  api.post<{ session: any; steps: Step[] }>(`/recorder/${id}/stop`).then(r => r.data);
export const getRecordingSession = (id: string) =>
  api.get<{ id: string; status: string; errorMessage?: string }>(`/recorder/${id}`).then(r => r.data);
export const getRecordingSteps = (id: string) =>
  api.get<{ steps: Step[]; rawCode?: string; status: string; error?: string }>(`/recorder/${id}/steps`).then(r => r.data);
export const deleteRecording = (id: string) => api.delete(`/recorder/${id}`);

// ─── Export ────────────────────────────────────────────────────────────────────

export const getExportUrl = (suiteId: string) => `/api/export/${suiteId}`;
export const getReportUrl = (suiteId: string, runId: string) => `/api/export/${suiteId}/report/${runId}`;
