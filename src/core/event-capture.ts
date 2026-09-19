/**
 * Event Capture.
 *
 * Attaches passive DOM listeners in capture phase to record user interactions:
 * - clicks (left, double, right)
 * - typing & text edits
 * - select dropdown changes
 * - checkbox and radio toggles
 * - meaningful keyboard shortcuts (Enter, Tab, Escape, etc.)
 * - window/element scroll
 *
 * Automatically filters out events from the floating recorder controller
 * and delegates raw events to DOMInspector, SelectorEngine, and EventNormalizer.
 */

import type {
  ClickStep,
  SelectStep,
  CheckboxStep,
  RadioStep,
  KeyPressStep,
  ScrollStep,
  KeyModifiers,
  ElementTarget,
  WorkflowStep,
} from '@shared/types';
import { generateStepId, generateStepDescription, now } from '@shared/utils';
import { DOMInspector } from './dom-inspector';
import { SelectorEngine } from './selector-engine';
import { EventNormalizer } from './event-normalizer';
import { FileUploadHandler } from '../content/file-upload-handler';

export interface EventCaptureOptions {
  onStep: (step: WorkflowStep) => void;
  recordScroll?: boolean;
  recordKeyboard?: boolean;
}

export class EventCapture {
  private isCapturing = false;
  private isPaused = false;
  private normalizer: EventNormalizer;
  private boundListeners: Map<
    string,
    { target: EventTarget; eventType: string; handler: EventListener; options?: boolean | AddEventListenerOptions }
  > = new Map();
  private lastClickTime = 0;
  private lastClickTarget: Element | null = null;

  public static readonly CONTROLLER_TAG = 'WORKFLOW-RECORDER-CONTROLLER';
  public static readonly IGNORE_ATTR = 'data-workflow-recorder-ignore';

  constructor(options: EventCaptureOptions) {
    this.normalizer = new EventNormalizer(options.onStep);
  }

  /**
   * Starts capturing events.
   */
  public start(): void {
    if (this.isCapturing) return;
    this.isCapturing = true;
    this.isPaused = false;
    this.attachListeners();
  }

  /**
   * Stops capturing events and detaches all listeners.
   */
  public stop(): void {
    if (!this.isCapturing) return;
    this.normalizer.flush();
    this.detachListeners();
    this.normalizer.destroy();
    this.isCapturing = false;
    this.isPaused = false;
  }

  /**
   * Pauses capturing without detaching listeners.
   */
  public pause(): void {
    if (!this.isCapturing) return;
    this.normalizer.flush();
    this.isPaused = true;
  }

  /**
   * Resumes capturing after pause.
   */
  public resume(): void {
    if (!this.isCapturing) return;
    this.isPaused = false;
  }

  /**
   * Checks if an event originated from within the floating controller or should be ignored.
   */
  public shouldIgnoreEvent(event: Event): boolean {
    const path = event.composedPath ? event.composedPath() : [];

    for (const node of path) {
      if (node instanceof HTMLElement) {
        if (
          node.tagName.toUpperCase() === EventCapture.CONTROLLER_TAG ||
          node.hasAttribute(EventCapture.IGNORE_ATTR) ||
          node.id === 'workflow-recorder-floating-controller'
        ) {
          return true;
        }
      }
    }

    const target = event.target as HTMLElement | null;
    if (target && target.closest) {
      if (
        target.closest(EventCapture.CONTROLLER_TAG.toLowerCase()) ||
        target.closest(`[${EventCapture.IGNORE_ATTR}]`)
      ) {
        return true;
      }
    }

    return false;
  }

  // ─── Event Handlers ───────────────────────────────────────────────────

  private handleClick = (event: MouseEvent): void => {
    if (!this.isCapturing || this.isPaused) return;
    if (this.shouldIgnoreEvent(event)) return;

    // Ignore right click here (handled by contextmenu)
    if (event.button === 2) return;

    const rawTarget = event.target as Element;
    if (!rawTarget) return;

    // Flush any pending input buffer before processing the click
    this.normalizer.flush();

    // Check for double click
    const currentTime = Date.now();
    const isDoubleClick =
      this.lastClickTarget === rawTarget && currentTime - this.lastClickTime < 300;

    this.lastClickTime = currentTime;
    this.lastClickTarget = rawTarget;

    // If double click, we let the dblclick event or this logic handle it
    const clickType = isDoubleClick ? 'double' : 'left';

    const interactiveTarget = DOMInspector.findInteractiveAncestor(rawTarget);
    const target = this.buildElementTarget(interactiveTarget);

    const clickStep: ClickStep = {
      id: generateStepId(),
      type: 'click',
      target,
      clickType,
      position: {
        x: Math.round(event.clientX),
        y: Math.round(event.clientY),
      },
      timestamp: now(),
      description: generateStepDescription({
        type: 'click',
        target,
        clickType,
      } as ClickStep),
    };

    this.normalizer.handleStep(clickStep);
  };

