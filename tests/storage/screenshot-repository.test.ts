import { describe, it, expect, beforeEach } from 'vitest';
import { ScreenshotRepository } from '@storage/screenshot-repository';
import { closeDatabase, getDatabase } from '@storage/db';

describe('ScreenshotRepository', () => {
  beforeEach(async () => {
    await closeDatabase();
    const db = await getDatabase();
    await db.clear('screenshots');
  });

  it('saves and retrieves a screenshot by step ID', async () => {
    const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    await ScreenshotRepository.save('step_1', 'wf_1', dataUrl);

    const retrieved = await ScreenshotRepository.get('step_1');
    expect(retrieved).toBe(dataUrl);
  });

  it('returns null for non-existent step screenshot', async () => {
    const retrieved = await ScreenshotRepository.get('non_existent');
    expect(retrieved).toBeNull();
  });

  it('deletes a single screenshot by step ID', async () => {
    const dataUrl = 'data:image/png;base64,dummy';
    await ScreenshotRepository.save('step_2', 'wf_1', dataUrl);

    await ScreenshotRepository.delete('step_2');
    const retrieved = await ScreenshotRepository.get('step_2');
    expect(retrieved).toBeNull();
  });

  it('deletes all screenshots associated with a workflow ID', async () => {
    const dataUrl = 'data:image/png;base64,dummy';
    await ScreenshotRepository.save('step_wf1_1', 'wf_target', dataUrl);
    await ScreenshotRepository.save('step_wf1_2', 'wf_target', dataUrl);
    await ScreenshotRepository.save('step_wf2_1', 'wf_other', dataUrl);

    await ScreenshotRepository.deleteForWorkflow('wf_target');

    expect(await ScreenshotRepository.get('step_wf1_1')).toBeNull();
    expect(await ScreenshotRepository.get('step_wf1_2')).toBeNull();
    expect(await ScreenshotRepository.get('step_wf2_1')).toBe(dataUrl);
  });
});
