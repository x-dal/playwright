import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { TestSuite, Test, Step, TestRun, PageObject, TestDataSet, ExecutionOptions } from '../types';
import * as api from '../api/client';

// tiny uuid shim since crypto.randomUUID may not exist in older Safari
function genId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

interface StoreState {
  // Suites
  suites: TestSuite[];
  suitesLoading: boolean;

  // Current editing context
  activeSuiteId: string | null;
  activeTestId: string | null;
  activeView: 'dashboard' | 'builder' | 'runs' | 'code';

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
  createSuite: (name: string, description?: string) => Promise<TestSuite>;
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
  setSelectedStep: (id: string | null) => void;
  setPaletteFilter: (f: string) => void;
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

    // ─── Suites ───────────────────────────────────────────────────────────────

    fetchSuites: async () => {
      set(s => { s.suitesLoading = true; });
      try {
        const suites = await api.getSuites();
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

    createSuite: async (name, description) => {
      const suite = await api.createSuite({ name, description });
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
    setSelectedStep: (id) => set(s => { s.selectedStepId = id; }),
    setPaletteFilter: (f) => set(s => { s.paletteFilter = f; }),
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