  private handleContextMenu = (event: MouseEvent): void => {
    if (!this.isCapturing || this.isPaused) return;
    if (this.shouldIgnoreEvent(event)) return;

    const rawTarget = event.target as Element;
    if (!rawTarget) return;

    this.normalizer.flush();

    const interactiveTarget = DOMInspector.findInteractiveAncestor(rawTarget);
    const target = this.buildElementTarget(interactiveTarget);

    const clickStep: ClickStep = {
      id: generateStepId(),
      type: 'click',
      target,
      clickType: 'right',
      position: {
        x: Math.round(event.clientX),
        y: Math.round(event.clientY),
      },
      timestamp: now(),
      description: generateStepDescription({
        type: 'click',
        target,
        clickType: 'right',
      } as ClickStep),
    };

    this.normalizer.handleStep(clickStep);
  };

  private handleInput = (event: Event): void => {
    if (!this.isCapturing || this.isPaused) return;
    if (this.shouldIgnoreEvent(event)) return;

    const targetEl = event.target as Element;
    if (!targetEl) return;

    const tag = targetEl.tagName.toUpperCase();
    // Ignore input events on checkbox/radio/select as those are handled by change
    if (tag === 'INPUT') {
      const type = (targetEl.getAttribute('type') || 'text').toLowerCase();
      if (type === 'checkbox' || type === 'radio' || type === 'file') return;
    }
    if (tag === 'SELECT') return;

    const info = DOMInspector.inspect(targetEl);
    const target = this.buildElementTarget(targetEl, info);

    this.normalizer.handleStep(
      {
        id: generateStepId(),
        type: 'input',
        target,
        value: info.value || '',
        sensitive: info.isSensitive,
        timestamp: now(),
        description: '',
      },
      targetEl
    );
  };

