/**
 * Typed messaging system for communication between extension components.
 *
 * All messages between popup, content script, service worker, and editor
 * must use these types to prevent runtime errors from untyped messaging.
 */

import type { RecordingState, WorkflowStep, WorkflowSummary } from './types';

// ─── Messages sent TO the Service Worker ──────────────────────────────

export interface StartRecordingMessage {
  type: 'START_RECORDING';
  workflowName?: string;
}

export interface StopRecordingMessage {
  type: 'STOP_RECORDING';
}

export interface PauseRecordingMessage {
  type: 'PAUSE_RECORDING';
}

export interface ResumeRecordingMessage {
  type: 'RESUME_RECORDING';
}

export interface GetRecordingStateMessage {
  type: 'GET_RECORDING_STATE';
}

export interface GetRecentWorkflowsMessage {
  type: 'GET_RECENT_WORKFLOWS';
  limit?: number;
}

export interface OpenEditorMessage {
  type: 'OPEN_EDITOR';
  workflowId?: string;
}

export interface OpenLibraryMessage {
  type: 'OPEN_LIBRARY';
}

export interface OpenSettingsMessage {
  type: 'OPEN_SETTINGS';
}

// ─── Messages sent FROM the Content Script ────────────────────────────

export interface EventRecordedMessage {
  type: 'EVENT_RECORDED';
  step: WorkflowStep;
  tabId?: number;
}

export interface ContentScriptReadyMessage {
  type: 'CONTENT_SCRIPT_READY';
  tabId?: number;
}

// ─── Messages sent TO the Content Script ──────────────────────────────

export interface StartCapturingMessage {
  type: 'START_CAPTURING';
  actionCount?: number;
  startTime?: number;
  isPaused?: boolean;
}

export interface StopCapturingMessage {
  type: 'STOP_CAPTURING';
}

export interface PauseCapturingMessage {
  type: 'PAUSE_CAPTURING';
}

export interface ResumeCapturingMessage {
  type: 'RESUME_CAPTURING';
}

// ─── Response Messages ────────────────────────────────────────────────

export interface RecordingStateResponse {
  type: 'RECORDING_STATE';
  state: RecordingState;
}

export interface RecentWorkflowsResponse {
  type: 'RECENT_WORKFLOWS';
  workflows: WorkflowSummary[];
}

export interface ErrorResponse {
  type: 'ERROR';
  message: string;
  code?: string;
}

// ─── Union Types ──────────────────────────────────────────────────────

/** Messages that can be sent to the service worker. */
export type ServiceWorkerMessage =
  | StartRecordingMessage
  | StopRecordingMessage
  | PauseRecordingMessage
  | ResumeRecordingMessage
  | GetRecordingStateMessage
  | GetRecentWorkflowsMessage
  | OpenEditorMessage
  | OpenLibraryMessage
  | OpenSettingsMessage
  | EventRecordedMessage
  | ContentScriptReadyMessage;

/** Messages that can be sent to a content script. */
export type ContentScriptMessage =
  | StartCapturingMessage
  | StopCapturingMessage
  | PauseCapturingMessage
  | ResumeCapturingMessage;

/** Messages that can be received as responses. */
export type ResponseMessage =
  | RecordingStateResponse
  | RecentWorkflowsResponse
  | ErrorResponse;

/** All possible extension messages. */
export type ExtensionMessage =
  | ServiceWorkerMessage
  | ContentScriptMessage
  | ResponseMessage;

// ─── Message Sending Helpers ──────────────────────────────────────────

/**
 * Send a message to the service worker (background script) and
 * receive a typed response.
 */
export function sendToBackground<T = ResponseMessage>(
  message: ServiceWorkerMessage
): Promise<T> {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(message, (response: T) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(response);
      });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Send a message to a specific tab's content script.
 */
export function sendToTab<T = ResponseMessage>(
  tabId: number,
  message: ContentScriptMessage
): Promise<T> {
  return new Promise((resolve, reject) => {
    try {
      chrome.tabs.sendMessage(tabId, message, (response: T) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(response);
      });
    } catch (err) {
      reject(err);
    }
  });
}
