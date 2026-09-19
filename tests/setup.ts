/**
 * Vitest test setup — global mocks and configuration.
 */

import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';

// ─── Chrome API Mock ──────────────────────────────────────────────────

// Provide a minimal mock of the chrome.runtime API so that modules
// importing @shared/messages can be loaded in unit tests.

const chromeMock = {
  runtime: {
    sendMessage: vi.fn((_message: unknown, callback?: (response: unknown) => void) => {
      if (callback) callback({});
      return Promise.resolve();
    }),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
      hasListener: vi.fn(() => false),
    },
    onInstalled: {
      addListener: vi.fn(),
    },
    lastError: null as chrome.runtime.LastError | null,
    getURL: vi.fn((path: string) => `chrome-extension://fake-id/${path}`),
    getManifest: vi.fn(() => ({ version: '1.0.0' })),
  },
  tabs: {
    query: vi.fn(() => Promise.resolve([])),
    sendMessage: vi.fn(
      (_tabId: number, _message: unknown, callback?: (response: unknown) => void) => {
        if (callback) callback({});
        return Promise.resolve();
      }
    ),
    create: vi.fn(() => Promise.resolve({ id: 1 })),
  },
  storage: {
    local: {
      get: vi.fn(() => Promise.resolve({})),
      set: vi.fn(() => Promise.resolve()),
    },
  },
};

// Assign to globalThis for tests
Object.defineProperty(globalThis, 'chrome', {
  value: chromeMock,
  writable: true,
});
