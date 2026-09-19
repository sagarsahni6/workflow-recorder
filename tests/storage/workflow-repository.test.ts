import { describe, it, expect, beforeEach } from 'vitest';
import { WorkflowRepository } from '@storage/workflow-repository';
import { closeDatabase } from '@storage/db';
import { createEmptyWorkflow } from '@shared/utils';
import type { ClickStep } from '@shared/types';

describe('WorkflowRepository', () => {
  beforeEach(async () => {
    await closeDatabase();
    // Clear indexedDB tables
    const all = await WorkflowRepository.exportAll();
    for (const item of all) {
      await WorkflowRepository.delete(item.id);
    }
  });

  const createTestWorkflow = (name: string, stepCount = 1) => {
    const wf = createEmptyWorkflow(name);
    for (let i = 0; i < stepCount; i++) {
      const step: ClickStep = {
        id: `step_${i}`,
        type: 'click',
        target: {
          tagName: 'BUTTON',
          classes: [],
          selectors: [{ type: 'id', value: `#btn_${i}`, score: 0.99 }],
        },
        clickType: 'left',
        description: `Click button ${i}`,
      };
      wf.steps.push(step);
    }
    return wf;
  };

  it('saves and retrieves a workflow by ID', async () => {
    const wf = createTestWorkflow('Checkout Flow');
    await WorkflowRepository.save(wf);

    const retrieved = await WorkflowRepository.get(wf.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe(wf.id);
    expect(retrieved?.name).toBe('Checkout Flow');
    expect(retrieved?.steps).toHaveLength(1);
  });

  it('lists workflow summaries with search filtering', async () => {
    await WorkflowRepository.save(createTestWorkflow('Customer Login'));
    await WorkflowRepository.save(createTestWorkflow('Customer Signup'));
    await WorkflowRepository.save(createTestWorkflow('Admin Portal'));

    const customerWorkflows = await WorkflowRepository.list({ query: 'customer' });
    expect(customerWorkflows).toHaveLength(2);

    const adminWorkflows = await WorkflowRepository.list({ query: 'admin' });
    expect(adminWorkflows).toHaveLength(1);
    expect(adminWorkflows[0]!.name).toBe('Admin Portal');
  });

  it('filters by favorite workflows', async () => {
    const wf1 = createTestWorkflow('Workflow 1');
    const wf2 = createTestWorkflow('Workflow 2');
    await WorkflowRepository.save(wf1);
    await WorkflowRepository.save(wf2);

    // Star wf1
    await WorkflowRepository.toggleFavorite(wf1.id);

    const favorites = await WorkflowRepository.list({ favoriteOnly: true });
    expect(favorites).toHaveLength(1);
    expect(favorites[0]!.id).toBe(wf1.id);
  });

  it('sorts workflows by step count or name', async () => {
    await WorkflowRepository.save(createTestWorkflow('Beta Flow', 5));
    await WorkflowRepository.save(createTestWorkflow('Alpha Flow', 2));

    const sortedByName = await WorkflowRepository.list({ sortBy: 'name', sortDirection: 'asc' });
    expect(sortedByName[0]!.name).toBe('Alpha Flow');
    expect(sortedByName[1]!.name).toBe('Beta Flow');

    const sortedBySteps = await WorkflowRepository.list({ sortBy: 'stepCount', sortDirection: 'desc' });
    expect(sortedBySteps[0]!.name).toBe('Beta Flow');
    expect(sortedBySteps[0]!.stepCount).toBe(5);
  });

  it('duplicates an existing workflow with a new ID', async () => {
    const original = createTestWorkflow('Master Template', 2);
    await WorkflowRepository.save(original);

    const duplicate = await WorkflowRepository.duplicate(original.id);
    expect(duplicate.id).not.toBe(original.id);
    expect(duplicate.name).toBe('Master Template (Copy)');
    expect(duplicate.steps[0]!.id).not.toBe(original.steps[0]!.id);

    const all = await WorkflowRepository.list();
    expect(all).toHaveLength(2);
  });

  it('deletes a workflow and removes its summary record', async () => {
    const wf = createTestWorkflow('Disposable Flow');
    await WorkflowRepository.save(wf);

    let list = await WorkflowRepository.list();
    expect(list).toHaveLength(1);

    await WorkflowRepository.delete(wf.id);

    list = await WorkflowRepository.list();
    expect(list).toHaveLength(0);

    const deleted = await WorkflowRepository.get(wf.id);
    expect(deleted).toBeNull();
  });

  it('exports all workflows and imports backup arrays', async () => {
    await WorkflowRepository.save(createTestWorkflow('Flow A'));
    await WorkflowRepository.save(createTestWorkflow('Flow B'));

    const exportData = await WorkflowRepository.exportAll();
    expect(exportData).toHaveLength(2);

    // Wipe database
    for (const item of exportData) {
      await WorkflowRepository.delete(item.id);
    }
    expect(await WorkflowRepository.list()).toHaveLength(0);

    // Re-import
    const importResult = await WorkflowRepository.importAll(exportData);
    expect(importResult.imported).toBe(2);
    expect(importResult.errors).toHaveLength(0);

    expect(await WorkflowRepository.list()).toHaveLength(2);
  });
});
