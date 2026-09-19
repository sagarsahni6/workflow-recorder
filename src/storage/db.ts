/**
 * IndexedDB Connection & Schema Definition.
 *
 * Uses Jake Archibald's lightweight `idb` library to provide a type-safe,
 * promise-based interface to the local browser database.
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Workflow, WorkflowSummary, ExtensionSettings } from '@shared/types';
import { DB_NAME, DB_VERSION, STORES } from '@shared/constants';

export interface ScreenshotRecord {
  id: string; // stepId
  workflowId: string;
  dataUrl: string;
  createdAt: string;
}

export interface SettingsRecord {
  key: string;
  value: ExtensionSettings;
}

export interface WorkflowRecorderDBSchema extends DBSchema {
  workflows: {
    key: string;
    value: Workflow;
    indexes: {
      updatedAt: string;
      createdAt: string;
      name: string;
    };
  };
  workflow_summaries: {
    key: string;
    value: WorkflowSummary;
    indexes: {
      updatedAt: string;
      createdAt: string;
      name: string;
      favorite: string;
    };
  };
  screenshots: {
    key: string;
    value: ScreenshotRecord;
    indexes: {
      workflowId: string;
    };
  };
  settings: {
    key: string;
    value: SettingsRecord;
  };
}

let dbPromise: Promise<IDBPDatabase<WorkflowRecorderDBSchema>> | null = null;

/**
 * Returns a cached connection to the IndexedDB database, creating/upgrading
 * the object stores if necessary.
 */
export function getDatabase(): Promise<IDBPDatabase<WorkflowRecorderDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<WorkflowRecorderDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // 1. Full Workflows Store
        if (!db.objectStoreNames.contains(STORES.WORKFLOWS as 'workflows')) {
          const workflowStore = db.createObjectStore(STORES.WORKFLOWS as 'workflows', {
            keyPath: 'id',
          });
          workflowStore.createIndex('updatedAt', 'updatedAt');
          workflowStore.createIndex('createdAt', 'createdAt');
          workflowStore.createIndex('name', 'name');
        }

        // 2. Lightweight Summaries Store
        if (!db.objectStoreNames.contains('workflow_summaries')) {
          const summaryStore = db.createObjectStore('workflow_summaries', {
            keyPath: 'id',
          });
          summaryStore.createIndex('updatedAt', 'updatedAt');
          summaryStore.createIndex('createdAt', 'createdAt');
          summaryStore.createIndex('name', 'name');
          summaryStore.createIndex('favorite', 'favorite');
        }

        // 3. Screenshots Store
        if (!db.objectStoreNames.contains(STORES.SCREENSHOTS as 'screenshots')) {
          const screenshotStore = db.createObjectStore(STORES.SCREENSHOTS as 'screenshots', {
            keyPath: 'id',
          });
          screenshotStore.createIndex('workflowId', 'workflowId');
        }

        // 4. Settings Store
        if (!db.objectStoreNames.contains(STORES.SETTINGS as 'settings')) {
          db.createObjectStore(STORES.SETTINGS as 'settings', {
            keyPath: 'key',
          });
        }
      },
    });
  }

  return dbPromise;
}

/**
 * Closes the database connection and resets the singleton promise.
 * Particularly helpful in unit tests when resetting state.
 */
export async function closeDatabase(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise;
    db.close();
    dbPromise = null;
  }
}
