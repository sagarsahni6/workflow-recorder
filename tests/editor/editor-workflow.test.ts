import { describe, it, expect } from 'vitest';
import { WorkflowBuilder } from '@core/workflow-builder';
import { VariableExtractor } from '@core/variable-extractor';
import type { ClickStep, InputStep, WorkflowStep } from '@shared/types';

describe('Phase 6 — Workflow Editor Logic', () => {
  it('adds manual steps and manages reordering', () => {
    const builder = WorkflowBuilder.create('Test Editor Flow');

    const step1: ClickStep = {
      id: 'step_1',
      type: 'click',
      target: { tagName: 'BUTTON', classes: [], selectors: [{ type: 'id', value: '#btn1', score: 0.9 }] },
      clickType: 'left',
      description: 'First click',
    };

    const step2: InputStep = {
      id: 'step_2',
      type: 'input',
      target: { tagName: 'INPUT', classes: [], selectors: [{ type: 'css', value: 'input[name="user"]', score: 0.8 }] },
      value: 'alice',
      sensitive: false,
      description: 'Input username',
    };

    builder.addStep(step1);
    builder.addStep(step2);

    let wf = builder.build();
    expect(wf.steps).toHaveLength(2);
    expect(wf.steps[0]?.id).toBe('step_1');
    expect(wf.steps[1]?.id).toBe('step_2');

    // Move step 1 to index 0
    builder.moveStep(1, 0);
    wf = builder.build();
    expect(wf.steps[0]?.id).toBe('step_2');
    expect(wf.steps[1]?.id).toBe('step_1');
  });

  it('duplicates steps with generated IDs and preserves properties', () => {
    const builder = WorkflowBuilder.create('Duplicate Flow');
    const step: ClickStep = {
      id: 'orig_1',
      type: 'click',
      target: { tagName: 'A', classes: [], selectors: [{ type: 'css', value: 'a.link', score: 0.7 }] },
      clickType: 'double',
      description: 'Double click link',
    };

    builder.addStep(step);
    builder.duplicateStep('orig_1');

    const wf = builder.build();
    expect(wf.steps).toHaveLength(2);
    expect(wf.steps[1]?.id).not.toBe('orig_1');
    expect((wf.steps[1] as ClickStep).clickType).toBe('double');
    expect(wf.steps[1]?.description).toBe('Double click link (Copy)');
  });

  it('updates step parameters and selector order', () => {
    const builder = WorkflowBuilder.create('Update Flow');
    const step: ClickStep = {
      id: 'step_update',
      type: 'click',
      target: {
        tagName: 'BUTTON',
        classes: ['btn'],
        selectors: [
          { type: 'css', value: '.btn', score: 0.6 },
          { type: 'id', value: '#submit', score: 0.95 },
        ],
      },
      clickType: 'left',
      description: 'Click button',
    };

    builder.addStep(step);

    // Promote #submit to first
    const updatedStep: ClickStep = {
      ...step,
      target: {
        ...step.target,
        selectors: [
          step.target.selectors[1]!,
          step.target.selectors[0]!,
        ],
      },
      timeout: 5000,
    };

    builder.updateStep('step_update', updatedStep);
    const wf = builder.build();
    const retrieved = wf.steps[0] as ClickStep;

    expect(retrieved.target.selectors[0]?.value).toBe('#submit');
    expect(retrieved.timeout).toBe(5000);
  });

  it('toggles step disabled status and removes steps cleanly', () => {
    const builder = WorkflowBuilder.create('Disable Flow');
    const step: WorkflowStep = {
      id: 'step_dis',
      type: 'wait',
      timeout: 1000,
      description: 'Wait 1s',
    };

    builder.addStep(step);
    builder.toggleStepDisabled('step_dis');

    let wf = builder.build();
    expect(wf.steps[0]?.disabled).toBe(true);

    builder.toggleStepDisabled('step_dis');
    wf = builder.build();
    expect(wf.steps[0]?.disabled).toBe(false);

    builder.removeStep('step_dis');
    wf = builder.build();
    expect(wf.steps).toHaveLength(0);
  });

  it('binds variables to steps and extracts suggestions', () => {
    const builder = WorkflowBuilder.create('Variables Flow');
    const step: InputStep = {
      id: 'step_email',
      type: 'input',
      target: {
        tagName: 'INPUT',
        classes: [],
        name: 'email',
        selectors: [{ type: 'css', value: '#email', score: 0.9 }],
      },
      value: 'user@example.com',
      sensitive: false,
      description: 'Enter email',
    };

    builder.addStep(step);
    const wf = builder.build();

    const candidates = VariableExtractor.scan(wf);
    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.type).toBe('email');

    const parametrized = VariableExtractor.applyVariable(wf, 'step_email', candidates[0]!.suggestedName);
    expect((parametrized.steps[0] as InputStep).value).toBe(`{{${candidates[0]!.suggestedName}}}`);
    expect(parametrized.variables).toHaveLength(1);
    expect(parametrized.variables[0]?.name).toBe(candidates[0]!.suggestedName);
  });
});
