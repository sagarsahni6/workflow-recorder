import { describe, it, expect, beforeEach } from 'vitest';
import { SelectorEngine } from '@core/selector-engine';

describe('SelectorEngine', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('generates an ID selector for a stable unique ID', () => {
    document.body.innerHTML = '<button id="submitBtn">Submit</button>';
    const btn = document.getElementById('submitBtn')!;
    const selectors = SelectorEngine.generateSelectors(btn);

    const idSelector = selectors.find((s) => s.type === 'id');
    expect(idSelector).toBeDefined();
    expect(idSelector?.value).toBe('#submitBtn');
    expect(idSelector?.score).toBeGreaterThanOrEqual(0.95);
  });

  it('ignores dynamic generated IDs', () => {
    document.body.innerHTML = '<button id="css-8d92ks">Click me</button>';
    const btn = document.getElementById('css-8d92ks')!;
    const selectors = SelectorEngine.generateSelectors(btn);

    const idSelector = selectors.find((s) => s.type === 'id');
    expect(idSelector).toBeUndefined();
  });

  it('generates data-testid selectors with high score', () => {
    document.body.innerHTML = '<input data-testid="user-email-input" type="email" />';
    const input = document.querySelector('[data-testid="user-email-input"]')!;
    const selectors = SelectorEngine.generateSelectors(input);

    const testIdSelector = selectors.find((s) => s.type === 'testId');
    expect(testIdSelector).toBeDefined();
    expect(testIdSelector?.value).toBe('[data-testid="user-email-input"]');
    expect(testIdSelector?.score).toBeGreaterThanOrEqual(0.9);
  });

  it('generates ARIA label selectors', () => {
    document.body.innerHTML = '<button aria-label="Close dialog">X</button>';
    const btn = document.querySelector('button')!;
    const selectors = SelectorEngine.generateSelectors(btn);

    const ariaSelector = selectors.find((s) => s.type === 'aria');
    expect(ariaSelector).toBeDefined();
    expect(ariaSelector?.value).toBe('button[aria-label="Close dialog"]');
  });

  it('generates name attribute selectors for form controls', () => {
    document.body.innerHTML = '<input name="user_email" type="email" />';
    const input = document.querySelector('input')!;
    const selectors = SelectorEngine.generateSelectors(input);

    const nameSelector = selectors.find((s) => s.type === 'name');
    expect(nameSelector).toBeDefined();
    expect(nameSelector?.value).toBe('input[name="user_email"]');
  });

  it('generates text-based selectors for buttons', () => {
    document.body.innerHTML = '<button>Log In</button>';
    const btn = document.querySelector('button')!;
    const selectors = SelectorEngine.generateSelectors(btn);

    const textSelector = selectors.find((s) => s.type === 'text');
    expect(textSelector).toBeDefined();
    expect(textSelector?.value).toContain('Log In');
  });

  it('penalizes selectors that match multiple elements', () => {
    document.body.innerHTML = `
      <div class="card">First</div>
      <div class="card">Second</div>
      <div class="card">Third</div>
    `;

    const firstCard = document.querySelector('.card')!;
    const candidate = {
      type: 'css' as const,
      value: '.card',
      score: 0.75,
    };

    const validated = SelectorEngine.validateAndScore(candidate, firstCard);
    expect(validated).not.toBeNull();
    // 3 matches should penalize the score
    expect(validated!.score).toBeLessThan(0.75);
  });
});
