import React, { useState } from 'react';
import { useStore, selectActiveSuite } from '../../store/useStore';
import type { ExecutionOptions, BrowserName } from '../../types';

const BROWSERS: { id: BrowserName; label: string; icon: string; description: string }[] = [
  { id: 'chromium', label: 'Chromium', icon: '🔵', description: 'Chrome / Edge engine' },
  { id: 'firefox',  label: 'Firefox',  icon: '🦊', description: 'Mozilla Firefox' },
  { id: 'webkit',   label: 'WebKit',   icon: '🧭', description: 'Safari engine' },
];

const DEVICES = [
  '',
  'iPhone 13', 'iPhone 13 Pro', 'iPhone 14', 'iPhone SE',
  'iPad Pro', 'iPad Mini',
  'Pixel 5', 'Pixel 7',
  'Galaxy S23',
  'Desktop Chrome', 'Desktop Firefox', 'Desktop Safari',
];

const VIEWPORTS = [
  { label: 'Full HD (1920×1080)', width: 1920, height: 1080 },
  { label: 'HD (1280×720)',       width: 1280, height: 720 },
  { label: 'Laptop (1366×768)',   width: 1366, height: 768 },
  { label: 'Tablet (768×1024)',   width: 768,  height: 1024 },
  { label: 'Mobile (375×812)',    width: 375,  height: 812 },
  { label: 'Custom',              width: 0,    height: 0 },
];

export default function ExecutionOptions() {
  const suite = useStore(selectActiveSuite);
  const { saveExecutionOptions, activeSuiteId } = useStore();

  const [opts, setOpts] = useState<ExecutionOptions>(suite?.executionOptions ?? {
    browsers: ['chromium'],
    headless: true,
    viewport: { width: 1280, height: 720 },
    timeout: 30000,
    retries: 1,
  });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  function patch(partial: Partial<ExecutionOptions>) {
    setOpts(prev => ({ ...prev, ...partial }));
    setDirty(true);
  }

  function toggleBrowser(b: BrowserName) {
    const current = opts.browsers;
    const next = current.includes(b) ? current.filter(x => x !== b) : [...current, b];
    if (next.length === 0) return; // must have at least one
    patch({ browsers: next });
  }

  const selectedViewport = VIEWPORTS.find(v => v.width === opts.viewport.width && v.height === opts.viewport.height) ?? VIEWPORTS[VIEWPORTS.length - 1];

  async function save() {
    if (!activeSuiteId) return;
    setSaving(true);
    await saveExecutionOptions(activeSuiteId, opts);
    setDirty(false);
    setSaving(false);
  }

  return (
    <div className="h-full overflow-y-auto p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Execution Options</h3>
        {dirty && (
          <button onClick={save} disabled={saving} className="btn-primary text-sm">
            {saving ? 'Saving…' : '💾 Save Options'}
          </button>
        )}
      </div>

      <div className="space-y-6">
        {/* Browser selection */}
        <section className="card p-5">
          <h4 className="text-sm font-semibold text-slate-300 mb-3">Target Browsers</h4>
          <div className="grid grid-cols-3 gap-3">
            {BROWSERS.map(b => (
              <button
                key={b.id}
                onClick={() => toggleBrowser(b.id)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  opts.browsers.includes(b.id)
                    ? 'border-blue-500 bg-blue-900/30 text-blue-300'
                    : 'border-slate-700 hover:border-slate-600 text-slate-400'
                }`}
              >
                <span className="text-2xl">{b.icon}</span>
                <span className="text-sm font-medium">{b.label}</span>
                <span className="text-xs opacity-70">{b.description}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-600 mt-2">Tests run once per selected browser. {opts.browsers.length} browser(s) selected.</p>
        </section>

        {/* Headless & slow-mo */}
        <section className="card p-5 space-y-4">
          <h4 className="text-sm font-semibold text-slate-300">Browser Behavior</h4>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-300">Headless Mode</div>
              <div className="text-xs text-slate-500">Run without visible browser window (faster, good for CI)</div>
            </div>
            <button
              onClick={() => patch({ headless: !opts.headless })}
              className={`relative w-12 h-6 rounded-full transition-colors ${opts.headless ? 'bg-blue-600' : 'bg-slate-600'}`}
            >
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${opts.headless ? 'left-7' : 'left-1'}`} />
            </button>
          </div>
          <div>
            <label className="label">Slow Mo (ms) <span className="text-slate-600">– delay between actions</span></label>
            <div className="flex items-center gap-3">
              <input
                type="range" min={0} max={1000} step={50}
                value={opts.slowMo ?? 0}
                onChange={e => patch({ slowMo: Number(e.target.value) })}
                className="flex-1 accent-blue-500"
              />
              <span className="text-sm text-slate-300 w-16 text-right">{opts.slowMo ?? 0}ms</span>
            </div>
          </div>
        </section>

        {/* Viewport & Device */}
        <section className="card p-5 space-y-4">
          <h4 className="text-sm font-semibold text-slate-300">Viewport & Device</h4>
          <div>
            <label className="label">Preset Viewport</label>
            <select
              className="input w-full"
              value={`${selectedViewport.width}x${selectedViewport.height}`}
              onChange={e => {
                const [w, h] = e.target.value.split('x').map(Number);
                if (!isNaN(w)) patch({ viewport: { width: w, height: h } });
              }}
            >
              {VIEWPORTS.map(v => (
                <option key={`${v.width}x${v.height}`} value={`${v.width}x${v.height}`}>{v.label}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Width (px)</label>
              <input type="number" className="input w-full" value={opts.viewport.width} onChange={e => patch({ viewport: { ...opts.viewport, width: Number(e.target.value) } })} min={320} />
            </div>
            <div>
              <label className="label">Height (px)</label>
              <input type="number" className="input w-full" value={opts.viewport.height} onChange={e => patch({ viewport: { ...opts.viewport, height: Number(e.target.value) } })} min={480} />
            </div>
          </div>
          <div>
            <label className="label">Device Emulation <span className="text-slate-600">(overrides viewport)</span></label>
            <select className="input w-full" value={opts.device ?? ''} onChange={e => patch({ device: e.target.value || undefined })}>
              {DEVICES.map(d => <option key={d} value={d}>{d || 'None (use viewport above)'}</option>)}
            </select>
          </div>
        </section>

        {/* Timeouts & Retries */}
        <section className="card p-5 space-y-4">
          <h4 className="text-sm font-semibold text-slate-300">Timeouts & Retries</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Default Timeout (ms)</label>
              <input type="number" className="input w-full" value={opts.timeout} min={1000} step={1000} onChange={e => patch({ timeout: Number(e.target.value) })} />
              <p className="text-xs text-slate-600 mt-1">Per-action timeout for clicks, fills, asserts</p>
            </div>
            <div>
              <label className="label">Retries on Failure</label>
              <input type="number" className="input w-full" value={opts.retries} min={0} max={5} onChange={e => patch({ retries: Number(e.target.value) })} />
              <p className="text-xs text-slate-600 mt-1">Retry a failed test up to N times</p>
            </div>
          </div>
          <div>
            <label className="label">Base URL <span className="text-slate-600">(optional prefix for relative navigate steps)</span></label>
            <input className="input w-full font-mono text-xs" value={opts.baseUrl ?? ''} onChange={e => patch({ baseUrl: e.target.value || undefined })} placeholder="https://your-staging-env.com" />
          </div>
        </section>
      </div>
    </div>
  );
}
