/**
 * Step Editor Component.
 *
 * Detailed inspector and editor for a selected workflow step.
 * Allows fine-tuning selectors, timeouts, input values, assertions,
 * and conditions.
 */

import { useState } from 'react';
import type { WorkflowStep, SelectorCandidate, WorkflowVariable } from '@shared/types';
import { IconSettings, IconClipboard, IconTrash, IconX, IconChevronUp } from './Icons';

interface StepEditorProps {
  step: WorkflowStep | null;
  variables: WorkflowVariable[];
  onUpdateStep: (updated: WorkflowStep) => void;
  onDeleteStep: (stepId: string) => void;
  onDuplicateStep: (stepId: string) => void;
}

export function StepEditor({
  step,
  variables,
  onUpdateStep,
  onDeleteStep,
  onDuplicateStep,
}: StepEditorProps) {
  const [newSelectorType, setNewSelectorType] = useState<SelectorCandidate['type']>('css');
  const [newSelectorValue, setNewSelectorValue] = useState('');

  if (!step) {
    return (
      <div className="step-editor empty">
        <div className="empty-editor-state">
          <IconSettings size={32} className="editor-icon" />
          <h3>No Step Selected</h3>
          <p>Choose a step from the list on the left to inspect and modify its properties.</p>
        </div>
      </div>
    );
  }

  const handleFieldChange = (field: string, value: unknown) => {
    onUpdateStep({
      ...step,
      [field]: value,
    } as WorkflowStep);
  };

  const handleTargetChange = (field: string, value: unknown) => {
    if (!('target' in step) || !step.target) return;
    onUpdateStep({
      ...step,
      target: {
        ...step.target,
        [field]: value,
      },
    } as WorkflowStep);
  };

  const handleAddSelector = () => {
    if (!newSelectorValue.trim() || !('target' in step) || !step.target) return;
    const current = step.target.selectors || [];
    const newCandidate: SelectorCandidate = {
      type: newSelectorType,
      value: newSelectorValue.trim(),
      score: 0.85,
    };
    handleTargetChange('selectors', [newCandidate, ...current]);
    setNewSelectorValue('');
  };

  const handleRemoveSelector = (index: number) => {
    if (!('target' in step) || !step.target) return;
    const current = [...(step.target.selectors || [])];
    current.splice(index, 1);
    handleTargetChange('selectors', current);
  };

  const handlePromoteSelector = (index: number) => {
    if (!('target' in step) || !step.target || index === 0) return;
    const current = [...(step.target.selectors || [])];
    const [selected] = current.splice(index, 1);
    if (selected) {
      current.unshift(selected);
      handleTargetChange('selectors', current);
    }
  };

  const handleInsertVariable = (varName: string) => {
    if (step.type === 'input') {
      const currentVal = step.value || '';
      handleFieldChange('value', `${currentVal}{{${varName}}}`);
    }
  };

  return (
    <div className="step-editor">
      <div className="editor-header">
        <div className="step-title-group">
          <span className="step-badge">{step.type.toUpperCase()}</span>
          <input
            type="text"
            className="step-desc-input"
            value={step.description || ''}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            placeholder="Step description..."
          />
        </div>
        <div className="step-actions">
          <button
            className="btn-tool"
            onClick={() => onDuplicateStep(step.id)}
            title="Duplicate step"
          >
            <IconClipboard size={14} /> Duplicate
          </button>
          <button
            className="btn-tool danger"
            onClick={() => onDeleteStep(step.id)}
            title="Delete step"
          >
            <IconTrash size={14} /> Delete
          </button>
        </div>
      </div>

      <div className="editor-scroll">
        {/* General Options */}
        <div className="editor-section">
          <h4>Execution Controls</h4>
          <div className="grid-form">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={!!step.disabled}
                onChange={(e) => handleFieldChange('disabled', e.target.checked)}
              />
              <span>Disable Step (skip during execution)</span>
            </label>

            <div className="form-row">
              <label>Timeout (ms):</label>
              <input
                type="number"
                min="0"
                step="100"
                value={step.timeout || 0}
                onChange={(e) => handleFieldChange('timeout', Number(e.target.value))}
              />
            </div>

            <div className="form-row">
              <label>Step Comment:</label>
              <input
                type="text"
                value={step.comment || ''}
                placeholder="Developer note..."
                onChange={(e) => handleFieldChange('comment', e.target.value)}
              />
            </div>

            <div className="form-row">
              <label>Retry Count:</label>
              <input
                type="number"
                min="0"
                max="10"
                value={step.retryCount || 0}
                onChange={(e) => handleFieldChange('retryCount', Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        {/* Step-Specific Parameters */}
        <div className="editor-section">
          <h4>Step Parameters</h4>

          {step.type === 'navigate' && (
            <div className="form-row">
              <label>Target URL:</label>
              <input
                type="url"
                value={step.url || ''}
                onChange={(e) => handleFieldChange('url', e.target.value)}
                placeholder="https://example.com"
              />
            </div>
          )}

          {step.type === 'click' && (
            <div className="form-row">
              <label>Click Type:</label>
              <select
                value={step.clickType}
                onChange={(e) => handleFieldChange('clickType', e.target.value)}
              >
                <option value="left">Left Click</option>
                <option value="double">Double Click</option>
                <option value="right">Right Click</option>
              </select>
            </div>
          )}

          {step.type === 'input' && (
            <div className="form-group">
              <div className="form-row">
                <label>Input Value:</label>
                <div className="input-with-vars">
                  <input
                    type="text"
                    value={step.value || ''}
                    onChange={(e) => handleFieldChange('value', e.target.value)}
                    placeholder="Value or {{variable_name}}"
                  />
                  {variables.length > 0 && (
                    <select
                      className="var-picker"
                      onChange={(e) => {
                        if (e.target.value) {
                          handleInsertVariable(e.target.value);
                          e.target.value = '';
                        }
                      }}
                      defaultValue=""
                    >
                      <option value="" disabled>Insert Variable</option>
                      {variables.map((v) => (
                        <option key={v.name} value={v.name}>{`{{${v.name}}}`}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <label className="checkbox-label" style={{ marginTop: '8px' }}>
                <input
                  type="checkbox"
                  checked={!!step.sensitive}
                  onChange={(e) => handleFieldChange('sensitive', e.target.checked)}
                />
                <span>Sensitive Input (Mask value in exports & storage)</span>
              </label>
            </div>
          )}

          {step.type === 'select' && (
            <div className="grid-form">
              <div className="form-row">
                <label>Option Value:</label>
                <input
                  type="text"
                  value={step.value || ''}
                  onChange={(e) => handleFieldChange('value', e.target.value)}
                />
              </div>
              <div className="form-row">
                <label>Visible Label:</label>
                <input
                  type="text"
                  value={step.label || ''}
                  onChange={(e) => handleFieldChange('label', e.target.value)}
                />
              </div>
            </div>
          )}

          {step.type === 'checkbox' && (
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={!!step.checked}
                onChange={(e) => handleFieldChange('checked', e.target.checked)}
              />
              <span>Checked</span>
            </label>
          )}

          {step.type === 'radio' && (
            <div className="form-row">
              <label>Selected Value:</label>
              <input
                type="text"
                value={step.value || ''}
                onChange={(e) => handleFieldChange('value', e.target.value)}
              />
            </div>
          )}

          {step.type === 'keyPress' && (
            <div className="form-row">
              <label>Key:</label>
              <input
                type="text"
                value={step.key || ''}
                onChange={(e) => handleFieldChange('key', e.target.value)}
              />
            </div>
          )}

          {step.type === 'scroll' && (
            <div className="grid-form">
              <div className="form-row">
                <label>Scroll X (px):</label>
                <input
                  type="number"
                  value={step.position.x}
                  onChange={(e) =>
                    handleFieldChange('position', { ...step.position, x: Number(e.target.value) })
                  }
                />
              </div>
              <div className="form-row">
                <label>Scroll Y (px):</label>
                <input
                  type="number"
                  value={step.position.y}
                  onChange={(e) =>
                    handleFieldChange('position', { ...step.position, y: Number(e.target.value) })
                  }
                />
              </div>
            </div>
          )}

          {(step.type === 'wait' ||
            step.type === 'waitForElement' ||
            step.type === 'waitForVisible' ||
            step.type === 'waitForEnabled' ||
            step.type === 'waitForText' ||
            step.type === 'waitForURL' ||
            step.type === 'waitForDownload' ||
            step.type === 'waitForNavigation') && (
            <div className="grid-form">
              <div className="form-row">
                <label>Wait Strategy:</label>
                <select
                  value={step.type}
                  onChange={(e) => handleFieldChange('type', e.target.value)}
                >
                  <option value="wait">Fixed Duration</option>
                  <option value="waitForElement">Wait for Element</option>
                  <option value="waitForVisible">Wait for Visible</option>
                  <option value="waitForEnabled">Wait for Enabled</option>
                  <option value="waitForText">Wait for Text</option>
                  <option value="waitForURL">Wait for URL</option>
                  <option value="waitForDownload">Wait for Download</option>
                  <option value="waitForNavigation">Wait for Navigation</option>
                </select>
              </div>
              <div className="form-row">
                <label>Timeout / Duration (ms):</label>
                <input
                  type="number"
                  value={step.timeout || 1000}
                  onChange={(e) => handleFieldChange('timeout', Number(e.target.value))}
                />
              </div>
            </div>
          )}

          {step.type === 'assert' && (
            <div className="grid-form">
              <div className="form-row">
                <label>Assertion Operator:</label>
                <select
                  value={step.assertion.operator}
                  onChange={(e) =>
                    handleFieldChange('assertion', {
                      ...step.assertion,
                      operator: e.target.value,
                    })
                  }
                >
                  <option value="equals">Equals</option>
                  <option value="contains">Contains Text</option>
                  <option value="exists">Element Exists</option>
                  <option value="notExists">Element Does Not Exist</option>
                  <option value="visible">Element Is Visible</option>
                  <option value="enabled">Element Is Enabled</option>
                </select>
              </div>
              <div className="form-row">
                <label>Expected Value:</label>
                <input
                  type="text"
                  value={step.assertion.expected || ''}
                  onChange={(e) =>
                    handleFieldChange('assertion', {
                      ...step.assertion,
                      expected: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          )}
        </div>

        {/* Target Selectors Inspector */}
        {'target' in step && step.target && (
          <div className="editor-section">
            <div className="section-header">
              <h4>Target Selectors ({step.target.selectors?.length || 0})</h4>
            </div>
            <p className="section-hint">
              During automation replay, selectors are evaluated in order from top to bottom.
            </p>

            <div className="selector-list">
              {step.target.selectors && step.target.selectors.map((sel, idx) => (
                <div key={idx} className={`selector-item ${idx === 0 ? 'primary' : ''}`}>
                  <div className="selector-info">
                    <span className="selector-type-badge">{sel.type.toUpperCase()}</span>
                    <code className="selector-code">{sel.value}</code>
                  </div>
                  <div className="selector-meta">
                    <span className="score-badge">
                      {Math.round(sel.score * 100)}%
                    </span>
                    {idx > 0 && (
                      <button
                        className="btn-sel-action"
                        onClick={() => handlePromoteSelector(idx)}
                        title="Move to top priority"
                      >
                        <IconChevronUp size={12} />
                      </button>
                    )}
                    <button
                      className="btn-sel-action danger"
                      onClick={() => handleRemoveSelector(idx)}
                      title="Remove selector"
                    >
                      <IconX size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Custom Selector */}
            <div className="add-selector-bar">
              <select
                value={newSelectorType}
                onChange={(e) => setNewSelectorType(e.target.value as SelectorCandidate['type'])}
              >
                <option value="css">CSS</option>
                <option value="xpath">XPath</option>
                <option value="id">ID</option>
                <option value="name">Name</option>
                <option value="aria">ARIA</option>
                <option value="testId">data-testid</option>
                <option value="text">Text</option>
              </select>
              <input
                type="text"
                placeholder="Enter selector string..."
                value={newSelectorValue}
                onChange={(e) => setNewSelectorValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddSelector();
                }}
              />
              <button
                className="btn-add-sel"
                onClick={handleAddSelector}
                disabled={!newSelectorValue.trim()}
              >
                + Add
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
