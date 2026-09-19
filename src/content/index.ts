/**
 * Content Script — injected into web pages.
 *
 * Responsibilities:
 * - Listens for recording commands from the service worker.
 * - Captures user interactions via EventCapture.
 * - Injects and updates the FloatingController (Shadow DOM).
 * - Forwards recorded steps to the Service Worker.
 */

import type { ContentScriptMessage, RecordingStateResponse } from '@shared/messages';
import type { WorkflowStep } from '@shared/types';
import { EventCapture } from '@core/event-capture';
import { FloatingController } from './floating-controller';

// ─── State ────────────────────────────────────────────────────────────

let isCapturing = false;
let isPaused = false;
let actionCount = 0;
let startTime = 0;

let eventCapture: EventCapture | null = null;
let floatingController: FloatingController | null = null;

// ─── Initialization ───────────────────────────────────────────────────

function initialize(): void {
  // Initialize Floating Controller with communication callbacks
  floatingController = new FloatingController({
    onPause: () => {
      chrome.runtime.sendMessage({ type: 'PAUSE_RECORDING' }).catch(() => {});
    },
    onResume: () => {
      chrome.runtime.sendMessage({ type: 'RESUME_RECORDING' }).catch(() => {});
    },
    onStop: () => {
      chrome.runtime.sendMessage({ type: 'STOP_RECORDING' }).catch(() => {});
    },
    onOpenEditor: () => {
      chrome.runtime.sendMessage({ type: 'OPEN_EDITOR' }).catch(() => {});
    },
  });

  // Initialize Event Capture with step dispatch callback
  eventCapture = new EventCapture({
    onStep: handleStepCaptured,
  });

  // Notify service worker that content script is ready
  chrome.runtime
    .sendMessage({ type: 'CONTENT_SCRIPT_READY' })
    .then((response: RecordingStateResponse) => {
      if (response && response.type === 'RECORDING_STATE') {
        if (response.state.status === 'recording') {
          startCapturing(response.state.actionCount, response.state.startTime || Date.now());
        } else if (response.state.status === 'paused') {
          startCapturing(response.state.actionCount, response.state.startTime || Date.now());
          pauseCapturing();
        }
      }
    })
    .catch(() => {
      // Background service worker might not be awake yet
    });
}

// ─── Step Handling ────────────────────────────────────────────────────

function handleStepCaptured(step: WorkflowStep): void {
  actionCount++;

  // Update floating controller
  floatingController?.updateState({
    actionCount,
  });

  // Forward recorded step to background service worker
  chrome.runtime
    .sendMessage({
      type: 'EVENT_RECORDED',
      step,
    })
    .catch((err) => {
      console.warn('[Workflow Recorder] Failed to send step to service worker:', err);
    });
}

// ─── Recording Controls ───────────────────────────────────────────────

function startCapturing(initialCount = 0, initialStartTime = Date.now(), initialPaused = false): void {
  if (isCapturing) return;

  isCapturing = true;
  isPaused = initialPaused;
  actionCount = initialCount;
  startTime = initialStartTime;

  if (!isPaused) {
    eventCapture?.start();
  }
  floatingController?.mount({
    isPaused,
    actionCount,
    startTime,
  });
}

function stopCapturing(): void {
  if (!isCapturing) return;

  isCapturing = false;
  isPaused = false;

  eventCapture?.stop();
  floatingController?.unmount();
}

function pauseCapturing(): void {
  if (!isCapturing || isPaused) return;

  isPaused = true;
  eventCapture?.pause();
  floatingController?.updateState({
    isPaused: true,
  });
}

function resumeCapturing(): void {
  if (!isCapturing || !isPaused) return;

  isPaused = false;
  eventCapture?.resume();
  floatingController?.updateState({
    isPaused: false,
  });
}

// ─── Keyboard Shortcuts ───────────────────────────────────────────────

window.addEventListener(
  'keydown',
  (e: KeyboardEvent) => {
    if (!isCapturing) return;

    // Alt+P: Toggle Pause / Resume
    if (e.altKey && (e.key === 'p' || e.key === 'P')) {
      e.preventDefault();
      e.stopPropagation();
      if (isPaused) {
        chrome.runtime.sendMessage({ type: 'RESUME_RECORDING' }).catch(() => {});
      } else {
        chrome.runtime.sendMessage({ type: 'PAUSE_RECORDING' }).catch(() => {});
      }
      return;
    }

    // Alt+S: Stop Recording
    if (e.altKey && (e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      e.stopPropagation();
      chrome.runtime.sendMessage({ type: 'STOP_RECORDING' }).catch(() => {});
      return;
    }
  },
  true
);

// ─── Chrome Message Listener ──────────────────────────────────────────

chrome.runtime.onMessage.addListener(
  (
    message: ContentScriptMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: { success: boolean }) => void
  ) => {
    switch (message.type) {
      case 'START_CAPTURING': {
        const msg = message as import('@shared/messages').StartCapturingMessage;
        startCapturing(msg.actionCount ?? 0, msg.startTime ?? Date.now(), msg.isPaused ?? false);
        sendResponse({ success: true });
        break;
      }

      case 'STOP_CAPTURING':
        stopCapturing();
        sendResponse({ success: true });
        break;

      case 'PAUSE_CAPTURING':
        pauseCapturing();
        sendResponse({ success: true });
        break;

      case 'RESUME_CAPTURING':
        resumeCapturing();
        sendResponse({ success: true });
        break;

      default:
        sendResponse({ success: false });
    }

    return false;
  }
);

// Start initialization
initialize();
