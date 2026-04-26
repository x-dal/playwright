import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store/useStore';
import * as api from '../../api/client';
import type { Step } from '../../types';
import { genId } from '../StepPalette';

interface Props { suiteId: string; }

export default function Recorder({ suiteId }: Props) {
  const { suites, setActiveTest, updateTest, activeTestId } = useStore();
  const suite = suites.find(s => s.id === suiteId);

  const [url, setUrl] = useState('https://');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'recording' | 'stopped' | 'error'>('idle');
  const [steps, setSteps] = useState<Step[]>([]);
  const [rawCode, setRawCode] = useState('');
  const [error, setError] = useState('');
  const [importTarget, setImportTarget] = useState<string>(activeTestId ?? '');
  const [importing, setImporting] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clean up on unmount
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);
  useEffect(() => { if (activeTestId) setImportTarget(activeTestId); }, [activeTestId]);

  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }

  async function startRecording() {
    if (!url.startsWith('http')) {
      setError('Please enter a valid URL starting with http:// or https://');
      return;
    }
    setError('');
    setSteps([]);
    setRawCode('');

    let session: Awaited<ReturnType<typeof api.startRecording>>;
    try {
      session = await api.startRecording(url);
    } catch (err: any) {
      setError(
        err?.response?.data?.error ??
        'Failed to start recording. Is the backend running and are Playwright browsers installed?'
      );
      return;
    }

    setSessionId(session.id);
    setStatus('recording');

    // Poll for session status + steps every 600 ms
    pollRef.current = setInterval(async () => {
      try {
        // First check session status for errors
        const sess = await api.getRecordingSession(session.id);
        if (sess.status === 'error') {
          stopPolling();
          setStatus('error');
          setError(
            (sess as any).errorMessage ??
            'The recording process failed. Check the terminal for details.'
          );
          return;
        }
        if (sess.status === 'stopped') {
          stopPolling();
          // Fetch final steps
          const data = await api.getRecordingSteps(session.id);
          setSteps(data.steps);
          if (data.rawCode) setRawCode(data.rawCode);
          setStatus('stopped');
          return;
        }

        // Still recording — update live steps
        const data = await api.getRecordingSteps(session.id);
        setSteps(data.steps);
        if (data.rawCode) setRawCode(data.rawCode);
      } catch { /* network blip — keep polling */ }
    }, 600);
  }

  async function stopRecording() {
    if (!sessionId) return;
    stopPolling();
    try {
      const result = await api.stopRecording(sessionId);
      setSteps(result.steps);
      setStatus('stopped');
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Failed to stop recording');
      setStatus('error');
    }
  }

  async function importToTest() {
    if (!importTarget || steps.length === 0 || !suite) return;
    setImporting(true);
    const test = suite.tests.find(t => t.id === importTarget);
    if (!test) { setImporting(false); return; }

    const newSteps: Step[] = steps.map(s => ({ ...s, id: genId() }));
    const merged = [...test.steps, ...newSteps];

    try {
      await updateTest(suiteId, importTarget, { steps: merged });
      setActiveTest(importTarget);
      reset();
    } finally {
      setImporting(false);
    }
  }

  async function discardRecording() {
    stopPolling();
    if (sessionId) {
      try { await api.deleteRecording(sessionId); } catch { /* ignore */ }
    }
    reset();
  }

  function reset() {
    setSessionId(null);
    setStatus('idle');
    setSteps([]);
    setRawCode('');
    setError('');
  }

  return (
    <div className="h-full overflow-y-auto p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-1">Playwright Codegen Recorder</h3>
        <p className="text-slate-400 text-sm">
          Opens a real browser with Playwright's inspector. Interact with the page and your actions are captured as test steps.
        </p>
      </div>

      {/* URL + controls */}
      <div className="card p-5 mb-5">
        <div className="mb-4">
          <label className="label">Target URL</label>
          <input
            className="input w-full"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://your-app.com"
            disabled={status === 'recording'}
          />
        </div>

        {error && (
          <div className="bg-red-950/40 border border-red-800 rounded-lg p-3 mb-4 text-red-300 text-sm whitespace-pre-wrap">
            <span className="font-semibold">Error: </span>{error}
          </div>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          {status === 'idle' && (
            <button onClick={startRecording} className="btn-primary">
              <span className="text-red-400">⏺</span> Start Recording
            </button>
          )}

          {status === 'recording' && (
            <>
              <div className="flex items-center gap-2">
                <span className="recording-pulse text-red-500 text-lg">⏺</span>
                <span className="text-sm font-medium text-red-400">Recording…</span>
                <span className="text-sm text-slate-400">interact with the browser window that just opened</span>
              </div>
              <button onClick={stopRecording} className="btn-danger ml-auto">
                ⏹ Stop Recording
              </button>
            </>
          )}

          {status === 'stopped' && (
            <>
              <span className="badge-passed">Recording stopped</span>
              <span className="text-slate-400 text-sm">{steps.length} steps captured</span>
              <button onClick={discardRecording} className="btn-ghost text-xs ml-auto">Discard</button>
            </>
          )}

          {status === 'error' && (
            <>
              <span className="badge-failed">Recording failed</span>
              <button onClick={reset} className="btn-secondary text-xs ml-auto">Try Again</button>
            </>
          )}
        </div>
      </div>

      {/* Live steps preview */}
      {(status === 'recording' || status === 'stopped') && (
        <div className="card p-4 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-slate-300">
              Captured Steps
              {status === 'recording' && (
                <span className="text-xs text-slate-500 ml-2">(auto-updating every 2s)</span>
              )}
            </h4>
            <span className="text-xs text-slate-500">{steps.length} steps</span>
          </div>

          {steps.length === 0 ? (
            <div className="text-slate-600 text-sm text-center py-4">
              {status === 'recording'
                ? 'Interact with the browser window — steps appear here as you record'
                : 'No steps were captured'}
            </div>
          ) : (
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {steps.map((step, idx) => (
                <div key={step.id} className="flex items-center gap-3 py-1.5 px-3 rounded bg-slate-900/60 text-xs">
                  <span className="text-slate-600 w-5 shrink-0">{idx + 1}</span>
                  <span className="text-xs bg-slate-700 rounded px-1.5 py-0.5 text-slate-300 font-mono shrink-0">{step.type}</span>
                  <span className="text-slate-400 truncate">{step.name}</span>
                </div>
              ))}
            </div>
          )}

          {rawCode && (
            <details className="mt-3">
              <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-400 select-none">
                View raw Playwright code
              </summary>
              <pre className="mt-2 text-xs font-mono bg-slate-950 rounded p-3 overflow-auto max-h-48 text-slate-300 whitespace-pre">{rawCode}</pre>
            </details>
          )}
        </div>
      )}

      {/* Import to test */}
      {status === 'stopped' && steps.length > 0 && (
        <div className="card p-5 mb-5">
          <h4 className="text-sm font-medium text-white mb-3">Import Steps into Test</h4>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="label">Target Test</label>
              <select
                className="input w-full"
                value={importTarget}
                onChange={e => setImportTarget(e.target.value)}
              >
                <option value="">Select a test…</option>
                {(suite?.tests ?? []).map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.steps.length} steps)</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={importToTest}
                disabled={!importTarget || importing}
                className="btn-primary"
              >
                {importing ? 'Importing…' : '→ Import Steps'}
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-600 mt-2">Steps are appended to the end of the selected test.</p>
        </div>
      )}

      {/* How-to instructions */}
      {status === 'idle' && (
        <div className="bg-slate-900/40 border border-slate-700 rounded-xl p-5 text-sm text-slate-400 space-y-3">
          <div className="font-medium text-slate-300">How recording works</div>
          <ol className="space-y-2 list-none">
            {[
              ['1', 'Enter the URL of the page you want to test'],
              ['2', 'Click "Start Recording" — a Chromium window opens with the Playwright inspector'],
              ['3', 'Perform your test actions (click, fill, navigate)'],
              ['4', 'Click "Stop Recording" when finished (or just close the browser window)'],
              ['5', 'Review the captured steps, then import them into any test'],
            ].map(([n, text]) => (
              <li key={n} className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-slate-700 text-slate-400 text-xs flex items-center justify-center shrink-0 mt-0.5">{n}</span>
                <span>{text}</span>
              </li>
            ))}
          </ol>
          <div className="border-t border-slate-700 pt-3 text-xs text-slate-600">
            <span className="text-slate-500 font-medium">Prerequisite:</span> run{' '}
            <code className="bg-slate-800 px-1 rounded font-mono">cd backend && npx playwright install chromium</code>{' '}
            before using the recorder.
          </div>
        </div>
      )}
    </div>
  );
}
