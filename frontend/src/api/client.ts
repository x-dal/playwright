import axios from 'axios';
import type {
  TestSuite, Test, TestRun, Step,
  Issue, TestPlan, TestStrategy,
  ApiCollection, ApiRequest, ApiResponse, Requirement,
} from '../types';

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

// ─── Issues ────────────────────────────────────────────────────────────────────

export const getIssues = () => api.get<Issue[]>('/issues').then(r => r.data);
export const getIssue = (id: string) => api.get<Issue>(`/issues/${id}`).then(r => r.data);
export const createIssue = (data: Partial<Issue>) => api.post<Issue>('/issues', data).then(r => r.data);
export const updateIssue = (id: string, data: Partial<Issue>) => api.put<Issue>(`/issues/${id}`, data).then(r => r.data);
export const deleteIssue = (id: string) => api.delete(`/issues/${id}`);

// ─── Test Plans ────────────────────────────────────────────────────────────────

export const getTestPlans = () => api.get<TestPlan[]>('/plans').then(r => r.data);
export const getTestPlan = (id: string) => api.get<TestPlan>(`/plans/${id}`).then(r => r.data);
export const createTestPlan = (data: Partial<TestPlan>) => api.post<TestPlan>('/plans', data).then(r => r.data);
export const updateTestPlan = (id: string, data: Partial<TestPlan>) => api.put<TestPlan>(`/plans/${id}`, data).then(r => r.data);
export const deleteTestPlan = (id: string) => api.delete(`/plans/${id}`);
export const importTestPlans = (format: 'json' | 'csv', content: string) =>
  api.post<{ imported: number; plans: TestPlan[] }>('/plans/import', { format, content }).then(r => r.data);
export const exportTestPlansUrl = (format: 'json' | 'csv') => `/api/plans/export/${format}`;

// ─── Test Strategies ───────────────────────────────────────────────────────────

export const getTestStrategies = () => api.get<TestStrategy[]>('/strategies').then(r => r.data);
export const getTestStrategy = (id: string) => api.get<TestStrategy>(`/strategies/${id}`).then(r => r.data);
export const createTestStrategy = (data: Partial<TestStrategy>) => api.post<TestStrategy>('/strategies', data).then(r => r.data);
export const updateTestStrategy = (id: string, data: Partial<TestStrategy>) => api.put<TestStrategy>(`/strategies/${id}`, data).then(r => r.data);
export const deleteTestStrategy = (id: string) => api.delete(`/strategies/${id}`);

// ─── API Collections ───────────────────────────────────────────────────────────

export const getApiCollections = () => api.get<ApiCollection[]>('/collections').then(r => r.data);
export const getApiCollection = (id: string) => api.get<ApiCollection>(`/collections/${id}`).then(r => r.data);
export const createApiCollection = (data: Partial<ApiCollection>) => api.post<ApiCollection>('/collections', data).then(r => r.data);
export const updateApiCollection = (id: string, data: Partial<ApiCollection>) => api.put<ApiCollection>(`/collections/${id}`, data).then(r => r.data);
export const deleteApiCollection = (id: string) => api.delete(`/collections/${id}`);

export const getApiRequests = (collectionId: string) =>
  api.get<ApiRequest[]>(`/collections/${collectionId}/requests`).then(r => r.data);
export const createApiRequest = (collectionId: string, data: Partial<ApiRequest>) =>
  api.post<ApiRequest>(`/collections/${collectionId}/requests`, data).then(r => r.data);
export const updateApiRequest = (collectionId: string, requestId: string, data: Partial<ApiRequest>) =>
  api.put<ApiRequest>(`/collections/${collectionId}/requests/${requestId}`, data).then(r => r.data);
export const deleteApiRequest = (collectionId: string, requestId: string) =>
  api.delete(`/collections/${collectionId}/requests/${requestId}`);
export const executeApiRequest = (collectionId: string, requestId: string) =>
  api.post<ApiResponse>(`/collections/${collectionId}/requests/${requestId}/execute`).then(r => r.data);

export const importPostmanCollection = (content: string) =>
  api.post<{ collection: ApiCollection; requestCount: number }>('/collections/import/postman', { content }).then(r => r.data);
export const getPostmanExportUrl = (collectionId: string) => `/api/collections/${collectionId}/export/postman`;

// ─── Requirements ──────────────────────────────────────────────────────────────

export const getRequirements = () => api.get<Requirement[]>('/requirements').then(r => r.data);
export const getRequirement = (id: string) => api.get<Requirement>(`/requirements/${id}`).then(r => r.data);
export const createRequirement = (data: Partial<Requirement>) => api.post<Requirement>('/requirements', data).then(r => r.data);
export const updateRequirement = (id: string, data: Partial<Requirement>) => api.put<Requirement>(`/requirements/${id}`, data).then(r => r.data);
export const deleteRequirement = (id: string) => api.delete(`/requirements/${id}`);
export const importRequirements = (format: 'json' | 'csv', content: string) =>
  api.post<{ imported: number; requirements: Requirement[] }>('/requirements/import', { format, content }).then(r => r.data);
export const exportRequirementsUrl = (format: 'json' | 'csv') => `/api/requirements/export/${format}`;
