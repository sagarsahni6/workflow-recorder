import { describe, it, expect, beforeEach } from 'vitest';
import { EventNormalizer } from '@core/event-normalizer';
import { WorkflowBuilder } from '@core/workflow-builder';
import { WorkflowValidator } from '@core/workflow-validator';
import { VariableExtractor } from '@core/variable-extractor';
import { PrivacyGuard } from '@core/privacy-guard';
import { WorkflowRepository } from '@storage/workflow-repository';
import { closeDatabase } from '@storage/db';
import { exportWorkflow } from '@exporters/index';
import type { WorkflowStep, ElementTarget, ClickStep, InputStep, SelectStep, CheckboxStep } from '@shared/types';

describe('Phase 10 — End-to-End Workflow Pipeline Integration', () => {
  beforeEach(async () => {
    await closeDatabase();
    const all = await WorkflowRepository.exportAll();
    for (const item of all) {
      await WorkflowRepository.delete(item.id);
    }
  });

  it('executes full pipeline: Record -> Normalize -> Build -> Validate -> Sanitize -> Store -> Export -> Re-import', async () => {
    // 1. Simulate Raw User Event Stream via EventNormalizer
    const dispatchedSteps: WorkflowStep[] = [];
    const normalizer = new EventNormalizer((step) => dispatchedSteps.push(step));

    const inputTarget: ElementTarget = {
      tagName: 'INPUT',
      id: 'customer-email',
      name: 'email',
      classes: ['input-field'],
      selectors: [{ type: 'css', value: '#customer-email', score: 0.95 }],
    };

    const inputEl = document.createElement('input');
    // Keystroke stream: j -> jo -> joh -> john -> john@acme.com
    normalizer.handleStep(
      { id: 's1_1', type: 'input', target: inputTarget, value: 'j', sensitive: false, description: '' },
      inputEl
    );
    normalizer.handleStep(
      { id: 's1_2', type: 'input', target: inputTarget, value: 'jo', sensitive: false, description: '' },
      inputEl
    );
    normalizer.handleStep(
      { id: 's1_3', type: 'input', target: inputTarget, value: 'john@acme.com', sensitive: false, description: '' },
      inputEl
    );

    // Click on button flushes pending input
    const buttonTarget: ElementTarget = {
      tagName: 'BUTTON',
      id: 'submit-btn',
      classes: ['btn', 'btn-primary'],
      selectors: [{ type: 'id', value: '#submit-btn', score: 0.99 }],
    };
    const clickStep: ClickStep = {
      id: 's2',
      type: 'click',
      target: buttonTarget,
      clickType: 'left',
      description: 'Click Submit',
    };
    normalizer.handleStep(clickStep);

    // Select dropdown
    const selectTarget: ElementTarget = {
      tagName: 'SELECT',
      name: 'country',
      classes: [],
      selectors: [{ type: 'name', value: 'country', score: 0.9 }],
    };
    const selectStep: SelectStep = {
      id: 's3',
      type: 'select',
      target: selectTarget,
      value: 'US',
      label: 'United States',
      description: 'Select country',
    };
    normalizer.handleStep(selectStep);

    // Checkbox agreement
    const checkboxTarget: ElementTarget = {
      tagName: 'INPUT',
      id: 'terms-checkbox',
      classes: [],
      selectors: [{ type: 'id', value: '#terms-checkbox', score: 0.9 }],
    };
    const checkboxStep: CheckboxStep = {
      id: 's4',
      type: 'checkbox',
      target: checkboxTarget,
      checked: true,
      description: 'Accept terms',
    };
    normalizer.handleStep(checkboxStep);
    normalizer.flush();

    // Verify input grouping collapsed 3 keystrokes into 1 normalized action
    expect(dispatchedSteps).toHaveLength(4);
    expect(dispatchedSteps[0]?.type).toBe('input');
    expect((dispatchedSteps[0] as InputStep).value).toBe('john@acme.com');

    // 2. Construct Canonical Workflow via WorkflowBuilder
    const builder = WorkflowBuilder.create('E2E Production Pipeline')
      .setDescription('End-to-end integration test flow');

    builder.addStep({
      id: 's0_nav',
      type: 'navigate',
      url: 'https://checkout.acme.com/register?utm_source=test&token=secret_auth_token_xyz',
      description: 'Navigate to checkout',
    });

    for (const step of dispatchedSteps) {
      builder.addStep(step);
    }

    let workflow = builder.build();
    expect(workflow.steps).toHaveLength(5);

    // 3. Validate against Canonical Workflow Schema & Business Rules
    const validationResult = WorkflowValidator.validate(workflow);
    expect(validationResult.valid).toBe(true);
    expect(validationResult.errors).toHaveLength(0);

    // 4. Dynamic Variable Discovery & Extraction
    const suggestions = VariableExtractor.scan(workflow);
    expect(suggestions.length).toBeGreaterThan(0);
    const emailCandidate = suggestions.find((s) => s.type === 'email');
    expect(emailCandidate).toBeDefined();

    if (emailCandidate) {
      workflow = VariableExtractor.applyVariable(workflow, emailCandidate.stepId, emailCandidate.suggestedName);
      expect(workflow.variables).toHaveLength(1);
      expect(workflow.variables[0]?.name).toBe(emailCandidate.suggestedName);
      expect((workflow.steps[1] as InputStep).value).toBe(`{{${emailCandidate.suggestedName}}}`);
    }

    // 5. Privacy & Security Sanitization
    const sanitizedWorkflow = PrivacyGuard.sanitizeWorkflow(workflow);
    // Sensitive token in navigation URL should be scrubbed
    expect(sanitizedWorkflow.steps[0]?.type).toBe('navigate');
    expect((sanitizedWorkflow.steps[0] as any).url).toContain('token=%5BREDACTED%5D');
    expect((sanitizedWorkflow.steps[0] as any).url).not.toContain('secret_auth_token_xyz');

    // 6. Persistence in IndexedDB via WorkflowRepository
    await WorkflowRepository.save(sanitizedWorkflow);

    const summaries = await WorkflowRepository.list();
    expect(summaries).toHaveLength(1);
    expect(summaries[0]?.id).toBe(sanitizedWorkflow.id);
    expect(summaries[0]?.stepCount).toBe(5);

    const loaded = await WorkflowRepository.get(sanitizedWorkflow.id);
    expect(loaded).not.toBeNull();
    expect(loaded?.name).toBe('E2E Production Pipeline');

    // 7. Multi-target Code Export
    const exportTargets = [
      'json',
      'yaml',
      'csv',
      'markdown',
      'playwright-js',
      'playwright-ts',
      'puppeteer',
      'selenium-python',
    ] as const;

    for (const target of exportTargets) {
      const exportOutput = exportWorkflow(loaded!, target);
      expect(exportOutput.content.length).toBeGreaterThan(50);
      expect(exportOutput.filename).toContain('e2e-production-pipeline');
    }

    // 8. Re-import Backup Array
    const exportedAll = await WorkflowRepository.exportAll();
    expect(exportedAll).toHaveLength(1);

    await WorkflowRepository.delete(sanitizedWorkflow.id);
    expect(await WorkflowRepository.list()).toHaveLength(0);

    const importResult = await WorkflowRepository.importAll(exportedAll);
    expect(importResult.imported).toBe(1);
    expect(importResult.errors).toHaveLength(0);
    expect(await WorkflowRepository.list()).toHaveLength(1);
  });
});