  private handleChange = (event: Event): void => {
    if (!this.isCapturing || this.isPaused) return;
    if (this.shouldIgnoreEvent(event)) return;

    const targetEl = event.target as HTMLElement;
    if (!targetEl) return;

    const tag = targetEl.tagName.toUpperCase();

    if (tag === 'SELECT') {
      this.normalizer.flush();
      const select = targetEl as HTMLSelectElement;
      const target = this.buildElementTarget(select);
      const selectedOption = select.options[select.selectedIndex];
      const value = select.value;
      const label = selectedOption ? selectedOption.text.trim() : value;

      const selectStep: SelectStep = {
        id: generateStepId(),
        type: 'select',
        target,
        value,
        label,
        timestamp: now(),
        description: generateStepDescription({
          type: 'select',
          target,
          value,
          label,
        } as SelectStep),
      };

      this.normalizer.handleStep(selectStep);
      return;
    }

    if (tag === 'INPUT') {
      const input = targetEl as HTMLInputElement;
      const type = (input.type || 'text').toLowerCase();

      if (type === 'checkbox') {
        this.normalizer.flush();
        const target = this.buildElementTarget(input);
        const checked = input.checked;

        const checkboxStep: CheckboxStep = {
          id: generateStepId(),
          type: 'checkbox',
          target,
          checked,
          timestamp: now(),
          description: generateStepDescription({
            type: 'checkbox',
            target,
            checked,
          } as CheckboxStep),
        };

        this.normalizer.handleStep(checkboxStep);
        return;
      }

      if (type === 'radio') {
        this.normalizer.flush();
        const target = this.buildElementTarget(input);
        const value = input.value;

        const radioStep: RadioStep = {
          id: generateStepId(),
          type: 'radio',
          target,
          value,
          timestamp: now(),
          description: generateStepDescription({
            type: 'radio',
            target,
            value,
          } as RadioStep),
        };

        this.normalizer.handleStep(radioStep);
        return;
      }

      if (type === 'file') {
        this.normalizer.flush();
        const uploadStep = FileUploadHandler.handleFileInput(input);
        this.normalizer.handleStep(uploadStep);
        return;
      }
    }
  };

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.isCapturing || this.isPaused) return;
    if (this.shouldIgnoreEvent(event)) return;

    const meaningfulKeys = ['Enter', 'Escape', 'Tab', 'Backspace', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
    const hasModifier = event.ctrlKey || event.metaKey || event.altKey;

    if (!meaningfulKeys.includes(event.key) && !hasModifier) {
      return; // Normal typing is handled by handleInput
    }

    // Special handling for Enter/Tab: flush active typing first!
    if (event.key === 'Enter' || event.key === 'Tab') {
      this.normalizer.flush();
    }

    const targetEl = event.target as Element | null;
    const target = targetEl ? this.buildElementTarget(targetEl) : undefined;

    const modifiers: KeyModifiers = {};
    if (event.ctrlKey) modifiers.ctrl = true;
    if (event.altKey) modifiers.alt = true;
    if (event.shiftKey) modifiers.shift = true;
    if (event.metaKey) modifiers.meta = true;

    const keyStep: KeyPressStep = {
      id: generateStepId(),
      type: 'keyPress',
      key: event.key,
      modifiers: Object.keys(modifiers).length > 0 ? modifiers : undefined,
      target,
      timestamp: now(),
      description: generateStepDescription({
        type: 'keyPress',
        key: event.key,
        modifiers,
      } as KeyPressStep),
    };

    this.normalizer.handleStep(keyStep);
  };

  private handleScroll = (): void => {
    if (!this.isCapturing || this.isPaused) return;

    const scrollX = Math.round(window.scrollX || window.pageXOffset || 0);
    const scrollY = Math.round(window.scrollY || window.pageYOffset || 0);

    const scrollStep: ScrollStep = {
      id: generateStepId(),
      type: 'scroll',
      position: { x: scrollX, y: scrollY },
      timestamp: now(),
      description: `Scroll to (${scrollX}, ${scrollY})`,
    };

    this.normalizer.handleStep(scrollStep);
  };

  private handleFocusOut = (event: FocusEvent): void => {
    if (!this.isCapturing || this.isPaused) return;
    if (this.shouldIgnoreEvent(event)) return;

    // When focus leaves an input field, flush its buffered content immediately
    if (this.normalizer.hasPendingInput()) {
      this.normalizer.flushInput();
    }
  };

  // ─── Helper ───────────────────────────────────────────────────────────

  private buildElementTarget(
    element: Element,
    inspectedInfo?: ReturnType<typeof DOMInspector.inspect>
  ): ElementTarget {
    const info = inspectedInfo || DOMInspector.inspect(element);
    const selectors = SelectorEngine.generateSelectors(element);
    return DOMInspector.toElementTarget(info, selectors);
  }

  // ─── Listener Attachment ──────────────────────────────────────────────

  private attachListeners(): void {
    const doc = document;
    const win = window;

    const listeners: Array<[EventTarget, string, EventListener, AddEventListenerOptions]> = [
      [doc, 'click', this.handleClick as EventListener, { capture: true, passive: true }],
      [doc, 'contextmenu', this.handleContextMenu as EventListener, { capture: true, passive: true }],
      [doc, 'input', this.handleInput as EventListener, { capture: true, passive: true }],
      [doc, 'change', this.handleChange as EventListener, { capture: true, passive: true }],
      [doc, 'keydown', this.handleKeyDown as EventListener, { capture: true, passive: true }],
      [doc, 'focusout', this.handleFocusOut as EventListener, { capture: true, passive: true }],
      [win, 'scroll', this.handleScroll as EventListener, { capture: true, passive: true }],
    ];

    for (const [target, eventType, handler, options] of listeners) {
      target.addEventListener(eventType, handler, options);
      this.boundListeners.set(`${eventType}_${target === doc ? 'doc' : 'win'}`, {
        target,
        eventType,
        handler,
        options,
      });
    }
  }

  private detachListeners(): void {
    for (const [, { target, eventType, handler, options }] of this.boundListeners) {
      target.removeEventListener(eventType, handler, options);
    }
    this.boundListeners.clear();
  }
}
