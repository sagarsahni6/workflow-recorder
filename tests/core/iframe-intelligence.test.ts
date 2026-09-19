import { describe, it, expect, beforeEach } from 'vitest';
import { DOMInspector } from '@core/dom-inspector';

describe('Iframe & Label Intelligence', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('findAssociatedLabel()', () => {
    it('discovers label associated via for="id" attribute', () => {
      document.body.innerHTML = `
        <label for="emailInput">Your Email Address</label>
        <input id="emailInput" type="email" />
      `;

      const input = document.getElementById('emailInput')!;
      const labelText = DOMInspector.findAssociatedLabel(input);

      expect(labelText).toBe('Your Email Address');

      const info = DOMInspector.inspect(input);
      expect(info.labelText).toBe('Your Email Address');
      expect(info.ariaLabel).toBe('Your Email Address');
    });

    it('discovers enclosing label text', () => {
      document.body.innerHTML = `
        <label>
          <span>Subscribe to newsletter</span>
          <input id="newsletter" type="checkbox" />
        </label>
      `;

      const input = document.getElementById('newsletter')!;
      const labelText = DOMInspector.findAssociatedLabel(input);

      expect(labelText).toContain('Subscribe to newsletter');
    });

    it('discovers label via aria-labelledby', () => {
      document.body.innerHTML = `
        <span id="headingBilling">Billing Address</span>
        <input id="address" aria-labelledby="headingBilling" type="text" />
      `;

      const input = document.getElementById('address')!;
      const labelText = DOMInspector.findAssociatedLabel(input);

      expect(labelText).toBe('Billing Address');
    });
  });

  describe('getFrameContext()', () => {
    it('identifies top-level window as main frame', () => {
      document.body.innerHTML = '<button id="btn">Click</button>';
      const btn = document.getElementById('btn')!;

      const frameContext = DOMInspector.getFrameContext(btn);
      expect(frameContext.type).toBe('main');
      expect(frameContext.depth).toBe(0);
      expect(frameContext.selectors).toHaveLength(0);
    });
  });
});
