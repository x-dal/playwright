import React, { useEffect, useState } from 'react';
import {
  DndContext, DragEndEvent, DragStartEvent,
  PointerSensor, useSensor, useSensors, DragOverlay, closestCenter,
  useDroppable,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useStore } from '../../store/useStore';
import type { Issue, IssueStatus, IssuePriority, IssueSeverity } from '../../types';

// ─── Constants ────────────────────────────────────────────────────────────────────────────────

const COLUMNS: { id: IssueStatus; label: string; accent: string }[] = [
  { id: 'open',        label: 'Open',        accent: 'bg-red-500' },
  { id: 'in-progress', label: 'In Progress', accent: 'bg-blue-500' },
  { id: 'resolved',    label: 'Resolved',    accent: 'bg-green-500' },
  { id: 'closed',      label: 'Closed',      accent: 'bg-slate-500' },
];

const STATUS_COLORS: Record<IssueStatus, string> = {
  open:          'bg-red-100 text-red-700 border border-red-200 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/40',
  'in-progress': 'bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/40',
  resolved:      'bg-green-100 text-green-700 border border-green-200 dark:bg-green-500/20 dark:text-green-300 dark:border-green-500/40',
  closed:        'bg-slate-100 text-slate-600 border border-slate-300 dark:bg-slate-600/40 dark:text-slate-400 dark:border-slate-500/40',
};

const PRIORITY_ICON: Record<IssuePriority, { symbol: string; color: string; label: string }> = {
  critical: { symbol: '▲▲', color: 'text-red-500 dark:text-red-400',    label: 'Critical' },
  high:     { symbol: '▲',      color: 'text-orange-500 dark:text-orange-400', label: 'High' },
  medium:   { symbol: '▬',      color: 'text-amber-500 dark:text-amber-400',   label: 'Medium' },
  low:      { symbol: '▼',      color: 'text-sky-500 dark:text-sky-400',       label: 'Low' },
};

const PRIORITY_BORDER: Record<IssuePriority, string> = {
  critical: 'border-l-red-500',
  high:     'border-l-orange-400',
  medium:   'border-l-amber-400',
  low:      'border-l-sky-400',
};

const SEVERITY_STYLE: Record<IssueSeverity, string> = {
  minor:    'bg-slate-200 text-slate-600 dark:bg-slate-700/60 dark:text-slate-400',
  major:    'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
  critical: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
  blocker:  'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
};

const EMPTY_FORM: Partial<Issue> = {
  title: '', description: '', status: 'open', priority: 'medium',
  severity: 'major', externalUrl: '',
};

function shortId(id: string) {
  return 'BUG-' + id.slice(0, 6).toUpperCase();
}

// ─── Main component ──────────────────────────────────────────────────────────────────────────────────

