import { describe, it, expect } from 'vitest';
import { PrivacyGuard } from '@core/privacy-guard';
import type { Workflow, InputStep, NavigateStep } from '@shared/types';
import { createEmptyWorkflow } from '@shared/utils';

describe('Phase 9 — Privacy & Security Hardening', () => {
  describe('Sensitive Field Detection', () => {
    it('detects type="password" fields', () => {
      expect(PrivacyGuard.isSensitiveField({ type: 'password' })).toBe(true);
      expect(PrivacyGuard.isSensitiveField({ type: 'text' })).toBe(false);
    });

    it('detects autocomplete sensitive tokens', () => {
      expect(PrivacyGuard.isSensitiveField({ autocomplete: 'current-password' })).toBe(true);
      expect(PrivacyGuard.isSensitiveField({ autocomplete: 'cc-number' })).toBe(true);
      expect(PrivacyGuard.isSensitiveField({ autocomplete: 'one-time-code' })).toBe(true);
      expect(PrivacyGuard.isSensitiveField({ autocomplete: 'username' })).toBe(false);
    });

    it('detects sensitive names, IDs, placeholders, and labels', () => {
      expect(PrivacyGuard.isSensitiveField({ name: 'user_cvv' })).toBe(true);
      expect(PrivacyGuard.isSensitiveField({ id: 'pan_card_input' })).toBe(true);
      expect(PrivacyGuard.isSensitiveField({ placeholder: 'Enter Aadhaar Number' })).toBe(true);
      expect(PrivacyGuard.isSensitiveField({ ariaLabel: 'One Time Password' })).toBe(true);
      expect(PrivacyGuard.isSensitiveField({ name: 'firstName' })).toBe(false);
    });
  });

  describe('Sensitive Value Pattern Matching', () => {
    it('identifies credit card numbers in text', () => {
      expect(PrivacyGuard.containsSensitiveData('4532 0150 1234 5678')).toBe(true);
      expect(PrivacyGuard.containsSensitiveData('4532-0150-1234-5678')).toBe(true);
      expect(PrivacyGuard.containsSensitiveData('hello world')).toBe(false);
    });

    it('identifies Indian PAN card formats', () => {
      expect(PrivacyGuard.containsSensitiveData('ABCDE1234F')).toBe(true);
      expect(PrivacyGuard.containsSensitiveData('NOT_A_PAN')).toBe(false);
    });

    it('identifies Indian Aadhaar card formats', () => {
      expect(PrivacyGuard.containsSensitiveData('9876 5432 1098')).toBe(true);
    });

    it('identifies Bearer tokens and JWTs', () => {
      const dummyJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.doNotLeakThisSecretSignature';
      expect(PrivacyGuard.containsSensitiveData(dummyJwt)).toBe(true);
    });
  });

  describe('URL Query Parameter Sanitization', () => {
    it('strips credentials and access tokens from recorded navigation URLs', () => {
      const dirtyUrl = 'https://app.example.com/oauth/callback?code=abc&access_token=secret_12345&state=ok';
      const cleanUrl = PrivacyGuard.sanitizeUrl(dirtyUrl);

      expect(cleanUrl).toContain('access_token=%5BREDACTED%5D');
      expect(cleanUrl).not.toContain('secret_12345');
      expect(cleanUrl).toContain('state=ok');
    });

    it('preserves clean URLs without query parameters', () => {
      const cleanUrl = 'https://portal.example.com/dashboard/home';
      expect(PrivacyGuard.sanitizeUrl(cleanUrl)).toBe(cleanUrl);
    });
  });

  describe('Workflow Sanitization for Export', () => {
    it('masks passwords and sensitive inputs with variable placeholders', () => {
      const wf: Workflow = createEmptyWorkflow('Sanitize Test');

      const navStep: NavigateStep = {
        id: 'step_nav',
        type: 'navigate',
        url: 'https://site.com/login?token=super_secret_token',
        description: 'Navigate',
      };

      const pwdStep: InputStep = {
        id: 'step_pwd',
        type: 'input',
        target: {
          tagName: 'INPUT',
          classes: [],
          name: 'password',
          selectors: [{ type: 'id', value: '#pwd', score: 0.9 }],
        },
        value: 'plaintextPassword123!',
        sensitive: true,
        description: 'Enter password',
      };

      const regularStep: InputStep = {
        id: 'step_user',
        type: 'input',
        target: {
          tagName: 'INPUT',
          classes: [],
          name: 'username',
          selectors: [{ type: 'id', value: '#user', score: 0.9 }],
        },
        value: 'johndoe',
        sensitive: false,
        description: 'Enter username',
      };

      wf.steps = [navStep, pwdStep, regularStep];

      const sanitized = PrivacyGuard.sanitizeWorkflow(wf);

      expect((sanitized.steps[0] as NavigateStep).url).toContain('token=%5BREDACTED%5D');
      expect((sanitized.steps[0] as NavigateStep).url).not.toContain('super_secret_token');

      expect((sanitized.steps[1] as InputStep).value).toBe('{{password}}');
      expect((sanitized.steps[2] as InputStep).value).toBe('johndoe');
    });
  });
});
