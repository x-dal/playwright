import React, { useState } from 'react';
import { useStore, selectActiveSuite } from '../../store/useStore';
import type { TestDataSet, DataColumn } from '../../types';
import { genId } from '../StepPalette';

export default function TestDataTable() {
  const suite = useStore(selectActiveSuite);
  const { saveDataSets, activeSuiteId } = useStore();

  const [dataSets, setDataSets] = useState<TestDataSet[]>(suite?.dataSets ?? []);
  const [selectedId, setSelectedId] = useState<string | null>(dataSets[0]?.id ?? null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const selected = dataSets.find(d => d.id === selectedId);

  function updateSet(id: string, patch: Partial<TestDataSet>) {
    setDataSets(prev => prev.map(d => d.id === id ? { ...d, ...patch } : d));
    setDirty(true);
  }

  function addDataSet() {
    const id = genId();
    const ds: TestDataSet = { id, name: 'Data Set', columns: [{ key: 'value', values: [''] }] };
    setDataSets(prev => [...prev, ds]);
    setSelectedId(id);
    setDirty(true);
  }

  function removeDataSet(id: string) {
    setDataSets(prev => prev.filter(d => d.id !== id));
    if (selectedId === id) setSelectedId(null);
    setDirty(true);
  }

  function addColumn() {
    if (!selected) return;
    const rowCount = Math.max(1, ...selected.columns.map(c => c.values.length));
    const col: DataColumn = { key: `col${selected.columns.length + 1}`, values: Array(rowCount).fill('') };
    updateSet(selected.id, { columns: [...selected.columns, col] });
  }

  function removeColumn(colIdx: number) {
    if (!selected) return;
    updateSet(selected.id, { columns: selected.columns.filter((_, i) => i !== colIdx) });
  }

  function renameColumn(colIdx: number, key: string) {
    if (!selected) return;
    const cols = selected.columns.map((c, i) => i === colIdx ? { ...c, key } : c);
    updateSet(selected.id, { columns: cols });
  }

  function addRow() {
    if (!selected) return;
    const cols = selected.columns.map(c => ({ ...c, values: [...c.values, ''] }));
    updateSet(selected.id, { columns: cols });
  }

  function removeRow(rowIdx: number) {
    if (!selected) return;
    const cols = selected.columns.map(c => ({ ...c, values: c.values.filter((_, i) => i !== rowIdx) }));
    updateSet(selected.id, { columns: cols });
  }

  function setCellValue(colIdx: number, rowIdx: number, value: string) {
    if (!selected) return;
    const cols = selected.columns.map((c, ci) => {
      if (ci !== colIdx) return c;
      const vals = [...c.values];
      vals[rowIdx] = value;
      return { ...c, values: vals };
    });
    updateSet(selected.id, { columns: cols });
  }

  async function save() {
    if (!activeSuiteId) return;
    setSaving(true);
    await saveDataSets(activeSuiteId, dataSets);
    setDirty(false);
    setSaving(false);
  }

  const rowCount = selected ? Math.max(0, ...selected.columns.map(c => c.values.length)) : 0;

  return (
    <div className="h-full flex overflow-hidden">
      {/* Dataset list */}
      <div className="w-52 flex-shrink-0 border-r border-slate-800 flex flex-col">
        <div className="flex items-center justify-between px-3 py-3 border-b border-slate-800">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Data Sets</span>
          <button onClick={addDataSet} className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 text-sm">+</button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {dataSets.length === 0 ? (
            <div className="text-center text-slate-600 text-xs p-4">No data sets yet</div>
          ) : (
            dataSets.map(ds => (
              <div
                key={ds.id}
                onClick={() => setSelectedId(ds.id)}
                className={`group flex items-center gap-2 px-3 py-2.5 cursor-pointer border-b border-slate-800/50 transition-colors ${
                  selectedId === ds.id ? 'bg-blue-900/30 border-l-2 border-l-blue-500' : 'hover:bg-slate-800/50'
                }`}
              >
                <span className="text-base">📊</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-slate-300 truncate font-medium">{ds.name}</div>
                  <div className="text-xs text-slate-600">{ds.columns.length} cols · {Math.max(0, ...ds.columns.map(c => c.values.length))} rows</div>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); removeDataSet(ds.id); }}
                  className="hidden group-hover:flex w-4 h-4 items-center justify-center text-slate-600 hover:text-red-400 text-xs"
                >✕</button>
              </div>
            ))
          )}
        </div>
        {dirty && (
          <div className="p-3 border-t border-slate-800">
            <button onClick={save} disabled={saving} className="btn-primary w-full text-xs">
              {saving ? 'Saving…' : '💾 Save'}
            </button>
          </div>
        )}
      </div>

      {/* Table editor */}
      {selected ? (
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Dataset header */}
          <div className="flex items-center gap-4 px-5 py-3 border-b border-slate-800 flex-shrink-0">
            <input
              className="input text-sm font-medium w-48"
              value={selected.name}
              onChange={e => updateSet(selected.id, { name: e.target.value })}
            />
            <span className="text-xs text-slate-500">{rowCount} rows · {selected.columns.length} columns</span>
            <div className="ml-auto flex gap-2">
              <button onClick={addColumn} className="btn-secondary text-xs">+ Column</button>
              <button onClick={addRow} className="btn-secondary text-xs">+ Row</button>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto p-4">
            {selected.columns.length === 0 ? (
              <div className="text-center text-slate-600 py-10">
                <div className="text-3xl mb-2">📊</div>
                <div>Add columns to define your test data</div>
                <button onClick={addColumn} className="btn-secondary mt-3 text-sm">+ Add Column</button>
              </div>
            ) : (
              <table className="min-w-full border-collapse">
                <thead>
                  <tr>
                    <th className="w-10 text-slate-600 text-xs px-2 py-2 border-b border-slate-700">#</th>
                    {selected.columns.map((col, ci) => (
                      <th key={ci} className="border-b border-slate-700 px-2 py-2 min-w-32">
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-slate-400 mr-1 font-mono">{'{{'}  </span>
                          <input
                            className="bg-transparent text-xs font-mono text-blue-300 outline-none border-b border-dashed border-slate-600 focus:border-blue-500 flex-1 min-w-0"
                            value={col.key}
                            onChange={e => renameColumn(ci, e.target.value)}
                          />
                          <span className="text-xs text-slate-400 font-mono">  {'}}'}</span>
                          <button onClick={() => removeColumn(ci)} className="text-slate-600 hover:text-red-400 text-xs ml-1">✕</button>
                        </div>
                      </th>
                    ))}
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: rowCount }).map((_, ri) => (
                    <tr key={ri} className="group hover:bg-slate-800/30">
                      <td className="text-xs text-slate-600 px-2 py-1.5 border-b border-slate-800 text-center">{ri + 1}</td>
                      {selected.columns.map((col, ci) => (
                        <td key={ci} className="border-b border-slate-800 px-2 py-1">
                          <input
                            className="bg-transparent w-full text-xs text-slate-200 outline-none focus:ring-1 focus:ring-blue-500 rounded px-1 py-0.5 font-mono"
                            value={col.values[ri] ?? ''}
                            onChange={e => setCellValue(ci, ri, e.target.value)}
                            placeholder="value"
                          />
                        </td>
                      ))}
                      <td className="border-b border-slate-800 px-1">
                        <button
                          onClick={() => removeRow(ri)}
                          className="hidden group-hover:flex w-5 h-5 items-center justify-center text-slate-600 hover:text-red-400 text-xs"
                        >✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Usage hint */}
          <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/20">
            <p className="text-xs text-slate-600">
              Reference columns in step values with <span className="font-mono text-blue-400">{'{{columnName}}'}</span>.
              Assign this data set to a test in the Test Steps view to run it for each row.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-slate-600">
          <div className="text-center">
            <div className="text-4xl mb-2">📊</div>
            <div className="text-sm">Select or create a data set</div>
            <button onClick={addDataSet} className="btn-secondary mt-3 text-sm">Create Data Set</button>
          </div>
        </div>
      )}
    </div>
  );
}
