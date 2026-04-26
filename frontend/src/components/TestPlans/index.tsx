import React, { useEffect, useState, useRef } from 'react';
import { useStore } from '../../store/useStore';
import { importTestPlans, exportTestPlansUrl } from '../../api/client';
import type { TestPlan, TestStrategy, TestLevel } from '../../types';

const LEVEL_OPTIONS: TestLevel[] = ['unit', 'integration', 'system', 'acceptance'];

// ─── Test Plans ───────────────────────────────────────────────────────────────

const EMPTY_PLAN: Partial<TestPlan> = {
  name: '', objective: '', scope: '', entryCriteria: '',
  exitCriteria: '', resources: '', schedule: '', associatedSuiteIds: [],
};

export default function TestPlans() {
  const [tab, setTab] = useState<'plans' | 'strategies'>('plans');

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-1 px-6 py-2 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/50 flex-shrink-0">
        <h1 className="text-sm font-semibold text-slate-900 dark:text-white mr-4">Test Management</h1>
        {(['plans', 'strategies'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-xs rounded-md font-medium transition-all ${
              tab === t ? 'bg-blue-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {t === 'plans' ? 'Test Plans' : 'Test Strategies'}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-hidden">
        {tab === 'plans' ? <PlansTab /> : <StrategiesTab />}
      </div>
    </div>
  );
}

// ─── Plans Tab ────────────────────────────────────────────────────────────────

function PlansTab() {
  const { testPlans, suites, fetchTestPlans, createTestPlan, updateTestPlan, deleteTestPlan } = useStore();
  const [editing, setEditing] = useState<Partial<TestPlan> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [importError, setImportError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchTestPlans(); }, []);

  function openNew() { setEditing({ ...EMPTY_PLAN }); setIsNew(true); }
  function openEdit(p: TestPlan) { setEditing({ ...p }); setIsNew(false); }

  async function handleSave() {
    if (!editing?.name?.trim()) return;
    setSaving(true);
    try {
      if (isNew) await createTestPlan(editing);
      else await updateTestPlan(editing.id!, editing);
      setEditing(null);
    } finally { setSaving(false); }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError('');
    try {
      const format = file.name.endsWith('.csv') ? 'csv' : 'json';
      const content = await toBase64(file);
      const result = await importTestPlans(format, content);
      await fetchTestPlans();
      alert(`Imported ${result.imported} test plan(s).`);
    } catch (err: any) {
      setImportError(err.response?.data?.error ?? err.message);
    }
    e.target.value = '';
  }

  return (
    <div className="flex h-full overflow-hidden">
      <div className={`flex-1 flex flex-col overflow-hidden ${editing ? 'border-r border-slate-200 dark:border-slate-800' : ''}`}>
        {/* List toolbar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
          <span className="text-xs text-slate-500 dark:text-slate-400">{testPlans.length} plan(s)</span>
          <div className="flex-1" />
          {importError && <span className="text-xs text-red-400">{importError}</span>}
          <a href={exportTestPlansUrl('csv')} className="btn-secondary text-xs py-1 px-2">Export CSV</a>
          <a href={exportTestPlansUrl('json')} className="btn-secondary text-xs py-1 px-2">Export JSON</a>
          <input ref={fileRef} type="file" accept=".json,.csv" className="hidden" onChange={handleImport} />
          <button onClick={() => fileRef.current?.click()} className="btn-secondary text-xs py-1 px-2">Import</button>
          <button onClick={openNew} className="btn-primary text-xs py-1.5 px-3">+ New Plan</button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {testPlans.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-600">
              <div className="text-4xl mb-3">📋</div>
              <div className="text-sm">No test plans yet</div>
              <button onClick={openNew} className="btn-primary mt-4 text-sm">Create first plan</button>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800/60">
              {testPlans.map(plan => (
                <div
                  key={plan.id}
                  onClick={() => openEdit(plan)}
                  className={`px-4 py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                    editing?.id === plan.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{plan.name}</div>
                      {plan.objective && (
                        <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{plan.objective}</div>
                      )}
                      <div className="text-xs text-slate-600 mt-1 flex gap-3">
                        {plan.schedule && <span>📅 {plan.schedule}</span>}
                        {plan.associatedSuiteIds.length > 0 && (
                          <span>📦 {plan.associatedSuiteIds.length} suite(s)</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        onClick={e => { e.stopPropagation(); setConfirmDeleteId(plan.id); }}
                        className="text-slate-600 hover:text-red-400 text-xs transition-colors"
                      >✕</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit panel */}
      {editing && (
        <div className="w-[480px] flex-shrink-0 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-900/30">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
            <span className="text-sm font-semibold text-slate-900 dark:text-white">{isNew ? 'New Test Plan' : 'Edit Test Plan'}</span>
            <button onClick={() => setEditing(null)} className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-lg">×</button>
          </div>
          <div className="flex-1 px-4 py-4 space-y-4 overflow-y-auto">
            <PField label="Name *">
              <input className="input w-full" value={editing.name ?? ''} onChange={e => setEditing(p => ({ ...p, name: e.target.value }))} placeholder="Test plan name" />
            </PField>
            <PField label="Objective">
              <textarea className="input w-full h-20 resize-none" value={editing.objective ?? ''} onChange={e => setEditing(p => ({ ...p, objective: e.target.value }))} placeholder="What are we trying to achieve?" />
            </PField>
            <PField label="Scope">
              <textarea className="input w-full h-20 resize-none" value={editing.scope ?? ''} onChange={e => setEditing(p => ({ ...p, scope: e.target.value }))} placeholder="What is in / out of scope?" />
            </PField>
            <div className="grid grid-cols-2 gap-3">
              <PField label="Entry Criteria">
                <textarea className="input w-full h-20 resize-none" value={editing.entryCriteria ?? ''} onChange={e => setEditing(p => ({ ...p, entryCriteria: e.target.value }))} placeholder="Conditions before testing starts" />
              </PField>
              <PField label="Exit Criteria">
                <textarea className="input w-full h-20 resize-none" value={editing.exitCriteria ?? ''} onChange={e => setEditing(p => ({ ...p, exitCriteria: e.target.value }))} placeholder="Conditions to conclude testing" />
              </PField>
            </div>
            <PField label="Resources">
              <input className="input w-full" value={editing.resources ?? ''} onChange={e => setEditing(p => ({ ...p, resources: e.target.value }))} placeholder="Team, tools, environments…" />
            </PField>
            <PField label="Schedule">
              <input className="input w-full" value={editing.schedule ?? ''} onChange={e => setEditing(p => ({ ...p, schedule: e.target.value }))} placeholder="e.g. Sprint 5, Week 2–3" />
            </PField>
            <PField label="Associated Suites">
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {suites.map(s => (
                  <label key={s.id} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(editing.associatedSuiteIds ?? []).includes(s.id)}
                      onChange={e => setEditing(p => ({
                        ...p,
                        associatedSuiteIds: e.target.checked
                          ? [...(p?.associatedSuiteIds ?? []), s.id]
                          : (p?.associatedSuiteIds ?? []).filter(id => id !== s.id),
                      }))}
                    />
                    {s.name}
                  </label>
                ))}
                {suites.length === 0 && <div className="text-xs text-slate-600">No suites available</div>}
              </div>
            </PField>
          </div>
          <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
            <button onClick={() => setEditing(null)} className="btn-secondary text-xs">Cancel</button>
            <button onClick={handleSave} disabled={saving || !editing.name?.trim()} className="btn-primary text-xs">
              {saving ? 'Saving…' : isNew ? 'Create Plan' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {confirmDeleteId && (
        <ConfirmDelete onCancel={() => setConfirmDeleteId(null)} onConfirm={() => { deleteTestPlan(confirmDeleteId); setConfirmDeleteId(null); if (editing?.id === confirmDeleteId) setEditing(null); }} />
      )}
    </div>
  );
}

// ─── Strategies Tab ───────────────────────────────────────────────────────────

const EMPTY_STRATEGY: Partial<TestStrategy> = {
  name: '', approach: '', testLevels: [], tools: '', riskAnalysis: '', notes: '',
};

function StrategiesTab() {
  const { testStrategies, fetchTestStrategies, createTestStrategy, updateTestStrategy, deleteTestStrategy } = useStore();
  const [editing, setEditing] = useState<Partial<TestStrategy> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => { fetchTestStrategies(); }, []);

  function openNew() { setEditing({ ...EMPTY_STRATEGY }); setIsNew(true); }
  function openEdit(s: TestStrategy) { setEditing({ ...s }); setIsNew(false); }

  async function handleSave() {
    if (!editing?.name?.trim()) return;
    setSaving(true);
    try {
      if (isNew) await createTestStrategy(editing);
      else await updateTestStrategy(editing.id!, editing);
      setEditing(null);
    } finally { setSaving(false); }
  }

  function toggleLevel(level: TestLevel) {
    setEditing(p => {
      const levels = p?.testLevels ?? [];
      return { ...p, testLevels: levels.includes(level) ? levels.filter(l => l !== level) : [...levels, level] };
    });
  }

  return (
    <div className="flex h-full overflow-hidden">
      <div className={`flex-1 flex flex-col overflow-hidden ${editing ? 'border-r border-slate-200 dark:border-slate-800' : ''}`}>
        <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
          <span className="text-xs text-slate-500 dark:text-slate-400">{testStrategies.length} strategy(ies)</span>
          <div className="flex-1" />
          <button onClick={openNew} className="btn-primary text-xs py-1.5 px-3">+ New Strategy</button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {testStrategies.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-600">
              <div className="text-4xl mb-3">🗺</div>
              <div className="text-sm">No test strategies yet</div>
              <button onClick={openNew} className="btn-primary mt-4 text-sm">Create first strategy</button>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800/60">
              {testStrategies.map(strat => (
                <div
                  key={strat.id}
                  onClick={() => openEdit(strat)}
                  className={`px-4 py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                    editing?.id === strat.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{strat.name}</div>
                      {strat.approach && <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{strat.approach}</div>}
                      <div className="flex flex-wrap gap-1 mt-1">
                        {strat.testLevels.map(l => (
                          <span key={l} className="text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded">{l}</span>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); setConfirmDeleteId(strat.id); }}
                      className="text-slate-600 hover:text-red-400 text-xs ml-2 transition-colors"
                    >✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {editing && (
        <div className="w-[480px] flex-shrink-0 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-900/30">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
            <span className="text-sm font-semibold text-slate-900 dark:text-white">{isNew ? 'New Strategy' : 'Edit Strategy'}</span>
            <button onClick={() => setEditing(null)} className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-lg">×</button>
          </div>
          <div className="flex-1 px-4 py-4 space-y-4 overflow-y-auto">
            <PField label="Name *">
              <input className="input w-full" value={editing.name ?? ''} onChange={e => setEditing(p => ({ ...p, name: e.target.value }))} placeholder="Strategy name" />
            </PField>
            <PField label="Approach">
              <textarea className="input w-full h-20 resize-none" value={editing.approach ?? ''} onChange={e => setEditing(p => ({ ...p, approach: e.target.value }))} placeholder="Overall testing approach and methodology" />
            </PField>
            <PField label="Test Levels">
              <div className="flex flex-wrap gap-2">
                {LEVEL_OPTIONS.map(level => (
                  <label key={level} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(editing.testLevels ?? []).includes(level)}
                      onChange={() => toggleLevel(level)}
                    />
                    {level}
                  </label>
                ))}
              </div>
            </PField>
            <PField label="Tools">
              <input className="input w-full" value={editing.tools ?? ''} onChange={e => setEditing(p => ({ ...p, tools: e.target.value }))} placeholder="e.g. Playwright, Jest, Postman" />
            </PField>
            <PField label="Risk Analysis">
              <textarea className="input w-full h-20 resize-none" value={editing.riskAnalysis ?? ''} onChange={e => setEditing(p => ({ ...p, riskAnalysis: e.target.value }))} placeholder="Known risks and mitigation strategies" />
            </PField>
            <PField label="Notes">
              <textarea className="input w-full h-20 resize-none" value={editing.notes ?? ''} onChange={e => setEditing(p => ({ ...p, notes: e.target.value }))} placeholder="Additional notes" />
            </PField>
          </div>
          <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
            <button onClick={() => setEditing(null)} className="btn-secondary text-xs">Cancel</button>
            <button onClick={handleSave} disabled={saving || !editing.name?.trim()} className="btn-primary text-xs">
              {saving ? 'Saving…' : isNew ? 'Create Strategy' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {confirmDeleteId && (
        <ConfirmDelete
          onCancel={() => setConfirmDeleteId(null)}
          onConfirm={() => { deleteTestStrategy(confirmDeleteId); setConfirmDeleteId(null); if (editing?.id === confirmDeleteId) setEditing(null); }}
        />
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function PField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">{label}</label>
      {children}
    </div>
  );
}

function ConfirmDelete({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="card p-6 max-w-sm w-full">
        <h3 className="text-slate-900 dark:text-white font-semibold mb-2">Delete?</h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">This action cannot be undone.</p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="btn-secondary text-sm">Cancel</button>
          <button onClick={onConfirm} className="btn-danger text-sm">Delete</button>
        </div>
      </div>
    </div>
  );
}

async function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
