/**
 * Core type definitions for the Workflow Recorder extension.
 *
 * Uses discriminated unions for WorkflowStep to ensure type safety
 * across the entire recording, editing, and export pipeline.
 */

// ─── Schema ───────────────────────────────────────────────────────────

export const SCHEMA_VERSION = '1.0';

// ─── Workflow ─────────────────────────────────────────────────────────

export interface Workflow {
  schemaVersion: string;
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  browser?: BrowserMetadata;
  variables: WorkflowVariable[];
  steps: WorkflowStep[];
  settings: WorkflowSettings;
}

export interface BrowserMetadata {
  name: string;
  version: string;
  userAgent: string;
  platform: string;
}

export interface WorkflowSettings {
  defaultTimeout: number;
  defaultRetryCount: number;
  screenshotsEnabled: boolean;
}

// ─── Variables ────────────────────────────────────────────────────────

export type VariableType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'email'
  | 'phone'
  | 'file'
  | 'url'
  | 'json';

export interface WorkflowVariable {
  name: string;
  type: VariableType;
  required: boolean;
  defaultValue?: string;
  description?: string;
}

// ─── Selectors ────────────────────────────────────────────────────────

export type SelectorType =
  | 'id'
  | 'name'
  | 'aria'
  | 'role'
  | 'testId'
  | 'dataAttr'
  | 'css'
  | 'xpath'
  | 'text';

export interface SelectorCandidate {
  type: SelectorType;
  value: string;
  score: number;
}

// ─── Element Target ───────────────────────────────────────────────────

export interface ElementTarget {
  tagName: string;
  id?: string;
  name?: string;
  type?: string;
  text?: string;
  ariaLabel?: string;
  role?: string;
  title?: string;
  placeholder?: string;
  classes: string[];
  selectors: SelectorCandidate[];
  frame?: FrameContext;
}

export interface FrameContext {
  type: 'main' | 'iframe';
  selectors: SelectorCandidate[];
  depth: number;
}

// ─── Position ─────────────────────────────────────────────────────────

export interface Position {
  x: number;
  y: number;
}

// ─── Base Step ────────────────────────────────────────────────────────

export interface BaseStep {
  id: string;
  description: string;
  timestamp?: string;
  screenshot?: string;
  disabled?: boolean;
  comment?: string;
  timeout?: number;
  retryCount?: number;
}

// ─── Step Types (Discriminated Union) ─────────────────────────────────

export interface NavigateStep extends BaseStep {
  type: 'navigate';
  url: string;
}

export interface ClickStep extends BaseStep {
  type: 'click';
  target: ElementTarget;
  clickType: 'left' | 'double' | 'right';
  position?: Position;
}

export interface InputStep extends BaseStep {
  type: 'input';
  target: ElementTarget;
  value: string;
  sensitive: boolean;
}

export interface SelectStep extends BaseStep {
  type: 'select';
  target: ElementTarget;
  value: string;
  label: string;
}

export interface CheckboxStep extends BaseStep {
  type: 'checkbox';
  target: ElementTarget;
  checked: boolean;
}

export interface RadioStep extends BaseStep {
  type: 'radio';
  target: ElementTarget;
  value: string;
}

export interface ScrollStep extends BaseStep {
  type: 'scroll';
  position: Position;
  target?: ElementTarget;
}

export interface HoverStep extends BaseStep {
  type: 'hover';
  target: ElementTarget;
}

export interface KeyPressStep extends BaseStep {
  type: 'keyPress';
  key: string;
  modifiers?: KeyModifiers;
  target?: ElementTarget;
}

export interface KeyModifiers {
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
}

export interface UploadStep extends BaseStep {
  type: 'upload';
  target: ElementTarget;
  file: string;
}

export interface DownloadStep extends BaseStep {
  type: 'download';
  filename: string;
  url?: string;
}

export interface WaitStep extends BaseStep {
  type:
    | 'wait'
    | 'waitForElement'
    | 'waitForVisible'
    | 'waitForEnabled'
    | 'waitForText'
    | 'waitForURL'
    | 'waitForDownload'
    | 'waitForNavigation';
  target?: ElementTarget;
  value?: string;
}

export interface NewTabStep extends BaseStep {
  type: 'newTab';
  tabId: string;
  url?: string;
}

export interface SwitchTabStep extends BaseStep {
  type: 'switchTab';
  tabId: string;
}

