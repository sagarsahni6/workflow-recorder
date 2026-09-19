/**
 * Workflow Migrator.
 *
 * Handles schema versioning and automated backward-compatible migrations
 * across workflow format iterations.
 */

import type { Workflow, WorkflowSettings, WorkflowStep, WorkflowVariable, BrowserMetadata } from '@shared/types';
import { SCHEMA_VERSION, DEFAULT_WORKFLOW_SETTINGS } from '@shared/constants';
import { generateWorkflowId, generateStepId, now } from '@shared/utils';

export interface MigrationResult {
  migrated: boolean;
  fromVersion: string;
  toVersion: string;
  workflow: Workflow;
}

export type MigrationFn = (raw: Record<string, unknown>) => Record<string, unknown>;

export class WorkflowMigrator {
  /** Registry of version migration transformers. */
  private static readonly MIGRATIONS: Map<string, MigrationFn> = new Map([
    ['0.9', WorkflowMigrator.migrate0_9To1_0],
  ]);

  /**
   * Migrates any arbitrary raw JSON object into a compliant canonical Workflow.
   */
  public static migrate(raw: Record<string, unknown>): MigrationResult {
    const rawVersion = typeof raw.schemaVersion === 'string' ? raw.schemaVersion : '0.9';

    if (rawVersion === SCHEMA_VERSION) {
      return {
        migrated: false,
        fromVersion: SCHEMA_VERSION,
        toVersion: SCHEMA_VERSION,
        workflow: this.normalizeWorkflow(raw),
      };
    }

    let current = { ...raw };
    let currentVersion = rawVersion;

    // Apply sequential migrations
    while (currentVersion !== SCHEMA_VERSION) {
      const migration = this.MIGRATIONS.get(currentVersion);
      if (migration) {
        current = migration(current);
        currentVersion = typeof current.schemaVersion === 'string' ? current.schemaVersion : SCHEMA_VERSION;
      } else {
        // Fallback: apply default normalization to upgrade unversioned data to 1.0
        current = this.migrateLegacyTo1_0(current);
        currentVersion = SCHEMA_VERSION;
      }
    }

    return {
      migrated: true,
      fromVersion: rawVersion,
      toVersion: SCHEMA_VERSION,
      workflow: this.normalizeWorkflow(current),
    };
  }

  /**
   * Migration from 0.9 (draft/beta format) to 1.0.
   */
  private static migrate0_9To1_0(raw: Record<string, unknown>): Record<string, unknown> {
    return WorkflowMigrator.migrateLegacyTo1_0(raw);
  }

  /**
   * Upgrades legacy or incomplete workflows to canonical 1.0.
   */
  private static migrateLegacyTo1_0(raw: Record<string, unknown>): Record<string, unknown> {
    const timestamp = now();

    const rawSettings = typeof raw.settings === 'object' && raw.settings !== null
      ? (raw.settings as Partial<WorkflowSettings>)
      : {};

    const settings: WorkflowSettings = {
      ...DEFAULT_WORKFLOW_SETTINGS,
      ...rawSettings,
    };

    const steps = Array.isArray(raw.steps)
      ? raw.steps.map((step: unknown) => {
          const s = typeof step === 'object' && step !== null ? (step as Record<string, unknown>) : {};
          return {
            ...s,
            id: typeof s.id === 'string' ? s.id : generateStepId(),
            description: typeof s.description === 'string' ? s.description : `${String(s.type || 'Action')} step`,
          };
        })
      : [];

    return {
      ...raw,
      schemaVersion: SCHEMA_VERSION,
      id: typeof raw.id === 'string' ? raw.id : generateWorkflowId(),
      name: typeof raw.name === 'string' ? raw.name : 'Migrated Workflow',
      description: typeof raw.description === 'string' ? raw.description : '',
      createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : timestamp,
      updatedAt: timestamp,
      variables: Array.isArray(raw.variables) ? raw.variables : [],
      steps,
      settings,
    };
  }

  /**
   * Ensures all required properties exist and have valid defaults.
   */
  private static normalizeWorkflow(raw: Record<string, unknown>): Workflow {
    const rawSettings = typeof raw.settings === 'object' && raw.settings !== null
      ? (raw.settings as Partial<WorkflowSettings>)
      : {};

    return {
      schemaVersion: SCHEMA_VERSION,
      id: typeof raw.id === 'string' ? raw.id : generateWorkflowId(),
      name: typeof raw.name === 'string' ? raw.name : 'Untitled Workflow',
      description: typeof raw.description === 'string' ? raw.description : '',
      createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : now(),
      updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : now(),
      browser: typeof raw.browser === 'object' && raw.browser !== null ? (raw.browser as BrowserMetadata) : undefined,
      variables: Array.isArray(raw.variables) ? (raw.variables as WorkflowVariable[]) : [],
      steps: Array.isArray(raw.steps) ? (raw.steps as WorkflowStep[]) : [],
      settings: {
        ...DEFAULT_WORKFLOW_SETTINGS,
        ...rawSettings,
      },
    };
  }
}
