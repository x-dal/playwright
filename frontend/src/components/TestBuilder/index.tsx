import React, { useState } from 'react';
import { useStore, selectActiveSuite, selectActiveTest } from '../../store/useStore';
import StepPalette from '../StepPalette';
import FlowCanvas from '../FlowCanvas';
import StepConfig from '../StepConfig';
import PageObjectsManager from '../PageObjectsManager';
import TestDataTable from '../TestDataTable';
import ExecutionOptions from '../ExecutionOptions';
import CodeEditor from '../CodeEditor';
import Recorder from '../Recorder';
import * as apiClient from '../../api/client';

type Tab = 'steps' | 'pageobjects' | 'data' | 'options' | 'recorder';

// ─── Tab definitions ──────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'steps',       label: 'Steps',        icon: '⚙' },
  { id: 'recorder',    label: 'Recorder',     icon: '⏺' },
  { id: 'pageobjects', label: 'Page Objects', icon: '📦' },
  { id: 'data',        label: 'Test Data',    icon: '📊' },
  { id: 'options',     label: 'Run Options',  icon: '🎯' },
];

// ─── Suite initials helper ────────────────────────────────────────────────────

function suiteInitials(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('') || '??';
}

// ─── TestBuilder ──────────────────────────────────────────────────────────────

