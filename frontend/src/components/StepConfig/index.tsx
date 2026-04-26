import React from 'react';
import { useStore, selectActiveSteps } from '../../store/useStore';
import type {
  Step, NavigateStep, ClickStep, TypeStep, SelectStep,
  WaitStep, AssertStep, PageObjectStep, ConditionalStep,
  HoverStep, KeyboardStep, ScrollStep, ScreenshotStep,
} from '../../types';
import LocatorStrategyPicker from './LocatorStrategyPicker';

export default function StepConfig() {
  const { selectedStepId, updateStep } = useStore();
  const steps = useStore(selectActiveSteps);
  const { activeSuiteId, suites } = useStore();
  const suite = suites.find(s => s.id === activeSuiteId);

  const step = steps.find(s => s.id === selectedStepId);

  if (!step) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <div className="text-3xl mb-2">👆</div>
        <div className="text-slate-400 text-sm">Select a step to configure it</div>
      </div>
    );
  }

  const update = (partial: Partial<Step>) => updateStep(step.id, partial);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs bg-slate-700 rounded px-2 py-0.5 text-slate-400 uppercase font-semibold">{step.type}</span>
        <input
          className="input flex-1 text-sm font-medium"
          value={step.name}
          onChange={e => update({ name: e.target.value } as any)}
          placeholder="Step name"
        />
      </div>

      {step.type === 'navigate'    && <NavigateConfig step={step} update={update} />}
      {step.type === 'click'       && <ClickConfig step={step} update={update} />}
      {step.type === 'type'        && <TypeConfig step={step} update={update} />}
      {step.type === 'select'      && <SelectConfig step={step} update={update} />}
      {step.type === 'wait'        && <WaitConfig step={step} update={update} />}
      {step.type === 'assert'      && <AssertConfig step={step} update={update} />}
      {step.type === 'hover'       && <SelectorConfig step={step as HoverStep} update={update} label="Element Selector" />}
      {step.type === 'keyboard'    && <KeyboardConfig step={step} update={update} />}
      {step.type === 'scroll'      && <ScrollConfig step={step} update={update} />}
      {step.type === 'screenshot'  && <ScreenshotConfig step={step} update={update} />}
      {step.type === 'pageObject'  && <PageObjectConfig step={step} update={update} suite={suite} />}
      {step.type === 'conditional' && <ConditionalConfig step={step} update={update} />}
    </div>
  );
}

// ─── Field helpers ─────────────────────────────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="text-xs text-slate-600 mt-1">{hint}</p>}
    </div>
  );
}

