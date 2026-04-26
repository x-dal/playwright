import React from 'react';
import { useStore } from '../../store/useStore';
import type { Step } from '../../types';

const STEP_COLORS: Record<string, string> = {
  navigate:    'border-l-blue-500 bg-blue-950/20',
  click:       'border-l-purple-500 bg-purple-950/20',
  type:        'border-l-green-500 bg-green-950/20',
  select:      'border-l-teal-500 bg-teal-950/20',
  assert:      'border-l-amber-500 bg-amber-950/20',
  wait:        'border-l-orange-500 bg-orange-950/20',
  hover:       'border-l-pink-500 bg-pink-950/20',
  keyboard:    'border-l-indigo-500 bg-indigo-950/20',
  scroll:      'border-l-cyan-500 bg-cyan-950/20',
  screenshot:  'border-l-violet-500 bg-violet-950/20',
  conditional: 'border-l-rose-500 bg-rose-950/20',
  pageObject:  'border-l-slate-400 bg-slate-800/60',
};

const STEP_ICONS: Record<string, string> = {
  navigate: '🔗', click: '👆', type: '⌨', select: '▾',
  assert: '✓', wait: '⏳', hover: '🖱', keyboard: '⌨',
  scroll: '↕', screenshot: '📸', conditional: '⁉', pageObject: '📦',
};

function describeLocatorForCard(step: { selector?: string; locatorType?: string; locatorOptions?: any }): string {
  const t = step.locatorType ?? 'css';
  const s = step.selector || '(none)';
  if (t === 'role')   return step.locatorOptions?.name ? `[${s}] "${step.locatorOptions.name}"` : `[${s}]`;
  if (t === 'css')    return s;
  if (t === 'label')  return `label:"${s}"`;
  if (t === 'text')   return `"${s}"`;
  if (t === 'testId') return `testId:${s}`;
  return `${t}:"${s}"`;
}

function getStepSummary(step: Step): string {
  switch (step.type) {
    case 'navigate':    return step.url || '(no URL)';
    case 'click':       return describeLocatorForCard(step);
    case 'type':        return `"${step.value || ''}" → ${describeLocatorForCard(step)}`;
    case 'select':      return `"${step.value || ''}" in ${describeLocatorForCard(step)}`;
    case 'assert':      return `${step.assertType} on ${describeLocatorForCard(step)}`;
    case 'wait':        return step.waitType === 'timeout' ? `${step.timeout}ms` : describeLocatorForCard(step);
    case 'hover':       return describeLocatorForCard(step);
    case 'keyboard':    return step.key || '(no key)';
    case 'scroll':      return step.selector ? `scroll to ${describeLocatorForCard(step)}` : `(${step.x ?? 0}, ${step.y ?? 0})`;
    case 'screenshot':  return step.screenshotName || 'full page';
    case 'conditional': return `if ${step.condition.type}`;
    case 'pageObject':  return step.pageObjectId || '(no page object)';
    default:            return '';
  }
}

interface Props {
  step: Step;
  index: number;
  isSelected: boolean;
  onClick: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}

export default function StepCard({ step, index, isSelected, onClick, dragHandleProps }: Props) {
  const { removeStep, toggleStepDisabled, duplicateStep } = useStore();

  const colorClass = STEP_COLORS[step.type] ?? 'border-l-slate-500';
  const icon = STEP_ICONS[step.type] ?? '·';

  return (
    <div
      className={`
        step-card border-l-4 ${colorClass}
        ${isSelected ? 'step-card-active' : ''}
        ${step.disabled ? 'step-card-disabled' : ''}
        flex items-center gap-2
      `}
      onClick={onClick}
    >
      {/* Drag handle */}
      <div
        {...dragHandleProps}
        className="text-slate-600 hover:text-slate-400 cursor-grab active:cursor-grabbing select-none px-1 shrink-0"
        style={{ touchAction: 'none' }}
        onClick={e => e.stopPropagation()}
      >
        ⣿
      </div>

      {/* Step number */}
      <span className="text-xs text-slate-600 w-5 shrink-0 text-right">{index + 1}</span>

      {/* Icon */}
      <span className="text-sm w-5 shrink-0 text-center">{icon}</span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">{step.type}</span>
          {step.disabled && <span className="badge-skipped text-xs">disabled</span>}
        </div>
        <div className="text-xs text-slate-400 truncate font-mono">{step.name}</div>
        <div className="text-xs text-slate-600 truncate">{getStepSummary(step)}</div>
      </div>

      {/* Actions */}
      <div
        className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={e => e.stopPropagation()}
        style={{ opacity: isSelected ? 1 : undefined }}
      >
        <button
          onClick={e => { e.stopPropagation(); toggleStepDisabled(step.id); }}
          title={step.disabled ? 'Enable' : 'Disable'}
          className="w-6 h-6 rounded flex items-center justify-center text-slate-500 hover:text-amber-400 hover:bg-slate-700 transition-colors"
        >
          {step.disabled ? '▶' : '⊘'}
        </button>
        <button
          onClick={e => { e.stopPropagation(); duplicateStep(step.id); }}
          title="Duplicate"
          className="w-6 h-6 rounded flex items-center justify-center text-slate-500 hover:text-blue-400 hover:bg-slate-700 transition-colors"
        >
          ⎘
        </button>
        <button
          onClick={e => { e.stopPropagation(); removeStep(step.id); }}
          title="Remove"
          className="w-6 h-6 rounded flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-slate-700 transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
