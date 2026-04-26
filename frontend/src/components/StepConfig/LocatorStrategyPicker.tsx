import React from 'react';
import type { LocatorType, LocatorOptions } from '../../types';

interface Props {
  locatorType: LocatorType | undefined;
  selector: string;
  locatorOptions: LocatorOptions | undefined;
  onChange: (patch: { locatorType?: LocatorType; selector?: string; locatorOptions?: LocatorOptions }) => void;
  label?: string;
}

const STRATEGIES: { value: LocatorType; label: string; desc: string }[] = [
  { value: 'css',         label: 'CSS Selector',    desc: '#id, .class, button[type="submit"]' },
  { value: 'xpath',       label: 'XPath',            desc: '//div[@class="foo"]' },
  { value: 'role',        label: 'Role (ARIA)',       desc: 'Accessible role + name (most stable)' },
  { value: 'label',       label: 'Label',            desc: 'Form field by its visible label' },
  { value: 'placeholder', label: 'Placeholder',      desc: 'Input by placeholder text' },
  { value: 'text',        label: 'Visible Text',     desc: 'Element by its visible text content' },
  { value: 'testId',      label: 'Test ID',          desc: 'data-testid attribute value' },
  { value: 'altText',     label: 'Alt Text',         desc: 'Image by alt attribute' },
  { value: 'title',       label: 'Title',            desc: 'Element by title attribute' },
];

const COMMON_ARIA_ROLES = [
  'alert', 'button', 'checkbox', 'combobox', 'dialog', 'form',
  'heading', 'img', 'link', 'listbox', 'main', 'menuitem',
  'navigation', 'option', 'radio', 'searchbox', 'tab', 'tabpanel',
  'textbox',
];

const PLACEHOLDER_MAP: Record<LocatorType, string> = {
  css:         '#id, .class, button[type="submit"]',
  xpath:       '//div[@class=\'foo\']',
  role:        'Select ARIA role…',
  label:       'Username',
  placeholder: 'Enter your email',
  text:        'Submit',
  testId:      'login-button',
  altText:     'Company logo',
  title:       'Close dialog',
  raw:         'page.locator(\'label\').filter({ hasText: \'…\' }).getByLabel(\'…\')',
};

export default function LocatorStrategyPicker({ locatorType, selector, locatorOptions, onChange, label = 'Locator' }: Props) {
  const type = locatorType ?? 'css';

  function handleTypeChange(newType: LocatorType) {
    onChange({ locatorType: newType, selector: '', locatorOptions: undefined });
  }

  function handleSelectorChange(value: string) {
    onChange({ selector: value });
  }

  function handleOptionChange(patch: Partial<LocatorOptions>) {
    onChange({ locatorOptions: { ...(locatorOptions ?? {}), ...patch } });
  }

  const showExact = ['label', 'placeholder', 'text', 'altText', 'title'].includes(type);
  const showRoleOptions = type === 'role';

  return (
    <div className="space-y-2">
      <label className="label">{label}</label>

      {/* Strategy dropdown */}
      <select
        className="input w-full"
        value={type}
        onChange={e => handleTypeChange(e.target.value as LocatorType)}
      >
        {STRATEGIES.map(s => (
          <option key={s.value} value={s.value}>{s.label} — {s.desc}</option>
        ))}
      </select>

      {/* Primary value input */}
      {type === 'role' ? (
        <div className="flex gap-2">
          <select
            className="input flex-1 font-mono text-xs"
            value={selector}
            onChange={e => handleSelectorChange(e.target.value)}
          >
            <option value="">Select ARIA role…</option>
            {COMMON_ARIA_ROLES.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <input
            className="input flex-1 font-mono text-xs"
            value={selector}
            onChange={e => handleSelectorChange(e.target.value)}
            placeholder="or type role name"
          />
        </div>
      ) : type === 'raw' ? (
        /* Raw: full page.xxx().yyy() expression — show as multi-line textarea */
        <textarea
          className="input w-full font-mono text-xs resize-y"
          rows={3}
          value={selector}
          onChange={e => handleSelectorChange(e.target.value)}
          placeholder={PLACEHOLDER_MAP.raw}
          spellCheck={false}
        />
      ) : (
        <input
          className="input w-full font-mono text-xs"
          value={selector}
          onChange={e => handleSelectorChange(e.target.value)}
          placeholder={PLACEHOLDER_MAP[type]}
        />
      )}

      {/* Options for role */}
      {showRoleOptions && (
        <div className="space-y-2 pl-2 border-l-2 border-slate-700">
          <div>
            <label className="label text-xs">Accessible name (optional)</label>
            <input
              className="input w-full text-xs"
              value={locatorOptions?.name ?? ''}
              onChange={e => handleOptionChange({ name: e.target.value || undefined })}
              placeholder='e.g. Search, Login, Submit'
            />
          </div>
          <details className="text-xs text-slate-400">
            <summary className="cursor-pointer select-none hover:text-slate-300">Advanced role options</summary>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(['checked', 'disabled', 'expanded', 'pressed', 'selected'] as const).map(flag => (
                <label key={flag} className="flex items-center gap-2 cursor-pointer capitalize">
                  <input
                    type="checkbox"
                    checked={!!(locatorOptions as any)?.[flag]}
                    onChange={e => handleOptionChange({ [flag]: e.target.checked || undefined })}
                    className="accent-blue-500"
                  />
                  {flag}
                </label>
              ))}
              <div className="col-span-2">
                <label className="label text-xs">Level (heading)</label>
                <input
                  type="number"
                  className="input w-full text-xs"
                  min={1} max={6}
                  value={locatorOptions?.level ?? ''}
                  onChange={e => handleOptionChange({ level: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="1–6"
                />
              </div>
            </div>
          </details>
        </div>
      )}

      {/* Exact option for text-based methods */}
      {showExact && (
        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={locatorOptions?.exact ?? false}
            onChange={e => handleOptionChange({ exact: e.target.checked || undefined })}
            className="accent-blue-500"
          />
          Exact match
        </label>
      )}
    </div>
  );
}
