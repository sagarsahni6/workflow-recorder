/**
 * Service Worker (Background Script) — Manifest V3.
 *
 * Responsibilities:
 * - Routes messages between popup, content scripts, and editor pages.
 * - Coordinates global recording state across browser tabs.
 * - Stores recorded steps and persists active session in storage.
 * - Listens for tab navigations to record `navigate` steps.
 * - Dispatches start/stop/pause/resume commands to content scripts.
 */

import type {
  ServiceWorkerMessage,
  RecordingStateResponse,
  RecentWorkflowsResponse,
  ErrorResponse,
  EventRecordedMessage,
  ContentScriptMessage,
} from '@shared/messages';
import type { RecordingState, WorkflowStep, NavigateStep, Workflow } from '@shared/types';
import { DEFAULT_RECORDING_STATE, EDITOR_PAGE } from '@shared/constants';
import { generateWorkflowId, generateStepId, now, createEmptyWorkflow } from '@shared/utils';
import { WorkflowRepository } from '@storage/workflow-repository';
import { ScreenshotRepository } from '@storage/screenshot-repository';
import { DownloadDetector } from './download-detector';
import { TabManager } from './tab-manager';

// ─── State ────────────────────────────────────────────────────────────

let recordingState: RecordingState = { ...DEFAULT_RECORDING_STATE };
let recordedSteps: WorkflowStep[] = [];
let lastNavigatedUrl = '';

const downloadDetector = new DownloadDetector((step) => {
  if (recordingState.status === 'recording') {
    recordedSteps.push(step);
    recordingState = { ...recordingState, actionCount: recordedSteps.length };
    persistSession().catch(() => {});
  }
});

const tabManager = new TabManager((step) => {
  if (recordingState.status === 'recording') {
    recordedSteps.push(step);
    recordingState = { ...recordingState, actionCount: recordedSteps.length };
    persistSession().catch(() => {});
  }
});

// Restore session if service worker was terminated and restarted.
// This MUST complete before any message is handled — otherwise a STOP_RECORDING
// arriving right after service-worker wake-up would see empty state and skip saving.
const sessionReady: Promise<void> = restoreSession().catch(() => {});

// ─── Message Handler ──────────────────────────────────────────────────

chrome.runtime.onMessage.addListener(
  (
    message: ServiceWorkerMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: RecordingStateResponse | RecentWorkflowsResponse | ErrorResponse) => void
  ) => {
    // Wait for session restore to finish before handling any message
    sessionReady
      .then(() => handleMessage(message, sender))
      .then(sendResponse)
      .catch((err: unknown) => {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        sendResponse({ type: 'ERROR', message: errorMsg });
      });

    return true; // Asynchronous response
  }
);

async function handleMessage(
  message: ServiceWorkerMessage,
  sender: chrome.runtime.MessageSender
): Promise<RecordingStateResponse | RecentWorkflowsResponse | ErrorResponse> {
  switch (message.type) {
    case 'START_RECORDING':
      return handleStartRecording(message.workflowName);

    case 'STOP_RECORDING':
      return handleStopRecording();

    case 'PAUSE_RECORDING':
      return handlePauseRecording();

    case 'RESUME_RECORDING':
      return handleResumeRecording();

    case 'GET_RECORDING_STATE':
      return handleGetRecordingState();

    case 'GET_RECENT_WORKFLOWS':
      return handleGetRecentWorkflows();

    case 'OPEN_EDITOR':
      return handleOpenEditor(message.workflowId);

    case 'OPEN_LIBRARY':
      return handleOpenEditor();

    case 'OPEN_SETTINGS':
      return handleOpenEditor();

    case 'EVENT_RECORDED':
      return handleEventRecorded(message as EventRecordedMessage, sender);

    case 'CONTENT_SCRIPT_READY':
      return handleContentScriptReady(sender);

    default:
      return { type: 'ERROR', message: 'Unknown message type' };
  }
}

// ─── Handlers ─────────────────────────────────────────────────────────

