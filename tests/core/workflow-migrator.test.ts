import { describe, it, expect } from 'vitest';
import { WorkflowMigrator } from '@core/workflow-migrator';
import { SCHEMA_VERSION } from '@shared/constants';

describe('WorkflowMigrator', () => {
  it('passes through workflows that already match current schema version', () => {
    const raw = {
      schemaVersion: SCHEMA_VERSION,
      id: 'wf_123',
      name: 'Modern Workflow',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      variables: [],
      steps: [],
      settings: {
        defaultTimeout: 10000,
        defaultRetryCount: 2,
        screenshotsEnabled: true,
      },
    };

    const result = WorkflowMigrator.migrate(raw);
    expect(result.migrated).toBe(false);
    expect(result.workflow.schemaVersion).toBe(SCHEMA_VERSION);
    expect(result.workflow.id).toBe('wf_123');
    expect(result.workflow.settings.screenshotsEnabled).toBe(true);
  });

  it('migrates legacy unversioned workflow to 1.0 schema with generated defaults', () => {
    const legacyRaw = {
      name: 'Old Recorded Workflow',
      steps: [
        { type: 'navigate', url: 'https://example.com' },
        { type: 'click', target: { tagName: 'BUTTON', classes: [], selectors: [] } },
      ],
    };

    const result = WorkflowMigrator.migrate(legacyRaw);

    expect(result.migrated).toBe(true);
    expect(result.workflow.schemaVersion).toBe(SCHEMA_VERSION);
    expect(result.workflow.id.startsWith('wf_')).toBe(true);
    expect(result.workflow.steps).toHaveLength(2);
    expect(result.workflow.steps[0]!.id.startsWith('step_')).toBe(true);
    expect(result.workflow.steps[1]!.id.startsWith('step_')).toBe(true);
    expect(result.workflow.settings).toBeDefined();
    expect(result.workflow.variables).toEqual([]);
  });
});
