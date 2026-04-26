import React, { useState } from 'react';
import { useStore, selectActiveSuite } from '../../store/useStore';
import type { TestSuite } from '../../types';
import { getExportUrl } from '../../api/client';

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

  const recentRuns = runs.slice(0, 5);
  const passRate = runs.length > 0
    ? Math.round((runs.filter(r => r.status === 'passed').length / runs.filter(r => r.status !== 'pending' && r.status !== 'running').length) * 100) || 0
    : 0;

  return (
    <div className="flex-1 overflow-y-auto p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Test Suites</h1>
          <p className="text-slate-400 text-sm mt-1">Manage and run your Playwright test suites</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary">
          <span>+</span> New Suite
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Suites', value: suites.length, color: 'blue' },
          { label: 'Total Tests', value: suites.reduce((n, s) => n + s.tests.length, 0), color: 'purple' },
          { label: 'Total Runs', value: runs.length, color: 'slate' },
          { label: 'Pass Rate', value: `${passRate}%`, color: passRate >= 80 ? 'green' : passRate >= 50 ? 'amber' : 'red' },
        ].map(stat => (
          <div key={stat.label} className="card p-4">
            <div className={`text-2xl font-bold text-${stat.color}-400`}>{stat.value}</div>
            <div className="text-xs text-slate-500 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* New Suite modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="card p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-semibold text-white mb-4">Create New Suite</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="label">Suite Name *</label>
                <input
                  className="input w-full"
                  placeholder="e.g. Checkout Flow Tests"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea
                  className="input w-full resize-none h-20"
                  placeholder="What does this suite test?"
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowNew(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={!newName.trim() || creating} className="btn-primary">
                  {creating ? 'Creating…' : 'Create Suite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Suite list */}
      {suitesLoading ? (
        <div className="text-slate-500 text-center py-16">Loading suites…</div>
      ) : suites.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🎭</div>
          <div className="text-slate-400 text-lg font-medium">No test suites yet</div>
          <div className="text-slate-600 text-sm mt-2">Create your first suite to get started</div>
          <button onClick={() => setShowNew(true)} className="btn-primary mt-6">Create Suite</button>
        </div>
      ) : (
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
      )}

      {/* Recent Runs */}
      {recentRuns.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Recent Runs</h2>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  {['Suite', 'Status', 'Tests', 'Started', 'Duration'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-slate-400 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentRuns.map(run => {
                  const duration = run.completedAt
                    ? ((new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()) / 1000).toFixed(1) + 's'
                    : '–';
                  return (
                    <tr
                      key={run.id}
                      onClick={() => { setView('runs'); }}
                      className="border-b border-slate-700/50 hover:bg-slate-700/30 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 text-slate-200">{run.suiteName}</td>
                      <td className="px-4 py-3"><span className={`badge-${run.status}`}>{run.status}</span></td>
                      <td className="px-4 py-3 text-slate-400">{run.results.length}</td>
                      <td className="px-4 py-3 text-slate-400">{new Date(run.startedAt).toLocaleString()}</td>
                      <td className="px-4 py-3 text-slate-400">{duration}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function SuiteCard({ suite, runs, onOpen, onDelete }: {
  suite: TestSuite;
  runs: any[];
  onOpen: () => void;
  onDelete: () => void;
}) {
  const lastRun = runs[0];
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="card p-5 hover:border-slate-600 transition-all group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onOpen}>
          <h3 className="font-semibold text-white text-sm truncate group-hover:text-blue-400 transition-colors">{suite.name}</h3>
          {suite.description && (
            <p className="text-slate-500 text-xs mt-1 line-clamp-2">{suite.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1 ml-2 shrink-0">
          <a
            href={getExportUrl(suite.id)}
            download
            onClick={e => e.stopPropagation()}
            title="Download as GitHub-ready project"
            className="btn-ghost p-1.5 text-xs"
          >↓</a>
          {confirmDelete ? (
            <>
              <button onClick={() => { onDelete(); setConfirmDelete(false); }} className="btn-danger text-xs px-2 py-1">Confirm</button>
              <button onClick={() => setConfirmDelete(false)} className="btn-ghost text-xs px-2 py-1">Cancel</button>
            </>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="btn-ghost p-1.5 text-xs text-red-400 hover:text-red-300">✕</button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
        <span>📋 {suite.tests.length} tests</span>
        <span>📦 {suite.pageObjects.length} page objects</span>
        <span>🌐 {suite.executionOptions.browsers.join(', ')}</span>
      </div>

      {lastRun && (
        <div className="flex items-center gap-2 pt-3 border-t border-slate-700">
          <span className="text-xs text-slate-500">Last run:</span>
          <span className={`badge-${lastRun.status}`}>{lastRun.status}</span>
          <span className="text-xs text-slate-600 ml-auto">
            {new Date(lastRun.startedAt).toLocaleDateString()}
          </span>
        </div>
      )}

      <button onClick={onOpen} className="btn-secondary w-full mt-3 text-xs">
        Open Builder →
      </button>
    </div>
  );
}
