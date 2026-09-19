# Privacy & Security Model

## Overview

The Workflow Recorder is designed with strict **privacy-by-default** principles. Because automation recording touches live user interfaces that may handle credentials, financial records, or personal data, the extension implements multiple layers of automatic sanitization, masking, and security isolation.

---

## Core Privacy Guarantees

### 1. Zero External Telemetry
- The extension contains zero tracking scripts, telemetry calls, or remote error reporters.
- All network operations use standard Chrome Extension message channels (`chrome.runtime.sendMessage`, `chrome.tabs.sendMessage`).
- Outgoing HTTP/HTTPS calls (`fetch`, `XMLHttpRequest`, `navigator.sendBeacon`) are strictly $0$.
- All workflow data, metadata, and screenshots are stored exclusively in client-side **IndexedDB**.

### 2. Automatic Password Masking
- Any input element with `type="password"` is automatically identified.
- Real keystrokes are intercepted and substituted with `{{password}}` or masked tokens. Plaintext passwords never enter memory buffers, logs, or IndexedDB storage.

### 3. Sensitive Field Detection
The centralized `PrivacyGuard` (`src/core/privacy-guard.ts`) scans element metadata (`name`, `id`, `autocomplete`, `aria-label`, placeholder, and associated `<label>` text) against comprehensive sensitive identifier patterns:
- **Authentication**: `password`, `passwd`, `pin`, `auth_token`, `access_token`, `secret`
- **Verification**: `otp`, `one-time`, `verification_code`
- **Financial**: `credit_card`, `card_number`, `cvv`, `cvc`, `bank_account`, `routing_number`, `upi`
- **Government Identifiers**: `ssn`, `social_security`, `aadhaar`, `aadhar`, `pan_card`, `pan_number`

Inputs matching these patterns are flagged as `sensitive: true` and replaced with masked representations.

### 4. URL Sanitization
Recorded URL navigation steps are scrubbed of secret tokens and credentials:
- Query parameters matching `token`, `access_token`, `auth`, `key`, `apiKey`, `password`, `secret`, `sessionId` are sanitized.
- HTTP basic authentication credentials embedded in URLs (`https://user:pass@host/`) are stripped.

### 5. Clipboard Isolation
- The recorder never captures raw system clipboard data. Clipboard paste events are represented by key action (`Ctrl+V` or `Cmd+V`) without logging clipboard payload contents.

---

## Browser Security & Content Security Policy (CSP)

### Manifest V3 Enforcement
- The extension operates strictly under Manifest V3 CSP rules:
  ```json
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
  ```
- No remote scripts, CDN scripts, or dynamic code evaluation (`eval`, `new Function()`) are permitted or used.
- All React components render data through JSX text escaping or sanitized DOM properties, eliminating XSS injection vectors.

### Permission Minimization
Only permissions strictly required for extension functionality are declared in `manifest.json`:
- `storage`: Client configuration synchronization (`chrome.storage.local`).
- `tabs`: Querying active tab status during recording triggers.
- `scripting`: Dynamic content script injection.
- `downloads`: Tracking download completion events during recording.
- `<all_urls>`: Required for content script recording injection across arbitrary user-specified websites.
