import React, { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore';
import { useTheme, type Theme } from '../../store/useTheme';
import OnboardingWizard from '../OnboardingWizard';
import type { Project } from '../../types';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function StatChip({ label, value, color }: { label: string; value: number; color: string }) {
  if (!value) return null;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {value} {label}
    </span>
  );
}

function ProjectCard({ project, onOpen, onEdit, onDelete }: {
  project: Project;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const s = project.stats;
  return (
    <div
      onClick={onOpen}
      className="group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 flex flex-col gap-4 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">📁</span>
            <h3 className="font-semibold text-slate-900 dark:text-white text-base truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {project.name}
            </h3>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 ml-7">
            {project.description || 'No description'}
          </p>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5">
          <button
            onClick={e => { e.stopPropagation(); onEdit(); }}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-sm"
            title="Edit"
          >✎</button>
          <button
            onClick={e => { e.stopPropagation(); onDelete(); }}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm"
            title="Delete"
          >✕</button>
        </div>
      </div>

      {s && (
        <div className="flex flex-wrap gap-1.5 ml-7">
          <StatChip label="suites"       value={s.suites}       color="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" />
          <StatChip label="requirements" value={s.requirements} color="bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300" />
          <StatChip label="plans"        value={s.plans}        color="bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300" />
          <StatChip label="collections"  value={s.collections}  color="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300" />
          {s.openIssues > 0 && (
            <StatChip label="open issues" value={s.openIssues} color="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300" />
          )}
        </div>
      )}

      <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-100 dark:border-slate-700">
        <span className="text-xs text-slate-400 dark:text-slate-500">
          Updated {formatDate(project.updatedAt)}
        </span>
        <span className="text-xs text-blue-600 dark:text-blue-400 font-medium group-hover:underline">
          Open →
        </span>
      </div>
    </div>
  );
}

function ProjectModal({ project, onSave, onClose }: {
  project: Partial<Project> | null;
  onSave: (name: string, description: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(project?.name ?? '');
  const [desc, setDesc] = useState(project?.description ?? '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          {project?.id ? 'Edit Project' : 'New Project'}
        </h2>
        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Name *</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && name.trim() && onSave(name.trim(), desc)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="My Project"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Description</label>
            <textarea
              value={desc}
              onChange={e => setDesc(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Optional description…"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => name.trim() && onSave(name.trim(), desc)}
            disabled={!name.trim()}
            className="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-medium transition-colors"
          >
            {project?.id ? 'Save Changes' : 'Create Project'}
          </button>
        </div>
      </div>
    </div>
  );
}

const THEME_OPTIONS: { id: Theme; icon: string; label: string }[] = [
  { id: 'light', icon: '☀', label: 'Light' },
  { id: 'dark',  icon: '🌙', label: 'Dark' },
  { id: 'auto',  icon: '⊙', label: 'System' },
];

export default function ProjectsDashboard() {
  const { projects, fetchProjects, createProject, updateProject, deleteProject, enterProject } = useStore();
  const { theme, setTheme } = useTheme();
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; project?: Project } | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Project | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchProjects(); }, []);

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.description.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (name: string, description: string) => {
    if (modal?.mode === 'create') {
      await createProject(name, description);
    } else if (modal?.project) {
      await updateProject(modal.project.id, { name, description });
    }
    setModal(null);
    fetchProjects();
  };

  const handleDelete = async (project: Project) => {
    await deleteProject(project.id);
    setConfirmDelete(null);
  };

  const handleOpen = (project: Project) => {
    enterProject(project.id);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      {/* Top bar */}
      <header className="flex-shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎭</span>
            <div>
              <div className="text-base font-bold text-slate-900 dark:text-white">Playwright Automation Studio</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Select a project to get started</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Theme switcher */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
              {THEME_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setTheme(opt.id)}
                  title={opt.label}
                  className={`w-7 h-7 flex items-center justify-center rounded text-sm transition-colors
                    ${theme === opt.id
                      ? 'bg-white dark:bg-slate-700 shadow text-slate-800 dark:text-white'
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                >
                  {opt.icon}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowWizard(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <span>+</span> New Project
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">
        {projects.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-24 gap-5">
            <span className="text-7xl">📁</span>
            <div className="text-center">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No projects yet</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
                Projects keep your test suites, requirements, plans, and issues organised in one place.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowWizard(true)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
              >
                Guided Setup →
              </button>
              <button
                onClick={() => setModal({ mode: 'create' })}
                className="px-5 py-2.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium rounded-xl transition-colors"
              >
                Quick Create
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Search + count */}
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {projects.length} {projects.length === 1 ? 'Project' : 'Projects'}
                </h2>
              </div>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search projects…"
                className="w-64 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-16 text-slate-400 dark:text-slate-600">
                <p className="text-base">No projects match "{search}"</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map(project => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onOpen={() => handleOpen(project)}
                    onEdit={() => setModal({ mode: 'edit', project })}
                    onDelete={() => setConfirmDelete(project)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Modals */}
      {modal && (
        <ProjectModal
          project={modal.mode === 'edit' ? modal.project ?? null : null}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      {showWizard && <OnboardingWizard onClose={() => { setShowWizard(false); fetchProjects(); }} />}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Delete Project?</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Permanently delete <strong>"{confirmDelete.name}"</strong>? Associated suites, issues, and plans will lose their project link but won't be deleted.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                Cancel
              </button>
              <button onClick={() => handleDelete(confirmDelete)} className="px-4 py-2 text-sm rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
