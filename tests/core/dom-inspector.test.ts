import { describe, it, expect, beforeEach } from 'vitest';
import { DOMInspector } from '@core/dom-inspector';

describe('DOMInspector', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('inspect()', () => {
    it('extracts metadata from a button element', () => {
      document.body.innerHTML = `
        <button id="submitBtn" class="btn btn-primary" aria-label="Submit Application" role="button">
          Submit Application
        </button>
      `;
      const btn = document.getElementById('submitBtn')!;
      const info = DOMInspector.inspect(btn);

      expect(info.tagName).toBe('BUTTON');
      expect(info.id).toBe('submitBtn');
      expect(info.ariaLabel).toBe('Submit Application');
      expect(info.role).toBe('button');
      expect(info.text).toBe('Submit Application');
      expect(info.classes).toContain('btn');
      expect(info.classes).toContain('btn-primary');
      expect(info.isSensitive).toBe(false);
    });

    it('extracts metadata from an input element with value', () => {
      document.body.innerHTML = `
        <input id="username" name="user_login" type="text" placeholder="Enter username" value="john_doe" />
      `;
      const input = document.getElementById('username')!;
      const info = DOMInspector.inspect(input);

      expect(info.tagName).toBe('INPUT');
      expect(info.id).toBe('username');
      expect(info.name).toBe('user_login');
      expect(info.type).toBe('text');
      expect(info.placeholder).toBe('Enter username');
      expect(info.value).toBe('john_doe');
      expect(info.isSensitive).toBe(false);
    });

    it('extracts state from a checkbox element', () => {
      document.body.innerHTML = `
        <input id="agreeTerms" type="checkbox" checked />
      `;
      const checkbox = document.getElementById('agreeTerms') as HTMLInputElement;
      const info = DOMInspector.inspect(checkbox);

      expect(info.type).toBe('checkbox');
      expect(info.checked).toBe(true);
    });

    it('extracts state from a select element', () => {
      document.body.innerHTML = `
        <select id="countrySelect">
          <option value="us">United States</option>
          <option value="in" selected>India</option>
        </select>
      `;
      const select = document.getElementById('countrySelect') as HTMLSelectElement;
      const info = DOMInspector.inspect(select);

      expect(info.tagName).toBe('SELECT');
      expect(info.value).toBe('in');
    });
  });

  describe('detectSensitive()', () => {
    it('flags password input types as sensitive', () => {
      document.body.innerHTML = '<input id="pwd" type="password" />';
      const input = document.getElementById('pwd')!;
      expect(DOMInspector.inspect(input).isSensitive).toBe(true);
    });

    it('flags credit card and OTP fields as sensitive', () => {
      document.body.innerHTML = `
        <input id="cardNum" name="creditCardNumber" type="text" />
        <input id="otpCode" placeholder="Enter OTP code" type="text" />
        <input id="cvv" name="card_cvv" type="text" />
      `;

      expect(DOMInspector.inspect(document.getElementById('cardNum')!).isSensitive).toBe(true);
      expect(DOMInspector.inspect(document.getElementById('otpCode')!).isSensitive).toBe(true);
      expect(DOMInspector.inspect(document.getElementById('cvv')!).isSensitive).toBe(true);
    });

    it('does not flag ordinary inputs as sensitive', () => {
      document.body.innerHTML = '<input id="firstName" name="first_name" type="text" />';
      expect(DOMInspector.inspect(document.getElementById('firstName')!).isSensitive).toBe(false);
    });
  });

  describe('extractStableClasses()', () => {
    it('preserves clean class names and filters out dynamic hash classes', () => {
      document.body.innerHTML = '<div id="test" class="btn btn-lg css-1a2b3c jss-456 active"></div>';
      const div = document.getElementById('test')!;
      const classes = DOMInspector.extractStableClasses(div);

      expect(classes).toContain('btn');
      expect(classes).toContain('btn-lg');
      expect(classes).toContain('active');
      expect(classes).not.toContain('css-1a2b3c');
      expect(classes).not.toContain('jss-456');
    });
  });

  describe('findInteractiveAncestor()', () => {
    it('returns the parent button when a nested span or icon is clicked', () => {
      document.body.innerHTML = `
        <button id="saveBtn">
          <span id="saveIcon">💾</span>
          <span id="saveText">Save</span>
        </button>
      `;

      const icon = document.getElementById('saveIcon')!;
      const text = document.getElementById('saveText')!;
      const btn = document.getElementById('saveBtn')!;

      expect(DOMInspector.findInteractiveAncestor(icon)).toBe(btn);
      expect(DOMInspector.findInteractiveAncestor(text)).toBe(btn);
    });

    it('returns the element itself if it is already interactive', () => {
      document.body.innerHTML = '<a id="homeLink" href="/">Home</a>';
      const link = document.getElementById('homeLink')!;
      expect(DOMInspector.findInteractiveAncestor(link)).toBe(link);
    });
  });
});