export default function BugTracker() {
  const { issues, fetchIssues, createIssue, updateIssue, deleteIssue } = useStore();
  const [view, setView] = useState<'list' | 'board'>('board');
  const [modal, setModal] = useState<{ issue: Partial<Issue>; isNew: boolean } | null>(null);
  const [filterPriority, setFilterPriority] = useState<IssuePriority | 'all'>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => { fetchIssues(); }, []);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const filtered = issues.filter(i => filterPriority === 'all' || i.priority === filterPriority);
  const activeIssue = activeId ? issues.find(i => i.id === activeId) : null;

  function openNew() { setModal({ issue: { ...EMPTY_FORM }, isNew: true }); }
  function openView(issue: Issue) { setModal({ issue: { ...issue }, isNew: false }); }

  async function handleSave(data: Partial<Issue>) {
    if (modal?.isNew) await createIssue(data);
    else await updateIssue(data.id!, data);
    await fetchIssues();
    setModal(null);
  }

  async function handleAutoSave(id: string, patch: Partial<Issue>) {
    await updateIssue(id, patch);
    await fetchIssues();
    setModal(m => m ? { ...m, issue: { ...m.issue, ...patch } } : null);
  }

  async function handleDelete(id: string) {
    await deleteIssue(id);
    await fetchIssues();
    setConfirmDeleteId(null);
    setModal(null);
  }

  function handleDragStart(e: DragStartEvent) { setActiveId(e.active.id as string); }

  async function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const dragged = issues.find(i => i.id === active.id);
    if (!dragged) return;
    const targetStatus = COLUMNS.find(c => c.id === over.id)?.id
      ?? issues.find(i => i.id === over.id)?.status;
    if (targetStatus && targetStatus !== dragged.status) {
      await updateIssue(dragged.id, { status: targetStatus });
      await fetchIssues();
    }
  }

  const openCount = issues.filter(i => i.status === 'open' || i.status === 'in-progress').length;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-[#0d1117]">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-5 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 flex-shrink-0">
        <h1 className="text-sm font-semibold text-slate-900 dark:text-white tracking-wide">Bug Tracker</h1>
        {openCount > 0 && (
          <span className="bg-red-600/80 text-white text-[10px] font-semibold rounded-full px-2 py-0.5">
            {openCount} open
          </span>
        )}
        <div className="flex-1" />
        <div className="flex rounded overflow-hidden border border-slate-300 dark:border-slate-700 text-xs">
          <button onClick={() => setView('list')}
            className={`px-3 py-1.5 transition-colors ${view === 'list' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-white'}`}
          >List</button>
          <button onClick={() => setView('board')}
            className={`px-3 py-1.5 transition-colors ${view === 'board' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-white'}`}
          >Board</button>
        </div>
        <select
          value={filterPriority}
          onChange={e => setFilterPriority(e.target.value as IssuePriority | 'all')}
          className="input text-xs py-1 pl-2 pr-6"
        >
          <option value="all">All priorities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <button onClick={openNew} className="btn-primary text-xs py-1.5 px-3">+ Create Issue</button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {view === 'board' ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <BoardView issues={filtered} onOpen={openView} onDelete={id => setConfirmDeleteId(id)} />
            <DragOverlay>
              {activeIssue ? <IssueCard issue={activeIssue} onOpen={() => {}} onDelete={() => {}} isDragging /> : null}
            </DragOverlay>
          </DndContext>
        ) : (
          <ListView issues={filtered} onOpen={openView} onDelete={id => setConfirmDeleteId(id)} />
        )}
      </div>

      {modal && (
        <IssueModal
          initial={modal.issue}
          isNew={modal.isNew}
          onSave={handleSave}
          onAutoSave={handleAutoSave}
          onDelete={modal.isNew ? undefined : () => setConfirmDeleteId(modal.issue.id!)}
          onClose={() => setModal(null)}
        />
      )}

      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-slate-900 dark:text-white font-semibold mb-1">Delete this issue?</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-5">This action cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDeleteId(null)} className="btn-secondary text-sm">Cancel</button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
              >Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Board view ──────────────────────────────────────────────────────────────────────────────────

function BoardView({ issues, onOpen, onDelete }: {
  issues: Issue[];
  onOpen: (i: Issue) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex gap-4 h-full overflow-x-auto px-5 py-4">
      {COLUMNS.map(col => {
        const colIssues = issues.filter(i => i.status === col.id);
        return <BoardColumn key={col.id} column={col} issues={colIssues} onOpen={onOpen} onDelete={onDelete} />;
      })}
    </div>
  );
}

