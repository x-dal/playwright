import React from 'react';
import {
  DndContext, DragEndEvent, DragOverEvent, DragStartEvent,
  DragOverlay, PointerSensor, useSensor, useSensors, closestCenter,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useStore, selectActiveSteps } from '../../store/useStore';
import { PALETTE_ITEMS, genId } from '../StepPalette';
import type { Step } from '../../types';
import StepCard from './StepCard';

export default function FlowCanvas() {
  const steps = useStore(selectActiveSteps);
  const { addStep, reorderSteps, selectedStepId, setSelectedStep } = useStore();
  const [activeId, setActiveId] = React.useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const activeStep = steps.find(s => s.id === activeId);

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;

    const fromPalette = active.data.current?.fromPalette;

    if (fromPalette) {
      const make = active.data.current?.make;
      if (make) {
        const newStep = { ...make(), id: genId() } as Step;
        const overIdx = steps.findIndex(s => s.id === String(over.id));
        if (overIdx >= 0) {
          const next = [...steps];
          next.splice(overIdx + 1, 0, newStep);
          reorderSteps(next);
        } else {
          addStep(newStep);
        }
      }
      return;
    }

    if (active.id !== over.id) {
      const oldIdx = steps.findIndex(s => s.id === String(active.id));
      const newIdx = steps.findIndex(s => s.id === String(over.id));
      if (oldIdx !== -1 && newIdx !== -1) {
        reorderSteps(arrayMove(steps, oldIdx, newIdx));
      }
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex-1 overflow-y-auto p-4">
        {steps.length === 0 ? (
          <EmptyCanvas />
        ) : (
          <SortableContext items={steps.map(s => s.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2 max-w-2xl mx-auto">
              {steps.map((step, idx) => (
                <SortableStepCard
                  key={step.id}
                  step={step}
                  index={idx}
                  isSelected={selectedStepId === step.id}
                  onClick={() => setSelectedStep(step.id === selectedStepId ? null : step.id)}
                />
              ))}
            </div>
          </SortableContext>
        )}
      </div>

      <DragOverlay>
        {activeStep && (
          <div className="dnd-dragging">
            <StepCard step={activeStep} index={0} isSelected={false} onClick={() => {}} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

function EmptyCanvas() {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center border-2 border-dashed border-slate-700 rounded-xl m-4">
      <div className="text-4xl mb-3">🎭</div>
      <div className="text-slate-400 font-medium">Drop steps here or click + in the palette</div>
      <div className="text-slate-600 text-sm mt-1">Build your test flow step by step</div>
    </div>
  );
}

function SortableStepCard({ step, index, isSelected, onClick }: {
  step: Step; index: number; isSelected: boolean; onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <StepCard
        step={step}
        index={index}
        isSelected={isSelected}
        onClick={onClick}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}
