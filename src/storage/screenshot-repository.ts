/**
 * Screenshot Repository.
 *
 * Manages captured step screenshot blobs and data URLs in IndexedDB,
 * with indexation by workflow ID for efficient batch cleanup.
 */

import { getDatabase, type ScreenshotRecord } from './db';
import { now } from '@shared/utils';

export class ScreenshotRepository {
  /**
   * Saves or updates a screenshot for a given workflow step.
   */
  public static async save(stepId: string, workflowId: string, dataUrl: string): Promise<void> {
    const db = await getDatabase();
    const record: ScreenshotRecord = {
      id: stepId,
      workflowId,
      dataUrl,
      createdAt: now(),
    };
    await db.put('screenshots', record);
  }

  /**
   * Retrieves a screenshot data URL for a specific step.
   */
  public static async get(stepId: string): Promise<string | null> {
    const db = await getDatabase();
    const record = await db.get('screenshots', stepId);
    return record?.dataUrl || null;
  }

  /**
   * Deletes a screenshot for a specific step.
   */
  public static async delete(stepId: string): Promise<void> {
    const db = await getDatabase();
    await db.delete('screenshots', stepId);
  }

  /**
   * Deletes all screenshots belonging to a specific workflow.
   */
  public static async deleteForWorkflow(workflowId: string): Promise<void> {
    const db = await getDatabase();
    const keys = await db.getAllKeysFromIndex('screenshots', 'workflowId', workflowId);

    const tx = db.transaction('screenshots', 'readwrite');
    await Promise.all([
      ...keys.map((k) => tx.store.delete(k)),
      tx.done,
    ]);
  }
}
