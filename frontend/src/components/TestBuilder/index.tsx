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

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'steps',       label: 'Test Steps',    icon: '⚙' },
    { id: 'recorder',    label: 'Recorder',      icon: '⏺' },
    { id: 'pageobjects', label: 'Page Objects',  icon: '📦' },
    { id: 'data',        label: 'Test Data',     icon: '📊' },
    { id: 'options',     label: 'Run Options',   icon: '🎯' },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-900/50">
        <div className="flex items-center gap-3 min-w-0">
          <div>
            <h2 className="text-sm font-semibold text-white truncate">{suite.name}</h2>
            <p className="text-xs text-slate-500">{suite.tests.length} tests · {suite.pageObjects.length} page objects</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => setView('code')} className="btn-secondary text-xs">
            {'</>'}  Code
          </button>
          {/* Preview toggle */}
          <button
            onClick={() => setPreview(p => !p)}
            title={preview ? 'Preview ON — browser window will open' : 'Preview OFF — runs headless'}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all ${
              preview
                ? 'bg-amber-900/40 border-amber-600 text-amber-300 hover:bg-amber-900/60'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>{preview ? '👁' : '👁'}</span>
            <span>Preview {preview ? 'ON' : 'OFF'}</span>
          </button>
          <button
            onClick={() => handleRun()}
            disabled={running || suite.tests.length === 0}
            className="btn-success text-xs"
          >
            {running ? '⏳ Running…' : '▶ Run Suite'}
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex-shrink-0 flex items-center gap-1 px-4 py-2 border-b border-slate-800 bg-slate-900/30 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              tab === t.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {/* Main layout */}
      <div className="flex-1 overflow-hidden flex">
        {/* Test list sidebar */}
        <div className="w-48 flex-shrink-0 border-r border-slate-800 flex flex-col bg-slate-900/30">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tests</span>
            <button onClick={() => setShowNewTest(true)} className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 text-sm">+</button>
          </div>

          {showNewTest && (
            <form onSubmit={handleCreateTest} className="p-2 border-b border-slate-800">
              <input
                className="input w-full text-xs mb-1"
                placeholder="Test name…"
                value={newTestName}
                onChange={e => setNewTestName(e.target.value)}
                autoFocus
              />
              <div className="flex gap-1">
                <button type="submit" className="btn-primary text-xs py-1 px-2 flex-1">Add</button>
                <button type="button" onClick={() => setShowNewTest(false)} className="btn-ghost text-xs py-1 px-2">✕</button>
              </div>
            </form>
          )}

          <div className="flex-1 overflow-y-auto">
            {suite.tests.length === 0 ? (
              <div className="text-center text-slate-600 text-xs p-4">No tests yet</div>
            ) : (
              suite.tests.map(test => (
                <div
                  key={test.id}
                  onClick={() => setActiveTest(test.id)}
                  className={`group flex items-center gap-2 px-3 py-2.5 cursor-pointer border-b border-slate-800/50 transition-colors ${
                    activeTestId === test.id ? 'bg-blue-900/30 border-l-2 border-l-blue-500' : 'hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-slate-300 truncate font-medium">{test.name}</div>
                    <div className="text-xs text-slate-600">{test.steps.length} steps</div>
                  </div>
                  <div className="hidden group-hover:flex items-center gap-1">
                    <button
                      onClick={e => { e.stopPropagation(); handleRun(test.id); }}
                      disabled={running}
                      title={`Run "${test.name}"${preview ? ' (preview)' : ''}`}
                      className="w-5 h-5 flex items-center justify-center rounded text-green-500 hover:text-green-300 hover:bg-slate-700 text-xs"
                    >▶</button>
                    <button
                      onClick={e => { e.stopPropagation(); deleteTest(suite.id, test.id); }}
                      className="w-5 h-5 flex items-center justify-center text-slate-600 hover:text-red-400 text-xs rounded"
                    >✕</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Content area */}
        {tab === 'steps' && activeTest ? (
          <div className="flex-1 flex overflow-hidden">
            {/* Step palette */}
            <div className="w-52 flex-shrink-0 border-r border-slate-800 overflow-hidden flex flex-col">
              <StepPalette />
            </div>

            {/* Flow canvas */}
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="px-4 py-2 border-b border-slate-800 bg-slate-900/20 flex items-center gap-2">
                <span className="text-xs font-medium text-slate-300">{activeTest.name}</span>
                <span className="text-xs text-slate-600">·</span>
                <span className="text-xs text-slate-500">{activeTest.steps.length} steps</span>
              </div>
              <FlowCanvas />
            </div>

            {/* Step config panel */}
            <div className="w-72 flex-shrink-0 border-l border-slate-800 overflow-hidden flex flex-col bg-slate-900/20">
              <div className="px-3 py-2 border-b border-slate-800">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Configure Step</span>
              </div>
              <StepConfig />
            </div>
          </div>
        ) : tab === 'steps' && !activeTest ? (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            <div className="text-center">
              <div className="text-3xl mb-2">📋</div>
              <div className="text-sm">Select or create a test to begin</div>
            </div>
          </div>
        ) : tab === 'recorder' ? (
          <div className="flex-1 overflow-hidden">
            <Recorder suiteId={suite.id} />
          </div>
        ) : tab === 'pageobjects' ? (
          <div className="flex-1 overflow-hidden">
            <PageObjectsManager />
          </div>
        ) : tab === 'data' ? (
          <div className="flex-1 overflow-hidden">
            <TestDataTable />
          </div>
        ) : tab === 'options' ? (
          <div className="flex-1 overflow-hidden">
            <ExecutionOptions />
          </div>
        ) : null}

        {/* Code editor overlay when activeView === 'code' */}
        {activeView === 'code' && (
          <div className="absolute inset-0 z-10 flex flex-col bg-slate-950">
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800">
              <span className="text-sm font-medium text-white">Generated Code</span>
              <button onClick={() => setView('builder')} className="btn-ghost text-xs">✕ Close</button>
            </div>
            <CodeEditor />
          </div>
        )}
      </div>
    </div>
  );
}
