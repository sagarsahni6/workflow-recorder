/**
 * Variable Panel Component.
 *
 * Full variable management interface for creating, editing,
 * and binding dynamic parameters to workflow steps.
 */

import { useState } from 'react';
import type { Workflow, WorkflowVariable, VariableType } from '@shared/types';
import { VariableExtractor } from '@core/variable-extractor';
import { IconSparkles, IconTrash } from './Icons';

interface VariablePanelProps {
  workflow: Workflow;
  onUpdateVariables: (variables: WorkflowVariable[]) => void;
  onApplyExtractedVariable: (stepId: string, varName: string, pattern: string) => void;
}

const VARIABLE_TYPES: VariableType[] = [
  'string',
  'number',
  'boolean',
  'date',
  'datetime',
  'email',
  'phone',
  'file',
  'url',
  'json',
];

export function VariablePanel({
  workflow,
  onUpdateVariables,
  onApplyExtractedVariable,
}: VariablePanelProps) {
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<VariableType>('string');
  const [newDefault, setNewDefault] = useState('');
  const [newRequired, setNewRequired] = useState(true);
  const [newDesc, setNewDesc] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Variable Candidates from Auto-Extraction
  const candidates = VariableExtractor.scan(workflow);

  const handleAddVariable = () => {
    setErrorMsg(null);
    const trimmed = newName.trim();

    if (!trimmed) {
      setErrorMsg('Variable name cannot be empty.');
      return;
    }

    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmed)) {
      setErrorMsg('Variable name must begin with a letter or underscore and contain only letters, numbers, and underscores.');
      return;
    }

    if (workflow.variables.some((v) => v.name === trimmed)) {
      setErrorMsg(`Variable "${trimmed}" already exists.`);
      return;
    }

    const newVar: WorkflowVariable = {
      name: trimmed,
      type: newType,
      defaultValue: newDefault ? newDefault : undefined,
      description: newDesc ? newDesc : undefined,
      required: newRequired,
    };

    onUpdateVariables([...workflow.variables, newVar]);
    setNewName('');
    setNewDefault('');
    setNewDesc('');
  };

  const handleRemoveVariable = (name: string) => {
    onUpdateVariables(workflow.variables.filter((v) => v.name !== name));
  };

  const handleUpdateVariable = (index: number, partial: Partial<WorkflowVariable>) => {
    const next = [...workflow.variables];
    const current = next[index];
    if (!current) return;
    next[index] = { ...current, ...partial };
    onUpdateVariables(next);
  };

  return (
    <div className="variable-panel">
      <div className="panel-header">
        <div>
          <h2>Workflow Variables ({workflow.variables.length})</h2>
          <p>
            Variables allow you to parametrize input steps with dynamic values like{' '}
            <code>{'{{customer_name}}'}</code>.
          </p>
        </div>
      </div>

      {/* Suggested Variables from Input Fields */}
      {candidates.length > 0 && (
        <div className="candidates-banner">
          <div className="candidates-header">
            <IconSparkles size={16} className="sparkle-icon" />
            <h4>Detected Dynamic Inputs ({candidates.length})</h4>
          </div>
          <p className="candidates-sub">
            The scanner identified literal values that look like variable candidates.
          </p>

          <div className="candidates-list">
            {candidates.map((cand, idx) => (
              <div key={idx} className="candidate-card">
                <div className="candidate-info">
                  <span className="candidate-name">{`{{${cand.suggestedName}}}`}</span>
                  <span className="candidate-type">({cand.type})</span>
                  <div className="candidate-literal">Value: &ldquo;{cand.literalValue}&rdquo;</div>
                </div>
                <button
                  className="btn-apply-var"
                  onClick={() =>
                    onApplyExtractedVariable(cand.stepId, cand.suggestedName, cand.type)
                  }
                >
                  Convert to Variable
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Existing Variables Table */}
      <div className="variables-section">
        <h3>Configured Variables</h3>
        {workflow.variables.length === 0 ? (
          <div className="empty-vars">
            <p>No variables configured yet. Add your first variable below.</p>
          </div>
        ) : (
          <div className="vars-table-wrapper">
            <table className="vars-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Default Value</th>
                  <th>Required</th>
                  <th>Description</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {workflow.variables.map((v, idx) => (
                  <tr key={v.name}>
                    <td>
                      <code>{`{{${v.name}}}`}</code>
                    </td>
                    <td>
                      <select
                        value={v.type}
                        onChange={(e) =>
                          handleUpdateVariable(idx, { type: e.target.value as VariableType })
                        }
                        className="table-select"
                      >
                        {VARIABLE_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="text"
                        value={v.defaultValue !== undefined ? String(v.defaultValue) : ''}
                        onChange={(e) =>
                          handleUpdateVariable(idx, { defaultValue: e.target.value })
                        }
                        className="table-input"
                        placeholder="None"
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={!!v.required}
                        onChange={(e) =>
                          handleUpdateVariable(idx, { required: e.target.checked })
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={v.description || ''}
                        onChange={(e) =>
                          handleUpdateVariable(idx, { description: e.target.value })
                        }
                        className="table-input"
                        placeholder="Description..."
                      />
                    </td>
                    <td>
                      <button
                        className="btn-mini danger"
                        onClick={() => handleRemoveVariable(v.name)}
                        title="Delete variable"
                      >
                        <IconTrash size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Variable Form */}
      <div className="add-var-card">
        <h3>+ Add New Variable</h3>
        {errorMsg && <div className="error-banner">{errorMsg}</div>}

        <div className="add-var-grid">
          <div className="form-row">
            <label>Variable Name:</label>
            <input
              type="text"
              placeholder="e.g. customer_email"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </div>

          <div className="form-row">
            <label>Type:</label>
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as VariableType)}
            >
              {VARIABLE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <label>Default Value (Optional):</label>
            <input
              type="text"
              placeholder="Default fallback"
              value={newDefault}
              onChange={(e) => setNewDefault(e.target.value)}
            />
          </div>

          <div className="form-row">
            <label>Description (Optional):</label>
            <input
              type="text"
              placeholder="Purpose of variable"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
            />
          </div>
        </div>

        <div className="add-var-footer">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={newRequired}
              onChange={(e) => setNewRequired(e.target.checked)}
            />
            <span>Required input</span>
          </label>

          <button className="btn-primary" onClick={handleAddVariable}>
            Add Variable
          </button>
        </div>
      </div>
    </div>
  );
}
