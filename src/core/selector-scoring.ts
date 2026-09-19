/**
 * Selector Scoring Engine.
 *
 * Implements a heuristic scoring algorithm evaluating:
 * - Uniqueness (match count in DOM)
 * - Stability (avoiding dynamic IDs, hashes, generated classes)
 * - Semantic meaning (data-testid, aria-label, role, name)
 * - DOM depth & simplicity (penalizing deep hierarchical paths)
 * - Text stability (penalizing currency, dates, volatile numbers)
 */

import type { SelectorCandidate, SelectorType } from '@shared/types';
import { SELECTOR_WEIGHTS } from '@shared/constants';
import { isDynamicSelector } from '@shared/utils';

export interface ScoringFactors {
  type: SelectorType;
  value: string;
  matchCount: number;
  domDepth?: number;
  text?: string;
}

export class SelectorScoring {
  /** Patterns indicating volatile text in text-based selectors (currency, dates, timestamps, counters). */
  private static readonly VOLATILE_TEXT_PATTERNS: readonly RegExp[] = [
    /^\$?\d+(\.\d{1,2})?$/,              // Prices ($19.99)
    /^[₹€£¥]\s?\d+/,                     // International currency
    /\b\d{4}[-/.]\d{2}[-/.]\d{2}\b/,     // Dates (2024-01-15)
    /\b\d{1,2}:\d{2}(:\d{2})?\b/,        // Times (12:30:00)
    /#\d{4,}/,                           // Order / Ticket numbers (#10293)
    /\b(item|result)s?\s+\d+\b/i,        // Counters ("12 items")
  ];

  /**
   * Computes a score between 0 and 1 for a selector candidate.
   */
  public static calculateScore(factors: ScoringFactors): number {
    const { type, value, matchCount } = factors;

    // 1. Uniqueness check
    if (matchCount <= 0) return 0;

    // 2. Base weight by selector type
    let score: number = SELECTOR_WEIGHTS[type] ?? 0.5;

    // 3. Dynamic pattern penalty
    if (isDynamicSelector(value)) {
      score -= 0.5;
    }

    // 4. Ambiguity penalty (more than 1 match)
    if (matchCount > 1) {
      score *= (1 / matchCount);
    }

    // 5. DOM depth penalty for hierarchical CSS/XPath
    const depth = factors.domDepth ?? this.estimateDepth(value, type);
    if (depth > 3) {
      score -= (depth - 3) * 0.05;
    }

    // 6. Text volatility penalty
    if (type === 'text' || value.includes('normalize-space()') || value.includes(':has-text')) {
      if (this.isVolatileText(factors.text || value)) {
        score -= 0.25;
      }
    }

    // 7. Accessibility boost
    if (type === 'aria' || type === 'role') {
      // Role with accessible name is especially stable
      if (value.includes('aria-label') || value.includes('[name=')) {
        score += 0.02;
      }
    }

    // Clamp score to [0.01, 0.99]
    return Math.round(Math.min(0.99, Math.max(0.01, score)) * 100) / 100;
  }

  /**
   * Estimates DOM depth from selector syntax.
   */
  public static estimateDepth(selector: string, type: SelectorType): number {
    if (type === 'id' || type === 'testId') return 1;

    if (type === 'css') {
      // Count direct child '>' or descendant ' ' operators
      const tokens = selector.split(/\s*>\s*|\s+/).filter(Boolean);
      return Math.max(1, tokens.length);
    }

    if (type === 'xpath') {
      // Count slash segments
      const segments = selector.split('/').filter(Boolean);
      return Math.max(1, segments.length);
    }

    return 1;
  }

  /**
   * Checks if text contains dynamic/volatile patterns.
   */
  public static isVolatileText(text: string): boolean {
    const trimmed = text.trim();
    return this.VOLATILE_TEXT_PATTERNS.some((p) => p.test(trimmed));
  }

  /**
   * Sorts candidates by score descending and removes duplicates.
   */
  public static rankCandidates(candidates: SelectorCandidate[]): SelectorCandidate[] {
    const sorted = [...candidates].sort((a, b) => b.score - a.score);
    const seen = new Set<string>();

    return sorted.filter((c) => {
      if (seen.has(c.value)) return false;
      seen.add(c.value);
      return true;
    });
  }
}
