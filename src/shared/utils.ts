/**
 * Shared utility functions used across the extension.
 *
 * These must not depend on browser APIs or Chrome APIs so they remain
 * independently testable.
 */

import type { WorkflowStep, Workflow, WorkflowSummary } from './types';
import { SCHEMA_VERSION } from './constants';
import { SENSITIVE_FIELD_PATTERNS, DYNAMIC_SELECTOR_PATTERNS } from './constants';
import { DEFAULT_WORKFLOW_SETTINGS } from './constants';

// ─── ID Generation ────────────────────────────────────────────────────

/** Generate a unique workflow ID (prefixed `wf_`). */
export function generateWorkflowId(): string {
  return `wf_${generateRandomId()}`;
}

/** Generate a unique step ID (prefixed `step_`). */
export function generateStepId(): string {
  return `step_${generateRandomId()}`;
}

/** Generate a random alphanumeric ID string. */
function generateRandomId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}_${random}`;
}

// ─── Timestamp ────────────────────────────────────────────────────────

/** Return an ISO 8601 timestamp string. */
export function now(): string {
  return new Date().toISOString();
}

// ─── Workflow Factory ─────────────────────────────────────────────────

/** Create a new empty workflow with default settings. */
export function createEmptyWorkflow(name: string = 'Untitled Workflow'): Workflow {
  const timestamp = now();
  return {
    schemaVersion: SCHEMA_VERSION,
    id: generateWorkflowId(),
    name,
    description: '',
    createdAt: timestamp,
    updatedAt: timestamp,
    variables: [],
    steps: [],
    settings: { ...DEFAULT_WORKFLOW_SETTINGS },
  };
}

/** Extract a summary from a full workflow (for the library view). */
export function workflowToSummary(workflow: Workflow): WorkflowSummary {
  return {
    id: workflow.id,
    name: workflow.name,
    description: workflow.description,
    stepCount: workflow.steps.length,
    variableCount: workflow.variables ? workflow.variables.length : 0,
    createdAt: workflow.createdAt,
    updatedAt: workflow.updatedAt,
    favorite: false,
  };
}

// ─── Sensitive Field Detection ────────────────────────────────────────

/** Returns true if the given field identifier matches a sensitive pattern. */
export function isSensitiveField(
  fieldName: string | undefined,
  fieldId: string | undefined,
  fieldType: string | undefined,
  autocomplete: string | undefined
): boolean {
  // Password type is always sensitive
  if (fieldType === 'password') return true;

  const candidates = [fieldName, fieldId, autocomplete].filter(Boolean) as string[];

  return candidates.some((value) =>
    SENSITIVE_FIELD_PATTERNS.some((pattern) => pattern.test(value))
  );
}

// ─── Dynamic Selector Detection ───────────────────────────────────────

/** Returns true if a selector value appears to be dynamically generated. */
export function isDynamicSelector(value: string): boolean {
  const clean = value.replace(/^[#.[\]]/, '').trim();
  return DYNAMIC_SELECTOR_PATTERNS.some(
    (pattern) => pattern.test(value) || pattern.test(clean)
  );
}

// ─── Text Utilities ───────────────────────────────────────────────────

/** Truncate text to a maximum length, adding ellipsis if truncated. */
export function truncate(text: string, maxLength: number = 40): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 1) + '…';
}

/** Slugify a string for use as a filename. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 80);
}

// ─── Step Description Generator ───────────────────────────────────────

/**
 * Generate a human-readable description for a workflow step.
 * Uses deterministic logic — no AI required.
 */
export function generateStepDescription(step: WorkflowStep): string {
  switch (step.type) {
    case 'navigate':
      return `Navigate to ${truncate(step.url, 60)}`;

    case 'click': {
      const label = getTargetLabel(step.target);
      const prefix =
        step.clickType === 'double'
          ? 'Double-click'
          : step.clickType === 'right'
            ? 'Right-click'
            : 'Click';
      return `${prefix} "${label}"`;
    }

    case 'input': {
      const label = getTargetLabel(step.target);
      if (step.sensitive) return `Enter sensitive value in "${label}"`;
      return `Enter "${truncate(step.value, 30)}" in "${label}"`;
    }

    case 'select': {
      const label = getTargetLabel(step.target);
      return `Select "${step.label}" in "${label}"`;
    }

    case 'checkbox': {
      const label = getTargetLabel(step.target);
      return step.checked ? `Check "${label}"` : `Uncheck "${label}"`;
    }

    case 'radio': {
      const label = getTargetLabel(step.target);
      return `Select radio "${step.value}" in "${label}"`;
    }

    case 'scroll':
      return `Scroll to position (${step.position.x}, ${step.position.y})`;

    case 'hover': {
      const label = getTargetLabel(step.target);
      return `Hover over "${label}"`;
    }

    case 'keyPress': {
      const mods = formatModifiers(step.modifiers);
      return `Press ${mods}${step.key}`;
    }

    case 'upload': {
      const label = getTargetLabel(step.target);
      return `Upload file to "${label}"`;
    }

    case 'download':
      return `Download "${step.filename}"`;

    case 'waitForElement':
    case 'waitForVisible':
    case 'waitForEnabled':
    case 'waitForText':
    case 'waitForURL':
    case 'waitForDownload':
    case 'waitForNavigation':
      return `Wait: ${step.type.replace('waitFor', '')}`;

    case 'newTab':
      return `Open new tab${step.url ? `: ${truncate(step.url, 50)}` : ''}`;

    case 'switchTab':
      return `Switch to tab ${step.tabId}`;

    case 'closeTab':
      return `Close tab ${step.tabId}`;

    case 'assert':
      return `Assert: ${step.assertion.operator} "${truncate(step.assertion.expected, 30)}"`;

    case 'condition':
      return `If: ${step.condition.operator} "${truncate(step.condition.value, 30)}"`;

    case 'loop':
      return `Loop over ${step.source}`;

    case 'screenshot':
      return step.fullPage ? 'Take full page screenshot' : 'Take screenshot';

    default:
      return 'Unknown action';
  }
}

/** Get the best human-readable label from an element target. */
function getTargetLabel(target: {
  text?: string;
  ariaLabel?: string;
  name?: string;
  id?: string;
  placeholder?: string;
  tagName: string;
}): string {
  return (
    target.ariaLabel ||
    target.text ||
    target.name ||
    target.placeholder ||
    target.id ||
    target.tagName.toLowerCase()
  );
}

/** Format keyboard modifiers into a prefix string. */
function formatModifiers(modifiers?: {
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
}): string {
  if (!modifiers) return '';
  const parts: string[] = [];
  if (modifiers.ctrl) parts.push('Ctrl+');
  if (modifiers.alt) parts.push('Alt+');
  if (modifiers.shift) parts.push('Shift+');
  if (modifiers.meta) parts.push('Meta+');
  return parts.join('');
}

// ─── Elapsed Time Formatting ──────────────────────────────────────────

/** Format elapsed milliseconds as HH:MM:SS. */
export function formatElapsedTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/** Alias for formatElapsedTime. */
export const formatDuration = formatElapsedTime;

// ─── File Size Formatting ─────────────────────────────────────────────

/** Format bytes into a human-readable size string. */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1);
  return `${size} ${units[i]}`;
}

// ─── Date Formatting ──────────────────────────────────────────────────

/** Format an ISO date string into a human-readable relative time. */
export function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  const diffMs = Date.now() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}
