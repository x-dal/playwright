import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  TestSuite, Test, Step, TestRun, PageObject, TestDataSet, ExecutionOptions,
  Issue, TestPlan, TestStrategy, ApiCollection, ApiRequest, Requirement, Project,
} from '../types';
import * as api from '../api/client';

// tiny uuid shim since crypto.randomUUID may not exist in older Safari
function genId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

interface StoreState {
  // Projects
  projects: Project[];
  activeProjectId: string | null;
  fetchProjects: () => Promise<void>;
  createProject: (name: string, description?: string) => Promise<Project>;
  updateProject: (id: string, data: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  setActiveProject: (id: string | null) => void;

  // Suites
  suites: TestSuite[];
  suitesLoading: boolean;

  // Current editing context
  activeSuiteId: string | null;
  activeTestId: string | null;
  activeView: 'dashboard' | 'builder' | 'runs' | 'code' | 'bugs' | 'plans' | 'api-tester' | 'requirements';

  // Runs
  runs: TestRun[];
  activeRunId: string | null;
  runLoading: boolean;

  // UI state
  selectedStepId: string | null;
  paletteFilter: string;

  // Actions – Suites
  fetchSuites: () => Promise<void>;
  fetchSuite: (id: string) => Promise<void>;
  createSuite: (name: string, description?: string, projectId?: string) => Promise<TestSuite>;
  updateSuite: (id: string, partial: Partial<TestSuite>) => Promise<void>;
  deleteSuite: (id: string) => Promise<void>;
  setActiveSuite: (id: string | null) => void;

  // Actions – Tests
  createTest: (suiteId: string, name: string, description?: string) => Promise<Test>;
  updateTest: (suiteId: string, testId: string, partial: Partial<Test>) => Promise<void>;
  deleteTest: (suiteId: string, testId: string) => Promise<void>;
  setActiveTest: (id: string | null) => void;

  // Actions – Steps (optimistic, synced on updateTest)
  addStep: (step: Step) => void;
  updateStep: (stepId: string, partial: Partial<Step>) => void;
  removeStep: (stepId: string) => void;
  reorderSteps: (steps: Step[]) => void;
  toggleStepDisabled: (stepId: string) => void;
  duplicateStep: (stepId: string) => void;

  // Actions – Page Objects
  savePageObjects: (suiteId: string, pageObjects: PageObject[]) => Promise<void>;

  // Actions – Data Sets
  saveDataSets: (suiteId: string, dataSets: TestDataSet[]) => Promise<void>;

  // Actions – Execution Options
  saveExecutionOptions: (suiteId: string, opts: ExecutionOptions) => Promise<void>;

  // Actions – Runs
  fetchRuns: (suiteId?: string) => Promise<void>;
  triggerRun: (suiteId: string, options?: { testId?: string; preview?: boolean }) => Promise<TestRun>;
  cancelRun: (runId: string) => Promise<void>;
  updateRun: (run: TestRun) => void;
  setActiveRun: (id: string | null) => void;

  // UI
  setView: (view: StoreState['activeView']) => void;
  enterProject: (id: string) => void;
  setSelectedStep: (id: string | null) => void;
  setPaletteFilter: (f: string) => void;

  // Issues
  issues: Issue[];
  fetchIssues: (projectId?: string) => Promise<void>;
  createIssue: (data: Partial<Issue>) => Promise<Issue>;
  updateIssue: (id: string, data: Partial<Issue>) => Promise<void>;
  deleteIssue: (id: string) => Promise<void>;

  // Test Plans
  testPlans: TestPlan[];
  fetchTestPlans: (projectId?: string) => Promise<void>;
  createTestPlan: (data: Partial<TestPlan>) => Promise<TestPlan>;
  updateTestPlan: (id: string, data: Partial<TestPlan>) => Promise<void>;
  deleteTestPlan: (id: string) => Promise<void>;

  // Test Strategies
  testStrategies: TestStrategy[];
  fetchTestStrategies: (projectId?: string) => Promise<void>;
  createTestStrategy: (data: Partial<TestStrategy>) => Promise<TestStrategy>;
  updateTestStrategy: (id: string, data: Partial<TestStrategy>) => Promise<void>;
  deleteTestStrategy: (id: string) => Promise<void>;

  // API Collections
  apiCollections: ApiCollection[];
  apiRequests: Record<string, ApiRequest[]>; // collectionId → requests
  fetchApiCollections: (projectId?: string) => Promise<void>;
  createApiCollection: (data: Partial<ApiCollection>) => Promise<ApiCollection>;
  updateApiCollection: (id: string, data: Partial<ApiCollection>) => Promise<void>;
  deleteApiCollection: (id: string) => Promise<void>;
  fetchApiRequests: (collectionId: string) => Promise<void>;
  createApiRequest: (collectionId: string, data: Partial<ApiRequest>) => Promise<ApiRequest>;
  updateApiRequest: (collectionId: string, requestId: string, data: Partial<ApiRequest>) => Promise<void>;
  deleteApiRequest: (collectionId: string, requestId: string) => Promise<void>;

  // Requirements
  requirements: Requirement[];
  fetchRequirements: (projectId?: string) => Promise<void>;
  createRequirement: (data: Partial<Requirement>) => Promise<Requirement>;
  updateRequirement: (id: string, data: Partial<Requirement>) => Promise<void>;
  deleteRequirement: (id: string) => Promise<void>;
}

// Helper: get active test from state
function getActiveTest(state: StoreState): Test | undefined {
  if (!state.activeSuiteId || !state.activeTestId) return undefined;
  const suite = state.suites.find(s => s.id === state.activeSuiteId);
  return suite?.tests.find(t => t.id === state.activeTestId);
}

function getActiveSuite(state: StoreState): TestSuite | undefined {
  return state.suites.find(s => s.id === state.activeSuiteId);
}

export const useStore = create<StoreState>()(
  immer((set, get) => ({
    projects: [],
    activeProjectId: null,
    suites: [],
    suitesLoading: false,
    activeSuiteId: null,
    activeTestId: null,
    activeView: 'dashboard',
    runs: [],
    activeRunId: null,
    runLoading: false,
    selectedStepId: null,
    paletteFilter: '',
    issues: [],
    testPlans: [],
    testStrategies: [],
    apiCollections: [],
    apiRequests: {},
    requirements: [],

    // ─── Projects ─────────────────────────────────────────────────────────────

    fetchProjects: async () => {
      const projects = await api.getProjects();
      set(s => { s.projects = projects; });
    },

    createProject: async (name, description) => {
      const project = await api.createProject({ name, description });
      set(s => { s.projects.unshift(project); });
      return project;
    },

    updateProject: async (id, data) => {
      const updated = await api.updateProject(id, data);
      set(s => { const idx = s.projects.findIndex(x => x.id === id); if (idx >= 0) s.projects[idx] = updated; });
    },

    deleteProject: async (id) => {
      await api.deleteProject(id);
      set(s => {
        s.projects = s.projects.filter(x => x.id !== id);
        if (s.activeProjectId === id) s.activeProjectId = null;
      });
    },

    setActiveProject: (id) => set(s => { s.activeProjectId = id; }),

    // ─── Suites ───────────────────────────────────────────────────────────────

    fetchSuites: async () => {
      set(s => { s.suitesLoading = true; });
      try {
        const projectId = get().activeProjectId ?? undefined;
        const suites = await api.getSuites(projectId);
        set(s => { s.suites = suites; s.suitesLoading = false; });
      } catch {
        set(s => { s.suitesLoading = false; });
      }
    },

    fetchSuite: async (id: string) => {
      const suite = await api.getSuite(id);
      set(s => {
        const idx = s.suites.findIndex(x => x.id === id);
        if (idx >= 0) s.suites[idx] = suite;
        else s.suites.push(suite);
      });
    },

    createSuite: async (name, description, projectId) => {
      const pid = projectId ?? get().activeProjectId ?? undefined;
      const suite = await api.createSuite({ name, description, projectId: pid });
      set(s => { s.suites.unshift(suite); });
      return suite;
    },

    updateSuite: async (id, partial) => {
      const updated = await api.updateSuite(id, partial);
      set(s => {
        const idx = s.suites.findIndex(x => x.id === id);
        if (idx >= 0) s.suites[idx] = updated;
      });
    },

    deleteSuite: async (id) => {
      await api.deleteSuite(id);
      set(s => {
        s.suites = s.suites.filter(x => x.id !== id);
        if (s.activeSuiteId === id) { s.activeSuiteId = null; s.activeTestId = null; }
      });
    },

    setActiveSuite: (id) => set(s => {
      s.activeSuiteId = id;
      s.activeTestId = null;
      s.selectedStepId = null;
    }),

    // ─── Tests ────────────────────────────────────────────────────────────────

    createTest: async (suiteId, name, description) => {
      const test = await api.createTest(suiteId, { name, description });
      set(s => {
        const suite = s.suites.find(x => x.id === suiteId);
        if (suite) suite.tests.push(test);
      });
      return test;
    },

    updateTest: async (suiteId, testId, partial) => {
      const updated = await api.updateTest(suiteId, testId, partial);
      set(s => {
        const suite = s.suites.find(x => x.id === suiteId);
        if (!suite) return;
        const idx = suite.tests.findIndex(t => t.id === testId);
        if (idx >= 0) suite.tests[idx] = updated;
      });
    },

    deleteTest: async (suiteId, testId) => {
      await api.deleteTest(suiteId, testId);
      set(s => {
        const suite = s.suites.find(x => x.id === suiteId);
        if (suite) suite.tests = suite.tests.filter(t => t.id !== testId);
        if (s.activeTestId === testId) s.activeTestId = null;
      });
    },

    setActiveTest: (id) => set(s => {
      s.activeTestId = id;
      s.selectedStepId = null;
    }),

    // ─── Steps (optimistic local, persisted via updateTest) ───────────────────

    addStep: (step) => {
      set(s => {
        const suite = s.suites.find(x => x.id === s.activeSuiteId);
        const test = suite?.tests.find(t => t.id === s.activeTestId);
        if (test) test.steps.push(step);
      });
      // persist
      const { activeSuiteId, activeTestId, suites } = get();
      const suite = suites.find(x => x.id === activeSuiteId);
      const test = suite?.tests.find(t => t.id === activeTestId);
      if (activeSuiteId && activeTestId && test) {
        api.updateTest(activeSuiteId, activeTestId, { steps: test.steps }).catch(() => {});
      }
    },

    updateStep: (stepId, partial) => {
      set(s => {
        const suite = s.suites.find(x => x.id === s.activeSuiteId);
        const test = suite?.tests.find(t => t.id === s.activeTestId);
        if (!test) return;
        const idx = test.steps.findIndex(st => st.id === stepId);
        if (idx >= 0) Object.assign(test.steps[idx], partial);
      });
      const { activeSuiteId, activeTestId, suites } = get();
      const suite = suites.find(x => x.id === activeSuiteId);
      const test = suite?.tests.find(t => t.id === activeTestId);
      if (activeSuiteId && activeTestId && test) {
        api.updateTest(activeSuiteId, activeTestId, { steps: test.steps }).catch(() => {});
      }
    },

    removeStep: (stepId) => {
      set(s => {
        const suite = s.suites.find(x => x.id === s.activeSuiteId);
        const test = suite?.tests.find(t => t.id === s.activeTestId);
        if (test) test.steps = test.steps.filter(st => st.id !== stepId);
        if (s.selectedStepId === stepId) s.selectedStepId = null;
      });
      const { activeSuiteId, activeTestId, suites } = get();
      const suite = suites.find(x => x.id === activeSuiteId);
      const test = suite?.tests.find(t => t.id === activeTestId);
      if (activeSuiteId && activeTestId && test) {
        api.updateTest(activeSuiteId, activeTestId, { steps: test.steps }).catch(() => {});
      }
    },

    reorderSteps: (steps) => {
      set(s => {
        const suite = s.suites.find(x => x.id === s.activeSuiteId);
        const test = suite?.tests.find(t => t.id === s.activeTestId);
        if (test) test.steps = steps;
      });
      const { activeSuiteId, activeTestId } = get();
      const suite = get().suites.find(x => x.id === activeSuiteId);
      const test = suite?.tests.find(t => t.id === activeTestId);
      if (activeSuiteId && activeTestId && test) {
        api.updateTest(activeSuiteId, activeTestId, { steps }).catch(() => {});
      }
    },

    toggleStepDisabled: (stepId) => {
      set(s => {
        const suite = s.suites.find(x => x.id === s.activeSuiteId);
        const test = suite?.tests.find(t => t.id === s.activeTestId);
        const step = test?.steps.find(st => st.id === stepId);
        if (step) step.disabled = !step.disabled;
      });
      const { activeSuiteId, activeTestId, suites } = get();
      const suite = suites.find(x => x.id === activeSuiteId);
      const test = suite?.tests.find(t => t.id === activeTestId);
      if (activeSuiteId && activeTestId && test) {
        api.updateTest(activeSuiteId, activeTestId, { steps: test.steps }).catch(() => {});
      }
    },

    duplicateStep: (stepId) => {
      set(s => {
        const suite = s.suites.find(x => x.id === s.activeSuiteId);
        const test = suite?.tests.find(t => t.id === s.activeTestId);
        if (!test) return;
        const idx = test.steps.findIndex(st => st.id === stepId);
        if (idx >= 0) {
          const copy = { ...test.steps[idx], id: genId(), name: test.steps[idx].name + ' (copy)' };
          test.steps.splice(idx + 1, 0, copy as any);
        }
      });
      const { activeSuiteId, activeTestId, suites } = get();
      const suite = suites.find(x => x.id === activeSuiteId);
      const test = suite?.tests.find(t => t.id === activeTestId);
      if (activeSuiteId && activeTestId && test) {
        api.updateTest(activeSuiteId, activeTestId, { steps: test.steps }).catch(() => {});
      }
    },

    // ─── Page Objects ─────────────────────────────────────────────────────────

    savePageObjects: async (suiteId, pageObjects) => {
      await api.updateSuite(suiteId, { pageObjects });
      set(s => {
        const suite = s.suites.find(x => x.id === suiteId);
        if (suite) suite.pageObjects = pageObjects;
      });
    },

    // ─── Data Sets ────────────────────────────────────────────────────────────

    saveDataSets: async (suiteId, dataSets) => {
      await api.updateSuite(suiteId, { dataSets });
      set(s => {
        const suite = s.suites.find(x => x.id === suiteId);
        if (suite) suite.dataSets = dataSets;
      });
    },

    // ─── Execution Options ────────────────────────────────────────────────────

    saveExecutionOptions: async (suiteId, executionOptions) => {
      await api.updateSuite(suiteId, { executionOptions });
      set(s => {
        const suite = s.suites.find(x => x.id === suiteId);
        if (suite) suite.executionOptions = executionOptions;
      });
    },

    // ─── Runs ─────────────────────────────────────────────────────────────────

    fetchRuns: async (suiteId) => {
      set(s => { s.runLoading = true; });
      try {
        const runs = await api.getRuns(suiteId);
        set(s => { s.runs = runs; s.runLoading = false; });
      } catch {
        set(s => { s.runLoading = false; });
      }
    },

    triggerRun: async (suiteId, options) => {
      const run = await api.triggerRun(suiteId, options);
      set(s => { s.runs.unshift(run); s.activeRunId = run.id; });
      return run;
    },

    cancelRun: async (runId) => {
      await api.cancelRun(runId);
      set(s => {
        const run = s.runs.find(r => r.id === runId);
        if (run) { run.status = 'cancelled'; run.completedAt = new Date().toISOString(); }
      });
    },

    updateRun: (run) => set(s => {
      const idx = s.runs.findIndex(r => r.id === run.id);
      if (idx >= 0) s.runs[idx] = run;
      else s.runs.unshift(run);
    }),

    setActiveRun: (id) => set(s => { s.activeRunId = id; }),

    // ─── UI ───────────────────────────────────────────────────────────────────

    setView: (view) => set(s => { s.activeView = view; }),

    enterProject: (id) => set(s => {
      s.activeProjectId = id;
      s.activeView = 'dashboard';
      s.activeSuiteId = null;
      s.activeTestId = null;
      s.selectedStepId = null;
    }),
    setSelectedStep: (id) => set(s => { s.selectedStepId = id; }),
    setPaletteFilter: (f) => set(s => { s.paletteFilter = f; }),

    // ─── Issues ───────────────────────────────────────────────────────────────

    fetchIssues: async (projectId) => {
      const issues = await api.getIssues(projectId ?? get().activeProjectId ?? undefined);
      set(s => { s.issues = issues; });
    },

    createIssue: async (data) => {
      const issue = await api.createIssue(data);
      set(s => { s.issues.unshift(issue); });
      return issue;
    },

    updateIssue: async (id, data) => {
      const updated = await api.updateIssue(id, data);
      set(s => { const idx = s.issues.findIndex(x => x.id === id); if (idx >= 0) s.issues[idx] = updated; });
    },

    deleteIssue: async (id) => {
      await api.deleteIssue(id);
      set(s => { s.issues = s.issues.filter(x => x.id !== id); });
    },

    // ─── Test Plans ───────────────────────────────────────────────────────────

    fetchTestPlans: async (projectId) => {
      const plans = await api.getTestPlans(projectId ?? get().activeProjectId ?? undefined);
      set(s => { s.testPlans = plans; });
    },

    createTestPlan: async (data) => {
      const plan = await api.createTestPlan(data);
      set(s => { s.testPlans.unshift(plan); });
      return plan;
    },

    updateTestPlan: async (id, data) => {
      const updated = await api.updateTestPlan(id, data);
      set(s => { const idx = s.testPlans.findIndex(x => x.id === id); if (idx >= 0) s.testPlans[idx] = updated; });
    },

    deleteTestPlan: async (id) => {
      await api.deleteTestPlan(id);
      set(s => { s.testPlans = s.testPlans.filter(x => x.id !== id); });
    },

    // ─── Test Strategies ──────────────────────────────────────────────────────

    fetchTestStrategies: async (projectId) => {
      const strategies = await api.getTestStrategies(projectId ?? get().activeProjectId ?? undefined);
      set(s => { s.testStrategies = strategies; });
    },

    createTestStrategy: async (data) => {
      const strategy = await api.createTestStrategy(data);
      set(s => { s.testStrategies.unshift(strategy); });
      return strategy;
    },

    updateTestStrategy: async (id, data) => {
      const updated = await api.updateTestStrategy(id, data);
      set(s => { const idx = s.testStrategies.findIndex(x => x.id === id); if (idx >= 0) s.testStrategies[idx] = updated; });
    },

    deleteTestStrategy: async (id) => {
      await api.deleteTestStrategy(id);
      set(s => { s.testStrategies = s.testStrategies.filter(x => x.id !== id); });
    },

    // ─── API Collections ──────────────────────────────────────────────────────

    fetchApiCollections: async (projectId) => {
      const cols = await api.getApiCollections(projectId ?? get().activeProjectId ?? undefined);
      set(s => { s.apiCollections = cols; });
    },

    createApiCollection: async (data) => {
      const col = await api.createApiCollection(data);
      set(s => { s.apiCollections.unshift(col); });
      return col;
    },

    updateApiCollection: async (id, data) => {
      const updated = await api.updateApiCollection(id, data);
      set(s => { const idx = s.apiCollections.findIndex(x => x.id === id); if (idx >= 0) s.apiCollections[idx] = updated; });
    },

    deleteApiCollection: async (id) => {
      await api.deleteApiCollection(id);
      set(s => {
        s.apiCollections = s.apiCollections.filter(x => x.id !== id);
        delete s.apiRequests[id];
      });
    },

    fetchApiRequests: async (collectionId) => {
      const requests = await api.getApiRequests(collectionId);
      set(s => { s.apiRequests[collectionId] = requests; });
    },

    createApiRequest: async (collectionId, data) => {
      const request = await api.createApiRequest(collectionId, data);
      set(s => { s.apiRequests[collectionId] = [request, ...(s.apiRequests[collectionId] ?? [])]; });
      return request;
    },

    updateApiRequest: async (collectionId, requestId, data) => {
      const updated = await api.updateApiRequest(collectionId, requestId, data);
      set(s => {
        const reqs = s.apiRequests[collectionId] ?? [];
        const idx = reqs.findIndex(r => r.id === requestId);
        if (idx >= 0) reqs[idx] = updated;
      });
    },

    deleteApiRequest: async (collectionId, requestId) => {
      await api.deleteApiRequest(collectionId, requestId);
      set(s => { s.apiRequests[collectionId] = (s.apiRequests[collectionId] ?? []).filter(r => r.id !== requestId); });
    },

    // ─── Requirements ─────────────────────────────────────────────────────────

    fetchRequirements: async (projectId) => {
      const reqs = await api.getRequirements(projectId ?? get().activeProjectId ?? undefined);
      set(s => { s.requirements = reqs; });
    },

    createRequirement: async (data) => {
      const req = await api.createRequirement(data);
      set(s => { s.requirements.unshift(req); });
      return req;
    },

    updateRequirement: async (id, data) => {
      const updated = await api.updateRequirement(id, data);
      set(s => { const idx = s.requirements.findIndex(x => x.id === id); if (idx >= 0) s.requirements[idx] = updated; });
    },

    deleteRequirement: async (id) => {
      await api.deleteRequirement(id);
      set(s => { s.requirements = s.requirements.filter(x => x.id !== id); });
    },
  })),
);

// Selector helpers
export const selectActiveSuite = (state: StoreState) =>
  state.suites.find(s => s.id === state.activeSuiteId);

export const selectActiveTest = (state: StoreState) => {
  const suite = state.suites.find(s => s.id === state.activeSuiteId);
  return suite?.tests.find(t => t.id === state.activeTestId);
};

export const selectActiveSteps = (state: StoreState) => {
  const suite = state.suites.find(s => s.id === state.activeSuiteId);
  return suite?.tests.find(t => t.id === state.activeTestId)?.steps ?? [];
};
