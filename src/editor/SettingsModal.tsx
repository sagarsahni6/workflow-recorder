/**
 * Settings Modal Component.
 *
 * Provides a comprehensive preferences UI covering:
 * - Recording toggles (clicks, typing, selects, uploads, downloads, screenshots, scrolls, hover)
 * - Privacy and data masking (passwords, OTPs, sensitive fields, clipboard, cookies, storage)
 * - Timing configuration (default waits, element timeouts, retry limits, hover delay)
 * - Developer Debug Mode metrics and sanitized debug log export
 */

import React, { useState, useEffect } from 'react';
import type { ExtensionSettings } from '@shared/types';
import { SettingsRepository } from '@storage/settings-repository';
import { DebugTracker } from '@core/debug-tracker';
import { IconSettings, IconX, IconDownload } from './Icons';

function downloadTextFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'recording' | 'privacy' | 'timing' | 'debug'>('recording');
  const [settings, setSettings] = useState<ExtensionSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const debugStats = DebugTracker.getInstance().getStats();

  useEffect(() => {
    SettingsRepository.getSettings().then(setSettings);
  }, []);

  if (!settings) {
    return null;
  }

  const handleToggleRecording = (key: keyof ExtensionSettings['recording']) => {
    if (typeof settings.recording[key] === 'boolean') {
      setSettings({
        ...settings,
        recording: {
          ...settings.recording,
          [key]: !settings.recording[key],
        },
      });
    }
  };

  const handleTogglePrivacy = (key: keyof ExtensionSettings['privacy']) => {
    setSettings({
      ...settings,
      privacy: {
        ...settings.privacy,
        [key]: !settings.privacy[key],
      },
    });
  };

  const handleNumberChange = (
    section: 'timing',
    key: keyof ExtensionSettings['timing'],
    value: number
  ) => {
    setSettings({
      ...settings,
      [section]: {
        ...settings[section],
        [key]: value,
      },
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await SettingsRepository.updateSettings(settings);
      setStatusMessage('Settings saved successfully!');
      setTimeout(() => setStatusMessage(''), 2500);
    } catch {
      setStatusMessage('Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (window.confirm('Reset all extension settings to default values?')) {
      const reset = await SettingsRepository.resetSettings();
      setSettings(reset);
      setStatusMessage('Settings reset to defaults.');
      setTimeout(() => setStatusMessage(''), 2500);
    }
  };

  const handleExportDebugLogs = () => {
    const logData = DebugTracker.getInstance().exportLogs();
    downloadTextFile(
      `recorder_debug_${new Date().toISOString().replace(/[:.]/g, '-')}.txt`,
      logData
    );
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.45)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          width: '90%',
          maxWidth: '680px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
          color: '#0f172a',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#ffffff',
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a' }}>
            <IconSettings size={18} /> Extension Settings
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '4px 8px',
            }}
          >
            <IconX size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #e2e8f0',
          background: '#f8fafc',
          padding: '0 16px',
        }}>
          {(['recording', 'privacy', 'timing', 'debug'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '12px 16px',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab ? '2px solid #0284c7' : '2px solid transparent',
                color: activeTab === tab ? '#0284c7' : '#64748b',
                fontWeight: activeTab === tab ? 600 : 500,
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {tab === 'debug' ? 'Developer Debug' : tab}
            </button>
          ))}
        </div>

        {/* Body Content */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, background: '#ffffff' }}>
          {activeTab === 'recording' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h3 style={{ fontSize: '13px', color: '#0284c7', margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                Capture Preferences
              </h3>
              {[
                { key: 'recordClicks', label: 'Record Clicks (single, double, right-click)' },
                { key: 'recordTyping', label: 'Record Typing (intelligent keystroke grouping)' },
                { key: 'recordSelects', label: 'Record Dropdown/Select Choices' },
                { key: 'recordKeyboardShortcuts', label: 'Record Keyboard Shortcuts & Navigation Keys' },
                { key: 'recordUploads', label: 'Record File Uploads (parameterized)' },
                { key: 'recordDownloads', label: 'Record Browser Downloads' },
                { key: 'recordScrolls', label: 'Record Page Scrolling (debounced)' },
                { key: 'recordHover', label: 'Record Hover Actions (with configurable delay)' },
                { key: 'recordScreenshots', label: 'Capture Step Preview Screenshots' },
                { key: 'detectVariables', label: 'Auto-detect Potential Variables in Input Values' },
              ].map(({ key, label }) => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px', color: '#1e293b' }}>
                  <input
                    type="checkbox"
                    checked={!!settings.recording[key as keyof ExtensionSettings['recording']]}
                    onChange={() => handleToggleRecording(key as keyof ExtensionSettings['recording'])}
                    style={{ accentColor: '#0284c7', width: '16px', height: '16px' }}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          )}

          {activeTab === 'privacy' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h3 style={{ fontSize: '13px', color: '#0284c7', margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                Privacy & Data Protection
              </h3>
              {[
                { key: 'maskPasswords', label: 'Never record passwords (mask <input type="password">)' },
                { key: 'maskSensitiveInputs', label: 'Mask sensitive inputs (credit cards, PAN, Aadhaar, SSN)' },
                { key: 'maskOtpFields', label: 'Mask OTP & verification code fields' },
                { key: 'noClipboard', label: 'Never record clipboard contents' },
                { key: 'noAuthHeaders', label: 'Never record authentication headers' },
                { key: 'noCookies', label: 'Never record browser cookies' },
                { key: 'noLocalStorage', label: 'Never record localStorage items' },
                { key: 'noSessionStorage', label: 'Never record sessionStorage items' },
              ].map(({ key, label }) => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px', color: '#1e293b' }}>
                  <input
                    type="checkbox"
                    checked={!!settings.privacy[key as keyof ExtensionSettings['privacy']]}
                    onChange={() => handleTogglePrivacy(key as keyof ExtensionSettings['privacy'])}
                    style={{ accentColor: '#0284c7', width: '16px', height: '16px' }}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          )}

          {activeTab === 'timing' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <h3 style={{ fontSize: '13px', color: '#0284c7', margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                Wait & Retry Settings
              </h3>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#475569', marginBottom: '6px', fontWeight: 500 }}>
                  Default Step Wait Timeout (ms)
                </label>
                <input
                  type="number"
                  value={settings.timing.defaultWaitMs}
                  onChange={(e) => handleNumberChange('timing', 'defaultWaitMs', parseInt(e.target.value, 10) || 500)}
                  style={{ width: '100%', padding: '8px 12px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#0f172a', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#475569', marginBottom: '6px', fontWeight: 500 }}>
                  Element Detection Timeout (ms)
                </label>
                <input
                  type="number"
                  value={settings.timing.elementTimeoutMs}
                  onChange={(e) => handleNumberChange('timing', 'elementTimeoutMs', parseInt(e.target.value, 10) || 15000)}
                  style={{ width: '100%', padding: '8px 12px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#0f172a', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#475569', marginBottom: '6px', fontWeight: 500 }}>
                  Action Retry Count
                </label>
                <input
                  type="number"
                  value={settings.timing.retryCount}
                  onChange={(e) => handleNumberChange('timing', 'retryCount', parseInt(e.target.value, 10) || 3)}
                  style={{ width: '100%', padding: '8px 12px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#0f172a', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#475569', marginBottom: '6px', fontWeight: 500 }}>
                  Hover Trigger Delay (ms)
                </label>
                <input
                  type="number"
                  value={settings.timing.hoverDelayMs}
                  onChange={(e) => handleNumberChange('timing', 'hoverDelayMs', parseInt(e.target.value, 10) || 500)}
                  style={{ width: '100%', padding: '8px 12px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#0f172a', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          )}

          {activeTab === 'debug' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '13px', color: '#0284c7', margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                Recorder Debug Telemetry
              </h3>
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '16px',
                fontFamily: 'monospace',
                fontSize: '13px',
                lineHeight: '1.8',
                color: '#0f172a',
              }}>
                <div><strong>Events received:</strong> {debugStats.eventsReceived}</div>
                <div><strong>Logical actions:</strong> {debugStats.logicalActions}</div>
                <div><strong>Ignored events:</strong> {debugStats.ignoredEvents}</div>
                <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #e2e8f0' }}>
                  <strong>Last event:</strong> {debugStats.lastEvent ? debugStats.lastEvent.type : 'None'}<br />
                  <strong>Selector:</strong> {debugStats.lastEvent?.selector || 'None'}<br />
                  <strong>Confidence:</strong> {debugStats.lastEvent?.confidence ? `${Math.round(debugStats.lastEvent.confidence * 100)}%` : 'N/A'}
                </div>
              </div>
              <div>
                <button
                  onClick={handleExportDebugLogs}
                  style={{
                    padding: '8px 16px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    color: '#0284c7',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  <IconDownload size={13} /> Export Sanitized Debug Logs
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#f8fafc',
        }}>
          <div>
            <button
              onClick={handleReset}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#dc2626',
                fontSize: '13px',
                cursor: 'pointer',
                padding: 0,
                fontWeight: 500,
              }}
            >
              Reset to Defaults
            </button>
            {statusMessage && (
              <span style={{ marginLeft: '12px', fontSize: '13px', color: '#15803d', fontWeight: 500 }}>
                {statusMessage}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                color: '#475569',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              Close
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              style={{
                padding: '8px 18px',
                background: '#0284c7',
                border: 'none',
                borderRadius: '6px',
                color: '#ffffff',
                fontWeight: 600,
                cursor: isSaving ? 'not-allowed' : 'pointer',
              }}
            >
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
