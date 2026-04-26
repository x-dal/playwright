import React, { useEffect, useState, useRef } from 'react';
import { useStore } from '../../store/useStore';
import { executeApiRequest, importPostmanCollection, getPostmanExportUrl } from '../../api/client';
import type {
  ApiCollection, ApiRequest, ApiResponse, ApiHeader, ApiRequestTest, HttpMethod,
} from '../../types';

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
const METHOD_COLORS: Record<HttpMethod, string> = {
  GET:     'text-emerald-600 dark:text-emerald-400',
  POST:    'text-blue-600 dark:text-blue-400',
  PUT:     'text-amber-600 dark:text-amber-400',
  PATCH:   'text-orange-600 dark:text-orange-400',
  DELETE:  'text-red-600 dark:text-red-400',
  HEAD:    'text-purple-600 dark:text-purple-400',
  OPTIONS: 'text-slate-500 dark:text-slate-400',
};

// ─── JSON Syntax Highlighter ──────────────────────────────────────────────────

type TokenType = 'key' | 'string' | 'number' | 'boolean' | 'null' | 'bracket' | 'punctuation' | 'space';
interface JsonToken { type: TokenType; value: string; }

const TOKEN_COLORS: Record<TokenType, string> = {
  key:         'text-blue-600 dark:text-blue-400',
  string:      'text-emerald-600 dark:text-emerald-400',
  number:      'text-amber-600 dark:text-amber-400',
  boolean:     'text-purple-600 dark:text-purple-400',
  null:        'text-rose-500 dark:text-rose-400',
  bracket:     'text-slate-600 dark:text-slate-400',
  punctuation: 'text-slate-400 dark:text-slate-500',
  space:       '',
};

function tokenizeJson(json: string): JsonToken[] {
  const tokens: JsonToken[] = [];
  const re = /("(?:[^"\\]|\\.)*")|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|(true|false)|(null)|([{}\[\]])|([,:])|([\s\S])/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(json)) !== null) {
    if (m[1]) {
      // string — look ahead for ':' to detect key
      const rest = json.slice(m.index + m[0].length).replace(/^\s+/, '');
      tokens.push({ type: rest[0] === ':' ? 'key' : 'string', value: m[0] });
    } else if (m[2]) { tokens.push({ type: 'number',      value: m[0] }); }
      else if (m[3]) { tokens.push({ type: 'boolean',     value: m[0] }); }
      else if (m[4]) { tokens.push({ type: 'null',        value: m[0] }); }
      else if (m[5]) { tokens.push({ type: 'bracket',     value: m[0] }); }
      else if (m[6]) { tokens.push({ type: 'punctuation', value: m[0] }); }
      else           { tokens.push({ type: 'space',       value: m[0] }); }
  }
  return tokens;
}

function JsonHighlight({ text, contentType }: { text: string; contentType?: string }) {
  const isJson = (contentType ?? '').includes('json') || text.trimStart().startsWith('{') || text.trimStart().startsWith('[');
  if (!isJson) {
    return <pre className="text-xs font-mono text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-all">{text}</pre>;
  }
  let pretty = text;
  try { pretty = JSON.stringify(JSON.parse(text), null, 2); } catch { /* keep raw */ }
  const tokens = tokenizeJson(pretty);
  return (
    <pre className="text-xs font-mono whitespace-pre-wrap break-all leading-relaxed">
      {tokens.map((t, i) =>
        t.type === 'space' ? t.value :
        <span key={i} className={TOKEN_COLORS[t.type]}>{t.value}</span>
      )}
    </pre>
  );
}

// ─── Highlighted JSON editor (textarea + pre overlay) ─────────────────────────

const EDITOR_FONT: React.CSSProperties = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  fontSize: '12px',
  lineHeight: '1.6',
  padding: '12px 16px',
  margin: 0,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-all',
  tabSize: 2,
  boxSizing: 'border-box',
};

