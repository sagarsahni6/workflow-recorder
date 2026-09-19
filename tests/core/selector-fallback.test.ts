import { describe, it, expect, beforeEach } from 'vitest';
import { SelectorFallback } from '@core/selector-fallback';
import type { ElementTarget, SelectorCandidate } from '@shared/types';

describe('SelectorFallback', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('orders candidates according to the standardized 5-tier fallback hierarchy', () => {
    const candidates: SelectorCandidate[] = [
      { type: 'xpath', value: '//button[@id="btn"]', score: 0.75 },
      { type: 'text', value: '//button[text()="Submit"]', score: 0.70 },
      { type: 'id', value: '#btn', score: 0.99 },
      { type: 'css', value: 'button.primary', score: 0.72 },
      { type: 'aria', value: 'button[aria-label="Submit"]', score: 0.92 },
      { type: 'testId', value: '[data-testid="submit"]', score: 0.97 },
    ];

    const sorted = SelectorFallback.sortByFallbackHierarchy(candidates);

    // Tier 1: ID or testId
    expect(['id', 'testId']).toContain(sorted[0]!.type);
    expect(['id', 'testId']).toContain(sorted[1]!.type);

    // Tier 2: ARIA
    expect(sorted[2]!.type).toBe('aria');

    // Tier 3: CSS
    expect(sorted[3]!.type).toBe('css');

    // Tier 4: XPath
    expect(sorted[4]!.type).toBe('xpath');

    // Tier 5: Semantic text
    expect(sorted[5]!.type).toBe('text');
  });

  it('resolves an element using its primary Tier 1 selector', () => {
    document.body.innerHTML = '<button id="primaryBtn">Click Me</button>';
    const btn = document.getElementById('primaryBtn')!;

    const target: ElementTarget = {
      tagName: 'BUTTON',
      classes: [],
      selectors: [
        { type: 'id', value: '#primaryBtn', score: 0.99 },
        { type: 'css', value: 'button', score: 0.7 },
      ],
    };

    const resolution = SelectorFallback.resolve(target);
    expect(resolution.element).toBe(btn);
    expect(resolution.strategy).toBe('exact');
    expect(resolution.tier).toBe(1);
  });

  it('falls back to Tier 2 (ARIA) if the primary ID selector is missing or changed', () => {
    // ID was removed in a page redesign, but aria-label remains
    document.body.innerHTML = '<button aria-label="Submit Order">Click Me</button>';
    const btn = document.querySelector('button')!;

    const target: ElementTarget = {
      tagName: 'BUTTON',
      classes: [],
      selectors: [
        { type: 'id', value: '#oldIdThatNoLongerExists', score: 0.99 },
        { type: 'aria', value: 'button[aria-label="Submit Order"]', score: 0.92 },
        { type: 'css', value: 'button', score: 0.6 },
      ],
    };

    const resolution = SelectorFallback.resolve(target);
    expect(resolution.element).toBe(btn);
    expect(resolution.strategy).toBe('fallback');
    expect(resolution.tier).toBe(2);
    expect(resolution.usedSelector?.type).toBe('aria');
  });

  it('reports failed strategy when none of the candidate selectors match', () => {
    document.body.innerHTML = '<div>Empty Page</div>';

    const target: ElementTarget = {
      tagName: 'BUTTON',
      classes: [],
      selectors: [
        { type: 'id', value: '#missing', score: 0.99 },
        { type: 'aria', value: 'button[aria-label="Missing"]', score: 0.92 },
      ],
    };

    const resolution = SelectorFallback.resolve(target);
    expect(resolution.element).toBeNull();
    expect(resolution.strategy).toBe('failed');
  });
});
