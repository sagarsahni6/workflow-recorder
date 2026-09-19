/**
 * Workflow Repository.
 *
 * Provides CRUD operations, querying, sorting, pagination, duplication,
 * and bulk import/export backed by IndexedDB.
 */

import type { Workflow, WorkflowSummary } from '@shared/types';
import { getDatabase } from './db';
import { workflowToSummary, generateWorkflowId, generateStepId, now } from '@shared/utils';
import { WorkflowValidator } from '@core/workflow-validator';
import { WorkflowMigrator } from '@core/workflow-migrator';

export interface WorkflowListOptions {
  query?: string;
  favoriteOnly?: boolean;
  sortBy?: 'updatedAt' | 'createdAt' | 'name' | 'stepCount';
  sortDirection?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export class WorkflowRepository {
  /**
   * Saves a workflow to IndexedDB and updates its lightweight summary record.
   */
  public static async save(workflow: Workflow): Promise<void> {
    const validation = WorkflowValidator.validate(workflow);
    if (!validation.valid) {
      throw new Error(`Cannot save invalid workflow: ${validation.errors[0]?.message || 'Validation failed'}`);
    }

    const db = await getDatabase();
    const summary = workflowToSummary(workflow);

    // Atomic transaction updating both full workflow and summary
    const tx = db.transaction(['workflows', 'workflow_summaries'], 'readwrite');
    await Promise.all([
      tx.objectStore('workflows').put(workflow),
      tx.objectStore('workflow_summaries').put(summary),
      tx.done,
    ]);

    // Keep chrome.storage.local synced with recent workflows for the popup
    this.syncRecentWorkflowsCache().catch(() => {});
  }

  /**
   * Retrieves a full workflow by ID.
   */
  public static async get(id: string): Promise<Workflow | null> {
    const db = await getDatabase();
    const wf = await db.get('workflows', id);
    return wf || null;
  }

  /**
   * Lists workflow summaries with optional search filtering, sorting, and pagination.
   */
  public static async list(options: WorkflowListOptions = {}): Promise<WorkflowSummary[]> {
    const db = await getDatabase();
    let summaries = await db.getAll('workflow_summaries');

    // 1. Search Query Filter
    if (options.query && options.query.trim().length > 0) {
      const q = options.query.toLowerCase().trim();
      summaries = summaries.filter(
        (s) => s.name.toLowerCase().includes(q) || (s.description && s.description.toLowerCase().includes(q))
      );
    }

    // 2. Favorite Filter
    if (options.favoriteOnly) {
      summaries = summaries.filter((s) => s.favorite === true);
    }

    // 3. Sorting
    const sortBy = options.sortBy || 'updatedAt';
    const sortDir = options.sortDirection || 'desc';
    const multiplier = sortDir === 'asc' ? 1 : -1;

    summaries.sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name) * multiplier;
      }
      if (sortBy === 'stepCount') {
        return (a.stepCount - b.stepCount) * multiplier;
      }
      if (sortBy === 'createdAt') {
        return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * multiplier;
      }
      // Default: updatedAt
      return (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()) * multiplier;
    });

    // 4. Pagination (offset & limit)
    const offset = Math.max(0, options.offset || 0);
    if (options.limit !== undefined && options.limit > 0) {
      return summaries.slice(offset, offset + options.limit);
    }

    return offset > 0 ? summaries.slice(offset) : summaries;
  }

  /**
   * Deletes a workflow and its summary record.
   */
  public static async delete(id: string): Promise<void> {
    const db = await getDatabase();
    const tx = db.transaction(['workflows', 'workflow_summaries'], 'readwrite');
    await Promise.all([
      tx.objectStore('workflows').delete(id),
      tx.objectStore('workflow_summaries').delete(id),
      tx.done,
    ]);

    this.syncRecentWorkflowsCache().catch(() => {});
  }

  /**
   * Duplicates an existing workflow with a new ID and title.
   */
  public static async duplicate(id: string): Promise<Workflow> {
    const original = await this.get(id);
    if (!original) {
      throw new Error(`Workflow "${id}" not found.`);
    }

    const timestamp = now();
    const newWorkflow: Workflow = {
      ...JSON.parse(JSON.stringify(original)),
      id: generateWorkflowId(),
      name: `${original.name} (Copy)`,
      createdAt: timestamp,
      updatedAt: timestamp,
      steps: original.steps.map((step) => ({
        ...step,
        id: generateStepId(),
      })),
    };

    await this.save(newWorkflow);
    return newWorkflow;
  }

  /**
   * Toggles the favorite status of a workflow.
   */
  public static async toggleFavorite(id: string): Promise<boolean> {
    const db = await getDatabase();
    const summary = await db.get('workflow_summaries', id);

    if (!summary) {
      throw new Error(`Workflow "${id}" not found.`);
    }

    const newFavoriteStatus = !summary.favorite;
    summary.favorite = newFavoriteStatus;
    summary.updatedAt = now();

    await db.put('workflow_summaries', summary);
    this.syncRecentWorkflowsCache().catch(() => {});

    return newFavoriteStatus;
  }

  /**
   * Exports all workflows in the database for complete offline backup.
   */
  public static async exportAll(): Promise<Workflow[]> {
    const db = await getDatabase();
    return db.getAll('workflows');
  }

  /**
   * Imports an array of workflows, automatically migrating legacy formats.
   */
  public static async importAll(rawWorkflows: unknown[]): Promise<{ imported: number; errors: string[] }> {
    let imported = 0;
    const errors: string[] = [];

    for (let i = 0; i < rawWorkflows.length; i++) {
      try {
        const raw = rawWorkflows[i];
        if (typeof raw !== 'object' || raw === null) {
          errors.push(`Item at index ${i} is not a valid object.`);
          continue;
        }

        const { workflow } = WorkflowMigrator.migrate(raw as Record<string, unknown>);
        await this.save(workflow);
        imported++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`Item at index ${i} failed: ${msg}`);
      }
    }

    return { imported, errors };
  }

  /**
   * Syncs the top 10 most recent workflows to chrome.storage.local for fast popup display.
   */
  private static async syncRecentWorkflowsCache(): Promise<void> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        const recents = await this.list({ limit: 10, sortBy: 'updatedAt', sortDirection: 'desc' });
        await chrome.storage.local.set({ recentWorkflows: recents });
      }
    } catch {
      // Ignore cache sync errors
    }
  }
}
