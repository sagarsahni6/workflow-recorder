/**
 * Privacy Guard.
 *
 * Centralized privacy enforcement and security sanitizer:
 * - Password & credential masking
 * - Financial & identity data pattern detection (Cards, CVV, OTP, PAN, Aadhaar)
 * - Token & authorization header redaction
 * - Sensitive URL query parameter scrubbing
 * - Workflow export sanitization
 * - Zero external telemetry guarantee
 */

import type { Workflow, WorkflowStep } from '@shared/types';

export class PrivacyGuard {
  /**
   * Regular expressions for detecting sensitive credentials and identity tokens.
   */
  private static readonly SENSITIVE_FIELD_NAMES = /password|passwd|pwd|secret|token|apikey|api_key|auth|bearer|cvv|cvc|ssn|social_security|credit_card|card_number|cardnum|aadhaar|pan_card|otp|pin|passcode/i;

  private static readonly SENSITIVE_INPUT_TYPES = new Set([
    'password',
  ]);

  /** Patterns detecting sensitive values in plain text. */
  private static readonly CREDIT_CARD_REGEX = /\b(?:\d[ -]*?){13,19}\b/;
  private static readonly JWT_OR_AUTH_TOKEN_REGEX = /\b(?:Bearer\s+)?[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*\b/;
  private static readonly PAN_CARD_REGEX = /\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/;
  private static readonly AADHAAR_REGEX = /\b\d{4}\s?\d{4}\s?\d{4}\b/;

  /**
   * Detects whether an element or attribute metadata represents a sensitive field.
   */
  public static isSensitiveField(metadata: {
    name?: string;
    id?: string;
    type?: string;
    ariaLabel?: string;
    placeholder?: string;
    autocomplete?: string;
  }): boolean {
    if (metadata.type && this.SENSITIVE_INPUT_TYPES.has(metadata.type.toLowerCase())) {
      return true;
    }

    if (metadata.autocomplete && /current-password|new-password|cc-number|cc-csc|one-time-code/i.test(metadata.autocomplete)) {
      return true;
    }

    const identifiers = [
      metadata.name,
      metadata.id,
      metadata.ariaLabel,
      metadata.placeholder,
    ].filter(Boolean) as string[];

    return identifiers.some((val) => this.SENSITIVE_FIELD_NAMES.test(val));
  }

  /**
   * Checks whether a literal string contains high-risk sensitive patterns.
   */
  public static containsSensitiveData(value: string): boolean {
    if (!value || typeof value !== 'string') return false;
    const trimmed = value.trim();

    if (this.CREDIT_CARD_REGEX.test(trimmed) && trimmed.replace(/\D/g, '').length >= 13) {
      return true;
    }
    if (this.PAN_CARD_REGEX.test(trimmed)) {
      return true;
    }
    if (this.AADHAAR_REGEX.test(trimmed) && trimmed.replace(/\D/g, '').length === 12) {
      return true;
    }
    if (this.JWT_OR_AUTH_TOKEN_REGEX.test(trimmed) && trimmed.length > 30 && trimmed.includes('.')) {
      return true;
    }

    return false;
  }

  /**
   * Masks a sensitive string into a variable reference placeholder.
   */
  public static maskValue(fieldName = 'password'): string {
    const clean = fieldName.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    return `{{${clean}}}`;
  }

  /**
   * Cleans sensitive query parameters from URLs (e.g. access_token, api_key, auth, session_id).
   */
  public static sanitizeUrl(rawUrl: string): string {
    try {
      const parsed = new URL(rawUrl);
      const sensitiveParams = ['token', 'access_token', 'api_key', 'apikey', 'auth', 'sessionId', 'session_id', 'password', 'secret', 'signature'];

      let changed = false;
      for (const param of sensitiveParams) {
        if (parsed.searchParams.has(param)) {
          parsed.searchParams.set(param, '[REDACTED]');
          changed = true;
        }
      }

      return changed ? parsed.toString() : rawUrl;
    } catch {
      return rawUrl;
    }
  }

  /**
   * Sanitizes a full workflow prior to exporting or sharing, ensuring no
   * unprotected passwords or credential leaks exist in step values or URLs.
   */
  public static sanitizeWorkflow(workflow: Workflow): Workflow {
    const cloned: Workflow = JSON.parse(JSON.stringify(workflow));

    cloned.steps = cloned.steps.map((step: WorkflowStep) => {
      if (step.type === 'navigate') {
        return {
          ...step,
          url: this.sanitizeUrl(step.url),
        };
      }

      if (step.type === 'input') {
        const isSensitive = step.sensitive || this.isSensitiveField({
          name: step.target.name,
          id: step.target.id,
          placeholder: step.target.placeholder,
          ariaLabel: step.target.ariaLabel,
        }) || this.containsSensitiveData(step.value);

        if (isSensitive && !step.value.startsWith('{{') && !step.value.endsWith('}}')) {
          return {
            ...step,
            value: this.maskValue(step.target.name || 'sensitive_input'),
            sensitive: true,
          };
        }
      }

      return step;
    });

    return cloned;
  }
}
