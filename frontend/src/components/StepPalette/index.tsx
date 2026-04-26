import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { useStore } from '../../store/useStore';
import type { StepType, Step } from '../../types';

interface PaletteItem {
  type: StepType;
  label: string;
  icon: string;
  colorClass: string;
  description: string;
  make: () => Omit<Step, 'id'>;
}

const PALETTE_ITEMS: PaletteItem[] = [
  {
    type: 'navigate',    label: 'Navigate',    icon: '🔗', colorClass: 'bg-blue-100 dark:bg-blue-900/50',
    description: 'Go to a URL',
    make: () => ({ type: 'navigate', name: 'Navigate to URL', url: 'https://' }),
  },
  {
    type: 'click',       label: 'Click',       icon: '👆', colorClass: 'bg-purple-100 dark:bg-purple-900/50',
    description: 'Click an element',
    make: () => ({ type: 'click', name: 'Click element', selector: '', button: 'left' as const }),
  },
  {
    type: 'type',        label: 'Type',        icon: '⌨', colorClass: 'bg-green-100 dark:bg-green-900/50',
    description: 'Type text into a field',
    make: () => ({ type: 'type', name: 'Type text', selector: '', value: '' }),
  },
  {
    type: 'select',      label: 'Select',      icon: '▾', colorClass: 'bg-teal-100 dark:bg-teal-900/50',
    description: 'Select a dropdown option',
    make: () => ({ type: 'select', name: 'Select option', selector: '', value: '' }),
  },
  {
    type: 'assert',      label: 'Assert',      icon: '✓', colorClass: 'bg-amber-100 dark:bg-amber-900/50',
    description: 'Verify element state',
    make: () => ({ type: 'assert', name: 'Assert element', assertType: 'isVisible' as const, selector: '', expected: '' }),
  },
  {
    type: 'wait',        label: 'Wait',        icon: '⏳', colorClass: 'bg-orange-100 dark:bg-orange-900/50',
    description: 'Wait for element or time',
    make: () => ({ type: 'wait', name: 'Wait', waitType: 'selector' as const, selector: '', timeout: 10000, onTimeout: 'fail' as const }),
  },
  {
    type: 'hover',       label: 'Hover',       icon: '🖱', colorClass: 'bg-pink-100 dark:bg-pink-900/50',
    description: 'Hover over an element',
    make: () => ({ type: 'hover', name: 'Hover element', selector: '' }),
  },
  {
    type: 'keyboard',    label: 'Keyboard',    icon: '⌨', colorClass: 'bg-indigo-100 dark:bg-indigo-900/50',
    description: 'Press a keyboard key',
    make: () => ({ type: 'keyboard', name: 'Press key', key: 'Enter' }),
  },
  {
    type: 'scroll',      label: 'Scroll',      icon: '↕', colorClass: 'bg-cyan-100 dark:bg-cyan-900/50',
    description: 'Scroll the page or element',
    make: () => ({ type: 'scroll', name: 'Scroll', x: 0, y: 300 }),
  },
  {
    type: 'screenshot',  label: 'Screenshot',  icon: '📸', colorClass: 'bg-violet-100 dark:bg-violet-900/50',
    description: 'Capture a screenshot',
    make: () => ({ type: 'screenshot' as const, name: 'Screenshot', screenshotName: undefined }),
  },
  {
    type: 'conditional', label: 'Conditional', icon: '⁉', colorClass: 'bg-rose-100 dark:bg-rose-900/50',
    description: 'If / else logic',
    make: () => ({ type: 'conditional', name: 'If condition', condition: { type: 'elementVisible' as const, selector: '' }, thenSteps: [], elseSteps: [] }),
  },
  {
    type: 'pageObject',  label: 'Page Object', icon: '📦', colorClass: 'bg-slate-100 dark:bg-slate-700/60',
    description: 'Reuse a named flow',
    make: () => ({ type: 'pageObject', name: 'Use page object', pageObjectId: '', params: {} }),
  },
];

function genId() {
  return `step-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export default function StepPalette() {
  const { paletteFilter, setPaletteFilter, addStep } = useStore();

  const filtered = PALETTE_ITEMS.filter(
    item => item.label.toLowerCase().includes(paletteFilter.toLowerCase()) ||
            item.description.toLowerCase().includes(paletteFilter.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900">
      <div className="px-3 py-3 border-b border-slate-200 dark:border-slate-800">
        <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Step Palette</div>
        <input
          className="input w-full text-xs"
          placeholder="Filter steps…"
          value={paletteFilter}
          onChange={e => setPaletteFilter(e.target.value)}
        />
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filtered.map(item => (
          <DraggableStepItem key={item.type} item={item} onAdd={() => {
            addStep({ ...item.make(), id: genId() } as Step);
          }} />
        ))}
      </div>

      <div className="px-3 py-2.5 border-t border-slate-200 dark:border-slate-800">
        <p className="text-xs text-slate-400 dark:text-slate-500">Drag to canvas or click + to add</p>
      </div>
    </div>
  );
}

function DraggableStepItem({ item, onAdd }: { item: PaletteItem; onAdd: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${item.type}`,
    data: { fromPalette: true, stepType: item.type, make: item.make },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`
        group flex items-center gap-2.5 px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700
        bg-white dark:bg-slate-800/50 cursor-grab active:cursor-grabbing
        hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm
        transition-all duration-100 select-none
        ${isDragging ? 'opacity-40 shadow-lg' : ''}
      `}
      style={{ touchAction: 'none' }}
    >
      {/* Coloured icon box */}
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 ${item.colorClass}`}>
        {item.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-tight">{item.label}</div>
        <div className="text-xs text-slate-400 dark:text-slate-500 truncate leading-tight">{item.description}</div>
      </div>
      <button
        onPointerDown={e => e.stopPropagation()}
        onClick={e => { e.stopPropagation(); onAdd(); }}
        className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
        title="Add step"
      >
        +
      </button>
    </div>
  );
}

export { PALETTE_ITEMS, genId };