async function handleStartRecording(
  _workflowName?: string
): Promise<RecordingStateResponse> {
  const workflowId = generateWorkflowId();
  recordingState = {
    status: 'recording',
    workflowId,
    actionCount: 0,
    startTime: Date.now(),
    elapsedMs: 0,
  };
  recordedSteps = [];
  lastNavigatedUrl = '';

  // Check active tab and record initial navigate step
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    tabManager.start(activeTab?.id);
    downloadDetector.start();

    if (activeTab && activeTab.url && activeTab.url.startsWith('http')) {
      const navStep: NavigateStep = {
        id: generateStepId(),
        type: 'navigate',
        url: activeTab.url,
        description: `Navigate to ${activeTab.url}`,
        timestamp: now(),
      };
      recordedSteps.push(navStep);
      recordingState.actionCount = recordedSteps.length;
      lastNavigatedUrl = activeTab.url;
    }
  } catch {
    // Ignore query error
  }

  await persistSession();

  // Notify all tabs to start capturing (or inject content script dynamically)
  await broadcastToTabs({
    type: 'START_CAPTURING',
    actionCount: recordingState.actionCount,
    startTime: recordingState.startTime || Date.now(),
    isPaused: false,
  });

  return { type: 'RECORDING_STATE', state: { ...recordingState } };
}

async function handleStopRecording(): Promise<RecordingStateResponse> {
  // Guard: nothing to stop if already idle
  if (recordingState.status === 'idle') {
    return { type: 'RECORDING_STATE', state: { ...recordingState } };
  }

  tabManager.stop();
  downloadDetector.stop();

  const elapsed =
    recordingState.startTime != null
      ? Date.now() - recordingState.startTime
      : recordingState.elapsedMs;

  // Capture workflow ID and steps BEFORE clearing state
  const finishedWorkflowId = recordingState.workflowId;
  const finishedSteps = [...recordedSteps];

  // Reset in-memory state immediately to prevent double-stop
  recordingState = {
    ...DEFAULT_RECORDING_STATE,
    elapsedMs: elapsed,
  };
  recordedSteps = [];
  lastNavigatedUrl = '';

  // Save the finished workflow draft to local storage
  if (finishedWorkflowId && finishedSteps.length > 0) {
    await saveCompletedWorkflow(finishedWorkflowId, finishedSteps);
  }

  await clearPersistedSession();

  // Notify all tabs to stop capturing and remove floating controller
  broadcastToTabs({ type: 'STOP_CAPTURING' }).catch(() => {});

  return { type: 'RECORDING_STATE', state: { ...recordingState } };
}

async function handlePauseRecording(): Promise<RecordingStateResponse> {
  if (recordingState.status !== 'recording') {
    return { type: 'RECORDING_STATE', state: { ...recordingState } };
  }

  const elapsed =
    recordingState.startTime != null
      ? Date.now() - recordingState.startTime
      : recordingState.elapsedMs;

  recordingState = {
    ...recordingState,
    status: 'paused',
    elapsedMs: elapsed,
    startTime: null,
  };

  await persistSession();
  await broadcastToTabs({ type: 'PAUSE_CAPTURING' });

  return { type: 'RECORDING_STATE', state: { ...recordingState } };
}

async function handleResumeRecording(): Promise<RecordingStateResponse> {
  if (recordingState.status !== 'paused') {
    return { type: 'RECORDING_STATE', state: { ...recordingState } };
  }

  recordingState = {
    ...recordingState,
    status: 'recording',
    startTime: Date.now(),
  };

  await persistSession();
  await broadcastToTabs({ type: 'RESUME_CAPTURING' });

  return { type: 'RECORDING_STATE', state: { ...recordingState } };
}

async function broadcastToTabs(message: ContentScriptMessage): Promise<void> {
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.id != null && tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
        try {
          await chrome.tabs.sendMessage(tab.id, message);
        } catch {
          // If content script was not loaded yet and we need to start capturing, inject it dynamically
          if (message.type === 'START_CAPTURING') {
            try {
              await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content/index.js'],
              });
              setTimeout(() => {
                if (tab.id != null) {
                  chrome.tabs.sendMessage(tab.id, message).catch(() => {});
                }
              }, 120);
            } catch {
              // Restricted pages (e.g. chrome web store or file://)
            }
          }
        }
      }
    }
  } catch {
    // Ignore query failure
  }
}

function handleGetRecordingState(): RecordingStateResponse {
  const state = { ...recordingState };
  if (state.status === 'recording' && state.startTime != null) {
    state.elapsedMs = Date.now() - state.startTime;
  }

  return { type: 'RECORDING_STATE', state };
}

async function handleGetRecentWorkflows(): Promise<RecentWorkflowsResponse> {
  try {
    const list = await WorkflowRepository.list({ limit: 5 });
    return { type: 'RECENT_WORKFLOWS', workflows: list };
  } catch {
    return { type: 'RECENT_WORKFLOWS', workflows: [] };
  }
}

