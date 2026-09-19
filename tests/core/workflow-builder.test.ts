import { describe, it, expect } from 'vitest';
import { WorkflowBuilder } from '@core/workflow-builder';
import type { ClickStep, InputStep } from '@shared/types';

describe('WorkflowBuilder', () => {
  const dummyClick: ClickStep = {
    id: 'step_1',
    type: 'click',
    target: {
      tagName: 'BUTTON',
      classes: ['btn'],
      selectors: [{ type: 'id', value: '#login', score: 0.99 }],
    },
    clickType: 'left',
    description: 'Click Login',
  };

  const dummyInput: InputStep = {
    id: 'step_2',
    type: 'input',
    target: {
      tagName: 'INPUT',
      classes: ['form-control'],
      selectors: [{ type: 'name', value: 'email', score: 0.9 }],
    },
    value: 'user@example.com',
    sensitive: false,
    description: 'Enter email',
  };

  it('builds a workflow with fluent methods', () => {
    const wf = WorkflowBuilder.create('Registration Flow')
      .setDescription('Customer sign up')
      .addStep(dummyClick)
      .addStep(dummyInput)
      .build();

    expect(wf.name).toBe('Registration Flow');
    expect(wf.description).toBe('Customer sign up');
    expect(wf.steps).toHaveLength(2);
    expect(wf.steps[0]!.id).toBe('step_1');
    expect(wf.steps[1]!.id).toBe('step_2');
  });

  it('inserts step at a specific index', () => {
    const builder = WorkflowBuilder.create()
      .addStep(dummyClick)
      .insertStepAt(0, dummyInput);

    const wf = builder.build();
    expect(wf.steps[0]!.id).toBe('step_2');
    expect(wf.steps[1]!.id).toBe('step_1');
  });

  it('removes a step by ID', () => {
    const wf = WorkflowBuilder.create()
      .addStep(dummyClick)
      .addStep(dummyInput)
      .removeStep('step_1')
      .build();

    expect(wf.steps).toHaveLength(1);
    expect(wf.steps[0]!.id).toBe('step_2');
  });

  it('reorders steps via moveStep', () => {
    const wf = WorkflowBuilder.create()
      .addStep(dummyClick)
      .addStep(dummyInput)
      .moveStep(0, 1)
      .build();

    expect(wf.steps[0]!.id).toBe('step_2');
    expect(wf.steps[1]!.id).toBe('step_1');
  });

  it('duplicates a step with a unique ID', () => {
    const wf = WorkflowBuilder.create()
      .addStep(dummyClick)
      .duplicateStep('step_1')
      .build();

    expect(wf.steps).toHaveLength(2);
    expect(wf.steps[0]!.id).toBe('step_1');
    expect(wf.steps[1]!.id).not.toBe('step_1');
    expect(wf.steps[1]!.id.startsWith('step_')).toBe(true);
  });

  it('toggles step disabled status', () => {
    const builder = WorkflowBuilder.create().addStep(dummyClick);

    builder.toggleStepDisabled('step_1');
    expect(builder.build().steps[0]!.disabled).toBe(true);

    builder.toggleStepDisabled('step_1');
    expect(builder.build().steps[0]!.disabled).toBe(false);
  });

  it('adds, updates, and removes variables', () => {
    const builder = WorkflowBuilder.create()
      .addVariable({ name: 'username', type: 'string', required: true, defaultValue: 'admin' });

    let wf = builder.build();
    expect(wf.variables).toHaveLength(1);
    expect(wf.variables[0]!.defaultValue).toBe('admin');

    builder.updateVariable('username', { defaultValue: 'superadmin' });
    wf = builder.build();
    expect(wf.variables[0]!.defaultValue).toBe('superadmin');

    builder.removeVariable('username');
    wf = builder.build();
    expect(wf.variables).toHaveLength(0);
  });
});
