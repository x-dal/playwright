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
    type: 'navigate', label: 'Navigate', icon: '🔗', colorClass: 'border-blue-600/50 bg-blue-950/40 hover:border-blue-500',
    description: 'Go to a URL',
    make: () => ({ type: 'navigate', name: 'Navigate to URL', url: 'https://' }),
  },
  {
    type: 'click', label: 'Click', icon: '👆', colorClass: 'border-purple-600/50 bg-purple-950/40 hover:border-purple-500',
    description: 'Click an element',
    make: () => ({ type: 'click', name: 'Click element', selector: '', button: 'left' as const }),
  },
  {
    type: 'type', label: 'Type', icon: '⌨', colorClass: 'border-green-600/50 bg-green-950/40 hover:border-green-500',
    description: 'Type text into a field',
    make: () => ({ type: 'type', name: 'Type text', selector: '', value: '' }),
  },
  {
    type: 'select', label: 'Select', icon: '▾', colorClass: 'border-teal-600/50 bg-teal-950/40 hover:border-teal-500',
    description: 'Select a dropdown option',
    make: () => ({ type: 'select', name: 'Select option', selector: '', value: '' }),
  },
  {
    type: 'assert', label: 'Assert', icon: '✓', colorClass: 'border-amber-600/50 bg-amber-950/40 hover:border-amber-500',
    description: 'Verify element state',
    make: () => ({ type: 'assert', name: 'Assert element', assertType: 'isVisible' as const, selector: '', expected: '' }),
  },
  {
    type: 'wait', label: 'Wait', icon: '⏳', colorClass: 'border-orange-600/50 bg-orange-950/40 hover:border-orange-500',
    description: 'Wait for element or time',
    make: () => ({ type: 'wait', name: 'Wait', waitType: 'selector' as const, selector: '', timeout: 10000, onTimeout: 'fail' as const }),
  },
  {
    type: 'hover', label: 'Hover', icon: '🖱', colorClass: 'border-pink-600/50 bg-pink-950/40 hover:border-pink-500',
    description: 'Hover over an element',
    make: () => ({ type: 'hover', name: 'Hover element', selector: '' }),
  },
  {
    type: 'keyboard', label: 'Keyboard', icon: '⌨', colorClass: 'border-indigo-600/50 bg-indigo-950/40 hover:border-indigo-500',
    description: 'Press a keyboard key',
    make: () => ({ type: 'keyboard', name: 'Press key', key: 'Enter' }),
  },
  {
    type: 'scroll', label: 'Scroll', icon: '↕', colorClass: 'border-cyan-600/50 bg-cyan-950/40 hover:border-cyan-500',
    description: 'Scroll the page or element',
    make: () => ({ type: 'scroll', name: 'Scroll', x: 0, y: 300 }),
  },
  {
    type: 'screenshot', label: 'Screenshot', icon: '📸', colorClass: 'border-violet-600/50 bg-violet-950/40 hover:border-violet-500',
    description: 'Capture a screenshot',
    make: () => ({ type: 'screenshot' as const, name: 'Screenshot', screenshotName: undefined }),
  },
  {
    type: 'conditional', label: 'Conditional', icon: '⁉', colorClass: 'border-rose-600/50 bg-rose-950/40 hover:border-rose-500',
    description: 'If / else logic',
    make: () => ({ type: 'conditional', name: 'If condition', condition: { type: 'elementVisible' as const, selector: '' }, thenSteps: [], elseSteps: [] }),
  },
  {
    type: 'pageObject', label: 'Page Object', icon: '📦', colorClass: 'border-slate-500/50 bg-slate-800/80 hover:border-slate-400',
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
    <div className="flex flex-col h-full">
      <div className="px-3 py-3 border-b border-slate-700">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Step Palette</div>
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

      <div className="px-3 py-2 border-t border-slate-700">
        <p className="text-xs text-slate-600">Drag to canvas or click + to add</p>
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
        flex items-center gap-2 p-2 rounded-lg border cursor-grab active:cursor-grabbing
        transition-all duration-100 select-none
        ${item.colorClass}
        ${isDragging ? 'opacity-50' : ''}
      `}
      style={{ touchAction: 'none' }}
    >
      <span className="text-base w-6 text-center">{item.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-slate-200">{item.label}</div>
        <div className="text-xs text-slate-500 truncate">{item.description}</div>
      </div>
      <button
        onPointerDown={e => e.stopPropagation()}
        onClick={e => { e.stopPropagation(); onAdd(); }}
        className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-600 transition-colors flex-shrink-0"
        title="Add step"
      >
        +
      </button>
    </div>
  );
}

export { PALETTE_ITEMS, genId };
