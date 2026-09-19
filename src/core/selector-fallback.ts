/**
 * Selector Fallback & Resolution System.
 *
 * Implements a prioritized multi-tier fallback mechanism:
 * 1. Strongest unique selector (ID, testId)
 * 2. Accessibility selector (ARIA label, accessible role)
 * 3. Stable CSS selector
 * 4. Robust XPath
 * 5. Semantic fallback (name, text, data attributes)
 *
 * Provides a DOM resolver that tests candidates in order of resilience
 * to recover elements even if page structure or IDs change.
 * Includes an architectural hook for future visual/AI fallback.
 */

import type { ElementTarget, SelectorCandidate, SelectorType } from '@shared/types';
import { SelectorValidator } from './selector-validator';

export interface ElementResolution {
  element: Element | null;
  usedSelector: SelectorCandidate | null;
  tier: number;
  confidence: number;
  strategy: 'exact' | 'fallback' | 'ambiguous' | 'failed';
}

/**
 * Interface stub for future AI visual fallback (e.g. computer vision / screenshot matching).
 */
export interface VisualFallbackProvider {
  resolveVisualTarget(screenshotDataUrl: string, boundingBox: { x: number; y: number; width: number; height: number }): Promise<Element | null>;
}

export class SelectorFallback {
  /** Map of selector types to their priority tier (1 = highest priority). */
  private static readonly TIER_MAP: Record<SelectorType, number> = {
    id: 1,
    testId: 1,
    aria: 2,
    role: 2,
    css: 3,
    xpath: 4,
    name: 5,
    text: 5,
    dataAttr: 5,
  };

  /**
   * Sorts candidates according to the standardized 5-tier fallback hierarchy,
   * with score breaking ties within each tier.
   */
  public static sortByFallbackHierarchy(candidates: SelectorCandidate[]): SelectorCandidate[] {
    return [...candidates].sort((a, b) => {
      const tierA = this.TIER_MAP[a.type] ?? 99;
      const tierB = this.TIER_MAP[b.type] ?? 99;

      if (tierA !== tierB) {
        return tierA - tierB;
      }
      return b.score - a.score;
    });
  }

  /**
   * Attempts to locate the element in the DOM by cycling through the target's
   * selectors in priority fallback order.
   */
  public static resolve(target: ElementTarget, doc: Document = document): ElementResolution {
    const candidates = this.sortByFallbackHierarchy(target.selectors || []);

    let fallbackCandidate: { candidate: SelectorCandidate; element: Element; matches: number } | null = null;

    for (const candidate of candidates) {
      const result = SelectorValidator.validate(candidate.value, candidate.type, undefined, doc);

      if (result.isValid && result.matchedElement) {
        // Perfect unique match!
        if (result.matches === 1) {
          const tier = this.TIER_MAP[candidate.type] ?? 5;
          return {
            element: result.matchedElement,
            usedSelector: candidate,
            tier,
            confidence: candidate.score,
            strategy: tier === 1 ? 'exact' : 'fallback',
          };
        }

        // Store first ambiguous match as a last resort
        if (!fallbackCandidate) {
          fallbackCandidate = {
            candidate,
            element: result.matchedElement,
            matches: result.matches,
          };
        }
      }
    }

    // If no unique match was found, use the ambiguous candidate if available
    if (fallbackCandidate) {
      const tier = this.TIER_MAP[fallbackCandidate.candidate.type] ?? 5;
      return {
        element: fallbackCandidate.element,
        usedSelector: fallbackCandidate.candidate,
        tier,
        confidence: Math.round((fallbackCandidate.candidate.score / fallbackCandidate.matches) * 100) / 100,
        strategy: 'ambiguous',
      };
    }

    // Resolution failed
    return {
      element: null,
      usedSelector: null,
      tier: -1,
      confidence: 0,
      strategy: 'failed',
    };
  }
}
