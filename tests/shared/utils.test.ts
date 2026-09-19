/**
 * Unit tests for src/shared/utils.ts
 *
 * These tests cover all exported utility functions to ensure correctness
 * before building higher-level features on top of them.
 */

import { describe, it, expect } from 'vitest';
import {
  generateWorkflowId,
  generateStepId,
  now,
  createEmptyWorkflow,
  workflowToSummary,
  isSensitiveField,
  isDynamicSelector,
  truncate,
  slugify,
  generateStepDescription,
  formatElapsedTime,
  formatFileSize,
  formatRelativeTime,
} from '@shared/utils';
import type {
  ClickStep,
  InputStep,
  NavigateStep,
  SelectStep,
  CheckboxStep,
  ScrollStep,
  KeyPressStep,
  ScreenshotStep,
  ElementTarget,
} from '@shared/types';
import { SCHEMA_VERSION } from '@shared/constants';

// ─── Helper ─────────────────────────────────────────────────────────

function makeTarget(overrides: Partial<ElementTarget> = {}): ElementTarget {
  return {
    tagName: 'INPUT',
    classes: [],
    selectors: [],
    ...overrides,
  };
}

// ─── ID Generation ──────────────────────────────────────────────────

describe('generateWorkflowId', () => {
  it('should return a string starting with wf_', () => {
    const id = generateWorkflowId();
    expect(id).toMatch(/^wf_/);
  });

  it('should generate unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateWorkflowId()));
    expect(ids.size).toBe(100);
  });
});

describe('generateStepId', () => {
  it('should return a string starting with step_', () => {
    const id = generateStepId();
    expect(id).toMatch(/^step_/);
  });

  it('should generate unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateStepId()));
    expect(ids.size).toBe(100);
  });
});

// ─── Timestamp ──────────────────────────────────────────────────────

describe('now', () => {
  it('should return a valid ISO 8601 string', () => {
    const ts = now();
    expect(new Date(ts).toISOString()).toBe(ts);
  });
});

// ─── Workflow Factory ───────────────────────────────────────────────

describe('createEmptyWorkflow', () => {
  it('should create a workflow with default name', () => {
    const wf = createEmptyWorkflow();
    expect(wf.name).toBe('Untitled Workflow');
    expect(wf.schemaVersion).toBe(SCHEMA_VERSION);
    expect(wf.id).toMatch(/^wf_/);
    expect(wf.steps).toEqual([]);
    expect(wf.variables).toEqual([]);
    expect(wf.description).toBe('');
  });

  it('should accept a custom name', () => {
    const wf = createEmptyWorkflow('My Workflow');
    expect(wf.name).toBe('My Workflow');
  });

  it('should have matching createdAt and updatedAt', () => {
    const wf = createEmptyWorkflow();
    expect(wf.createdAt).toBe(wf.updatedAt);
  });
});

describe('workflowToSummary', () => {
  it('should extract summary fields', () => {
    const wf = createEmptyWorkflow('Test');
    const summary = workflowToSummary(wf);
    expect(summary.id).toBe(wf.id);
    expect(summary.name).toBe('Test');
    expect(summary.stepCount).toBe(0);
    expect(summary.favorite).toBe(false);
  });
});

// ─── Sensitive Field Detection ──────────────────────────────────────

describe('isSensitiveField', () => {
  it('should detect password type', () => {
    expect(isSensitiveField(undefined, undefined, 'password', undefined)).toBe(true);
  });

  it('should detect password in name', () => {
    expect(isSensitiveField('user_password', undefined, 'text', undefined)).toBe(true);
  });

  it('should detect OTP field', () => {
    expect(isSensitiveField('otp_code', undefined, 'text', undefined)).toBe(true);
  });

  it('should detect credit card by autocomplete', () => {
    expect(isSensitiveField(undefined, undefined, 'text', 'credit-card-number')).toBe(true);
  });

  it('should detect CVV', () => {
    expect(isSensitiveField('cvv', undefined, 'text', undefined)).toBe(true);
  });

  it('should detect Aadhaar', () => {
    expect(isSensitiveField('aadhaar_number', undefined, 'text', undefined)).toBe(true);
  });

  it('should NOT flag regular fields', () => {
    expect(isSensitiveField('username', 'user-input', 'text', undefined)).toBe(false);
  });

  it('should NOT flag email fields', () => {
    expect(isSensitiveField('email', 'email-input', 'email', undefined)).toBe(false);
  });
});