function JsonEditorOverlay({
  value, onChange, placeholder = '', height = 208,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; height?: number;
}) {
  const preRef = useRef<HTMLPreElement>(null);
  const taRef  = useRef<HTMLTextAreaElement>(null);

  function syncScroll() {
    if (preRef.current && taRef.current) {
      preRef.current.scrollTop = taRef.current.scrollTop;
    }
  }

  const tokens = tokenizeJson(value);
  const showPlaceholder = value === '' && placeholder !== '';

  return (
    <div style={{ position: 'relative', height, overflow: 'hidden' }}>
      {/* Syntax-highlighted layer (non-interactive) */}
      <pre
        ref={preRef}
        aria-hidden
        style={{ ...EDITOR_FONT, position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'hidden', pointerEvents: 'none' }}
      >
        {showPlaceholder
          ? <span className="text-slate-300 dark:text-slate-600">{placeholder}</span>
          : tokens.map((t, i) =>
              t.type === 'space' ? t.value :
              <span key={i} className={TOKEN_COLORS[t.type]}>{t.value}</span>
            )
        }
        {'\n'}
      </pre>

      {/* Editable textarea — transparent text so pre shows through */}
      <textarea
        ref={taRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        onScroll={syncScroll}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        style={{
          ...EDITOR_FONT,
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          background: 'transparent',
          color: 'transparent',
          caretColor: 'inherit',
          resize: 'none',
          border: 'none',
          outline: 'none',
          overflow: 'auto',
        }}
        className="text-slate-800 dark:text-slate-200"
        onKeyDown={e => {
          if (e.key === 'Tab') {
            e.preventDefault();
            const el = e.currentTarget;
            const s = el.selectionStart, end = el.selectionEnd;
            const next = value.substring(0, s) + '  ' + value.substring(end);
            onChange(next);
            requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = s + 2; });
          }
        }}
      />
    </div>
  );
}

