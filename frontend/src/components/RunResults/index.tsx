import React, { useEffect, useState } from 'react';
import { useStore, selectActiveSuite } from '../../store/useStore';
import { streamRun, getReportUrl } from '../../api/client';
import type { TestRun, TestResult, StepResult } from '../../types';

export default function RunResults() {
  const { runs, fetchRuns, activeRunId, setActiveRun, updateRun, activeSuiteId, triggerRun, cancelRun } = useStore();
  const suite = useStore(selectActiveSuite);
  const [running, setRunning] = useState(false);
  const [stopping, setStopping] = useState(false);

  useEffect(() => { fetchRuns(activeSuiteId ?? undefined); }, [activeSuiteId]);

  // Auto-stream any runs that are still in progress on mount
  useEffect(() => {
    for (const run of runs) {
      if (run.status === 'running' || run.status === 'pending') {
        const es = streamRun(run.id, updateRun, () => setRunning(false));
        return () => es.close();
      }
    }
  }, []);

  const activeRun = runs.find(r => r.id === activeRunId) ?? runs[0];

  async function handleRun() {
    if (!activeSuiteId) return;
    setRunning(true);
    setStopping(false);
    const run = await triggerRun(activeSuiteId);
    const es = streamRun(run.id, updateRun, () => setRunning(false));
  }

  async function handleStop(runId: string) {
    setStopping(true);
    await cancelRun(runId);
    setRunning(false);
    setStopping(false);
  }

  const liveRun = runs.find(r => r.status === 'running' || r.status === 'pending');

  return (
    <div className="flex h-full overflow-hidden">
      {/* Run list sidebar */}
      <div className="w-64 flex-shrink-0 flex flex-col border-r border-slate-800 bg-slate-900/30">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Run History</span>
          <div className="flex items-center gap-1">
            {liveRun && (
              <button
                onClick={() => handleStop(liveRun.id)}
                disabled={stopping}
                title="Stop run"
                className="btn-danger text-xs py-1 px-2"
              >
                {stopping ? '…' : '⏹'}
              </button>
            )}
            {activeSuiteId && suite && !liveRun && (
              <button
                onClick={handleRun}
                disabled={running}
                className="btn-success text-xs py-1 px-2"
              >
                {running ? '⏳' : '▶'}
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {runs.length === 0 ? (
            <div className="text-center text-slate-600 text-xs p-4">No runs yet</div>
          ) : (
            runs.map(run => (
              <RunListItem
                key={run.id}
                run={run}
                isActive={activeRun?.id === run.id}
                onClick={() => setActiveRun(run.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Run detail */}
      <div className="flex-1 overflow-y-auto">
        {activeRun ? (
          <RunDetail run={activeRun} />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-600">
            <div className="text-center">
              <div className="text-4xl mb-2">▶</div>
              <div className="text-sm">Select a run or trigger a new one</div>
              {activeSuiteId && (
                <button onClick={handleRun} disabled={running} className="btn-success mt-4">
                  {running ? 'Running…' : '▶ Run Suite'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RunListItem({ run, isActive, onClick }: { run: TestRun; isActive: boolean; onClick: () => void }) {
  const passed = run.results.filter(r => r.status === 'passed').length;
  const total = run.results.length;

  return (
    <div
      onClick={onClick}
      className={`px-4 py-3 cursor-pointer border-b border-slate-800/50 transition-colors ${
        isActive ? 'bg-blue-900/30 border-l-2 border-l-blue-500' : 'hover:bg-slate-800/40'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className={`badge-${run.status}`}>{run.status}</span>
        <span className="text-xs text-slate-600">{total > 0 ? `${passed}/${total}` : '–'}</span>
      </div>
      <div className="text-xs text-slate-400 font-medium truncate">{run.suiteName}</div>
      <div className="text-xs text-slate-600">{new Date(run.startedAt).toLocaleString()}</div>
    </div>
  );
}

function RunDetail({ run }: { run: TestRun }) {
  const { cancelRun } = useStore();
  const [expandedTestId, setExpandedTestId] = useState<string | null>(null);
  const [stopping, setStopping] = useState(false);

  async function handleStop() {
    setStopping(true);
    await cancelRun(run.id);
    setStopping(false);
  }
  const passed = run.results.filter(r => r.status === 'passed').length;
  const failed = run.results.filter(r => r.status === 'failed').length;
  const skipped = run.results.filter(r => r.status === 'skipped').length;

  const duration = run.completedAt
    ? ((new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()) / 1000).toFixed(1)
    : null;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-white">{run.suiteName}</h2>
          <div className="text-xs text-slate-500 mt-1">
            Run ID: <span className="font-mono">{run.id.slice(0, 8)}…</span>
            &nbsp;·&nbsp; Started: {new Date(run.startedAt).toLocaleString()}
            {duration && <>&nbsp;·&nbsp; {duration}s</>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`badge-${run.status} text-sm px-3 py-1`}>{run.status}</span>
          {(run.status === 'running' || run.status === 'pending') && (
            <button
              onClick={handleStop}
              disabled={stopping}
              className="btn-danger text-xs"
            >
              {stopping ? 'Stopping…' : '⏹ Stop Run'}
            </button>
          )}
          {run.htmlReportPath && (
            <a href={getReportUrl(run.suiteId, run.id)} target="_blank" rel="noreferrer" className="btn-secondary text-xs">
              HTML Report ↗
            </a>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total',   value: run.results.length, color: 'slate' },
          { label: 'Passed',  value: passed,  color: 'green' },
          { label: 'Failed',  value: failed,  color: 'red' },
          { label: 'Skipped', value: skipped, color: 'amber' },
        ].map(s => (
          <div key={s.label} className="card p-3 text-center">
            <div className={`text-xl font-bold text-${s.color}-400`}>{s.value}</div>
            <div className="text-xs text-slate-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Running indicator */}
      {(run.status === 'running' || run.status === 'pending') && (
        <div className="mb-4 flex items-center gap-3 p-4 bg-blue-950/40 border border-blue-800 rounded-xl">
          <div className="recording-pulse text-blue-400 text-xl">⏳</div>
          <div>
            <div className="text-sm font-medium text-blue-300">Tests are running…</div>
            <div className="text-xs text-blue-500">{run.results.length} results so far. This page updates in real time.</div>
          </div>
        </div>
      )}

      {/* Results list */}
      {run.results.length === 0 ? (
        <div className="text-center text-slate-600 py-10">No results yet…</div>
      ) : (
        <div className="space-y-3">
          {run.results.map((result, idx) => (
            <TestResultCard
              key={`${result.testId}-${result.browser}-${idx}`}
              result={result}
              isExpanded={expandedTestId === `${result.testId}-${idx}`}
              onToggle={() => setExpandedTestId(expandedTestId === `${result.testId}-${idx}` ? null : `${result.testId}-${idx}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TestResultCard({ result, isExpanded, onToggle }: {
  result: TestResult;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="card overflow-hidden">
      {/* Summary row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-4 hover:bg-slate-700/30 transition-colors text-left"
      >
        <span className={`badge-${result.status} shrink-0`}>{result.status}</span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-slate-200 truncate">
            {result.testName}
            {result.dataRow !== undefined && <span className="text-slate-500 ml-2">row {result.dataRow + 1}</span>}
          </div>
          <div className="text-xs text-slate-500 flex items-center gap-3 mt-0.5">
            <span>🌐 {result.browser}</span>
            <span>⏱ {(result.duration / 1000).toFixed(2)}s</span>
            <span>📋 {result.steps.length} steps</span>
          </div>
        </div>
        {result.error && (
          <div className="text-xs text-red-400 truncate max-w-xs">{result.error}</div>
        )}
        <span className="text-slate-600 text-sm">{isExpanded ? '▲' : '▼'}</span>
      </button>

      {/* Expanded detail */}
      {isExpanded && (
        <div className="border-t border-slate-700 px-4 py-4 space-y-4">
          {/* Step timeline */}
          {result.steps.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Steps</h4>
              <div className="space-y-1">
                {result.steps.map((step, i) => (
                  <StepResultRow key={step.stepId} step={step} index={i} />
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {result.error && (
            <div>
              <h4 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">Error</h4>
              <pre className="text-xs font-mono bg-red-950/30 border border-red-900 rounded-lg p-3 overflow-auto text-red-300 whitespace-pre-wrap">{result.error}</pre>
            </div>
          )}

          {/* Screenshot */}
          {result.screenshotPath && (
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Screenshot</h4>
              <img
                src={`/artifacts/screenshots/${result.screenshotPath.split('/').pop()}`}
                alt="Test screenshot"
                className="rounded-lg border border-slate-700 max-h-64 object-cover cursor-pointer hover:max-h-none transition-all"
                onClick={e => { const el = e.currentTarget; el.style.maxHeight = el.style.maxHeight === 'none' ? '' : 'none'; }}
              />
            </div>
          )}

          {/* Logs */}
          {result.logs.length > 0 && (
            <details>
              <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-400 select-none">
                Console logs ({result.logs.length} lines)
              </summary>
              <pre className="mt-2 text-xs font-mono bg-slate-950 rounded-lg p-3 overflow-auto max-h-48 text-slate-400">{result.logs.join('\n')}</pre>
            </details>
          )}

          {/* Trace download */}
          {result.tracePath && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500">Trace:</span>
              <a
                href={`/artifacts/traces/${result.tracePath.split('/').pop()}`}
                download
                className="text-blue-400 hover:text-blue-300 font-mono"
              >
                Download .zip
              </a>
              <span className="text-slate-600">· Open with: <span className="font-mono">npx playwright show-trace trace.zip</span></span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StepResultRow({ step, index }: { step: StepResult; index: number }) {
  const colors = { passed: 'text-green-400', failed: 'text-red-400', skipped: 'text-amber-400' };
  const icons = { passed: '✓', failed: '✗', skipped: '⊘' };

  return (
    <div className={`flex items-center gap-3 px-3 py-1.5 rounded text-xs ${
      step.status === 'failed' ? 'bg-red-950/30' : 'hover:bg-slate-800/40'
    }`}>
      <span className={`${colors[step.status]} w-4 text-center font-mono`}>{icons[step.status]}</span>
      <span className="text-slate-600 w-5 text-right">{index + 1}</span>
      <span className="text-slate-300 flex-1 truncate">{step.stepName}</span>
      <span className="text-slate-600">{step.duration}ms</span>
      {step.error && (
        <span className="text-red-400 truncate max-w-xs" title={step.error}>{step.error}</span>
      )}
    </div>
  );
}
