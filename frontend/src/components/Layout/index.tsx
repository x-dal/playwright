import React from 'react';
import { useStore, selectActiveSuite } from '../../store/useStore';

interface Props { children: React.ReactNode; }

const NAV_ITEMS = [
  { id: 'dashboard', icon: '⊞', label: 'Dashboard' },
  { id: 'builder',   icon: '⚙', label: 'Test Builder' },
  { id: 'runs',      icon: '▶', label: 'Run History' },
] as const;

export default function Layout({ children }: Props) {
  const { activeView, setView, activeSuiteId, runs } = useStore();
  const activeSuite = useStore(selectActiveSuite);

  const pendingRuns = runs.filter(r => r.status === 'running' || r.status === 'pending').length;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col bg-slate-900 border-r border-slate-800">
        {/* Logo */}
        <div className="px-4 py-5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎭</span>
            <div>
              <div className="text-sm font-semibold text-white">Playwright</div>
              <div className="text-xs text-slate-500">Automation Studio</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setView(item.id as any)}
              disabled={item.id === 'builder' && !activeSuiteId}
              className={`
                w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all
                ${activeView === item.id
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}
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
            </button>
          ))}
        </nav>

        {/* Active Suite indicator */}
        {activeSuite && (
          <div className="px-3 py-3 border-t border-slate-800">
            <div className="text-xs text-slate-500 mb-1">Active Suite</div>
            <div className="text-xs text-slate-300 font-medium truncate">{activeSuite.name}</div>
          </div>
        )}

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-800">
          <div className="text-xs text-slate-600">Powered by Playwright v1.44</div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {children}
      </main>
    </div>
  );
}
