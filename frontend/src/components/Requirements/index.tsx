import React, { useEffect, useState, useRef } from 'react';
import { useStore } from '../../store/useStore';
import { importRequirements, exportRequirementsUrl } from '../../api/client';
import type { Requirement, RequirementStatus, RequirementPriority } from '../../types';

const STATUS_COLORS: Record<RequirementStatus, string> = {
  draft: 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-700/60 dark:text-slate-400 dark:border-slate-600',
  approved: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/60 dark:text-blue-300 dark:border-blue-700',
  implemented: 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/60 dark:text-amber-300 dark:border-amber-700',
  verified: 'bg-green-50 text-green-600 border-green-200 dark:bg-green-900/60 dark:text-green-300 dark:border-green-700',
};

const PRIORITY_COLORS: Record<RequirementPriority, string> = {
  low: 'text-slate-400', medium: 'text-amber-400', high: 'text-orange-400', critical: 'text-red-400',
};

const EMPTY_REQ: Partial<Requirement> = {
  title: '', description: '', priority: 'medium', status: 'draft',
  tags: [], linkedTestIds: [], linkedApiCollectionIds: [],
};

export default function Requirements() {
  const {
    requirements, suites, apiCollections,
    fetchRequirements, fetchApiCollections,
    createRequirement, updateRequirement, deleteRequirement,
  } = useStore();
  const [editing, setEditing] = useState<Partial<Requirement> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState<RequirementStatus | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<RequirementPriority | 'all'>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [importError, setImportError] = useState('');
  const [tagInput, setTagInput] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchRequirements();
    fetchApiCollections();
  }, []);

  const filtered = requirements.filter(r =>
    (filterStatus === 'all' || r.status === filterStatus) &&
    (filterPriority === 'all' || r.priority === filterPriority)
  );

  function openNew() { setEditing({ ...EMPTY_REQ }); setIsNew(true); setTagInput(''); }
  function openEdit(r: Requirement) { setEditing({ ...r }); setIsNew(false); setTagInput(''); }

  async function handleSave() {
    if (!editing?.title?.trim()) return;
    setSaving(true);
    try {
      if (isNew) await createRequirement(editing);
      else await updateRequirement(editing.id!, editing);
      setEditing(null);
    } finally { setSaving(false); }
  }

  function addTag() {
    const tag = tagInput.trim();
    if (!tag) return;
    setEditing(p => ({ ...p, tags: [...(p?.tags ?? []), tag] }));
    setTagInput('');
  }

  function removeTag(tag: string) {
    setEditing(p => ({ ...p, tags: (p?.tags ?? []).filter(t => t !== tag) }));
  }

  function toggleLinkedTest(suiteId: string, testId: string) {
    const key = `${suiteId}::${testId}`;
    setEditing(p => {
      const linked = p?.linkedTestIds ?? [];
      return { ...p, linkedTestIds: linked.includes(key) ? linked.filter(id => id !== key) : [...linked, key] };
    });
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError('');
    try {
      const format = file.name.endsWith('.csv') ? 'csv' : 'json';
      const content = await toBase64(file);
      const result = await importRequirements(format, content);
      await fetchRequirements();
      alert(`Imported ${result.imported} requirement(s).`);
    } catch (err: any) {
      setImportError(err.response?.data?.error ?? err.message);
    }
    e.target.value = '';
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main list */}
      <div className={`flex-1 flex flex-col overflow-hidden ${editing ? 'border-r border-slate-800' : ''}`}>
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/50 flex-shrink-0">
          <h1 className="text-sm font-semibold text-slate-900 dark:text-white">Requirements</h1>
          <span className="text-xs text-slate-500">{requirements.length} total</span>
          <div className="flex-1" />
          {importError && <span className="text-xs text-red-400">{importError}</span>}
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)} className="input text-xs py-1 px-2">
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="approved">Approved</option>
            <option value="implemented">Implemented</option>
            <option value="verified">Verified</option>
          </select>
          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value as any)} className="input text-xs py-1 px-2">
            <option value="all">All priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <a href={exportRequirementsUrl('csv')} className="btn-secondary text-xs py-1 px-2">Export CSV</a>
          <a href={exportRequirementsUrl('json')} className="btn-secondary text-xs py-1 px-2">Export JSON</a>
          <input ref={fileRef} type="file" accept=".json,.csv" className="hidden" onChange={handleImport} />
          <button onClick={() => fileRef.current?.click()} className="btn-secondary text-xs py-1 px-2">Import</button>
          <button onClick={openNew} className="btn-primary text-xs py-1.5 px-3">+ New Requirement</button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-600">
              <div className="text-4xl mb-3">📝</div>
              <div className="text-sm">No requirements found</div>
              <button onClick={openNew} className="btn-primary mt-4 text-sm">Add first requirement</button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-left">
                  <th className="px-4 py-2 text-xs text-slate-500 font-medium">Title</th>
                  <th className="px-4 py-2 text-xs text-slate-500 font-medium w-24">Status</th>
                  <th className="px-4 py-2 text-xs text-slate-500 font-medium w-20">Priority</th>
                  <th className="px-4 py-2 text-xs text-slate-500 font-medium">Tags</th>
                  <th className="px-4 py-2 text-xs text-slate-500 font-medium w-24">Links</th>
                  <th className="px-4 py-2 text-xs text-slate-500 font-medium w-12"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(req => (
                  <tr
                    key={req.id}
                    onClick={() => openEdit(req)}
                    className={`border-b border-slate-200 dark:border-slate-800/60 cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                      editing?.id === req.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                  >
                    <td className="px-4 py-2.5">
                      <div className="text-slate-800 dark:text-slate-200 font-medium">{req.title}</div>
                      {req.description && (
                        <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{req.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded border ${STATUS_COLORS[req.status]}`}>
                        {req.status}
                      </span>
                    </td>
                    <td className={`px-4 py-2.5 text-xs font-medium ${PRIORITY_COLORS[req.priority]}`}>
                      {req.priority}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {req.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded">{tag}</span>
                        ))}
                        {req.tags.length > 3 && <span className="text-xs text-slate-600">+{req.tags.length - 3}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">
                      {req.linkedTestIds.length > 0 && <span>🧪 {req.linkedTestIds.length}</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <button
                        onClick={e => { e.stopPropagation(); setConfirmDeleteId(req.id); }}
                        className="text-slate-600 hover:text-red-400 text-xs transition-colors"
                      >✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Edit panel */}
      {editing && (
          <div className="w-[420px] flex-shrink-0 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-900/30">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
            <span className="text-sm font-semibold text-slate-900 dark:text-white">{isNew ? 'New Requirement' : 'Edit Requirement'}</span>
            <button onClick={() => setEditing(null)} className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-lg">×</button>
          </div>
          <div className="flex-1 px-4 py-4 space-y-4 overflow-y-auto">
            <RField label="Title *">
              <input className="input w-full" value={editing.title ?? ''} onChange={e => setEditing(p => ({ ...p, title: e.target.value }))} placeholder="Requirement title" />
            </RField>
            <RField label="Description">
              <textarea className="input w-full h-24 resize-none" value={editing.description ?? ''} onChange={e => setEditing(p => ({ ...p, description: e.target.value }))} placeholder="Detailed description" />
            </RField>
            <div className="grid grid-cols-2 gap-3">
              <RField label="Priority">
                <select className="input w-full" value={editing.priority ?? 'medium'} onChange={e => setEditing(p => ({ ...p, priority: e.target.value as RequirementPriority }))}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </RField>
              <RField label="Status">
                <select className="input w-full" value={editing.status ?? 'draft'} onChange={e => setEditing(p => ({ ...p, status: e.target.value as RequirementStatus }))}>
                  <option value="draft">Draft</option>
                  <option value="approved">Approved</option>
                  <option value="implemented">Implemented</option>
                  <option value="verified">Verified</option>
                </select>
              </RField>
            </div>
            <RField label="Tags">
              <div className="flex flex-wrap gap-1 mb-2">
                {(editing.tags ?? []).map(tag => (
                    <span key={tag} className="flex items-center gap-1 text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded">
                    {tag}
                    <button onClick={() => removeTag(tag)} className="text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400">×</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-1">
                <input
                  className="input flex-1 text-xs py-1 px-2"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addTag(); }}
                  placeholder="Add tag (press Enter)"
                />
                <button onClick={addTag} className="btn-secondary text-xs py-1 px-2">Add</button>
              </div>
            </RField>
            <RField label="Linked Tests">
              <div className="space-y-1 max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg p-2">
                {suites.map(suite => (
                  <div key={suite.id}>
                    <div className="text-xs text-slate-500 font-medium mb-1">{suite.name}</div>
                    {suite.tests.map(test => {
                      const key = `${suite.id}::${test.id}`;
                      return (
                        <label key={test.id} className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 cursor-pointer ml-2">
                          <input
                            type="checkbox"
                            checked={(editing.linkedTestIds ?? []).includes(key)}
                            onChange={() => toggleLinkedTest(suite.id, test.id)}
                          />
                          {test.name}
                        </label>
                      );
                    })}
                    {suite.tests.length === 0 && <div className="text-xs text-slate-600 ml-2">No tests</div>}
                  </div>
                ))}
                {suites.length === 0 && <div className="text-xs text-slate-600">No suites available</div>}
              </div>
            </RField>
            <RField label="Linked API Collections">
              <div className="space-y-1 max-h-32 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg p-2">
                {apiCollections.map(col => (
                  <label key={col.id} className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(editing.linkedApiCollectionIds ?? []).includes(col.id)}
                      onChange={e => setEditing(p => ({
                        ...p,
                        linkedApiCollectionIds: e.target.checked
                          ? [...(p?.linkedApiCollectionIds ?? []), col.id]
                          : (p?.linkedApiCollectionIds ?? []).filter(id => id !== col.id),
                      }))}
                    />
                    {col.name}
                  </label>
                ))}
                {apiCollections.length === 0 && <div className="text-xs text-slate-600">No collections available</div>}
              </div>
            </RField>
          </div>
          <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
            <button onClick={() => setEditing(null)} className="btn-secondary text-xs">Cancel</button>
            <button onClick={handleSave} disabled={saving || !editing.title?.trim()} className="btn-primary text-xs">
              {saving ? 'Saving…' : isNew ? 'Create' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="card p-6 max-w-sm w-full">
            <h3 className="text-slate-900 dark:text-white font-semibold mb-2">Delete requirement?</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">This action cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDeleteId(null)} className="btn-secondary text-sm">Cancel</button>
              <button onClick={() => { deleteRequirement(confirmDeleteId); setConfirmDeleteId(null); if (editing?.id === confirmDeleteId) setEditing(null); }} className="btn-danger text-sm">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1">{label}</label>
      {children}
    </div>
  );
}

async function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