function BoardColumn({ column, issues, onOpen, onDelete }: {
  column: typeof COLUMNS[number];
  issues: Issue[];
  onOpen: (i: Issue) => void;
  onDelete: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col w-72 flex-shrink-0 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700/60 transition-all ${isOver ? 'border-blue-500/60 shadow-lg shadow-blue-500/10' : ''}`}
    >
      <div className={`h-1 w-full flex-shrink-0 ${column.accent}`} />
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-100 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-700/40 flex-shrink-0">
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-200 uppercase tracking-wider">{column.label}</span>
        <span className={`ml-auto text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center ${column.accent} text-white leading-none`}>
          {issues.length}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-white/60 dark:bg-slate-800/30 min-h-[80px]">
        <SortableContext items={issues.map(i => i.id)} strategy={verticalListSortingStrategy}>
          {issues.map(issue => (
            <SortableIssueCard key={issue.id} issue={issue} onOpen={onOpen} onDelete={onDelete} />
          ))}
        </SortableContext>
        {issues.length === 0 && (
          <div className={`border-2 border-dashed rounded-lg py-8 text-center text-xs transition-colors ${isOver ? 'border-blue-500/40 text-blue-600' : 'border-slate-200 dark:border-slate-700/40 text-slate-400 dark:text-slate-700'}`}>
            Drop issues here
          </div>
        )}
      </div>
    </div>
  );
}

function SortableIssueCard({ issue, onOpen, onDelete }: {
  issue: Issue; onOpen: (i: Issue) => void; onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: issue.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <IssueCard issue={issue} onOpen={onOpen} onDelete={onDelete} />
    </div>
  );
}

function IssueCard({ issue, onOpen, onDelete, isDragging }: {
  issue: Issue;
  onOpen: (i: Issue) => void;
  onDelete: (id: string) => void;
  isDragging?: boolean;
}) {
  const p = PRIORITY_ICON[issue.priority];
  return (
    <div
      onClick={() => onOpen(issue)}
      className={`group relative rounded-lg bg-white dark:bg-slate-800 border-l-[3px] ${PRIORITY_BORDER[issue.priority]} border border-t-slate-200 border-r-slate-200 border-b-slate-200 dark:border-t-slate-700/50 dark:border-r-slate-700/50 dark:border-b-slate-700/50 cursor-pointer select-none transition-all ${isDragging ? 'shadow-2xl ring-2 ring-blue-500/60 opacity-90' : 'hover:shadow-md hover:shadow-black/10 hover:-translate-y-px hover:border-t-slate-300 dark:hover:border-t-slate-600'}`}
    >
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 font-semibold tracking-wide">{shortId(issue.id)}</span>
          <div className="flex items-center gap-1.5">
            <span className={`text-[11px] font-bold leading-none ${p.color}`} title={p.label}>{p.symbol}</span>
            <button
              onClick={e => { e.stopPropagation(); onDelete(issue.id); }}
              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 text-xs leading-none transition-all"
            >✕</button>
          </div>
        </div>
        <p className="text-sm text-slate-800 dark:text-slate-200 font-medium leading-snug line-clamp-2 mb-3">{issue.title}</p>
        {issue.testName && (
          <div className="flex items-center gap-1 text-[11px] text-slate-500 mb-2.5 truncate">
            <span className="flex-shrink-0">🔗</span>
            <span className="truncate">{issue.testName}</span>
          </div>
        )}
        <div className="flex items-center justify-between gap-2">
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide ${SEVERITY_STYLE[issue.severity]}`}>
            {issue.severity}
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-600">
            {new Date(issue.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── List view ──────────────────────────────────────────────────────────────────────────────────

function ListView({ issues, onOpen, onDelete }: {
  issues: Issue[];
  onOpen: (i: Issue) => void;
  onDelete: (id: string) => void;
}) {
  if (issues.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-600 gap-2">
        <span className="text-5xl">🐛</span>
        <span className="text-sm">No issues found</span>
      </div>
    );
  }
  return (
    <div className="overflow-y-auto h-full">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur z-10">
            <th className="px-4 py-2.5 text-left text-[11px] text-slate-500 font-semibold uppercase tracking-wider w-24">Key</th>
            <th className="px-4 py-2.5 text-left text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Summary</th>
            <th className="px-4 py-2.5 text-left text-[11px] text-slate-500 font-semibold uppercase tracking-wider w-28">Status</th>
            <th className="px-4 py-2.5 text-left text-[11px] text-slate-500 font-semibold uppercase tracking-wider w-24">Priority</th>
            <th className="px-4 py-2.5 text-left text-[11px] text-slate-500 font-semibold uppercase tracking-wider w-20">Severity</th>
            <th className="px-4 py-2.5 text-left text-[11px] text-slate-500 font-semibold uppercase tracking-wider w-28">Created</th>
            <th className="w-8" />
          </tr>
        </thead>
        <tbody>
          {issues.map(issue => {
            const p = PRIORITY_ICON[issue.priority];
            return (
              <tr key={issue.id} onClick={() => onOpen(issue)}
                className="border-b border-slate-100 dark:border-slate-800/50 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group">
                <td className="px-4 py-3 font-mono text-[11px] text-blue-600 dark:text-blue-400 font-semibold">{shortId(issue.id)}</td>
                <td className="px-4 py-3">
                  <div className="text-slate-800 dark:text-slate-200 font-medium text-sm">{issue.title}</div>
                  {issue.testName && <div className="text-[11px] text-slate-500 mt-0.5">🔗 {issue.testName}</div>}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[issue.status]}`}>
                    {issue.status === 'in-progress' ? 'In Progress' : issue.status.charAt(0).toUpperCase() + issue.status.slice(1)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`flex items-center gap-1.5 text-xs font-semibold ${p.color}`}>
                    <span>{p.symbol}</span><span>{p.label}</span>
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase ${SEVERITY_STYLE[issue.severity]}`}>
                    {issue.severity}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {new Date(issue.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </td>
                <td className="px-2 py-3">
                  <button onClick={e => { e.stopPropagation(); onDelete(issue.id); }}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 text-xs transition-all">
                    ✕
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Issue modal (Jira-style) ─────────────────────────────────────────────────────────────────────────────

function IssueModal({ initial, isNew, onSave, onAutoSave, onDelete, onClose }: {
  initial: Partial<Issue>;
  isNew: boolean;
  onSave: (data: Partial<Issue>) => Promise<void>;
  onAutoSave?: (id: string, patch: Partial<Issue>) => Promise<void>;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Partial<Issue>>(initial);
  const [editMode, setEditMode] = useState(isNew);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!draft.title?.trim()) return;
    setSaving(true);
    try { await onSave(draft); } finally { setSaving(false); }
  }

  function handleCancel() {
    if (isNew) { onClose(); return; }
    setDraft(initial);
    setEditMode(false);
  }

  async function handleSidebarChange(patch: Partial<Issue>) {
    setDraft(d => ({ ...d, ...patch }));
    if (!isNew && initial.id && onAutoSave) {
      await onAutoSave(initial.id, patch);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm overflow-y-auto py-8 px-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-[#161b22] border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden">

        {/* Modal header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-200 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-900/60 flex-shrink-0">
          <span className="text-[11px] font-mono font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-0.5 flex-shrink-0">
            {isNew ? 'NEW' : shortId(draft.id ?? '')}
          </span>
          <div className={`text-[11px] font-semibold rounded-full px-3 py-1 ${STATUS_COLORS[draft.status ?? 'open']}`}>
            {draft.status === 'in-progress' ? 'In Progress' : ((draft.status ?? 'open').charAt(0).toUpperCase() + (draft.status ?? 'open').slice(1))}
          </div>
          <div className="flex-1" />
          {!editMode ? (
            <>
              <button
                onClick={() => setEditMode(true)}
                className="text-xs font-medium text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 px-3 py-1.5 rounded-lg transition-colors"
              >✎ Edit</button>
              {onDelete && (
                <button onClick={onDelete}
                  className="text-xs text-slate-500 hover:text-red-600 dark:hover:text-red-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors">
                  Delete
                </button>
              )}
            </>
          ) : (
            <>
              <button onClick={handleSave} disabled={saving || !draft.title?.trim()}
                className="text-xs font-semibold bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white px-4 py-1.5 rounded-lg transition-colors">
                {saving ? 'Saving...' : isNew ? 'Create Issue' : 'Save Changes'}
              </button>
              <button onClick={handleCancel}
                className="text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                Cancel
              </button>
            </>
          )}
          <button onClick={onClose}
            className="text-slate-400 hover:text-slate-900 dark:text-slate-500 dark:hover:text-white text-xl leading-none w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ml-1">
            ×
          </button>
        </div>

        {/* Modal body */}
        <div className="flex min-h-[420px]">

          {/* Left: main content */}
          <div className="flex-1 px-8 py-6 space-y-6 overflow-y-auto border-r border-slate-200 dark:border-slate-700/40">

            {/* Title */}
            <div>
              {editMode ? (
                <input
                  className="w-full bg-transparent border-0 border-b-2 border-blue-500 text-xl font-semibold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none pb-1"
                  value={draft.title ?? ''}
                  onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
                  placeholder="Issue title..."
                  autoFocus
                />
              ) : (
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white leading-snug">
                  {draft.title || <span className="text-slate-400 dark:text-slate-600 italic text-base">No title</span>}
                </h2>
              )}
            </div>

            {/* Description */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Description</p>
              {editMode ? (
                <textarea
                  className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 p-3 resize-none focus:outline-none focus:border-blue-500 transition-colors h-36"
                  value={draft.description ?? ''}
                  onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
                  placeholder="Add a description..."
                />
              ) : draft.description ? (
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{draft.description}</p>
              ) : (
                <p onClick={() => setEditMode(true)}
                  className="text-sm text-slate-400 dark:text-slate-700 italic cursor-pointer hover:text-slate-600 dark:hover:text-slate-500 transition-colors py-2">
                  Click Edit to add a description...
                </p>
              )}
            </div>

            {/* Error log (read-only) */}
            {draft.errorMessage && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Error Log</p>
                <pre className="text-xs text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg p-3 overflow-auto max-h-40 whitespace-pre-wrap font-mono leading-relaxed">
                  {draft.errorMessage}
                </pre>
              </div>
            )}

            {/* External URL */}
            {editMode && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">External Link</p>
                <input
                  className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 px-3 py-2 focus:outline-none focus:border-blue-500 transition-colors"
                  value={draft.externalUrl ?? ''}
                  onChange={e => setDraft(d => ({ ...d, externalUrl: e.target.value }))}
                  placeholder="https://github.com/org/repo/issues/123"
                />
              </div>
            )}
            {!editMode && draft.externalUrl && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">External Link</p>
                <a href={draft.externalUrl} target="_blank" rel="noreferrer"
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline break-all">
                  {draft.externalUrl}
                </a>
              </div>
            )}
          </div>

          {/* Right: sidebar */}
          <div className="w-64 flex-shrink-0 px-5 py-6 space-y-5 bg-slate-50 dark:bg-slate-900/30 overflow-y-auto">
            <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Details</p>

            <SidebarField label="Status">
              <select
                value={draft.status ?? 'open'}
                onChange={e => handleSidebarChange({ status: e.target.value as IssueStatus })}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-800 dark:text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="open">Open</option>
                <option value="in-progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </SidebarField>

            <SidebarField label="Priority">
              <select
                value={draft.priority ?? 'medium'}
                onChange={e => handleSidebarChange({ priority: e.target.value as IssuePriority })}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-800 dark:text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </SidebarField>

            <SidebarField label="Severity">
              <select
                value={draft.severity ?? 'major'}
                onChange={e => handleSidebarChange({ severity: e.target.value as IssueSeverity })}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-800 dark:text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="blocker">Blocker</option>
                <option value="critical">Critical</option>
                <option value="major">Major</option>
                <option value="minor">Minor</option>
              </select>
            </SidebarField>

            {draft.testName && (
              <SidebarField label="Linked Test">
                <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2">
                  <span className="flex-shrink-0 text-slate-500">🔗</span>
                  <span className="truncate">{draft.testName}</span>
                </div>
              </SidebarField>
            )}

            {!isNew && initial.createdAt && (
              <SidebarField label="Created">
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {new Date(initial.createdAt as string).toLocaleDateString('en-US', {
                    month: 'long', day: 'numeric', year: 'numeric',
                  })}
                </span>
              </SidebarField>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-600 uppercase tracking-wider">{label}</p>
      {children}
    </div>
  );
}