function genId() { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`; }

export default function ApiTester() {
  const {
    apiCollections, apiRequests, fetchApiCollections, fetchApiRequests,
    createApiCollection, updateApiCollection, deleteApiCollection,
    createApiRequest, updateApiRequest, deleteApiRequest,
  } = useStore();

  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [executing, setExecuting] = useState(false);
  const [execError, setExecError] = useState('');
  const [showCollectionForm, setShowCollectionForm] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [showEnvEditor, setShowEnvEditor] = useState(false);
  const [responseTab, setResponseTab] = useState<'body' | 'headers' | 'tests'>('body');
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchApiCollections(); }, []);

  useEffect(() => {
    if (activeCollectionId && !apiRequests[activeCollectionId]) {
      fetchApiRequests(activeCollectionId);
    }
  }, [activeCollectionId]);

  const activeCollection = apiCollections.find(c => c.id === activeCollectionId);
  const requests = activeCollectionId ? (apiRequests[activeCollectionId] ?? []) : [];
  const activeRequest = requests.find(r => r.id === activeRequestId);

  async function handleCreateCollection() {
    if (!newColName.trim()) return;
    const col = await createApiCollection({ name: newColName.trim(), description: '', environments: [] });
    setActiveCollectionId(col.id);
    setNewColName('');
    setShowCollectionForm(false);
  }

  async function handleCreateRequest() {
    if (!activeCollectionId) return;
    const req = await createApiRequest(activeCollectionId, {
      name: 'New Request', method: 'GET', url: '', headers: [], bodyType: 'none', tests: [],
    });
    setActiveRequestId(req.id);
    setResponse(null);
  }

  async function handleExecute() {
    if (!activeCollectionId || !activeRequestId) return;
    setExecuting(true);
    setExecError('');
    setResponse(null);
    try {
      const resp = await executeApiRequest(activeCollectionId, activeRequestId);
      setResponse(resp);
      setResponseTab('body');
    } catch (err: any) {
      setExecError(err.response?.data?.error ?? err.message);
    } finally {
      setExecuting(false);
    }
  }

  async function handleSaveRequest(partial: Partial<ApiRequest>) {
    if (!activeCollectionId || !activeRequestId) return;
    setSaving(true);
    try { await updateApiRequest(activeCollectionId, activeRequestId, partial); }
    finally { setSaving(false); }
  }

  async function handleImportPostman(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await toBase64(file);
      const result = await importPostmanCollection(base64);
      await fetchApiCollections();
      setActiveCollectionId(result.collection.id);
      await fetchApiRequests(result.collection.id);
      alert(`Imported "${result.collection.name}" with ${result.requestCount} request(s).`);
    } catch (err: any) {
      alert(`Import failed: ${err.response?.data?.error ?? err.message}`);
    }
    e.target.value = '';
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar: Collections */}
      <div className="w-56 flex-shrink-0 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30">
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 dark:border-slate-800">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Collections</span>
          <div className="flex gap-1">
            <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImportPostman} />
            <button title="Import Postman" onClick={() => fileRef.current?.click()} className="text-slate-500 hover:text-slate-300 text-xs px-1">⬆</button>
            <button title="New collection" onClick={() => setShowCollectionForm(true)} className="text-slate-500 hover:text-slate-300 text-lg leading-none">+</button>
          </div>
        </div>

        {showCollectionForm && (
          <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800 flex gap-1">
            <input
              autoFocus
              className="input flex-1 text-xs py-1 px-2"
              value={newColName}
              onChange={e => setNewColName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreateCollection(); if (e.key === 'Escape') setShowCollectionForm(false); }}
              placeholder="Collection name"
            />
            <button onClick={handleCreateCollection} className="btn-primary text-xs py-1 px-2">✓</button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto py-1">
          {apiCollections.map(col => (
            <div key={col.id}>
              <div
                onClick={() => { setActiveCollectionId(col.id); setActiveRequestId(null); setResponse(null); }}
                className={`flex items-center gap-2 px-3 py-2 cursor-pointer text-xs transition-colors ${
                  activeCollectionId === col.id ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                <span className="text-base">📁</span>
                <span className="flex-1 truncate font-medium">{col.name}</span>
                <a
                  href={getPostmanExportUrl(col.id)}
                  title="Export as Postman"
                  onClick={e => e.stopPropagation()}
                  className="text-slate-600 hover:text-slate-400 text-xs"
                >⬇</a>
                <button
                  onClick={e => { e.stopPropagation(); deleteApiCollection(col.id); if (activeCollectionId === col.id) { setActiveCollectionId(null); setActiveRequestId(null); } }}
                  className="text-slate-600 hover:text-red-400 text-xs"
                >✕</button>
              </div>
              {activeCollectionId === col.id && (
                <div className="ml-4">
                  {(apiRequests[col.id] ?? []).map(req => (
                    <div
                      key={req.id}
                      onClick={() => { setActiveRequestId(req.id); setResponse(null); }}
                      className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer text-xs transition-colors ${
                        activeRequestId === req.id ? 'bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/30 hover:text-slate-600 dark:hover:text-slate-300'
                      }`}
                    >
                      <span className={`font-mono font-bold w-12 flex-shrink-0 ${METHOD_COLORS[req.method]}`}>{req.method}</span>
                      <span className="flex-1 truncate">{req.name}</span>
                      <button
                        onClick={e => { e.stopPropagation(); deleteApiRequest(col.id, req.id); if (activeRequestId === req.id) setActiveRequestId(null); }}
                        className="text-slate-600 hover:text-red-400"
                      >✕</button>
                    </div>
                  ))}
                  <button
                    onClick={handleCreateRequest}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-500 dark:text-slate-600 hover:text-slate-700 dark:hover:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                  >+ Add Request</button>
                </div>
              )}
            </div>
          ))}
          {apiCollections.length === 0 && (
            <div className="text-xs text-slate-600 px-3 py-4 text-center">
              No collections yet.<br />Create one or import Postman.
            </div>
          )}
        </div>

        {activeCollection && (
          <div className="border-t border-slate-200 dark:border-slate-800 p-2">
            <button
              onClick={() => setShowEnvEditor(v => !v)}
              className="w-full text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-left px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800/50"
            >
              ⚙ Environments
            </button>
          </div>
        )}
      </div>

      {/* Request editor */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeRequest ? (
          <RequestEditor
            key={activeRequest.id}
            request={activeRequest}
            onSave={handleSaveRequest}
            onExecute={handleExecute}
            executing={executing}
            saving={saving}
            response={response}
            execError={execError}
            responseTab={responseTab}
            setResponseTab={setResponseTab}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-600 flex-col gap-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-3xl">⚡</div>
            <div className="text-sm font-medium text-slate-600 dark:text-slate-400">
              {activeCollectionId ? 'Select or create a request' : 'Select a collection from the sidebar'}
            </div>
            {activeCollectionId && (
              <button onClick={handleCreateRequest} className="btn-primary text-sm mt-2">+ New Request</button>
            )}
          </div>
        )}
      </div>

      {/* Environment editor overlay */}
      {showEnvEditor && activeCollection && (
        <EnvEditor
          collection={activeCollection}
          onClose={() => setShowEnvEditor(false)}
          onSave={envs => updateApiCollection(activeCollection.id, { environments: envs })}
        />
      )}
    </div>
  );
}

// ─── Request Editor ───────────────────────────────────────────────────────────

function RequestEditor({
  request, onSave, onExecute, executing, saving, response, execError, responseTab, setResponseTab,
}: {
  request: ApiRequest;
  onSave: (partial: Partial<ApiRequest>) => void;
  onExecute: () => void;
  executing: boolean;
  saving: boolean;
  response: ApiResponse | null;
  execError: string;
  responseTab: 'body' | 'headers' | 'tests';
  setResponseTab: (t: 'body' | 'headers' | 'tests') => void;
}) {
  const [local, setLocal] = useState<ApiRequest>(request);
  const [bodyTab, setBodyTab] = useState<'body' | 'headers' | 'tests'>('body');
  const isDirty = JSON.stringify(local) !== JSON.stringify(request);

  useEffect(() => { setLocal(request); }, [request.id]);

  function addHeader() {
    setLocal(p => ({ ...p, headers: [...p.headers, { key: '', value: '', enabled: true }] }));
  }
  function removeHeader(idx: number) {
    setLocal(p => ({ ...p, headers: p.headers.filter((_, i) => i !== idx) }));
  }
  function updateHeader(idx: number, field: keyof ApiHeader, val: any) {
    setLocal(p => {
      const headers = [...p.headers];
      headers[idx] = { ...headers[idx], [field]: val };
      return { ...p, headers };
    });
  }

  function addTest() {
    setLocal(p => ({
      ...p,
      tests: [...p.tests, { id: genId(), name: 'New test', type: 'assertStatus', value: '200' }],
    }));
  }
  function removeTest(id: string) {
    setLocal(p => ({ ...p, tests: p.tests.filter(t => t.id !== id) }));
  }
  function updateTest(id: string, field: keyof ApiRequestTest, val: any) {
    setLocal(p => ({
      ...p,
      tests: p.tests.map(t => t.id === id ? { ...t, [field]: val } : t),
    }));
  }

  const passedTests = response?.testResults?.filter(t => t.passed).length ?? 0;
  const totalTests = response?.testResults?.length ?? 0;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* URL bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex-shrink-0 bg-white/80 dark:bg-slate-900/30">
        <input
          className="input text-xs py-1.5 px-2 w-32"
          value={local.name}
          onChange={e => setLocal(p => ({ ...p, name: e.target.value }))}
          placeholder="Request name"
        />
        <select
          className={`input text-xs py-1.5 px-2 w-28 font-mono font-bold ${METHOD_COLORS[local.method]}`}
          value={local.method}
          onChange={e => setLocal(p => ({ ...p, method: e.target.value as HttpMethod }))}
        >
          {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <input
          className="input flex-1 text-xs py-1.5 px-3 font-mono"
          value={local.url}
          onChange={e => setLocal(p => ({ ...p, url: e.target.value }))}
          placeholder="https://api.example.com/endpoint  (use {{variable}} for env vars)"
          onKeyDown={e => { if (e.key === 'Enter') { onSave(local); onExecute(); } }}
        />
        {isDirty && (
          <button onClick={() => onSave(local)} disabled={saving} className="btn-secondary text-xs py-1.5 px-3">
            {saving ? '…' : 'Save'}
          </button>
        )}
        <button
          onClick={() => { onSave(local); onExecute(); }}
          disabled={executing || !local.url}
          className="btn-primary text-xs py-1.5 px-4"
        >
          {executing ? '⏳ Sending…' : '▶ Send'}
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Request config */}
        <div className="w-1/2 flex flex-col overflow-hidden border-r border-slate-200 dark:border-slate-800">
          {/* Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 px-4 flex-shrink-0">
            {(['body', 'headers', 'tests'] as const).map(t => (
              <button
                key={t}
                onClick={() => setBodyTab(t)}
                className={`px-3 py-2 text-xs transition-colors ${
                  bodyTab === t ? 'text-slate-900 dark:text-white border-b-2 border-blue-500' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {t === 'headers' ? `Headers (${local.headers.filter(h => h.enabled).length})` :
                 t === 'tests' ? `Tests (${local.tests.length})` : 'Body'}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {bodyTab === 'body' && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  {(['none', 'json', 'form', 'text'] as const).map(bt => (
                    <label key={bt} className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 cursor-pointer">
                      <input type="radio" name="bodyType" value={bt} checked={local.bodyType === bt} onChange={() => setLocal(p => ({ ...p, bodyType: bt }))} />
                      {bt}
                    </label>
                  ))}
                </div>
                {local.bodyType !== 'none' && (
                  <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950">
                    {/* Code editor header */}
                    <div className="flex items-center justify-between px-3 py-1.5 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                      <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                        {local.bodyType === 'json' ? 'JSON' : local.bodyType === 'form' ? 'Form Data' : 'Plain Text'}
                      </span>
                      {local.bodyType === 'json' && (
                        <button
                          type="button"
                          onClick={() => {
                            try {
                              const pretty = JSON.stringify(JSON.parse(local.body ?? ''), null, 2);
                              setLocal(p => ({ ...p, body: pretty }));
                            } catch {}
                          }}
                          className="text-xs text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                          Format ✨
                        </button>
                      )}
                    </div>
                    {local.bodyType === 'json' ? (
                      <JsonEditorOverlay
                        value={local.body ?? ''}
                        onChange={v => setLocal(p => ({ ...p, body: v }))}
                        placeholder={'{\n  "key": "value"\n}'}
                        height={208}
                      />
                    ) : (
                      <textarea
                        className="w-full h-52 resize-none font-mono text-xs px-4 py-3 bg-transparent text-slate-800 dark:text-slate-200 placeholder-slate-300 dark:placeholder-slate-600 focus:outline-none"
                        value={local.body ?? ''}
                        onChange={e => setLocal(p => ({ ...p, body: e.target.value }))}
                        placeholder="Request body"
                        spellCheck={false}
                      />
                    )}
                  </div>
                )}
              </div>
            )}

            {bodyTab === 'headers' && (
              <div className="space-y-1">
                {local.headers.map((h, idx) => (
                  <div key={idx} className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={h.enabled}
                      onChange={e => updateHeader(idx, 'enabled', e.target.checked)}
                      className="flex-shrink-0"
                    />
                    <input
                      className="input flex-1 text-xs py-1 px-2"
                      value={h.key}
                      onChange={e => updateHeader(idx, 'key', e.target.value)}
                      placeholder="Header name"
                    />
                    <input
                      className="input flex-1 text-xs py-1 px-2"
                      value={h.value}
                      onChange={e => updateHeader(idx, 'value', e.target.value)}
                      placeholder="Value"
                    />
                    <button onClick={() => removeHeader(idx)} className="text-slate-600 hover:text-red-400 text-xs">✕</button>
                  </div>
                ))}
                <button onClick={addHeader} className="text-xs text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 mt-2 transition-colors">+ Add Header</button>
              </div>
            )}

            {bodyTab === 'tests' && (
              <div className="space-y-2">
                {local.tests.map(t => (
                  <div key={t.id} className="card p-2 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <input
                        className="input flex-1 text-xs py-1 px-2"
                        value={t.name}
                        onChange={e => updateTest(t.id, 'name', e.target.value)}
                        placeholder="Test name"
                      />
                      <button onClick={() => removeTest(t.id)} className="text-slate-600 hover:text-red-400 text-xs">✕</button>
                    </div>
                    <div className="flex gap-2">
                      <select
                        className="input text-xs py-1 px-2 w-44"
                        value={t.type}
                        onChange={e => updateTest(t.id, 'type', e.target.value)}
                      >
                        <option value="assertStatus">Status equals</option>
                        <option value="assertBodyContains">Body contains</option>
                        <option value="assertBodyField">Body field equals</option>
                        <option value="assertHeader">Header contains</option>
                      </select>
                      {(t.type === 'assertBodyField' || t.type === 'assertHeader') && (
                        <input
                          className="input flex-1 text-xs py-1 px-2"
                          value={t.field ?? ''}
                          onChange={e => updateTest(t.id, 'field', e.target.value)}
                          placeholder={t.type === 'assertBodyField' ? 'field.path' : 'header-name'}
                        />
                      )}
                      <input
                        className="input flex-1 text-xs py-1 px-2"
                        value={t.value}
                        onChange={e => updateTest(t.id, 'value', e.target.value)}
                        placeholder="Expected value"
                      />
                    </div>
                  </div>
                ))}
                <button onClick={addTest} className="text-xs text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">+ Add Test</button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Response */}
        <div className="w-1/2 flex flex-col overflow-hidden">
          {execError && (
            <div className="px-4 py-2.5 bg-red-50 dark:bg-red-950/40 border-b border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex-shrink-0">
              ⚠️ {execError}
            </div>
          )}

          {response ? (
            <>
              {/* Response meta */}
              <div className="flex items-center gap-4 px-4 py-2 border-b border-slate-200 dark:border-slate-800 flex-shrink-0 bg-white/80 dark:bg-slate-900/30 text-xs">
                <span className={`font-bold tabular-nums ${response.status < 300 ? 'text-emerald-600 dark:text-emerald-400' : response.status < 400 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                  {response.status} {response.statusText}
                </span>
                <span className="text-slate-400 dark:text-slate-500 tabular-nums">{response.duration}ms</span>
                <span className="text-slate-400 dark:text-slate-500">{formatBytes(response.size)}</span>
                {totalTests > 0 && (
                  <span className={passedTests === totalTests ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-red-600 dark:text-red-400 font-semibold'}>
                    {passedTests}/{totalTests} tests
                  </span>
                )}
                <div className="flex-1" />
                {(['body', 'headers', 'tests'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setResponseTab(t)}
                    className={`px-2 py-0.5 rounded text-xs transition-colors ${
                      responseTab === t ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-950 p-4">
                {responseTab === 'body' && (
                  <JsonHighlight
                    text={prettifyBody(response.body, response.headers['content-type'] ?? '')}
                    contentType={response.headers['content-type'] ?? ''}
                  />
                )}
                {responseTab === 'headers' && (
                  <table className="w-full text-xs">
                    <tbody>
                      {Object.entries(response.headers).map(([k, v]) => (
                          <tr key={k} className="border-b border-slate-200 dark:border-slate-800">
                          <td className="py-1.5 pr-3 text-blue-600 dark:text-blue-400 font-medium w-48 font-mono">{k}</td>
                          <td className="py-1.5 text-slate-600 dark:text-slate-300 break-all">{v}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {responseTab === 'tests' && (
                  <div className="space-y-1">
                    {(response.testResults ?? []).map(t => (
                      <div key={t.id} className={`flex items-start gap-2 text-xs p-2.5 rounded-lg ${
                        t.passed ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-red-50 dark:bg-red-950/30'
                      }`}>
                        <span className={t.passed ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-red-600 dark:text-red-400 font-bold'}>{t.passed ? '✓' : '✗'}</span>
                        <div>
                          <div className={t.passed ? 'text-emerald-700 dark:text-emerald-300 font-medium' : 'text-red-700 dark:text-red-300 font-medium'}>{t.name}</div>
                          {!t.passed && t.message && <div className="text-slate-500 dark:text-slate-500 mt-0.5 font-mono text-xs">{t.message}</div>}
                        </div>
                      </div>
                    ))}
                    {(response.testResults?.length ?? 0) === 0 && (
                      <div className="text-slate-400 dark:text-slate-600 text-xs">No tests defined. Add tests in the Tests tab.</div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-2xl mx-auto mb-3">📡</div>
                <div className="text-xs text-slate-500 dark:text-slate-500">
                  {executing ? '⏳ Waiting for response…' : 'Press Send to execute the request'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Environment Editor ───────────────────────────────────────────────────────

function EnvEditor({
  collection, onClose, onSave,
}: {
  collection: ApiCollection;
  onClose: () => void;
  onSave: (envs: ApiCollection['environments']) => void;
}) {
  const [envs, setEnvs] = useState(collection.environments.length > 0
    ? collection.environments
    : [{ name: 'Default', variables: {} }]
  );
  const [activeEnv, setActiveEnv] = useState(envs[0]?.name ?? '');

  const current = envs.find(e => e.name === activeEnv);
  const vars = Object.entries(current?.variables ?? {});

  function addVar() {
    setEnvs(prev => prev.map(e =>
      e.name === activeEnv ? { ...e, variables: { ...e.variables, '': '' } } : e
    ));
  }

  function setVar(oldKey: string, newKey: string, value: string) {
    setEnvs(prev => prev.map(e => {
      if (e.name !== activeEnv) return e;
      const vars = { ...e.variables };
      delete vars[oldKey];
      vars[newKey] = value;
      return { ...e, variables: vars };
    }));
  }

  function removeVar(key: string) {
    setEnvs(prev => prev.map(e => {
      if (e.name !== activeEnv) return e;
      const vars = { ...e.variables };
      delete vars[key];
      return { ...e, variables: vars };
    }));
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="card w-[560px] max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <span className="text-sm font-semibold text-slate-900 dark:text-white">Environments — {collection.name}</span>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-lg">×</button>
        </div>
        <div className="flex flex-1 overflow-hidden">
          {/* Env list */}
          <div className="w-36 border-r border-slate-200 dark:border-slate-800 flex flex-col flex-shrink-0">
            {envs.map(e => (
              <button
                key={e.name}
                onClick={() => setActiveEnv(e.name)}
                className={`px-3 py-2 text-xs text-left transition-colors ${activeEnv === e.name ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'}`}
              >
                {e.name}
              </button>
            ))}
            <button
              onClick={() => {
                const name = prompt('Environment name:');
                if (name?.trim()) { setEnvs(p => [...p, { name, variables: {} }]); setActiveEnv(name); }
              }}
              className="px-3 py-2 text-xs text-slate-600 hover:text-slate-400"
            >+ Add env</button>
          </div>
          {/* Variables */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {vars.map(([k, v]) => (
              <div key={k} className="flex gap-1 items-center">
                <input
                  className="input flex-1 text-xs py-1 px-2"
                  defaultValue={k}
                  onBlur={e => setVar(k, e.target.value, v)}
                  placeholder="Variable name"
                />
                <input
                  className="input flex-1 text-xs py-1 px-2"
                  value={v}
                  onChange={e => setVar(k, k, e.target.value)}
                  placeholder="Value"
                />
                <button onClick={() => removeVar(k)} className="text-slate-600 hover:text-red-400 text-xs">✕</button>
              </div>
            ))}
            <button onClick={addVar} className="text-xs text-slate-500 hover:text-slate-300">+ Add variable</button>
          </div>
        </div>
        <div className="px-4 py-3 border-t border-slate-800 flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary text-xs">Cancel</button>
          <button onClick={() => { onSave(envs); onClose(); }} className="btn-primary text-xs">Save</button>
        </div>
      </div>
    </div>
  );
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function prettifyBody(body: string, contentType: string): string {
  if (contentType.includes('json')) {
    try { return JSON.stringify(JSON.parse(body), null, 2); } catch { /* fall through */ }
  }
  return body;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

async function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
