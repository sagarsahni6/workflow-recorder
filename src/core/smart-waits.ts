/**
 * Smart Wait System.
 *
 * Replaces naive hardcoded sleeps with intelligent wait assertions
 * (waitForElement, waitForVisible, waitForEnabled, waitForURL, waitForNavigation)
 * based on target element semantics and navigation boundaries.
 */

import type { WaitStep, ElementTarget, Workflow, WorkflowStep } from '@shared/types';
import { generateStepId, now } from '@shared/utils';

export class SmartWaitSystem {
  public static readonly DEFAULT_WAIT_TIMEOUT_MS = 15000;

  /**
   * Synthesizes an element-focused smart wait step.
   */
  public static synthesizeWait(
    target: ElementTarget,
    strategy: 'waitForElement' | 'waitForVisible' | 'waitForEnabled' = 'waitForVisible',
    timeoutMs = SmartWaitSystem.DEFAULT_WAIT_TIMEOUT_MS
  ): WaitStep {
    const selectorDesc = target.selectors[0]?.value || target.tagName;
    return {
      id: generateStepId(),
      type: strategy,
      target,
      timeout: timeoutMs,
      timestamp: now(),
      description: `Wait for element (${selectorDesc}) to become ${strategy.replace('waitFor', '').toLowerCase()}`,
    };
  }

  /**
   * Synthesizes a URL wait step.
   */
  public static synthesizeURLWait(
    url: string,
    timeoutMs = SmartWaitSystem.DEFAULT_WAIT_TIMEOUT_MS
  ): WaitStep {
    return {
      id: generateStepId(),
      type: 'waitForURL',
      value: url,
      timeout: timeoutMs,
      timestamp: now(),
      description: `Wait for URL to match "${url}"`,
    };
  }

  /**
   * Synthesizes a page navigation completion wait step.
   */
  public static synthesizeNavigationWait(
    timeoutMs = SmartWaitSystem.DEFAULT_WAIT_TIMEOUT_MS
  ): WaitStep {
    return {
      id: generateStepId(),
      type: 'waitForNavigation',
      timeout: timeoutMs,
      timestamp: now(),
      description: 'Wait for page navigation and network idle',
    };
  }

  /**
   * Analyzes an existing workflow and transforms blind fixed waits into
   * contextual smart waits when followed immediately by an element action.
   */
  public static optimizeWorkflowWaits(workflow: Workflow): Workflow {
    const cloned: Workflow = JSON.parse(JSON.stringify(workflow));
    const optimizedSteps: WorkflowStep[] = [];

    for (let i = 0; i < cloned.steps.length; i++) {
      const current = cloned.steps[i]!;
      const next = cloned.steps[i + 1];

      // If current is a blind wait and next has a target element, convert to smart waitForVisible
      if (
        current.type === 'wait' &&
        next &&
        'target' in next &&
        next.target &&
        next.target.selectors &&
        next.target.selectors.length > 0
      ) {
        const smartWait = this.synthesizeWait(
          next.target,
          'waitForVisible',
          Math.max(current.timeout || 1000, 5000)
        );
        optimizedSteps.push(smartWait);
      } else {
        optimizedSteps.push(current);
      }
    }

    cloned.steps = optimizedSteps;
    return cloned;
  }
}
