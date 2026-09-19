/**
 * Workflow Editor Component.
 *
 * Full 3-panel workspace for reviewing, organizing, fine-tuning,
 * and parametrizing recorded browser workflows.
 */

import { useState, useEffect, useCallback } from 'react';
import type { Workflow, WorkflowStep, WorkflowVariable } from '@shared/types';
import { WorkflowRepository } from '@storage/workflow-repository';
import { WorkflowBuilder } from '@core/workflow-builder';
import { VariableExtractor } from '@core/variable-extractor';
import { StepList } from './StepList';
import { StepEditor } from './StepEditor';
import { StepPreview } from './StepPreview';
import { IconLoader, IconCheck, IconSettings } from './Icons';
import { VariablePanel } from './VariablePanel';
import { ExportModal } from './ExportModal';
import { SettingsModal } from './SettingsModal';
import './WorkflowEditor.css';

interface WorkflowEditorProps {
  workflowId: string;
  onBackToLibrary: () => void;
  onOpenExportModal?: (workflow: Workflow) => void;
}

export function WorkflowEditor({
  workflowId,
  onBackToLibrary,
  onOpenExportModal,
}: WorkflowEditorProps) {
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'steps' | 'variables' | 'json'>('steps');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('All changes saved');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Load workflow from storage
  useEffect(() => {
    let active = true;
    WorkflowRepository.get(workflowId).then((loaded) => {
      if (active && loaded) {
        setWorkflow(loaded);
        if (loaded.steps.length > 0) {
          setSelectedStepId(loaded.steps[0]?.id || null);
        }
      }
    });
    return () => {
      active = false;
    };
  }, [workflowId]);

  // Persist changes to storage
  const saveWorkflow = useCallback(async (updated: Workflow) => {
    setIsSaving(true);
    setSaveMessage('Saving...');
    try {
      await WorkflowRepository.save(updated);
      setSaveMessage('All changes saved');
    } catch {
      setSaveMessage('Error saving');
    } finally {
      setIsSaving(false);
    }
  }, []);

  const handleUpdateWorkflow = (updater: (builder: WorkflowBuilder) => WorkflowBuilder) => {
    if (!workflow) return;
    const builder = WorkflowBuilder.from(workflow);
    const updated = updater(builder).build();
    setWorkflow(updated);
    saveWorkflow(updated);
  };

  const handleNameChange = (name: string) => {
    handleUpdateWorkflow((b) => b.setName(name));
  };

  const handleDescriptionChange = (description: string) => {
    handleUpdateWorkflow((b) => b.setDescription(description));
  };

  const handleSelectStep = (stepId: string) => {
    setSelectedStepId(stepId);
  };

  const handleMoveStep = (fromIndex: number, toIndex: number) => {
    handleUpdateWorkflow((b) => b.moveStep(fromIndex, toIndex));
  };

  const handleDeleteStep = (stepId: string) => {
    if (!workflow) return;
    const currentIndex = workflow.steps.findIndex((s) => s.id === stepId);
    handleUpdateWorkflow((b) => b.removeStep(stepId));

    // Update selection to neighbor
    const remaining = workflow.steps.filter((s) => s.id !== stepId);
    if (remaining.length === 0) {
      setSelectedStepId(null);
    } else {
      const nextIndex = Math.min(currentIndex, remaining.length - 1);
      setSelectedStepId(remaining[nextIndex]?.id || null);
    }
  };

  const handleDuplicateStep = (stepId: string) => {
    handleUpdateWorkflow((b) => b.duplicateStep(stepId));
  };

  const handleToggleDisabled = (stepId: string) => {
    handleUpdateWorkflow((b) => b.toggleStepDisabled(stepId));
  };

  const handleAddManualStep = (step: WorkflowStep) => {
    handleUpdateWorkflow((b) => b.addStep(step));
    setSelectedStepId(step.id);
  };

  const handleUpdateStep = (updatedStep: WorkflowStep) => {
    handleUpdateWorkflow((b) => b.updateStep(updatedStep.id, updatedStep));
  };

  const handleUpdateVariables = (variables: WorkflowVariable[]) => {
    if (!workflow) return;
    const updated: Workflow = {
      ...workflow,
      variables,
      updatedAt: new Date().toISOString(),
    };
    setWorkflow(updated);
    saveWorkflow(updated);
  };

  const handleApplyExtractedVariable = (stepId: string, varName: string) => {
    if (!workflow) return;
    const updated = VariableExtractor.applyVariable(workflow, stepId, varName);
    setWorkflow(updated);
    saveWorkflow(updated);
  };

  if (!workflow) {
    return (
      <div className="workflow-editor-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#64748b', fontWeight: 500 }}>Loading workflow...</p>
      </div>
    );
  }

  const selectedStep = workflow.steps.find((s) => s.id === selectedStepId) || null;

  return (
    <div className="workflow-editor-container">
      {/* Top Navbar */}
      <div className="editor-navbar">
        <div className="nav-left">
          <button className="btn-back" onClick={onBackToLibrary}>
            ← Library
          </button>
          <div className="title-desc-group">
            <input
              type="text"
              className="workflow-title-input"
              value={workflow.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Workflow Name"
            />
            <input
              type="text"
              className="workflow-desc-input"
              value={workflow.description || ''}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              placeholder="Add description..."
            />
          </div>
        </div>

        <div className="nav-center-tabs">
          <button
            className={`tab-btn ${activeTab === 'steps' ? 'active' : ''}`}
            onClick={() => setActiveTab('steps')}
          >
            Steps ({workflow.steps.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'variables' ? 'active' : ''}`}
            onClick={() => setActiveTab('variables')}
          >
            Variables ({workflow.variables.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'json' ? 'active' : ''}`}
            onClick={() => setActiveTab('json')}
          >
            JSON Schema
          </button>
        </div>

        <div className="nav-right-actions">
          <span className="save-status-badge">
            {isSaving ? <IconLoader size={14} /> : <IconCheck size={14} />}
            {' '}{saveMessage}
          </span>
          <button
            className="btn-editor-action"
            onClick={() => setIsSettingsOpen(true)}
            title="Configure settings"
          >
            <IconSettings size={14} /> Settings
          </button>
          <button
            className="btn-editor-action primary"
            onClick={() => {
              if (onOpenExportModal) onOpenExportModal(workflow);
              setIsExportModalOpen(true);
            }}
          >
            Export ▾
          </button>
        </div>
      </div>

      {/* Main Tab Views */}
      {activeTab === 'steps' && (
        <div className="editor-main-body">
          {/* Panel 1: Step List */}
          <StepList
            steps={workflow.steps}
            selectedStepId={selectedStepId}
            onSelectStep={handleSelectStep}
            onMoveStep={handleMoveStep}
            onDeleteStep={handleDeleteStep}
            onDuplicateStep={handleDuplicateStep}
            onToggleDisabled={handleToggleDisabled}
            onAddManualStep={handleAddManualStep}
          />

          {/* Panel 2: Step Editor */}
          <StepEditor
            step={selectedStep}
            variables={workflow.variables}
            onUpdateStep={handleUpdateStep}
            onDeleteStep={handleDeleteStep}
            onDuplicateStep={handleDuplicateStep}
          />

          {/* Panel 3: Step Preview */}
          <StepPreview step={selectedStep} />
        </div>
      )}

      {activeTab === 'variables' && (
        <VariablePanel
          workflow={workflow}
          onUpdateVariables={handleUpdateVariables}
          onApplyExtractedVariable={handleApplyExtractedVariable}
        />
      )}

      {activeTab === 'json' && (
        <div className="json-viewer-container">
          <pre className="json-code-block">{JSON.stringify(workflow, null, 2)}</pre>
        </div>
      )}

      {isExportModalOpen && (
        <ExportModal
          workflow={workflow}
          onClose={() => setIsExportModalOpen(false)}
        />
      )}

      {isSettingsOpen && (
        <SettingsModal onClose={() => setIsSettingsOpen(false)} />
      )}
    </div>
  );
}
