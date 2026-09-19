/**
 * Workflow Library View Component.
 *
 * Full visual management interface for saved workflows:
 * - Live search & favorite filtering
 * - Sorting by date, title, or step count
 * - Card view with step/variable metadata
 * - Actions: Open in Editor, Duplicate, Export, Delete, Import Backup
 */

import React, { useState, useEffect, useCallback, useId } from 'react';
import type { WorkflowSummary, Workflow } from '@shared/types';
import { WorkflowRepository } from '@storage/workflow-repository';
import { formatRelativeTime } from '@shared/utils';
import { importWorkflowFile } from '@imports/index';
import { SettingsModal } from './SettingsModal';
import { IconDownload, IconSettings, IconSearch, IconFolder, IconStar } from './Icons';
import './LibraryView.css';

interface LibraryViewProps {
  onOpenWorkflow: (workflowId: string) => void;
  onCreateNew: () => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({ onOpenWorkflow, onCreateNew }) => {
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'updatedAt' | 'createdAt' | 'name' | 'stepCount'>('updatedAt');
  const [isLoading, setIsLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const fileInputId = useId();

  const loadWorkflows = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await WorkflowRepository.list({
        query: searchQuery,
        favoriteOnly,
        sortBy,
        sortDirection: sortBy === 'name' ? 'asc' : 'desc',
      });
      setWorkflows(list);
    } catch (err) {
      console.error('Failed to load workflows:', err);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, favoriteOnly, sortBy]);

  useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

  const handleToggleFavorite = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await WorkflowRepository.toggleFavorite(id);
      loadWorkflows();
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  const handleDuplicate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await WorkflowRepository.duplicate(id);
      loadWorkflows();
    } catch (err) {
      console.error('Failed to duplicate workflow:', err);
    }
  };

  const handleDelete = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      try {
        await WorkflowRepository.delete(id);
        loadWorkflows();
      } catch (err) {
        console.error('Failed to delete workflow:', err);
      }
    }
  };

  const handleExportSingle = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const wf = await WorkflowRepository.get(id);
      if (wf) {
        downloadJson(`${name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.json`, wf);
      }
    } catch (err) {
      console.error('Failed to export workflow:', err);
    }
  };

  const handleExportAll = async () => {
    try {
      const all = await WorkflowRepository.exportAll();
      downloadJson(`workflow_recorder_backup_${new Date().toISOString().slice(0, 10)}.json`, all);
    } catch (err) {
      console.error('Failed to backup workflows:', err);
    }
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = (e.target?.result as string) || '';
      try {
        // Multi-workflow backup array
        if (file.name.toLowerCase().endsWith('.json') && content.trim().startsWith('[')) {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed)) {
            const result = await WorkflowRepository.importAll(parsed);
            if (result.errors.length > 0) {
              alert(`Imported ${result.imported} workflows with errors:\n${result.errors.join('\n')}`);
            } else {
              alert(`Successfully imported ${result.imported} workflow(s).`);
            }
            loadWorkflows();
            return;
          }
        }

        // Single workflow import (JSON, YAML, CSV)
        const result = importWorkflowFile(content, file.name);
        if (result.success && result.workflow) {
          await WorkflowRepository.save(result.workflow);
          alert(`Successfully imported workflow "${result.workflow.name}".`);
          loadWorkflows();
        } else {
          alert(`Failed to import file:\n${result.errors.join('\n')}`);
        }
      } catch (err) {
        alert(`Import error: ${err instanceof Error ? err.message : String(err)}`);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  return (
    <div className="library-container">
      <div className="library-header">
        <div className="library-title">
          <h1>Workflow Library</h1>
          <p>Manage, search, edit, and export your recorded automation workflows</p>
        </div>
        <div className="library-header-actions">
          <label className="btn-secondary" htmlFor={fileInputId} style={{ cursor: 'pointer' }}>
            <IconDownload size={14} /> Import File
            <input
              id={fileInputId}
              type="file"
              accept=".json,.yaml,.yml,.csv"
              style={{ display: 'none' }}
              onChange={handleImportFile}
            />
          </label>
          <button className="btn-secondary" onClick={handleExportAll}>
            Backup All
          </button>
          <button className="btn-secondary" onClick={() => setIsSettingsOpen(true)}>
            <IconSettings size={14} /> Settings
          </button>
          <button className="btn-primary" onClick={onCreateNew}>
            + New Workflow
          </button>
        </div>
      </div>

      <div className="library-controls">
        <div className="search-wrapper">
          <IconSearch size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search workflows by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <button
            className={`btn-filter ${favoriteOnly ? 'active' : ''}`}
            onClick={() => setFavoriteOnly(!favoriteOnly)}
            title="Show only starred workflows"
          >
            <IconStar size={14} /> Favorites
          </button>

          <select
            className="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'updatedAt' | 'createdAt' | 'name' | 'stepCount')}
          >
            <option value="updatedAt">Recently Updated</option>
            <option value="createdAt">Creation Date</option>
            <option value="name">Name (A-Z)</option>
            <option value="stepCount">Step Count</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="empty-library">
          <p>Loading workflows...</p>
        </div>
      ) : workflows.length === 0 ? (
        <div className="empty-library">
          <div className="empty-icon"><IconFolder size={48} /></div>
          <h3>No workflows found</h3>
          <p>
            {searchQuery || favoriteOnly
              ? 'No workflows matched your current filter criteria.'
              : 'Record a browser interaction to create your first workflow.'}
          </p>
          <button className="btn-primary" style={{ marginTop: '16px' }} onClick={onCreateNew}>
            Create Workflow
          </button>
        </div>
      ) : (
        <div className="workflow-grid">
          {workflows.map((wf) => (
            <div
              key={wf.id}
              className="workflow-card"
              onClick={() => onOpenWorkflow(wf.id)}
            >
              <div>
                <div className="card-header">
                  <h3 className="card-title">{wf.name}</h3>
                  <button
                    className={`btn-star ${wf.favorite ? 'starred' : ''}`}
                    onClick={(e) => handleToggleFavorite(wf.id, e)}
                    title={wf.favorite ? 'Unstar workflow' : 'Star workflow'}
                  >
                    <IconStar size={14} />
                  </button>
                </div>
                <p className="card-desc">
                  {wf.description || 'No description provided.'}
                </p>
              </div>

              <div>
                <div className="card-meta">
                  <span className="badge badge-steps">{wf.stepCount} steps</span>
                  {wf.variableCount !== undefined && wf.variableCount > 0 && (
                    <span className="badge badge-vars">{wf.variableCount} vars</span>
                  )}
                  <span className="time-text">{formatRelativeTime(wf.updatedAt)}</span>
                </div>

                <div className="card-actions">
                  <button
                    className="btn-card btn-open"
                    onClick={() => onOpenWorkflow(wf.id)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn-card"
                    onClick={(e) => handleDuplicate(wf.id, e)}
                    title="Duplicate workflow"
                  >
                    Duplicate
                  </button>
                  <button
                    className="btn-card"
                    onClick={(e) => handleExportSingle(wf.id, wf.name, e)}
                    title="Export JSON"
                  >
                    Export
                  </button>
                  <button
                    className="btn-card btn-delete"
                    onClick={(e) => handleDelete(wf.id, wf.name, e)}
                    title="Delete workflow"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} />}
    </div>
  );
};

function downloadJson(filename: string, data: Workflow | Workflow[]): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