function SelectorInput({ value, onChange, placeholder = 'CSS selector or text locator' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      className="input w-full font-mono text-xs"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}

// ─── Step configs ──────────────────────────────────────────────────────────────

function NavigateConfig({ step, update }: { step: NavigateStep; update: any }) {
  return (
    <Field label="URL" hint="Supports absolute URLs. Use {{variable}} for data substitution.">
      <input className="input w-full font-mono text-xs" value={step.url} onChange={e => update({ url: e.target.value })} placeholder="https://example.com" />
    </Field>
  );
}

function ClickConfig({ step, update }: { step: ClickStep; update: any }) {
  return (
    <div className="space-y-3">
      <LocatorStrategyPicker
        locatorType={step.locatorType}
        selector={step.selector}
        locatorOptions={step.locatorOptions}
        onChange={patch => update(patch as any)}
        label="Selector"
      />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Mouse Button">
          <select className="input w-full" value={step.button ?? 'left'} onChange={e => update({ button: e.target.value })}>
            <option value="left">Left</option>
            <option value="right">Right</option>
            <option value="middle">Middle</option>
          </select>
        </Field>
        <Field label="Click Count">
          <input type="number" className="input w-full" min={1} max={3} value={step.clickCount ?? 1} onChange={e => update({ clickCount: Number(e.target.value) })} />
        </Field>
      </div>
    </div>
  );
}

function TypeConfig({ step, update }: { step: TypeStep; update: any }) {
  return (
    <div className="space-y-3">
      <LocatorStrategyPicker
        locatorType={step.locatorType}
        selector={step.selector}
        locatorOptions={step.locatorOptions}
        onChange={patch => update(patch as any)}
        label="Selector"
      />
      <Field label="Value" hint="Use {{variable}} to reference test data columns.">
        <input className="input w-full" value={step.value} onChange={e => update({ value: e.target.value })} placeholder="Text to type or {{username}}" />
      </Field>
      <Field label="Behavior">
        <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
          <input type="checkbox" checked={step.clearFirst !== false} onChange={e => update({ clearFirst: e.target.checked })} className="accent-blue-500" />
          Clear field before typing (fill mode)
        </label>
      </Field>
    </div>
  );
}

function SelectConfig({ step, update }: { step: SelectStep; update: any }) {
  return (
    <div className="space-y-3">
      <LocatorStrategyPicker
        locatorType={step.locatorType}
        selector={step.selector}
        locatorOptions={step.locatorOptions}
        onChange={patch => update(patch as any)}
        label="Selector"
      />
      <Field label="Option Value / Label">
        <input className="input w-full" value={step.value} onChange={e => update({ value: e.target.value })} placeholder="Option value or {{variable}}" />
      </Field>
    </div>
  );
}

function WaitConfig({ step, update }: { step: WaitStep; update: any }) {
  return (
    <div className="space-y-3">
      <Field label="Wait Type">
        <select className="input w-full" value={step.waitType} onChange={e => update({ waitType: e.target.value })}>
          <option value="selector">Wait for selector</option>
          <option value="timeout">Wait for timeout</option>
          <option value="navigation">Wait for navigation</option>
        </select>
      </Field>
      {step.waitType === 'selector' && (
        <LocatorStrategyPicker
          locatorType={step.locatorType}
          selector={step.selector ?? ''}
          locatorOptions={step.locatorOptions}
          onChange={patch => update(patch as any)}
          label="Selector"
        />
      )}
      <Field label="Timeout (ms)">
        <input type="number" className="input w-full" min={100} step={500} value={step.timeout} onChange={e => update({ timeout: Number(e.target.value) })} />
      </Field>
      {step.waitType === 'selector' && (
        <Field label="On Timeout">
          <select className="input w-full" value={step.onTimeout} onChange={e => update({ onTimeout: e.target.value })}>
            <option value="fail">Fail the test</option>
            <option value="skip">Skip this step</option>
          </select>
        </Field>
      )}
    </div>
  );
}

const ASSERT_TYPES = [
  { value: 'isVisible',       label: 'Is Visible' },
  { value: 'isHidden',        label: 'Is Hidden' },
  { value: 'containsText',    label: 'Contains Text' },
  { value: 'notContainsText', label: 'Does Not Contain Text' },
  { value: 'hasValue',        label: 'Has Value' },
  { value: 'hasCount',        label: 'Has Count' },
  { value: 'urlContains',     label: 'URL Contains' },
  { value: 'titleContains',   label: 'Title Contains' },
  { value: 'isChecked',       label: 'Is Checked' },
  { value: 'isEnabled',       label: 'Is Enabled' },
  { value: 'isDisabled',      label: 'Is Disabled' },
];

function AssertConfig({ step, update }: { step: AssertStep; update: any }) {
  const needsExpected = ['containsText', 'notContainsText', 'hasValue', 'hasCount', 'urlContains', 'titleContains'];
  const needsSelector = !['urlContains', 'titleContains'].includes(step.assertType);

  return (
    <div className="space-y-3">
      <Field label="Assert Type">
        <select className="input w-full" value={step.assertType} onChange={e => update({ assertType: e.target.value })}>
          {ASSERT_TYPES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
        </select>
      </Field>
      {needsSelector && (
        <LocatorStrategyPicker
          locatorType={step.locatorType}
          selector={step.selector}
          locatorOptions={step.locatorOptions}
          onChange={patch => update(patch as any)}
          label="Selector"
        />
      )}
      {needsExpected.includes(step.assertType) && (
        <Field label="Expected Value">
          <input className="input w-full" value={step.expected} onChange={e => update({ expected: e.target.value })} placeholder="Expected value" />
        </Field>
      )}
    </div>
  );
}

function SelectorConfig({ step, update, label }: { step: HoverStep; update: any; label: string }) {
  return (
    <LocatorStrategyPicker
      locatorType={step.locatorType}
      selector={step.selector}
      locatorOptions={step.locatorOptions}
      onChange={patch => update(patch as any)}
      label={label}
    />
  );
}

const COMMON_KEYS = ['Enter', 'Escape', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Backspace', 'Delete', 'Space', 'F5'];

function KeyboardConfig({ step, update }: { step: KeyboardStep; update: any }) {
  return (
    <div className="space-y-3">
      <Field label="Key" hint="Playwright key name (e.g. Enter, Escape, Tab, ArrowDown).">
        <input className="input w-full font-mono" value={step.key} onChange={e => update({ key: e.target.value })} placeholder="Enter" />
      </Field>
      <div className="flex flex-wrap gap-1">
        {COMMON_KEYS.map(k => (
          <button key={k} onClick={() => update({ key: k })}
            className={`text-xs px-2 py-1 rounded border transition-colors ${step.key === k ? 'border-blue-500 bg-blue-900/40 text-blue-300' : 'border-slate-600 text-slate-400 hover:border-slate-500'}`}>
            {k}
          </button>
        ))}
      </div>
    </div>
  );
}

function ScrollConfig({ step, update }: { step: ScrollStep; update: any }) {
  return (
    <div className="space-y-3">
      <Field label="Scroll Target">
        <select className="input w-full" value={step.selector ? 'element' : 'window'} onChange={e => update(e.target.value === 'element' ? { selector: '' } : { selector: undefined })}>
          <option value="window">Scroll window to position</option>
          <option value="element">Scroll element into view</option>
        </select>
      </Field>
      {step.selector !== undefined ? (
        <LocatorStrategyPicker
          locatorType={step.locatorType}
          selector={step.selector}
          locatorOptions={step.locatorOptions}
          onChange={patch => update(patch as any)}
          label="Element Selector"
        />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Field label="X Position"><input type="number" className="input w-full" value={step.x ?? 0} onChange={e => update({ x: Number(e.target.value) })} /></Field>
          <Field label="Y Position"><input type="number" className="input w-full" value={step.y ?? 0} onChange={e => update({ y: Number(e.target.value) })} /></Field>
        </div>
      )}
    </div>
  );
}

function ScreenshotConfig({ step, update }: { step: ScreenshotStep; update: any }) {
  return (
    <Field label="Screenshot Name" hint="Optional. Saved as <name>.png in the artifacts directory.">
      <input className="input w-full" value={step.screenshotName ?? ''} onChange={e => update({ screenshotName: e.target.value || undefined })} placeholder="e.g. after-login" />
    </Field>
  );
}

function PageObjectConfig({ step, update, suite }: { step: PageObjectStep; update: any; suite: any }) {
  const po = suite?.pageObjects?.find((p: any) => p.id === step.pageObjectId);

  return (
    <div className="space-y-3">
      <Field label="Page Object">
        <select className="input w-full" value={step.pageObjectId} onChange={e => update({ pageObjectId: e.target.value, params: {} })}>
          <option value="">Select page object…</option>
          {(suite?.pageObjects ?? []).map((p: any) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </Field>
      {po && po.params.length > 0 && (
        <div className="space-y-2">
          <label className="label">Parameters</label>
          {po.params.map((param: string) => (
            <div key={param}>
              <label className="label">{param}</label>
              <input
                className="input w-full text-xs font-mono"
                value={step.params[param] ?? ''}
                onChange={e => update({ params: { ...step.params, [param]: e.target.value } })}
                placeholder={`Value for {{${param}}}`}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ConditionalConfig({ step, update }: { step: ConditionalStep; update: any }) {
  return (
    <div className="space-y-3">
      <Field label="Condition Type">
        <select className="input w-full" value={step.condition.type} onChange={e => update({ condition: { ...step.condition, type: e.target.value } })}>
          <option value="elementVisible">Element is visible</option>
          <option value="elementContainsText">Element contains text</option>
          <option value="urlContains">URL contains</option>
        </select>
      </Field>
      {(step.condition.type === 'elementVisible' || step.condition.type === 'elementContainsText') && (
        <LocatorStrategyPicker
          locatorType={step.condition.locatorType}
          selector={step.condition.selector ?? ''}
          locatorOptions={step.condition.locatorOptions}
          onChange={patch => update({ condition: { ...step.condition, ...patch } } as any)}
          label="Selector"
        />
      )}
      {(step.condition.type === 'elementContainsText' || step.condition.type === 'urlContains') && (
        <Field label="Value">
          <input className="input w-full" value={step.condition.value ?? ''} onChange={e => update({ condition: { ...step.condition, value: e.target.value } })} placeholder="Expected text/URL fragment" />
        </Field>
      )}
      <div className="bg-slate-900/60 rounded-lg p-3 text-xs text-slate-500 border border-slate-700">
        <div className="mb-1 font-medium text-slate-400">Then / Else branches</div>
        <p>Add nested steps by switching to code view or using the advanced API. Visual sub-step editing is available in the generated code.</p>
        <p className="mt-1">Then steps: <span className="text-slate-300">{step.thenSteps.length}</span> &nbsp;|&nbsp; Else steps: <span className="text-slate-300">{step.elseSteps.length}</span></p>
      </div>
    </div>
  );
}