export interface CloseTabStep extends BaseStep {
  type: 'closeTab';
  tabId: string;
}

export interface AssertStep extends BaseStep {
  type: 'assert';
  assertion: Assertion;
}

export interface Assertion {
  target?: ElementTarget;
  operator: ConditionOperator;
  expected: string;
}

export interface ConditionStep extends BaseStep {
  type: 'condition';
  condition: Condition;
  then: WorkflowStep[];
  else: WorkflowStep[];
}

export interface Condition {
  target?: ElementTarget;
  operator: ConditionOperator;
  value: string;
}

export type ConditionOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'notContains'
  | 'containsText'
  | 'exists'
  | 'notExists'
  | 'visible'
  | 'hidden'
  | 'enabled'
  | 'disabled'
  | 'greaterThan'
  | 'lessThan';

export interface LoopStep extends BaseStep {
  type: 'loop';
  source: string;
  itemVariable: string;
  steps: WorkflowStep[];
}

export interface ScreenshotStep extends BaseStep {
  type: 'screenshot';
  fullPage: boolean;
}

/** Discriminated union of all workflow step types. */
export type WorkflowStep =
  | NavigateStep
  | ClickStep
  | InputStep
  | SelectStep
  | CheckboxStep
  | RadioStep
  | ScrollStep
  | HoverStep
  | KeyPressStep
  | UploadStep
  | DownloadStep
  | WaitStep
  | NewTabStep
  | SwitchTabStep
  | CloseTabStep
  | AssertStep
  | ConditionStep
  | LoopStep
  | ScreenshotStep;

/** All possible step type string literals. */
export type StepType = WorkflowStep['type'];

// ─── Recording State ──────────────────────────────────────────────────

export type RecordingStatus = 'idle' | 'recording' | 'paused';

export interface RecordingState {
  status: RecordingStatus;
  workflowId: string | null;
  actionCount: number;
  startTime: number | null;
  elapsedMs: number;
}

// ─── Settings ─────────────────────────────────────────────────────────

export interface ExtensionSettings {
  recording: RecordingPreferences;
  privacy: PrivacySettings;
  timing: TimingSettings;
}

export interface RecordingPreferences {
  recordClicks: boolean;
  recordTyping: boolean;
  recordSelects: boolean;
  recordKeyboardShortcuts: boolean;
  recordUploads: boolean;
  recordDownloads: boolean;
  recordScreenshots: boolean;
  recordScrolls: boolean;
  recordHover: boolean;
  scrollMode: 'none' | 'major' | 'all';
  detectVariables: boolean;
}

export interface PrivacySettings {
  maskPasswords: boolean;
  maskSensitiveInputs: boolean;
  maskOtpFields: boolean;
  noClipboard: boolean;
  noAuthHeaders: boolean;
  noCookies: boolean;
  noLocalStorage: boolean;
  noSessionStorage: boolean;
}

export interface TimingSettings {
  defaultWaitMs: number;
  elementTimeoutMs: number;
  retryCount: number;
  hoverDelayMs: number;
}

// ─── Workflow Library ─────────────────────────────────────────────────

export interface WorkflowSummary {
  id: string;
  name: string;
  description: string;
  stepCount: number;
  variableCount?: number;
  createdAt: string;
  updatedAt: string;
  favorite: boolean;
}

// ─── Export Targets ───────────────────────────────────────────────────

export type ExportFormat =
  | 'json'
  | 'yaml'
  | 'csv'
  | 'markdown'
  | 'playwright-js'
  | 'playwright-ts'
  | 'puppeteer'
  | 'selenium-python';

// ─── Future AI Interface (not implemented yet) ────────────────────────

export interface WorkflowAI {
  analyze(workflow: Workflow): Promise<WorkflowAnalysis>;
  optimize(workflow: Workflow): Promise<Workflow>;
  suggestVariables(workflow: Workflow): Promise<VariableSuggestion[]>;
  repairStep(workflow: Workflow, stepId: string): Promise<WorkflowStep>;
  generateCode(workflow: Workflow, target: ExportFormat): Promise<string>;
}

export interface WorkflowAnalysis {
  quality: number;
  suggestions: string[];
}

export interface VariableSuggestion {
  stepId: string;
  field: string;
  suggestedName: string;
  type: VariableType;
  literalValue?: string;
}

// ─── Validation ───────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  path: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  path: string;
  message: string;
  code: string;
}
