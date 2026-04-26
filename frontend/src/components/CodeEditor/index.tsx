import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { useStore, selectActiveSuite, selectActiveTest } from '../../store/useStore';
import * as api from '../../api/client';

export default function CodeEditor() {
  const suite = useStore(selectActiveSuite);
  const activeTest = useStore(selectActiveTest);
  const { activeSuiteId, activeTestId } = useStore();

  const [mode, setMode] = useState<'suite' | 'test'>('suite');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!activeSuiteId) return;
    loadCode();
  }, [activeSuiteId, activeTestId, mode]);

  async function loadCode() {
    if (!activeSuiteId) return;
    setLoading(true);
    setDirty(false);
    try {
      let c: string;
      if (mode === 'test' && activeTestId) {
        c = await api.getTestCode(activeSuiteId, activeTestId);
      } else {
        c = await api.getSuiteCode(activeSuiteId);
      }
      setCode(c);
    } catch { /* ignore */ }
    setLoading(false);
  }

  async function saveCode() {
    if (!activeSuiteId || !activeTestId) return;
    setSaving(true);
    try {
      await api.saveTestCode(activeSuiteId, activeTestId, code);
      setSaved(true);
      setDirty(false);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* ignore */ }
    setSaving(false);
  }

  function copyCode() {
    navigator.clipboard.writeText(code).catch(() => {});
  }

  return (
    <div className="flex flex-col h-full bg-slate-950">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-slate-800 bg-slate-900 flex-shrink-0">
        {/* Mode selector */}
        <div className="flex rounded-lg overflow-hidden border border-slate-700">
          <button
            onClick={() => setMode('suite')}
            className={`px-3 py-1 text-xs transition-colors ${mode === 'suite' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Full Suite
          </button>
          <button
            onClick={() => { setMode('test'); }}
            disabled={!activeTestId}
            className={`px-3 py-1 text-xs transition-colors disabled:opacity-30 ${mode === 'test' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            {activeTest ? activeTest.name : 'Active Test'}
          </button>
        </div>

        <div className="flex-1" />

        {mode === 'test' && activeTestId && dirty && (
          <button onClick={saveCode} disabled={saving} className="btn-primary text-xs py-1">
            {saving ? 'Saving…' : '💾 Save Custom Code'}
          </button>
        )}
        {saved && <span className="text-xs text-green-400">✓ Saved</span>}

        <button onClick={loadCode} className="btn-ghost text-xs py-1">↺ Regenerate</button>
        <button onClick={copyCode} className="btn-secondary text-xs py-1">⎘ Copy</button>

        {suite && (
          <a href={api.getExportUrl(suite.id)} download className="btn-secondary text-xs py-1">
            ↓ Download Project
          </a>
        )}
      </div>

      {/* Info bar */}
      <div className="px-4 py-1.5 bg-slate-900/50 border-b border-slate-800 text-xs text-slate-500 flex items-center gap-3 flex-shrink-0">
        <span className="font-mono text-slate-600">TypeScript</span>
        {mode === 'suite' && suite && (
          <span>Suite: <span className="text-slate-400">{suite.name}</span> · {suite.tests.length} tests</span>
        )}
        {mode === 'test' && activeTest && (
          <span>Test: <span className="text-slate-400">{activeTest.name}</span> · {activeTest.steps.length} steps</span>
        )}
        {dirty && <span className="text-amber-400">● unsaved changes</span>}
        <span className="ml-auto">{code.split('\n').length} lines</span>
      </div>

      {/* Editor */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-slate-500">
          <div className="text-center">
            <div className="text-2xl mb-2">⚙</div>
            <div className="text-sm">Generating code…</div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          <Editor
            height="100%"
            language="typescript"
            value={code}
            onChange={value => { setCode(value ?? ''); setDirty(true); }}
            theme="vs-dark"
            options={{
              fontSize: 13,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              fontLigatures: true,
              minimap: { enabled: true, scale: 1 },
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              lineNumbers: 'on',
              renderLineHighlight: 'all',
              tabSize: 2,
              insertSpaces: true,
              folding: true,
              showFoldingControls: 'always',
              bracketPairColorization: { enabled: true },
              formatOnPaste: true,
              automaticLayout: true,
              readOnly: mode === 'suite',
              padding: { top: 16 },
            }}
          />
        </div>
      )}

      {/* Footer hint */}
      <div className="px-4 py-2 border-t border-slate-800 bg-slate-900/30 text-xs text-slate-600 flex-shrink-0">
        {mode === 'suite'
          ? 'Read-only: switch to "Active Test" mode to save custom code for a specific test'
          : 'Edit the code and save. Custom code overrides the generated output for this test.'}
      </div>
    </div>
  );
}
