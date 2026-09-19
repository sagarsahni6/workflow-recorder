/**
 * Tab Manager.
 *
 * Tracks browser tab lifecycles and maps non-deterministic Chrome integer tab IDs
 * into logical, exportable tab IDs ('tab_1', 'tab_2', ...).
 */

import type { NewTabStep, SwitchTabStep, CloseTabStep, WorkflowStep } from '@shared/types';
import { generateStepId, now } from '@shared/utils';

export class TabManager {
  private isTracking = false;
  private tabMap = new Map<number, string>(); // Chrome ID -> Logical ID
  private nextLogicalIndex = 1;
  private activeLogicalId: string | null = null;
  private onStepCallback: ((step: WorkflowStep) => void) | null = null;

  constructor(onStep: (step: WorkflowStep) => void) {
    this.onStepCallback = onStep;
  }

  /**
   * Initializes tab tracking for the starting active tab.
   */
  public start(initialTabId?: number): void {
    if (this.isTracking) return;
    this.tabMap.clear();
    this.nextLogicalIndex = 1;

    if (initialTabId !== undefined) {
      const logicalId = `tab_${this.nextLogicalIndex++}`;
      this.tabMap.set(initialTabId, logicalId);
      this.activeLogicalId = logicalId;
    }

    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.onCreated?.addListener(this.handleTabCreated);
      chrome.tabs.onActivated?.addListener(this.handleTabActivated);
      chrome.tabs.onRemoved?.addListener(this.handleTabRemoved);
      this.isTracking = true;
    }
  }

  /**
   * Stops tab tracking and cleans up Chrome listeners.
   */
  public stop(): void {
    if (!this.isTracking) return;

    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.onCreated?.removeListener(this.handleTabCreated);
      chrome.tabs.onActivated?.removeListener(this.handleTabActivated);
      chrome.tabs.onRemoved?.removeListener(this.handleTabRemoved);
    }

    this.tabMap.clear();
    this.isTracking = false;
    this.activeLogicalId = null;
  }

  /**
   * Returns the logical ID for a given numeric chrome tab ID.
   */
  public getLogicalId(chromeTabId: number): string {
    let logicalId = this.tabMap.get(chromeTabId);
    if (!logicalId) {
      logicalId = `tab_${this.nextLogicalIndex++}`;
      this.tabMap.set(chromeTabId, logicalId);
    }
    return logicalId;
  }

  public handleTabCreated = (tab: { id?: number; url?: string }): void => {
    if (!this.onStepCallback || tab.id === undefined) return;

    const logicalId = `tab_${this.nextLogicalIndex++}`;
    this.tabMap.set(tab.id, logicalId);

    const step: NewTabStep = {
      id: generateStepId(),
      type: 'newTab',
      tabId: logicalId,
      url: tab.url && !tab.url.startsWith('chrome://') ? tab.url : undefined,
      timestamp: now(),
      description: `Open new tab (${logicalId})`,
    };

    this.onStepCallback(step);
  };

  public handleTabActivated = (activeInfo: { tabId: number }): void => {
    if (!this.onStepCallback) return;

    const logicalId = this.getLogicalId(activeInfo.tabId);
    if (logicalId === this.activeLogicalId) return;

    this.activeLogicalId = logicalId;

    const step: SwitchTabStep = {
      id: generateStepId(),
      type: 'switchTab',
      tabId: logicalId,
      timestamp: now(),
      description: `Switch to tab ${logicalId}`,
    };

    this.onStepCallback(step);
  };

  public handleTabRemoved = (tabId: number): void => {
    const logicalId = this.tabMap.get(tabId);
    if (!logicalId || !this.onStepCallback) return;

    this.tabMap.delete(tabId);

    const step: CloseTabStep = {
      id: generateStepId(),
      type: 'closeTab',
      tabId: logicalId,
      timestamp: now(),
      description: `Close tab ${logicalId}`,
    };

    this.onStepCallback(step);
  };
}
