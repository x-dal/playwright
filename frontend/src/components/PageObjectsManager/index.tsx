import React, { useState } from 'react';
import { useStore, selectActiveSuite } from '../../store/useStore';
import type { PageObject, Step } from '../../types';
import { PALETTE_ITEMS, genId } from '../StepPalette';

function emptyPO(): Omit<PageObject, 'id'> {
  return { name: '', description: '', steps: [], params: [] };
}

export default function PageObjectsManager() {
  const suite = useStore(selectActiveSuite);
  const { savePageObjects, activeSuiteId } = useStore();

  const [pageObjects, setPageObjects] = useState<PageObject[]>(suite?.pageObjects ?? []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const selected = pageObjects.find(po => po.id === selectedId);

  function update(id: string, patch: Partial<PageObject>) {
    setPageObjects(prev => prev.map(po => po.id === id ? { ...po, ...patch } : po));
    setDirty(true);
  }

  function addPO() {
    const id = genId();
    const po: PageObject = { id, ...emptyPO(), name: 'New Page Object' };
    setPageObjects(prev => [...prev, po]);
    setSelectedId(id);
    setDirty(true);
  }

  function removePO(id: string) {
    setPageObjects(prev => prev.filter(p => p.id !== id));
    if (selectedId === id) setSelectedId(null);
    setDirty(true);
  }

  function addStep(poId: string, type: string) {
    const item = PALETTE_ITEMS.find(p => p.type === type);
    if (!item) return;
    const step: Step = { ...item.make(), id: genId() } as Step;
    update(poId, { steps: [...(pageObjects.find(p => p.id === poId)?.steps ?? []), step] });
  }

  function removeStep(poId: string, stepId: string) {
    const po = pageObjects.find(p => p.id === poId);
    if (!po) return;
    update(poId, { steps: po.steps.filter(s => s.id !== stepId) });
  }

  function addParam(poId: string) {
    const po = pageObjects.find(p => p.id === poId);
    if (!po) return;
    update(poId, { params: [...po.params, `param${po.params.length + 1}`] });
  }

  function renameParam(poId: string, idx: number, name: string) {
    const po = pageObjects.find(p => p.id === poId);
    if (!po) return;
    const params = [...po.params];
    params[idx] = name;
    update(poId, { params });
  }

  function removeParam(poId: string, idx: number) {
    const po = pageObjects.find(p => p.id === poId);
    if (!po) return;
    update(poId, { params: po.params.filter((_, i) => i !== idx) });
  }

  async function save() {
    if (!activeSuiteId) return;
    setSaving(true);
    await savePageObjects(activeSuiteId, pageObjects);
    setDirty(false);
    setSaving(false);
  }

  return (
    <div className="h-full flex overflow-hidden">
      {/* PO list */}
      <div className="w-56 flex-shrink-0 border-r border-slate-200 dark:border-slate-800 flex flex-col">
        <div className="flex items-center justify-between px-3 py-3 border-b border-slate-200 dark:border-slate-800">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Page Objects</span>
          <button onClick={addPO} className="w-5 h-5 rounded flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 text-sm">+</button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {pageObjects.length === 0 ? (
            <div className="text-center text-slate-600 text-xs p-4">No page objects yet</div>
          ) : (
            pageObjects.map(po => (
              <div
                key={po.id}
                onClick={() => setSelectedId(po.id)}
                className={`group flex items-center gap-2 px-3 py-2.5 cursor-pointer border-b border-slate-200 dark:border-slate-800/50 transition-colors ${
                  selectedId === po.id ? 'bg-blue-50 dark:bg-blue-900/30 border-l-2 border-l-blue-500' : 'hover:bg-slate-100 dark:hover:bg-slate-800/50'
                }`}
              >
                <span className="text-base">📦</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-slate-700 dark:text-slate-300 truncate font-medium">{po.name || '(unnamed)'}</div>
                  <div className="text-xs text-slate-400 dark:text-slate-600">{po.steps.length} steps · {po.params.length} params</div>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); removePO(po.id); }}
                  className="hidden group-hover:flex w-4 h-4 items-center justify-center text-slate-600 hover:text-red-400 text-xs"
                >✕</button>
              </div>
            ))
          )}
        </div>
        {dirty && (
          <div className="p-3 border-t border-slate-200 dark:border-slate-800">
            <button onClick={save} disabled={saving} className="btn-primary w-full text-xs">
              {saving ? 'Saving…' : '💾 Save Changes'}
            </button>
          </div>
        )}
      </div>

      {/* PO editor */}
      {selected ? (
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Name</label>
              <input className="input w-full" value={selected.name} onChange={e => update(selected.id, { name: e.target.value })} placeholder="e.g. Login Flow" />
            </div>
            <div>
              <label className="label">Description</label>
              <input className="input w-full" value={selected.description} onChange={e => update(selected.id, { description: e.target.value })} placeholder="What does this page object do?" />
            </div>
          </div>

          {/* Parameters */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Parameters</label>
              <button onClick={() => addParam(selected.id)} className="text-xs text-blue-400 hover:text-blue-300">+ Add param</button>
            </div>
            {selected.params.length === 0 ? (
              <p className="text-xs text-slate-600">No parameters. Add params to make this reusable with different values.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {selected.params.map((p, i) => (
                  <div key={i} className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1">
                    <span className="text-xs text-slate-400 font-mono">{'{{'}
                    </span>
                    <input
                      className="bg-transparent text-xs text-blue-300 font-mono w-20 outline-none"
                      value={p}
                      onChange={e => renameParam(selected.id, i, e.target.value)}
                    />
                    <span className="text-xs text-slate-400 font-mono">{'}}'}</span>
                    <button onClick={() => removeParam(selected.id, i)} className="text-slate-600 hover:text-red-400 text-xs ml-1">✕</button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-slate-600 mt-1">Use {'{{paramName}}'} in step values to reference parameters.</p>
          </div>

          {/* Steps */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Steps ({selected.steps.length})</label>
              <div className="flex gap-1">
                {['navigate', 'click', 'type', 'assert'].map(t => (
                  <button key={t} onClick={() => addStep(selected.id, t)}
                    className="text-xs bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded px-2 py-1">+ {t}</button>
                ))}
              </div>
            </div>

            {selected.steps.length === 0 ? (
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 text-center text-slate-400 dark:text-slate-600 text-sm">
                Add steps using the buttons above
              </div>
            ) : (
              <div className="space-y-2">
                {selected.steps.map((step, idx) => (
                  <div key={step.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-700">
                    <span className="text-xs text-slate-400 dark:text-slate-600 w-5">{idx + 1}</span>
                    <span className="text-xs bg-slate-200 dark:bg-slate-700 rounded px-1.5 py-0.5 text-slate-600 dark:text-slate-300 font-mono shrink-0">{step.type}</span>
                    <input
                      className="input flex-1 text-xs"
                      value={step.name}
                      onChange={e => {
                        const updated = selected.steps.map(s => s.id === step.id ? { ...s, name: e.target.value } : s);
                        update(selected.id, { steps: updated });
                      }}
                      placeholder="Step name"
                    />
                    <button onClick={() => removeStep(selected.id, step.id)} className="text-slate-600 hover:text-red-400 text-xs">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Usage hint */}
          <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-lg p-4 text-xs text-slate-500">
            <div className="font-medium text-slate-600 dark:text-slate-400 mb-1">Usage</div>
            <p>Reference this page object in any test by adding a <span className="font-mono bg-slate-200 dark:bg-slate-800 px-1 rounded">pageObject</span> step and selecting <span className="text-slate-700 dark:text-slate-300">{selected.name}</span>.</p>
            {selected.params.length > 0 && (
              <p className="mt-1">Provide values for: <span className="text-blue-400 font-mono">{selected.params.map(p => `{{${p}}}`).join(', ')}</span></p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-slate-600">
          <div className="text-center">
            <div className="text-4xl mb-2">📦</div>
            <div className="text-sm">Select or create a page object</div>
          </div>
        </div>
      )}
    </div>
  );
}