// ─── Dynamic Selector Detection ────────────────────────────────────

describe('isDynamicSelector', () => {
  it('should detect UUID prefixes', () => {
    expect(isDynamicSelector('a1b2c3d4-e5f6-7890-abcd-ef1234567890')).toBe(true);
  });

  it('should detect CSS-in-JS class names', () => {
    expect(isDynamicSelector('css-abc123')).toBe(true);
  });

  it('should detect JSS classes', () => {
    expect(isDynamicSelector('jss-42')).toBe(true);
  });

  it('should detect Angular prefixes', () => {
    expect(isDynamicSelector('ng-content')).toBe(true);
  });

  it('should NOT flag normal IDs', () => {
    expect(isDynamicSelector('login-form')).toBe(false);
  });

  it('should NOT flag normal class names', () => {
    expect(isDynamicSelector('btn-primary')).toBe(false);
  });
});

// ─── Text Utilities ─────────────────────────────────────────────────

describe('truncate', () => {
  it('should not truncate short text', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('should truncate long text with ellipsis', () => {
    expect(truncate('hello world', 8)).toBe('hello w…');
  });

  it('should use default max length', () => {
    const longText = 'a'.repeat(50);
    const result = truncate(longText);
    expect(result).toHaveLength(40);
    expect(result.endsWith('…')).toBe(true);
  });
});

describe('slugify', () => {
  it('should convert to lowercase', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('should replace special characters with hyphens', () => {
    expect(slugify('My Workflow (v2)!')).toBe('my-workflow-v2');
  });

  it('should trim leading/trailing hyphens', () => {
    expect(slugify('---test---')).toBe('test');
  });

  it('should cap at 80 characters', () => {
    const long = 'a'.repeat(100);
    expect(slugify(long).length).toBeLessThanOrEqual(80);
  });
});

// ─── Step Description Generator ─────────────────────────────────────

describe('generateStepDescription', () => {
  it('should describe navigate steps', () => {
    const step: NavigateStep = {
      id: 'step_1',
      type: 'navigate',
      description: '',
      url: 'https://example.com',
    };
    expect(generateStepDescription(step)).toBe('Navigate to https://example.com');
  });

  it('should describe click steps', () => {
    const step: ClickStep = {
      id: 'step_2',
      type: 'click',
      description: '',
      target: makeTarget({ ariaLabel: 'Login' }),
      clickType: 'left',
    };
    expect(generateStepDescription(step)).toBe('Click "Login"');
  });

  it('should describe double-click steps', () => {
    const step: ClickStep = {
      id: 'step_3',
      type: 'click',
      description: '',
      target: makeTarget({ text: 'Cell' }),
      clickType: 'double',
    };
    expect(generateStepDescription(step)).toBe('Double-click "Cell"');
  });

  it('should describe input steps', () => {
    const step: InputStep = {
      id: 'step_4',
      type: 'input',
      description: '',
      target: makeTarget({ name: 'email' }),
      value: 'user@example.com',
      sensitive: false,
    };
    expect(generateStepDescription(step)).toBe(
      'Enter "user@example.com" in "email"'
    );
  });

  it('should mask sensitive input steps', () => {
    const step: InputStep = {
      id: 'step_5',
      type: 'input',
      description: '',
      target: makeTarget({ name: 'password' }),
      value: 'secret123',
      sensitive: true,
    };
    expect(generateStepDescription(step)).toBe(
      'Enter sensitive value in "password"'
    );
  });

  it('should describe select steps', () => {
    const step: SelectStep = {
      id: 'step_6',
      type: 'select',
      description: '',
      target: makeTarget({ name: 'country' }),
      value: 'US',
      label: 'United States',
    };
    expect(generateStepDescription(step)).toBe(
      'Select "United States" in "country"'
    );
  });

  it('should describe checkbox checked', () => {
    const step: CheckboxStep = {
      id: 'step_7',
      type: 'checkbox',
      description: '',
      target: makeTarget({ ariaLabel: 'Agree to terms' }),
      checked: true,
    };
    expect(generateStepDescription(step)).toBe('Check "Agree to terms"');
  });

  it('should describe checkbox unchecked', () => {
    const step: CheckboxStep = {
      id: 'step_8',
      type: 'checkbox',
      description: '',
      target: makeTarget({ ariaLabel: 'Subscribe' }),
      checked: false,
    };
    expect(generateStepDescription(step)).toBe('Uncheck "Subscribe"');
  });

  it('should describe scroll steps', () => {
    const step: ScrollStep = {
      id: 'step_9',
      type: 'scroll',
      description: '',
      position: { x: 0, y: 500 },
    };
    expect(generateStepDescription(step)).toBe(
      'Scroll to position (0, 500)'
    );
  });

  it('should describe key press with modifiers', () => {
    const step: KeyPressStep = {
      id: 'step_10',
      type: 'keyPress',
      description: '',
      key: 's',
      modifiers: { ctrl: true },
    };
    expect(generateStepDescription(step)).toBe('Press Ctrl+s');
  });

  it('should describe screenshot steps', () => {
    const step: ScreenshotStep = {
      id: 'step_11',
      type: 'screenshot',
      description: '',
      fullPage: true,
    };
    expect(generateStepDescription(step)).toBe('Take full page screenshot');
  });
});

// ─── Elapsed Time Formatting ────────────────────────────────────────

describe('formatElapsedTime', () => {
  it('should format zero', () => {
    expect(formatElapsedTime(0)).toBe('00:00:00');
  });

  it('should format seconds', () => {
    expect(formatElapsedTime(5000)).toBe('00:00:05');
  });

  it('should format minutes and seconds', () => {
    expect(formatElapsedTime(125_000)).toBe('00:02:05');
  });

  it('should format hours', () => {
    expect(formatElapsedTime(3_661_000)).toBe('01:01:01');
  });
});

// ─── File Size Formatting ───────────────────────────────────────────

describe('formatFileSize', () => {
  it('should format zero bytes', () => {
    expect(formatFileSize(0)).toBe('0 B');
  });

  it('should format bytes', () => {
    expect(formatFileSize(500)).toBe('500 B');
  });

  it('should format kilobytes', () => {
    expect(formatFileSize(1024)).toBe('1.0 KB');
  });

  it('should format megabytes', () => {
    expect(formatFileSize(1_048_576)).toBe('1.0 MB');
  });
});

// ─── Relative Time Formatting ───────────────────────────────────────

describe('formatRelativeTime', () => {
  it('should show "just now" for very recent times', () => {
    const recent = new Date(Date.now() - 5_000).toISOString();
    expect(formatRelativeTime(recent)).toBe('just now');
  });

  it('should show minutes ago', () => {
    const minutesAgo = new Date(Date.now() - 5 * 60_000).toISOString();
    expect(formatRelativeTime(minutesAgo)).toBe('5m ago');
  });

  it('should show hours ago', () => {
    const hoursAgo = new Date(Date.now() - 3 * 3_600_000).toISOString();
    expect(formatRelativeTime(hoursAgo)).toBe('3h ago');
  });

  it('should show days ago', () => {
    const daysAgo = new Date(Date.now() - 2 * 86_400_000).toISOString();
    expect(formatRelativeTime(daysAgo)).toBe('2d ago');
  });
});
