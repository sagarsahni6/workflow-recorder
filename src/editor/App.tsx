/**
 * Editor App — Top-level container for Workflow Library & Step Editor.
 */

import { useState, useEffect } from 'react';
import { LibraryView } from './LibraryView';
import { WorkflowEditor } from './WorkflowEditor';
import { WorkflowRepository } from '@storage/workflow-repository';
import { WorkflowBuilder } from '@core/workflow-builder';

export function App() {
  const [activeWorkflowId, setActiveWorkflowId] = useState<string | null>(null);

  useEffect(() => {
    // Check URL parameters (e.g. editor.html?id=wf_123)
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (id) {
      setActiveWorkflowId(id);
    }
  }, []);

  const handleOpenWorkflow = (id: string) => {
    setActiveWorkflowId(id);
    window.history.pushState({}, '', `?id=${id}`);
  };

  const handleCreateNew = async () => {
    const newWf = WorkflowBuilder.create('New Workflow').build();
    await WorkflowRepository.save(newWf);
    handleOpenWorkflow(newWf.id);
  };

  const handleBackToLibrary = () => {
    setActiveWorkflowId(null);
    window.history.pushState({}, '', window.location.pathname);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a' }}>
      {activeWorkflowId ? (
        <WorkflowEditor
          workflowId={activeWorkflowId}
          onBackToLibrary={handleBackToLibrary}
        />
      ) : (
        <LibraryView onOpenWorkflow={handleOpenWorkflow} onCreateNew={handleCreateNew} />
      )}
    </div>
  );
}
