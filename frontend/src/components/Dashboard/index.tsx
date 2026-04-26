import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import type { TestSuite } from '../../types';
import { getExportUrl } from '../../api/client';

// ─── Run Badge ────────────────────────────────────────────────────────────────

function RunBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    passed:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
    failed:  'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
    running: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
    pending: 'bg-slate-100 text-slate-500 dark:bg-slate-700/60 dark:text-slate-400',
  };
  const dots: Record<string, string> = {
    passed: 'bg-emerald-500', failed: 'bg-red-500',
    running: 'bg-blue-500 animate-pulse', pending: 'bg-slate-400',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${styles[status] ?? styles.pending}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dots[status] ?? dots.pending}`} />
      {status}
    </span>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, colorClass }: {
  label: string; value: string | number; icon: string; colorClass: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl text-xl mb-3 ${colorClass}`}>
        {icon}
      </div>
      <div className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight leading-none mb-1">{value}</div>
      <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</div>
    </div>
  );
}

// ─── Relative time helper ─────────────────────────────────────────────────────

function relativeTime(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7)  return `${d}d ago`;
  const w = Math.floor(d / 7);
  if (w < 5)  return `${w}w ago`;
  return new Date(date).toLocaleDateString();
}

// ─── Suite Card ───────────────────────────────────────────────────────────────

