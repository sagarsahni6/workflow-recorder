import { describe, it, expect } from 'vitest';
import { WorkflowValidator } from '@core/workflow-validator';
import { createEmptyWorkflow } from '@shared/utils';
import type { ClickStep, InputStep } from '@shared/types';

describe('WorkflowValidator', () => {
  it('validates a clean, valid workflow successfully', () => {
    const wf = createEmptyWorkflow('Login Flow');
    const result = WorkflowValidator.validate(wf);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('catches missing or unsupported schema versions', () => {
    const wf = createEmptyWorkflow('Test');
    wf.schemaVersion = '99.0';

    const result = WorkflowValidator.validate(wf);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'UNSUPPORTED_SCHEMA_VERSION')).toBe(true);
  });

  it('detects duplicate variable names', () => {
    const wf = createEmptyWorkflow('Test');
    wf.variables = [
      { name: 'username', type: 'string', required: true },
      { name: 'username', type: 'string', required: false },
    ];

    const result = WorkflowValidator.validate(wf);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'DUPLICATE_VARIABLE_NAME')).toBe(true);
  });

  it('detects invalid variable identifier names', () => {
    const wf = createEmptyWorkflow('Test');
    wf.variables = [
      { name: '123-invalid-name!', type: 'string', required: true },
    ];

    const result = WorkflowValidator.validate(wf);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'INVALID_VARIABLE_NAME')).toBe(true);
  });

  it('detects duplicate step IDs', () => {
    const wf = createEmptyWorkflow('Test');
    const step1: ClickStep = {
      id: 'duplicate_step',
      type: 'click',
      target: {
        tagName: 'BUTTON',
        classes: [],
        selectors: [{ type: 'id', value: '#btn', score: 0.99 }],
      },
      clickType: 'left',
      description: 'Click button',
    };
    const step2: ClickStep = {
      id: 'duplicate_step',
      type: 'click',
      target: {
        tagName: 'BUTTON',
        classes: [],
        selectors: [{ type: 'id', value: '#btn2', score: 0.99 }],
      },
      clickType: 'left',
      description: 'Click button 2',
    };

    wf.steps = [step1, step2];

    const result = WorkflowValidator.validate(wf);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'DUPLICATE_STEP_ID')).toBe(true);
  });

  it('detects missing targets for action steps', () => {
    const wf = createEmptyWorkflow('Test');
    const invalidStep = {
      id: 'step_1',
      type: 'click',
      clickType: 'left',
      description: 'Click without target',
    } as any;

    wf.steps = [invalidStep];

    const result = WorkflowValidator.validate(wf);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'MISSING_TARGET')).toBe(true);
  });

  it('detects empty selectors on an element target', () => {
    const wf = createEmptyWorkflow('Test');
    const stepWithEmptySelectors: ClickStep = {
      id: 'step_1',
      type: 'click',
      target: {
        tagName: 'BUTTON',
        classes: [],
        selectors: [], // Empty!
      },
      clickType: 'left',
      description: 'Click button',
    };

    wf.steps = [stepWithEmptySelectors];

    const result = WorkflowValidator.validate(wf);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'MISSING_SELECTORS')).toBe(true);
  });

  it('warns when a step references an undefined variable', () => {
    const wf = createEmptyWorkflow('Test');
    const step: InputStep = {
      id: 'step_1',
      type: 'input',
      target: {
        tagName: 'INPUT',
        classes: [],
        selectors: [{ type: 'id', value: '#user', score: 0.99 }],
      },
      value: 'Hello {{unknown_variable}}',
      sensitive: false,
      description: 'Enter text',
    };

    wf.steps = [step];

    const result = WorkflowValidator.validate(wf);
    // Should still be valid structurally, but have a warning
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.code === 'UNDEFINED_VARIABLE_REFERENCE')).toBe(true);
  });
});
