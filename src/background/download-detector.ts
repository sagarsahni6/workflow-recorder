/**
 * Download Detector.
 *
 * Listens for browser download events during active recording and records
 * privacy-safe DownloadSteps without exposing host file paths.
 */

import type { DownloadStep } from '@shared/types';
import { generateStepId, now } from '@shared/utils';

export class DownloadDetector {
  private isListening = false;
  private onStepCallback: ((step: DownloadStep) => void) | null = null;

  constructor(onStep: (step: DownloadStep) => void) {
    this.onStepCallback = onStep;
  }

  /**
   * Starts listening to chrome download events.
   */
  public start(): void {
    if (this.isListening) return;

    if (typeof chrome !== 'undefined' && chrome.downloads && chrome.downloads.onCreated) {
      chrome.downloads.onCreated.addListener(this.handleDownloadCreated);
      this.isListening = true;
    }
  }

  /**
   * Stops listening to chrome download events.
   */
  public stop(): void {
    if (!this.isListening) return;

    if (typeof chrome !== 'undefined' && chrome.downloads && chrome.downloads.onCreated) {
      chrome.downloads.onCreated.removeListener(this.handleDownloadCreated);
    }
    this.isListening = false;
  }

  /**
   * Normalizes a chrome.downloads.DownloadItem into a privacy-safe DownloadStep.
   */
  public handleDownloadCreated = (item: { filename?: string; url?: string }): void => {
    if (!this.onStepCallback) return;

    // Extract only the leaf filename, never expose host directories
    const rawName = item.filename ? item.filename.split(/[\\/]/).pop() : 'download';
    const cleanFilename = rawName || 'downloaded_file';

    const step: DownloadStep = {
      id: generateStepId(),
      type: 'download',
      filename: `{{downloaded_${cleanFilename.replace(/[^a-zA-Z0-9_]/g, '_')}}}`,
      url: item.url ? item.url.split('?')[0] : undefined, // Strip sensitive query parameters
      timestamp: now(),
      description: `Wait for download "${cleanFilename}"`,
    };

    this.onStepCallback(step);
  };
}