function SuiteCard({ suite, runs, onOpen, onDelete }: {
  suite: TestSuite; runs: any[]; onOpen: () => void; onDelete: () => void;
}) {
  const lastRun = runs[0];
  const [confirmDelete, setConfirmDelete] = useState(false);

  const history = runs.slice(0, 12);
  const finishedRuns = runs.filter(r => r.status !== 'pending' && r.status !== 'running');
  const passRate = finishedRuns.length > 0
    ? Math.round((runs.filter(r => r.status === 'passed').length / finishedRuns.length) * 100) || 0
    : null;

  // Accent colour driven by last run status
  const accentBar =
    !lastRun                         ? 'bg-slate-200 dark:bg-slate-700' :
    lastRun.status === 'passed'      ? 'bg-emerald-400 dark:bg-emerald-500' :
    lastRun.status === 'failed'      ? 'bg-red-400 dark:bg-red-500' :
    lastRun.status === 'running'     ? 'bg-blue-400 dark:bg-blue-500' :
                                       'bg-slate-300 dark:bg-slate-600';

  // Suite avatar: first two chars, uppercased
  const initials = suite.name.replace(/[^a-zA-Z0-9 ]/g, '').trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') || '??';

  return (
    <div className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col overflow-hidden hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xl hover:shadow-slate-200/60 dark:hover:shadow-black/30 transition-all duration-200">

      {/* Top accent strip */}
      <div className={`h-1 w-full ${accentBar} transition-colors`} />

      {/* Card body */}
      <div className="p-5 flex flex-col gap-4 flex-1">

        {/* Header: avatar + name + actions */}
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div
            onClick={onOpen}
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold shrink-0 cursor-pointer select-none shadow-sm"
          >
            {initials}
          </div>

          {/* Title + meta */}
          <div className="flex-1 min-w-0 cursor-pointer" onClick={onOpen}>
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm leading-tight truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {suite.name}
            </h3>
            {suite.description ? (
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5 line-clamp-1">{suite.description}</p>
            ) : (
              <p className="text-slate-400 dark:text-slate-600 text-xs mt-0.5">No description</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <a
              href={getExportUrl(suite.id)}
              download
              onClick={e => e.stopPropagation()}
              title="Export project"
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm"
            >↓</a>
            {confirmDelete ? (
              <div className="flex items-center gap-1">
                <button onClick={() => { onDelete(); setConfirmDelete(false); }} className="text-xs px-2 py-1 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors">Delete</button>
                <button onClick={() => setConfirmDelete(false)} className="text-xs px-2 py-1 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">No</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-sm">✕</button>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Tests',    value: suite.tests.length,       icon: '🧪' },
            { label: 'Objects',  value: suite.pageObjects.length,  icon: '📦' },
            { label: 'Browser',  value: suite.executionOptions.browsers[0] ?? '—', icon: '🌐' },
          ].map(({ label, value, icon }) => (
            <div key={label} className="bg-slate-50 dark:bg-slate-800/60 rounded-xl px-3 py-2 text-center">
              <div className="text-base leading-none mb-1">{icon}</div>
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{value}</div>
              <div className="text-xs text-slate-400 dark:text-slate-500">{label}</div>
            </div>
          ))}
        </div>

        {/* Run history sparkline */}
        {history.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="flex gap-0.5 items-end flex-1">
              {history.map((r, i) => (
                <div
                  key={i}
                  title={r.status}
                  className={`flex-1 rounded-sm ${
                    r.status === 'passed'  ? 'h-4 bg-emerald-400 dark:bg-emerald-500' :
                    r.status === 'failed'  ? 'h-4 bg-red-400 dark:bg-red-500' :
                                            'h-2 bg-slate-200 dark:bg-slate-700'
                  }`}
                />
              ))}
            </div>
            {passRate !== null && (
              <span className={`text-xs font-bold tabular-nums ${
                passRate >= 80 ? 'text-emerald-600 dark:text-emerald-400' :
                passRate >= 50 ? 'text-amber-600 dark:text-amber-400' :
                                 'text-red-600 dark:text-red-400'
              }`}>
                {passRate}%
              </span>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 flex items-center justify-between gap-3">
        {lastRun ? (
          <div className="flex items-center gap-2 min-w-0">
            <RunBadge status={lastRun.status} />
            <span className="text-xs text-slate-400 dark:text-slate-500 truncate">
              {relativeTime(lastRun.startedAt)}
            </span>
          </div>
        ) : (
          <span className="text-xs text-slate-400 dark:text-slate-500">No runs yet</span>
        )}
        <button
          onClick={onOpen}
          className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors"
        >
          Open <span className="text-blue-200">→</span>
        </button>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { suites, suitesLoading, createSuite, deleteSuite, setActiveSuite, setView, runs, fetchRuns } = useStore();
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);

  React.useEffect(() => { fetchRuns(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    await createSuite(newName.trim(), newDesc.trim());
    setNewName(''); setNewDesc(''); setShowNew(false); setCreating(false);
  }

  function openSuite(suite: TestSuite) {
    setActiveSuite(suite.id);
    setView('builder');
  }

  const finishedRuns = runs.filter(r => r.status !== 'pending' && r.status !== 'running');
  const passRate = finishedRuns.length > 0
    ? Math.round((runs.filter(r => r.status === 'passed').length / finishedRuns.length) * 100) || 0
    : 0;
  const recentRuns = runs.slice(0, 8);

  const stats = [
    { label: 'Total Suites',  value: suites.length,
      icon: '🗂',  colorClass: 'bg-blue-100 dark:bg-blue-900/40' },
    { label: 'Total Tests',   value: suites.reduce((n, s) => n + s.tests.length, 0),
      icon: '🧪',  colorClass: 'bg-violet-100 dark:bg-violet-900/40' },
    { label: 'Total Runs',    value: runs.length,
      icon: '▶',   colorClass: 'bg-slate-100 dark:bg-slate-800' },
    { label: 'Pass Rate',     value: `${passRate}%`,
      icon: '✓',   colorClass: passRate >= 80 ? 'bg-emerald-100 dark:bg-emerald-900/40' : passRate >= 50 ? 'bg-amber-100 dark:bg-amber-900/40' : 'bg-red-100 dark:bg-red-900/40' },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950">
      <div className="max-w-6xl mx-auto px-8 py-8">

        {/* Page header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Test Suites</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage and run your Playwright test suites</p>
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-colors"
          >
            <span className="text-base leading-none font-bold">+</span> New Suite
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {stats.map(s => <StatCard key={s.label} {...s} />)}
        </div>

        {/* Suites section */}
        {suitesLoading ? (
          <div className="flex items-center justify-center py-20 text-slate-400 gap-3">
            <span className="animate-spin">⏳</span> Loading suites…
          </div>
        ) : suites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-4xl mb-5">🎭</div>
            <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">No test suites yet</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 max-w-xs">Create your first suite to start building automated Playwright tests</p>
            <button
              onClick={() => setShowNew(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
            >
              + Create Suite
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center mb-4">
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                {suites.length} Suite{suites.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 mb-10">
              {suites.map(suite => (
                <SuiteCard
                  key={suite.id}
                  suite={suite}
                  runs={runs.filter(r => r.suiteId === suite.id)}
                  onOpen={() => openSuite(suite)}
                  onDelete={() => deleteSuite(suite.id)}
                />
              ))}
            </div>
          </>
        )}

        {/* Recent Runs */}
        {recentRuns.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Recent Runs</span>
              <button
                onClick={() => setView('runs')}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
              >
                View all →
              </button>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                    {['Suite', 'Status', 'Tests', 'Started', 'Duration'].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {recentRuns.map(run => {
                    const duration = run.completedAt
                      ? ((new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()) / 1000).toFixed(1) + 's'
                      : '–';
                    return (
                      <tr
                        key={run.id}
                        onClick={() => setView('runs')}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                      >
                        <td className="px-5 py-3.5 font-medium text-slate-800 dark:text-slate-200">{run.suiteName}</td>
                        <td className="px-5 py-3.5"><RunBadge status={run.status} /></td>
                        <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{run.results.length}</td>
                        <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 text-xs">{new Date(run.startedAt).toLocaleString()}</td>
                        <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 font-mono text-xs">{duration}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* New Suite Modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Create New Suite</h2>
              <button
                onClick={() => setShowNew(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >✕</button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">Suite Name *</label>
                <input
                  className="input w-full"
                  placeholder="e.g. Checkout Flow Tests"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">Description</label>
                <textarea
                  className="input w-full resize-none h-20"
                  placeholder="What does this suite test?"
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                />
              </div>
              <div className="flex gap-3 justify-end pt-1">
                <button type="button" onClick={() => setShowNew(false)} className="btn-secondary px-4">Cancel</button>
                <button
                  type="submit"
                  disabled={!newName.trim() || creating}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
                >
                  {creating ? '⏳ Creating…' : 'Create Suite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