export default function TestBuilder() {
  const suite = useStore(selectActiveSuite);
  const activeTest = useStore(selectActiveTest);
  const { createTest, deleteTest, setActiveTest, activeTestId, setView, updateRun, activeView } = useStore();

  const [tab, setTab] = useState<Tab>('steps');
  const [newTestName, setNewTestName] = useState('');
  const [showNewTest, setShowNewTest] = useState(false);
  const [running, setRunning] = useState(false);
  const [preview, setPreview] = useState(false);

  if (!suite) return null;

  async function handleRun(testId?: string) {
    if (!suite) return;
    setRunning(true);
    try {
      const run = await apiClient.triggerRun(suite.id, { testId, preview });
      updateRun(run);
      apiClient.streamRun(run.id, updateRun, () => setRunning(false));
      setView('runs');
    } catch {
      setRunning(false);
    }
  }

  async function handleCreateTest(e: React.FormEvent) {
    e.preventDefault();
    if (!newTestName.trim() || !suite) return;
    const test = await createTest(suite.id, newTestName.trim());
    setActiveTest(test.id);
    setNewTestName('');
    setShowNewTest(false);
    setTab('steps');
  }

  const initials = suiteInitials(suite.name);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-slate-950">

      {/* ── Top header ─────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">

        {/* Left: back + suite identity */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setView('dashboard')}
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm"
            title="Back to Dashboard"
          >←</button>

          {/* Suite avatar */}
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm select-none">
            {initials}
          </div>

          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white truncate leading-tight">{suite.name}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-tight">
              {suite.tests.length} test{suite.tests.length !== 1 ? 's' : ''} · {suite.pageObjects.length} page object{suite.pageObjects.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setView('code')}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            {'</>'} Code
          </button>

          {/* Preview toggle */}
          <button
            onClick={() => setPreview(p => !p)}
            title={preview ? 'Preview ON — browser window will open' : 'Preview OFF — runs headless'}
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all ${
              preview
                ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-300 dark:border-amber-600 text-amber-700 dark:text-amber-400'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            <span>👁</span>
            {preview ? 'Preview ON' : 'Preview OFF'}
          </button>

          <button
            onClick={() => handleRun()}
            disabled={running || suite.tests.length === 0}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-sm transition-colors"
          >
            {running ? '⏳ Running…' : '▶ Run Suite'}
          </button>
        </div>
      </div>

      {/* ── Tab bar ─────────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center gap-0.5 px-5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`relative inline-flex items-center gap-1.5 px-3.5 py-3 text-xs font-medium transition-all whitespace-nowrap ${
              tab === t.id
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <span>{t.icon}</span>
            {t.label}
            {/* active underline */}
            {tab === t.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* ── Main layout ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden flex">

        {/* Test list sidebar */}
        <div className="w-56 flex-shrink-0 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white dark:bg-slate-900">

          {/* Sidebar header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Tests</span>
            <button
              onClick={() => setShowNewTest(v => !v)}
              className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors text-base font-bold leading-none"
            >+</button>
          </div>

          {/* Inline new-test form */}
          {showNewTest && (
            <form onSubmit={handleCreateTest} className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30">
              <input
                className="input w-full text-xs mb-2"
                placeholder="Test name…"
                value={newTestName}
                onChange={e => setNewTestName(e.target.value)}
                autoFocus
              />
              <div className="flex gap-1.5">
                <button
                  type="submit"
                  disabled={!newTestName.trim()}
                  className="flex-1 text-xs font-semibold py-1.5 px-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white transition-colors"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => { setShowNewTest(false); setNewTestName(''); }}
                  className="text-xs px-2.5 py-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Test list */}
          <div className="flex-1 overflow-y-auto">
            {suite.tests.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-10 text-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-2xl">📋</div>
                <p className="text-xs text-slate-500 dark:text-slate-400">No tests yet</p>
                <button
                  onClick={() => setShowNewTest(true)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                >
                  + Add Test
                </button>
              </div>
            ) : (
              suite.tests.map(test => (
                <div
                  key={test.id}
                  onClick={() => setActiveTest(test.id)}
                  className={`group flex items-center gap-2.5 px-3 py-2.5 cursor-pointer border-b border-slate-100 dark:border-slate-800/60 transition-colors ${
                    activeTestId === test.id
                      ? 'bg-blue-50 dark:bg-blue-900/30 border-l-2 border-l-blue-500'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  {/* Test number dot */}
                  <div className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${
                    activeTestId === test.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                  }`}>
                    {suite.tests.indexOf(test) + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{test.name}</div>
                    <div className="text-xs text-slate-400 dark:text-slate-500 tabular-nums">{test.steps.length} step{test.steps.length !== 1 ? 's' : ''}</div>
                  </div>

                  {/* Hover actions */}
                  <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={e => { e.stopPropagation(); handleRun(test.id); }}
                      disabled={running}
                      title="Run this test"
                      className="w-6 h-6 flex items-center justify-center rounded-lg text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors text-xs"
                    >▶</button>
                    <button
                      onClick={e => { e.stopPropagation(); deleteTest(suite.id, test.id); }}
                      className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-xs"
                    >✕</button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Sidebar footer: add test button */}
          {suite.tests.length > 0 && (
            <div className="p-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setShowNewTest(true)}
                className="w-full text-xs font-medium py-2 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-blue-400 dark:hover:border-blue-600 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-all"
              >
                + New Test
              </button>
            </div>
          )}
        </div>

        {/* ── Content area ───────────────────────────────────────────────────── */}
        {tab === 'steps' && activeTest ? (
          <div className="flex-1 flex overflow-hidden">
            {/* Step palette */}
            <div className="w-52 flex-shrink-0 border-r border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col bg-white dark:bg-slate-900">
              <StepPalette />
            </div>

            {/* Flow canvas */}
            <div className="flex-1 overflow-hidden flex flex-col bg-slate-50 dark:bg-slate-950">
              <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">{activeTest.name}</span>
                <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium tabular-nums">
                  {activeTest.steps.length} step{activeTest.steps.length !== 1 ? 's' : ''}
                </span>
              </div>
              <FlowCanvas />
            </div>

            {/* Step config panel */}
            <div className="w-72 flex-shrink-0 border-l border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col bg-white dark:bg-slate-900">
              <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800">
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Configure Step</span>
              </div>
              <StepConfig />
            </div>
          </div>

        ) : tab === 'steps' && !activeTest ? (
          <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-950">
            <div className="text-center max-w-xs">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-3xl mx-auto mb-4">📋</div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">No test selected</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">Select a test from the sidebar, or create a new one to start adding steps.</p>
              <button
                onClick={() => setShowNewTest(true)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors"
              >
                + New Test
              </button>
            </div>
          </div>

        ) : tab === 'recorder' ? (
          <div className="flex-1 overflow-hidden bg-slate-50 dark:bg-slate-950">
            <Recorder suiteId={suite.id} />
          </div>
        ) : tab === 'pageobjects' ? (
          <div className="flex-1 overflow-hidden bg-slate-50 dark:bg-slate-950">
            <PageObjectsManager />
          </div>
        ) : tab === 'data' ? (
          <div className="flex-1 overflow-hidden bg-slate-50 dark:bg-slate-950">
            <TestDataTable />
          </div>
        ) : tab === 'options' ? (
          <div className="flex-1 overflow-hidden bg-slate-50 dark:bg-slate-950">
            <ExecutionOptions />
          </div>
        ) : null}

        {/* Code editor overlay */}
        {activeView === 'code' && (
          <div className="absolute inset-0 z-10 flex flex-col bg-white dark:bg-slate-950">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-sm font-semibold text-slate-900 dark:text-white">Generated Code</span>
                <span className="text-xs text-slate-400 dark:text-slate-500">— {suite.name}</span>
              </div>
              <button
                onClick={() => setView('builder')}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                ✕ Close
              </button>
            </div>
            <CodeEditor />
          </div>
        )}
      </div>
    </div>
  );
}
