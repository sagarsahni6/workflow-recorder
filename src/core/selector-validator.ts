/**
 * Selector Validator.
 *
 * Tests selectors against the live DOM:
 * 1. Counts how many elements match the selector.
 * 2. Verifies whether the first matched element is identical to the target element.
 * 3. Measures execution performance and catches query errors safely.
 */

import type { SelectorCandidate, SelectorType } from '@shared/types';
import { SelectorScoring } from './selector-scoring';

export interface ValidationResult {
  isValid: boolean;
  matches: number;
  isTarget: boolean;
  matchedElement: Element | null;
  executionTimeMs: number;
  error?: string;
}

export class SelectorValidator {
  /**
   * Validates a single selector against the DOM.
   */
  public static validate(
    selector: string,
    type: SelectorType,
    targetElement?: Element,
    doc: Document = document
  ): ValidationResult {
    const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

    try {
      if (type === 'xpath' || type === 'text') {
        return this.validateXPath(selector, targetElement, doc, startTime);
      } else {
        return this.validateCss(selector, targetElement, doc, startTime);
      }
    } catch (err: unknown) {
      const duration = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime;
      const message = err instanceof Error ? err.message : 'Invalid selector';
      return {
        isValid: false,
        matches: 0,
        isTarget: false,
        matchedElement: null,
        executionTimeMs: duration,
        error: message,
      };
    }
  }

  /**
   * Validates CSS-based selectors via querySelectorAll.
   */
  private static validateCss(
    selector: string,
    targetElement: Element | undefined,
    doc: Document,
    startTime: number
  ): ValidationResult {
    const elements = doc.querySelectorAll(selector);
    const duration = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime;

    const matches = elements.length;
    const firstMatch = elements[0] || null;
    const isTarget = targetElement ? firstMatch === targetElement : matches > 0;

    return {
      isValid: matches > 0,
      matches,
      isTarget,
      matchedElement: firstMatch,
      executionTimeMs: duration,
    };
  }

  /**
   * Validates XPath-based selectors via document.evaluate.
   */
  private static validateXPath(
    xpath: string,
    targetElement: Element | undefined,
    doc: Document,
    startTime: number
  ): ValidationResult {
    const result = doc.evaluate(
      xpath,
      doc,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    );
    const duration = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime;

    const matches = result.snapshotLength;
    const firstMatch = matches > 0 ? (result.snapshotItem(0) as Element) : null;
    const isTarget = targetElement ? firstMatch === targetElement : matches > 0;

    return {
      isValid: matches > 0,
      matches,
      isTarget,
      matchedElement: firstMatch,
      executionTimeMs: duration,
    };
  }

  /**
   * Validates an array of candidates against the target element, calculates
   * their score using SelectorScoring, and filters out non-matching candidates.
   */
  public static validateAndScoreCandidates(
    candidates: SelectorCandidate[],
    targetElement: Element,
    doc: Document = document
  ): SelectorCandidate[] {
    const results: SelectorCandidate[] = [];

    for (const candidate of candidates) {
      const validation = this.validate(candidate.value, candidate.type, targetElement, doc);

      // Discard candidates that match 0 elements or don't resolve to the target element
      if (!validation.isValid || !validation.isTarget) {
        continue;
      }

      const score = SelectorScoring.calculateScore({
        type: candidate.type,
        value: candidate.value,
        matchCount: validation.matches,
      });

      results.push({
        type: candidate.type,
        value: candidate.value,
        score,
      });
    }

    return SelectorScoring.rankCandidates(results);
  }
}
