import { describe, it, expect, beforeEach } from 'vitest';
import { SettingsRepository } from '@storage/settings-repository';
import { closeDatabase, getDatabase } from '@storage/db';
import { DEFAULT_EXTENSION_SETTINGS } from '@shared/constants';

describe('SettingsRepository', () => {
  beforeEach(async () => {
    await closeDatabase();
    const db = await getDatabase();
    await db.clear('settings');
  });

  it('returns default settings if no custom settings are stored', async () => {
    const settings = await SettingsRepository.getSettings();
    expect(settings).toEqual(DEFAULT_EXTENSION_SETTINGS);
  });

  it('updates partial settings and merges with existing configuration', async () => {
    const updated = await SettingsRepository.updateSettings({
      recording: {
        recordHover: true,
      },
      privacy: {
        maskPasswords: true,
      },
    });

    expect(updated.recording.recordHover).toBe(true);
    expect(updated.recording.recordClicks).toBe(DEFAULT_EXTENSION_SETTINGS.recording.recordClicks);
    expect(updated.privacy.maskPasswords).toBe(true);

    const reloaded = await SettingsRepository.getSettings();
    expect(reloaded.recording.recordHover).toBe(true);
  });

  it('resets settings back to system defaults', async () => {
    await SettingsRepository.updateSettings({
      recording: { recordScrolls: true },
      timing: { defaultWaitMs: 15000 },
    });

    let current = await SettingsRepository.getSettings();
    expect(current.recording.recordScrolls).toBe(true);
    expect(current.timing.defaultWaitMs).toBe(15000);

    const reset = await SettingsRepository.resetSettings();
    expect(reset).toEqual(DEFAULT_EXTENSION_SETTINGS);

    current = await SettingsRepository.getSettings();
    expect(current).toEqual(DEFAULT_EXTENSION_SETTINGS);
  });
});
