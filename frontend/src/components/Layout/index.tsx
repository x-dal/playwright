import React, { useRef, useState } from 'react';
import { useStore, selectActiveSuite } from '../../store/useStore';
import { useTheme, type Theme } from '../../store/useTheme';

interface Props { children: React.ReactNode; }

const NAV_ITEMS = [
  { id: 'dashboard',    icon: '⊞', label: 'Dashboard',    group: 'main' },
  { id: 'builder',      icon: '⚙', label: 'Test Builder', group: 'main' },
  { id: 'runs',         icon: '▶', label: 'Run History',  group: 'main' },
  { id: 'bugs',         icon: '🐛', label: 'Bug Tracker',  group: 'manage' },
  { id: 'plans',        icon: '📋', label: 'Test Plans',   group: 'manage' },
  { id: 'requirements', icon: '📝', label: 'Requirements', group: 'manage' },
  { id: 'api-tester',   icon: '⚡', label: 'API Tester',  group: 'tools' },
] as const;

const THEME_OPTIONS: { id: Theme; icon: string; label: string; desc: string }[] = [
  { id: 'light',  icon: '☀',  label: 'Light',  desc: 'Always light' },
  { id: 'dark',   icon: '🌙', label: 'Dark',   desc: 'Always dark' },
  { id: 'auto',   icon: '⊙',  label: 'System', desc: 'Follow OS setting' },
];

export default function Layout({ children }: Props) {
  const { activeView, setView, activeSuiteId, runs, issues, projects, activeProjectId, setActiveProject } = useStore();
  const activeSuite = useStore(selectActiveSuite);
  const { theme, setTheme } = useTheme();
  const [showSettings, setShowSettings] = useState(false);
  const settingsBtnRef = useRef<HTMLButtonElement>(null);

  const pendingRuns = runs.filter(r => r.status === 'running' || r.status === 'pending').length;
  const openIssues = issues.filter(i => i.status === 'open' || i.status === 'in-progress').length;
  const activeProject = projects.find(p => p.id === activeProjectId);

  const groups = [
    { key: 'main',   label: null },
    { key: 'manage', label: 'Test Management' },
    { key: 'tools',  label: 'Tools' },
  ] as const;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100 dark:bg-slate-950">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
        {/* Project header */}
        <div className="px-3 py-4 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
          {/* Back to projects */}
          <button
            onClick={() => setActiveProject(null)}
            className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors mb-2 w-full"
          >
            <span>←</span>
            <span>All Projects</span>
          </button>
          {/* Project name */}
          <div className="flex items-center gap-2">
            <span className="text-lg flex-shrink-0">📁</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                {activeProject?.name ?? 'Project'}
              </div>
              <div className="text-xs text-slate-400 dark:text-slate-500">Automation Studio</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 overflow-y-auto space-y-4">
          {groups.map(group => {
            const items = NAV_ITEMS.filter(i => i.group === group.key);
            return (
              <div key={group.key}>
                {group.label && (
                  <div className="px-3 mb-1 text-[10px] font-semibold text-slate-400 dark:text-slate-600 uppercase tracking-wider">
                    {group.label}
                  </div>
                )}
                <div className="space-y-0.5">
                  {items.map(item => (
                    <button
                      key={item.id}
                      onClick={() => setView(item.id as any)}
                      disabled={item.id === 'builder' && !activeSuiteId}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all
                        ${activeView === item.id
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}
                        disabled:opacity-30 disabled:cursor-not-allowed
                      `}
                    >
                      <span className="text-base w-5 text-center">{item.icon}</span>
                      <span>{item.label}</span>
                      {item.id === 'runs' && pendingRuns > 0 && (
                        <span className="ml-auto bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                          {pendingRuns}
                        </span>
                      )}
                      {item.id === 'bugs' && openIssues > 0 && (
                        <span className="ml-auto bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                          {openIssues > 9 ? '9+' : openIssues}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Active Suite indicator */}
        {activeSuite && (
          <div className="px-3 py-3 border-t border-slate-200 dark:border-slate-800 flex-shrink-0">
            <div className="text-xs text-slate-400 dark:text-slate-500 mb-1">Active Suite</div>
            <div className="text-xs text-slate-700 dark:text-slate-300 font-medium truncate">{activeSuite.name}</div>
          </div>
        )}

        {/* Footer: settings + version */}
        <div className="px-3 py-3 border-t border-slate-200 dark:border-slate-800 flex-shrink-0 flex items-center gap-2">
          <div className="text-xs text-slate-400 dark:text-slate-600 flex-1">Playwright v1.44</div>
          <div className="relative">
            <button
              ref={settingsBtnRef}
              onClick={() => setShowSettings(v => !v)}
              title="Settings"
              className={`w-7 h-7 flex items-center justify-center rounded-lg text-base transition-colors
                ${showSettings
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              ⚙
            </button>

            {showSettings && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowSettings(false)} />
                <div className="absolute bottom-full left-0 mb-2 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-3 z-50">
                  <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 px-1">
                    Appearance
                  </p>
                  <div className="space-y-1">
                    {THEME_OPTIONS.map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => { setTheme(opt.id); setShowSettings(false); }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left
                          ${theme === opt.id
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                      >
                        <span className="text-base w-5 text-center leading-none">{opt.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{opt.label}</div>
                          <div className={`text-[10px] truncate ${theme === opt.id ? 'text-blue-200' : 'text-slate-400 dark:text-slate-500'}`}>
                            {opt.desc}
                          </div>
                        </div>
                        {theme === opt.id && <span className="text-xs ml-auto flex-shrink-0">✓</span>}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {children}
      </main>
    </div>
  );
}