async function handleOpenEditor(workflowId?: string): Promise<RecordingStateResponse> {
  const editorUrl = workflowId
    ? chrome.runtime.getURL(`${EDITOR_PAGE}?id=${workflowId}`)
    : chrome.runtime.getURL(EDITOR_PAGE);

  await chrome.tabs.create({ url: editorUrl });
  return { type: 'RECORDING_STATE', state: { ...recordingState } };
}

async function handleEventRecorded(
  message: EventRecordedMessage,
  sender: chrome.runtime.MessageSender
): Promise<RecordingStateResponse> {
  if (recordingState.status !== 'recording') {
    return { type: 'RECORDING_STATE', state: { ...recordingState } };
  }

  if (message.step) {
    recordedSteps.push(message.step);
    recordingState = {
      ...recordingState,
      actionCount: recordedSteps.length,
    };
    await persistSession();

    // Optionally capture visible tab screenshot
    const currentWfId = recordingState.workflowId;
    if (sender.tab?.windowId && currentWfId && typeof chrome !== 'undefined' && chrome.tabs?.captureVisibleTab) {
      try {
        const dataUrl = await chrome.tabs.captureVisibleTab(sender.tab.windowId, { format: 'png' });
        if (dataUrl) {
          ScreenshotRepository.save(message.step.id, currentWfId, dataUrl).catch(() => {});
        }
      } catch {
        // Protected tabs or minimization may prevent capture
      }
    }
  }

  return { type: 'RECORDING_STATE', state: { ...recordingState } };
}

function handleContentScriptReady(_sender: chrome.runtime.MessageSender): RecordingStateResponse {
  const state = { ...recordingState };
  if (state.status === 'recording' && state.startTime != null) {
    state.elapsedMs = Date.now() - state.startTime;
  }
  return { type: 'RECORDING_STATE', state };
}

// ─── Tab Navigation Listener ──────────────────────────────────────────

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (recordingState.status !== 'recording') return;

  // When page finishes loading and URL is http/https
  if (changeInfo.status === 'complete' && tab.url && tab.url.startsWith('http')) {
    if (tab.url !== lastNavigatedUrl) {
      lastNavigatedUrl = tab.url;

      const navStep: NavigateStep = {
        id: generateStepId(),
        type: 'navigate',
        url: tab.url,
        description: `Navigate to ${tab.url}`,
        timestamp: now(),
      };

      recordedSteps.push(navStep);
      recordingState = {
        ...recordingState,
        actionCount: recordedSteps.length,
      };
      persistSession().catch(() => {});
    }

    // Ensure content script starts capturing on the newly loaded page
    chrome.tabs.sendMessage(tabId, {
      type: 'START_CAPTURING',
      actionCount: recordingState.actionCount,
      startTime: recordingState.startTime || Date.now(),
      isPaused: recordingState.status === 'paused',
    }).catch(() => {
      // Content script might still be injecting
    });
  }
});

// ─── Storage Persistence ──────────────────────────────────────────────

async function persistSession(): Promise<void> {
  const sessionData = {
    recordingState,
    recordedSteps,
    lastNavigatedUrl,
  };
  try {
    if (chrome.storage?.session) {
      await chrome.storage.session.set({ activeSession: sessionData });
    } else {
      await chrome.storage.local.set({ activeSession: sessionData });
    }
  } catch {
    // Ignore storage failure
  }
}

async function restoreSession(): Promise<void> {
  try {
    const storageArea = chrome.storage?.session || chrome.storage.local;
    const res = await storageArea.get('activeSession');
    if (res && res.activeSession) {
      recordingState = res.activeSession.recordingState;
      recordedSteps = res.activeSession.recordedSteps || [];
      lastNavigatedUrl = res.activeSession.lastNavigatedUrl || '';
    }
  } catch {
    // Ignore
  }
}

async function clearPersistedSession(): Promise<void> {
  try {
    if (chrome.storage?.session) {
      await chrome.storage.session.remove('activeSession');
    }
    await chrome.storage.local.remove('activeSession');
  } catch {
    // Ignore
  }
}

async function saveCompletedWorkflow(workflowId: string, steps: WorkflowStep[]): Promise<void> {
  try {
    const workflow: Workflow = {
      ...createEmptyWorkflow('Recorded Workflow'),
      id: workflowId,
      steps,
      updatedAt: now(),
    };

    await WorkflowRepository.save(workflow);
  } catch (err) {
    console.warn('[Workflow Recorder] Failed to save workflow draft:', err);
  }
}

// ─── Install / Update ─────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.warn(`[Workflow Recorder] Installed at ${now()}`);
  } else if (details.reason === 'update') {
    console.warn(`[Workflow Recorder] Updated to v${chrome.runtime.getManifest().version}`);
  }
});
