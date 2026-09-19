/**
 * Step List Component.
 *
 * Left panel of the Workflow Editor.
 * Manages step ordering, visual statuses, selection, duplication,
 * deletion, manual step insertion, and drag-and-drop reordering.
 */

import { useState } from 'react';
import type { WorkflowStep } from '@shared/types';
import { generateStepId } from '@shared/utils';
import {
  StepIcon,
  IconGlobe,
  IconPointer,
  IconKeyboard,
  IconClock,
  IconShield,
  IconCrosshair,
  IconZap,
  IconClipboard,
  IconTrash,
  IconChevronUp,
  IconChevronDown,
  IconPlus,
} from './Icons';

interface StepListProps {
  steps: WorkflowStep[];
  selectedStepId: string | null;
  onSelectStep: (stepId: string) => void;
  onMoveStep: (fromIndex: number, toIndex: number) => void;
  onDeleteStep: (stepId: string) => void;
  onDuplicateStep: (stepId: string) => void;
  onToggleDisabled: (stepId: string) => void;
  onAddManualStep: (step: WorkflowStep) => void;
}

export function StepList({
  steps,
  selectedStepId,
  onSelectStep,
  onMoveStep,
  onDeleteStep,
  onDuplicateStep,
  onToggleDisabled,
  onAddManualStep,
}: StepListProps) {
  const [filterQuery, setFilterQuery] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);

  const filteredSteps = steps
    .map((step, originalIndex) => ({ step, originalIndex }))
    .filter(({ step }) => {
      if (!filterQuery) return true;
      const q = filterQuery.toLowerCase();
      return (
        step.type.toLowerCase().includes(q) ||
        (step.description && step.description.toLowerCase().includes(q))
      );
    });

  const handleCreateStep = (type: string) => {
    setIsAddMenuOpen(false);
    const id = generateStepId();

    let newStep: WorkflowStep;

    switch (type) {
      case 'navigate':
        newStep = {
          id,
          type: 'navigate',
          url: 'https://example.com',
          description: 'Navigate to https://example.com',
        };
        break;
      case 'click':
        newStep = {
          id,
          type: 'click',
          target: {
            tagName: 'BUTTON',
            classes: [],
            selectors: [{ type: 'css', value: 'button.btn-primary', score: 0.8 }],
          },
          clickType: 'left',
          description: 'Click button',
        };
        break;
      case 'input':
        newStep = {
          id,
          type: 'input',
          target: {
            tagName: 'INPUT',
            classes: [],
            selectors: [{ type: 'css', value: 'input[name="example"]', score: 0.8 }],
          },
          value: '',
          sensitive: false,
          description: 'Enter text',
        };
        break;
      case 'wait':
        newStep = {
          id,
          type: 'wait',
          timeout: 2000,
          description: 'Wait 2000ms',
        };
        break;
      case 'assert':
        newStep = {
          id,
          type: 'assert',
          assertion: {
            operator: 'contains',
            expected: 'Success',
            target: {
              tagName: 'DIV',
              classes: [],
              selectors: [{ type: 'css', value: '.alert', score: 0.8 }],
            },
          },
          description: 'Assert contains "Success"',
        };
        break;
      case 'hover':
        newStep = {
          id,
          type: 'hover',
          target: {
            tagName: 'DIV',
            classes: [],
            selectors: [{ type: 'css', value: '.menu-item', score: 0.8 }],
          },
          description: 'Hover over element',
        };
        break;
      case 'keyPress':
        newStep = {
          id,
          type: 'keyPress',
          key: 'Enter',
          description: 'Press Enter',
        };
        break;
      default:
        newStep = {
          id,
          type: 'wait',
          timeout: 1000,
          description: 'Wait 1000ms',
        };
    }

    onAddManualStep(newStep);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      onMoveStep(draggedIndex, dropIndex);
    }
    setDraggedIndex(null);
  };

  return (
    <div className="step-list-panel">
      <div className="step-list-header">
        <div className="header-left">
          <h3>Steps ({steps.length})</h3>
        </div>

        <div className="header-actions">
          <div className="add-step-dropdown-wrapper">
            <button
              className="btn-add-step"
              onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
              title="Add manual step"
            >
              <IconPlus size={13} /> Add Step
            </button>
            {isAddMenuOpen && (
              <div className="add-step-dropdown">
                <button onClick={() => handleCreateStep('navigate')}><IconGlobe size={14} /> Navigate</button>
                <button onClick={() => handleCreateStep('click')}><IconPointer size={14} /> Click</button>
                <button onClick={() => handleCreateStep('input')}><IconKeyboard size={14} /> Input</button>
                <button onClick={() => handleCreateStep('wait')}><IconClock size={14} /> Wait</button>
                <button onClick={() => handleCreateStep('assert')}><IconShield size={14} /> Assert</button>
                <button onClick={() => handleCreateStep('hover')}><IconCrosshair size={14} /> Hover</button>
                <button onClick={() => handleCreateStep('keyPress')}><IconZap size={14} /> Key Press</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="step-filter-bar">
        <input
          type="text"
          placeholder="Filter steps..."
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          className="step-filter-input"
        />
      </div>

      <div className="step-items-container">
        {filteredSteps.length === 0 ? (
          <div className="empty-steps-state">
            <p>No steps match your criteria.</p>
          </div>
        ) : (
          filteredSteps.map(({ step, originalIndex }) => {
            const isSelected = step.id === selectedStepId;
            const isFirst = originalIndex === 0;
            const isLast = originalIndex === steps.length - 1;

            return (
              <div
                key={step.id}
                draggable
                onDragStart={(e) => handleDragStart(e, originalIndex)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, originalIndex)}
                className={`step-row ${isSelected ? 'selected' : ''} ${
                  step.disabled ? 'disabled' : ''
                }`}
                onClick={() => onSelectStep(step.id)}
              >
                <div className="drag-handle" title="Drag to reorder">
                  ⋮⋮
                </div>

                <span className="step-number">{originalIndex + 1}</span>

                <div className="step-icon-badge" title={step.type}>
                  <StepIcon type={step.type} size={14} />
                </div>

                <div className="step-content">
                  <div className="step-desc">
                    {step.description || `${step.type} action`}
                  </div>
                  <div className="step-subline">
                    <span className="step-type-tag">{step.type}</span>
                    {step.timeout ? <span className="tag-timing">{step.timeout}ms</span> : null}
                  </div>
                </div>

                <div className="step-quick-tools" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="btn-order"
                    disabled={isFirst}
                    onClick={() => onMoveStep(originalIndex, originalIndex - 1)}
                    title="Move up"
                  >
                    <IconChevronUp size={12} />
                  </button>
                  <button
                    className="btn-order"
                    disabled={isLast}
                    onClick={() => onMoveStep(originalIndex, originalIndex + 1)}
                    title="Move down"
                  >
                    <IconChevronDown size={12} />
                  </button>
                  <button
                    className={`btn-toggle-disable ${step.disabled ? 'is-disabled' : ''}`}
                    onClick={() => onToggleDisabled(step.id)}
                    title={step.disabled ? 'Enable step' : 'Disable step'}
                  >
                    {step.disabled ? 'Off' : 'On'}
                  </button>
                  <button
                    className="btn-mini"
                    onClick={() => onDuplicateStep(step.id)}
                    title="Duplicate step"
                  >
                    <IconClipboard size={13} />
                  </button>
                  <button
                    className="btn-mini danger"
                    onClick={() => onDeleteStep(step.id)}
                    title="Delete step"
                  >
                    <IconTrash size={13} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
