/**
 * JSON Workflow Importer.
 *
 * Parses canonical workflow JSON, applies schema migration if needed,
 * and validates semantic integrity.
 */

import type { Workflow } from '@shared/types';
import { WorkflowValidator } from '@core/workflow-validator';
import { WorkflowMigrator } from '@core/workflow-migrator';

export interface ImportResult {
  success: boolean;
  workflow?: Workflow;
  errors: string[];
}

export function importFromJSON(content: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (err) {
    return {
      success: false,
      errors: [`JSON syntax error: ${err instanceof Error ? err.message : String(err)}`],
    };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      success: false,
      errors: ['JSON root must be an object representing a workflow.'],
    };
  }

  // Check if migration is needed
  const migrationResult = WorkflowMigrator.migrate(parsed as Record<string, unknown>);
  const workflow = migrationResult.workflow;
  const validation = WorkflowValidator.validate(workflow);

  if (!validation.valid) {
    return {
      success: false,
      errors: validation.errors.map((e) => `[${e.path}] ${e.message}`),
    };
  }

  return {
    success: true,
    workflow,
    errors: [],
  };
}
