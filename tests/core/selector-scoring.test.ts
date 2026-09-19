import { describe, it, expect } from 'vitest';
import { SelectorScoring } from '@core/selector-scoring';
import type { SelectorCandidate } from '@shared/types';

describe('SelectorScoring', () => {
  it('gives unique stable IDs the highest score', () => {
    const score = SelectorScoring.calculateScore({
      type: 'id',
      value: '#submitBtn',
      matchCount: 1,
    });
    expect(score).toBeGreaterThanOrEqual(0.95);
  });

  it('severely penalizes ambiguous selectors matching multiple elements', () => {
    const singleMatchScore = SelectorScoring.calculateScore({
      type: 'css',
      value: 'button.btn',
      matchCount: 1,
    });

    const multiMatchScore = SelectorScoring.calculateScore({
      type: 'css',
      value: 'button.btn',
      matchCount: 5,
    });

    expect(multiMatchScore).toBeLessThan(singleMatchScore);
    expect(multiMatchScore).toBeLessThan(0.2);
  });

  it('penalizes selectors containing volatile text such as currency or dates', () => {
    const normalTextScore = SelectorScoring.calculateScore({
      type: 'text',
      value: '//button[text()="Submit Application"]',
      text: 'Submit Application',
      matchCount: 1,
    });

    const priceTextScore = SelectorScoring.calculateScore({
      type: 'text',
      value: '//button[text()="$49.99"]',
      text: '$49.99',
      matchCount: 1,
    });

    const dateTextScore = SelectorScoring.calculateScore({
      type: 'text',
      value: '//span[text()="2024-05-12"]',
      text: '2024-05-12',
      matchCount: 1,
    });

    expect(priceTextScore).toBeLessThan(normalTextScore);
    expect(dateTextScore).toBeLessThan(normalTextScore);
  });

  it('penalizes deeply nested CSS paths', () => {
    const shallowScore = SelectorScoring.calculateScore({
      type: 'css',
      value: 'div > button',
      domDepth: 2,
      matchCount: 1,
    });

    const deepScore = SelectorScoring.calculateScore({
      type: 'css',
      value: 'html > body > main > div > section > div > button',
      domDepth: 7,
      matchCount: 1,
    });

    expect(deepScore).toBeLessThan(shallowScore);
  });

  it('correctly ranks candidates by score descending and deduplicates', () => {
    const candidates: SelectorCandidate[] = [
      { type: 'css', value: 'div.btn', score: 0.65 },
      { type: 'id', value: '#submitBtn', score: 0.99 },
      { type: 'aria', value: 'button[aria-label="Submit"]', score: 0.92 },
      { type: 'css', value: 'div.btn', score: 0.65 }, // duplicate
    ];

    const ranked = SelectorScoring.rankCandidates(candidates);
    expect(ranked.length).toBe(3);
    expect(ranked[0]!.type).toBe('id');
    expect(ranked[1]!.type).toBe('aria');
    expect(ranked[2]!.type).toBe('css');
  });
});
