/**
 * Settings Repository.
 *
 * Manages user preferences for recording options, privacy masks,
 * and wait timeouts backed by IndexedDB and synchronized with chrome.storage.
 */

import type { ExtensionSettings } from '@shared/types';
import { DEFAULT_EXTENSION_SETTINGS } from '@shared/constants';
import { getDatabase } from './db';

const SETTINGS_KEY = 'extension_settings';

export class SettingsRepository {
  /**
   * Retrieves user preferences, returning default settings if none have been saved yet.
   */
  public static async getSettings(): Promise<ExtensionSettings> {
    try {
      const db = await getDatabase();
      const record = await db.get('settings', SETTINGS_KEY);

      if (!record || !record.value) {
        return { ...DEFAULT_EXTENSION_SETTINGS };
      }

      // Deep merge with defaults to ensure any newly introduced settings fields are populated
      return {
        recording: { ...DEFAULT_EXTENSION_SETTINGS.recording, ...record.value.recording },
        privacy: { ...DEFAULT_EXTENSION_SETTINGS.privacy, ...record.value.privacy },
        timing: { ...DEFAULT_EXTENSION_SETTINGS.timing, ...record.value.timing },
      };
    } catch {
      return { ...DEFAULT_EXTENSION_SETTINGS };
    }
  }

  /**
   * Updates specific configuration fields and synchronizes to local storage.
   */
  public static async updateSettings(
    partial: Partial<{
      recording: Partial<ExtensionSettings['recording']>;
      privacy: Partial<ExtensionSettings['privacy']>;
      timing: Partial<ExtensionSettings['timing']>;
    }>
  ): Promise<ExtensionSettings> {
    const current = await this.getSettings();

    const updated: ExtensionSettings = {
      recording: { ...current.recording, ...(partial.recording || {}) },
      privacy: { ...current.privacy, ...(partial.privacy || {}) },
      timing: { ...current.timing, ...(partial.timing || {}) },
    };

    const db = await getDatabase();
    await db.put('settings', {
      key: SETTINGS_KEY,
      value: updated,
    });

    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        await chrome.storage.local.set({ extensionSettings: updated });
      }
    } catch {
      // Ignore
    }

    return updated;
  }

  /**
   * Resets all settings to application defaults.
   */
  public static async resetSettings(): Promise<ExtensionSettings> {
    const db = await getDatabase();
    await db.put('settings', {
      key: SETTINGS_KEY,
      value: { ...DEFAULT_EXTENSION_SETTINGS },
    });

    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        await chrome.storage.local.set({ extensionSettings: DEFAULT_EXTENSION_SETTINGS });
      }
    } catch {
      // Ignore
    }

    return { ...DEFAULT_EXTENSION_SETTINGS };
  }
}
