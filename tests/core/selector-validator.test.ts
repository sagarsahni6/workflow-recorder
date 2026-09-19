import { describe, it, expect, beforeEach } from 'vitest';
import { SelectorValidator } from '@core/selector-validator';

describe('SelectorValidator', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('validates CSS selectors and checks referential equality to target element', () => {
    document.body.innerHTML = `
      <div class="container">
        <button id="targetBtn">Click</button>
        <button id="otherBtn">Other</button>
      </div>
    `;

    const targetBtn = document.getElementById('targetBtn')!;
    const otherBtn = document.getElementById('otherBtn')!;

    const validResult = SelectorValidator.validate('#targetBtn', 'id', targetBtn);
    expect(validResult.isValid).toBe(true);
    expect(validResult.matches).toBe(1);
    expect(validResult.isTarget).toBe(true);
    expect(validResult.matchedElement).toBe(targetBtn);

    const wrongTargetResult = SelectorValidator.validate('#otherBtn', 'id', targetBtn);
    expect(wrongTargetResult.isValid).toBe(true);
    expect(wrongTargetResult.isTarget).toBe(false); // matches otherBtn, not targetBtn!
    expect(wrongTargetResult.matchedElement).toBe(otherBtn);
  });

  it('validates XPath selectors and counts matches accurately', () => {
    document.body.innerHTML = `
      <ul>
        <li>Apple</li>
        <li>Banana</li>
        <li>Orange</li>
      </ul>
    `;

    const result = SelectorValidator.validate('//ul/li', 'xpath');
    expect(result.isValid).toBe(true);
    expect(result.matches).toBe(3);
    expect(result.matchedElement?.textContent).toBe('Apple');
  });

  it('safely handles syntax errors in malformed selectors without throwing', () => {
    const brokenCssResult = SelectorValidator.validate('button[unclosed-bracket', 'css');
    expect(brokenCssResult.isValid).toBe(false);
    expect(brokenCssResult.matches).toBe(0);

    const brokenXpathResult = SelectorValidator.validate('///broken//[xpath', 'xpath');
    expect(brokenXpathResult.isValid).toBe(false);
    expect(brokenXpathResult.matches).toBe(0);
  });
});
