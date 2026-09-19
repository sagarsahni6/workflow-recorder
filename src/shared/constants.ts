/**
 * Application-wide constants and default values.
 */

import type {
  ExtensionSettings,
  RecordingState,
  WorkflowSettings,
} from './types';

// ─── Extension Identity ───────────────────────────────────────────────

export const EXTENSION_NAME = 'Workflow Recorder';
export const EXTENSION_VERSION = '1.0.0';
export const SCHEMA_VERSION = '1.0';

// ─── Default Recording State ──────────────────────────────────────────

export const DEFAULT_RECORDING_STATE: RecordingState = {
  status: 'idle',
  workflowId: null,
  actionCount: 0,
  startTime: null,
  elapsedMs: 0,
};

// ─── Default Workflow Settings ────────────────────────────────────────

export const DEFAULT_WORKFLOW_SETTINGS: WorkflowSettings = {
  defaultTimeout: 15_000,
  defaultRetryCount: 3,
  screenshotsEnabled: false,
};

// ─── Default Extension Settings ───────────────────────────────────────

export const DEFAULT_EXTENSION_SETTINGS: ExtensionSettings = {
  recording: {
    recordClicks: true,
    recordTyping: true,
    recordSelects: true,
    recordKeyboardShortcuts: true,
    recordUploads: true,
    recordDownloads: true,
    recordScreenshots: false,
    recordScrolls: true,
    recordHover: false,
    scrollMode: 'major',
    detectVariables: true,
  },
  privacy: {
    maskPasswords: true,
    maskSensitiveInputs: true,
    maskOtpFields: true,
    noClipboard: true,
    noAuthHeaders: true,
    noCookies: true,
    noLocalStorage: true,
    noSessionStorage: true,
  },
  timing: {
    defaultWaitMs: 500,
    elementTimeoutMs: 15_000,
    retryCount: 3,
    hoverDelayMs: 500,
  },
};

// ─── Sensitive Field Patterns ─────────────────────────────────────────

/** Patterns used to detect sensitive form fields by name, id, or autocomplete. */
export const SENSITIVE_FIELD_PATTERNS: readonly RegExp[] = [
  /password/i,
  /passwd/i,
  /otp/i,
  /one.?time/i,
  /aadhaar/i,
  /aadhar/i,
  /pan.?(?:card|number)?/i,
  /credit.?card/i,
  /debit.?card/i,
  /card.?number/i,
  /cvv/i,
  /cvc/i,
  /bank.?account/i,
  /account.?number/i,
  /routing.?number/i,
  /upi/i,
  /auth.?token/i,
  /access.?token/i,
  /refresh.?token/i,
  /secret/i,
  /ssn/i,
  /social.?security/i,
  /pin/i,
];

// ─── Selector Scoring Weights ─────────────────────────────────────────

export const SELECTOR_WEIGHTS = {
  id: 0.99,
  name: 0.90,
  aria: 0.95,
  role: 0.88,
  testId: 0.97,
  dataAttr: 0.85,
  css: 0.70,
  xpath: 0.75,
  text: 0.60,
} as const;

// ─── Dynamic Selector Patterns (to avoid) ─────────────────────────────

/** Patterns that indicate a selector value is dynamically generated. */
export const DYNAMIC_SELECTOR_PATTERNS: readonly RegExp[] = [
  /^css-[a-z0-9]{4,}$/i,
  /^jss-?\d+$/i,
  /^[a-f0-9]{8}-[a-f0-9]{4}-/i,  // UUID prefix
  /^\d{10,}$/,                     // timestamps
  /^[a-z0-9]{20,}$/i,             // random hashes
  /^__/,                           // framework internals
  /^ng-/,                          // Angular
  /^ember\d+/,                     // Ember
];

// ─── IndexedDB ────────────────────────────────────────────────────────

export const DB_NAME = 'WorkflowRecorderDB';
export const DB_VERSION = 1;

export const STORES = {
  WORKFLOWS: 'workflows',
  SCREENSHOTS: 'screenshots',
  SETTINGS: 'settings',
} as const;

// ─── Pages ────────────────────────────────────────────────────────────

export const EDITOR_PAGE = 'editor.html';
export const POPUP_PAGE = 'popup.html';
