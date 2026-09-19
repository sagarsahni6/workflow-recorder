/**
 * Event Normalizer.
 *
 * Sits between EventCapture and RecorderEngine:
 * 1. Groups keystrokes on the same input into a single logical `input` step.
 * 2. Debounces rapid scroll events into a single `scroll` step.
 * 3. Flushes buffered events when focus moves or another action takes place.
 * 4. Ensures sensitive data is masked according to privacy rules.
 */

import type {
  WorkflowStep,
  InputStep,
  ScrollStep,
  ElementTarget,
  Position,
} from '@shared/types';
import { generateStepId, generateStepDescription, now } from '@shared/utils';

export interface PendingInput {
  element: Element;
  target: ElementTarget;
  value: string;
  sensitive: boolean;
  timestamp: string;
  timer: ReturnType<typeof setTimeout> | null;
}

export interface PendingScroll {
  position: Position;
  target?: ElementTarget;
  timestamp: string;
  timer: ReturnType<typeof setTimeout> | null;
}

export type StepCallback = (step: WorkflowStep) => void;

export class EventNormalizer {
  private pendingInput: PendingInput | null = null;
  private pendingScroll: PendingScroll | null = null;
  private onStepCallback: StepCallback;

  /** Idle time (ms) after which pending typing is flushed into a step. */
  public static readonly INPUT_DEBOUNCE_MS = 1200;

  /** Idle time (ms) after which scrolling is flushed into a step. */
  public static readonly SCROLL_DEBOUNCE_MS = 350;

  constructor(onStep: StepCallback) {
    this.onStepCallback = onStep;
  }

  /**
   * Receives an intermediate step or action candidate from EventCapture.
   */
  public handleStep(step: WorkflowStep, sourceElement?: Element): void {
    if (step.type === 'input') {
      this.handleInputStep(step as InputStep, sourceElement);
      return;
    }

    if (step.type === 'scroll') {
      this.handleScrollStep(step as ScrollStep);
      return;
    }

    // Any non-input, non-scroll action flushes any pending buffers first
    this.flush();

    // Emit the discrete step
    this.emit(step);
  }

  /**
   * Handles text input event grouping.
   */
  private handleInputStep(step: InputStep, sourceElement?: Element): void {
    // Cancel scroll if user began typing
    this.flushScroll();

    if (
      this.pendingInput &&
      sourceElement &&
      this.pendingInput.element === sourceElement
    ) {
      // Same input element — update buffer & reset debounce timer
      if (this.pendingInput.timer) {
        clearTimeout(this.pendingInput.timer);
      }

      this.pendingInput.value = step.value;
      this.pendingInput.sensitive = step.sensitive || this.pendingInput.sensitive;
      this.pendingInput.target = step.target;

      this.pendingInput.timer = setTimeout(() => {
        this.flushInput();
      }, EventNormalizer.INPUT_DEBOUNCE_MS);
      return;
    }

    // Different input element or initial input — flush previous buffer
    this.flushInput();

    // Start a new pending input buffer
    const timer = setTimeout(() => {
      this.flushInput();
    }, EventNormalizer.INPUT_DEBOUNCE_MS);

    this.pendingInput = {
      element: sourceElement || (null as unknown as Element),
      target: step.target,
      value: step.value,
      sensitive: step.sensitive,
      timestamp: step.timestamp || now(),
      timer,
    };
  }

  /**
   * Handles scroll event debouncing.
   */
  private handleScrollStep(step: ScrollStep): void {
    if (this.pendingScroll?.timer) {
      clearTimeout(this.pendingScroll.timer);
    }

    const timer = setTimeout(() => {
      this.flushScroll();
    }, EventNormalizer.SCROLL_DEBOUNCE_MS);

    this.pendingScroll = {
      position: step.position,
      target: step.target,
      timestamp: step.timestamp || now(),
      timer,
    };
  }

  /**
   * Flushes both pending input and pending scroll buffers.
   */
  public flush(): void {
    this.flushInput();
    this.flushScroll();
  }

  /**
   * Flushes the pending input buffer and emits a final InputStep.
   */
  public flushInput(): void {
    if (!this.pendingInput) return;

    if (this.pendingInput.timer) {
      clearTimeout(this.pendingInput.timer);
    }

    const { target, value, sensitive, timestamp } = this.pendingInput;
    this.pendingInput = null;

    // Mask value if marked sensitive
    const finalValue = sensitive ? '{{password}}' : value;

    const inputStep: InputStep = {
      id: generateStepId(),
      type: 'input',
      target,
      value: finalValue,
      sensitive,
      description: generateStepDescription({
        type: 'input',
        target,
        value: finalValue,
        sensitive,
      } as InputStep),
      timestamp,
    };

    this.emit(inputStep);
  }

  /**
   * Flushes the pending scroll buffer and emits a final ScrollStep.
   */
  public flushScroll(): void {
    if (!this.pendingScroll) return;

    if (this.pendingScroll.timer) {
      clearTimeout(this.pendingScroll.timer);
    }

    const { position, target, timestamp } = this.pendingScroll;
    this.pendingScroll = null;

    const scrollStep: ScrollStep = {
      id: generateStepId(),
      type: 'scroll',
      position,
      target,
      description: `Scroll to (${position.x}, ${position.y})`,
      timestamp,
    };

    this.emit(scrollStep);
  }

  /**
   * Checks if an input buffer is currently active.
   */
  public hasPendingInput(): boolean {
    return this.pendingInput !== null;
  }

  /**
   * Checks if a scroll buffer is currently active.
   */
  public hasPendingScroll(): boolean {
    return this.pendingScroll !== null;
  }

  /**
   * Emits a finalized workflow step to the callback.
   */
  private emit(step: WorkflowStep): void {
    try {
      this.onStepCallback(step);
    } catch (err) {
      console.error('[EventNormalizer] Error emitting step:', err);
    }
  }

  /**
   * Cleans up all pending timers on recorder stop or teardown.
   */
  public destroy(): void {
    if (this.pendingInput?.timer) {
      clearTimeout(this.pendingInput.timer);
      this.pendingInput = null;
    }
    if (this.pendingScroll?.timer) {
      clearTimeout(this.pendingScroll.timer);
      this.pendingScroll = null;
    }
  }
}
