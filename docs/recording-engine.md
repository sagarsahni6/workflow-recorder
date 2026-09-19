# Recording Engine & Event Normalization

## Overview

The Recording Engine operates in the browser tab content script environment. It captures raw user events, filters out background noise, normalizes keystrokes and scroll movements into discrete logical actions, and dispatches structured events to the extension background service worker.

---

## Event Pipeline

```text
User Interaction
       ↓
Passive Event Listeners (EventCapture)
       ↓
Target Inspection (DOMInspector & SelectorEngine)
       ↓
Privacy Scrubbing (PrivacyGuard)
       ↓
Noise Filtering & Event Normalizer (EventNormalizer)
       ↓
Message Dispatcher (EVENT_RECORDED)
       ↓
Service Worker → WorkflowBuilder → IndexedDB
```

---

## Noise Reduction & Event Normalization

Raw browser interaction generates thousands of redundant events. The `EventNormalizer` (`src/core/event-normalizer.ts`) converts these streams into clean steps:

### 1. Intelligent Keystroke Grouping
- As a user types into `<input>` or `<textarea>`, the browser emits `keydown`, `keypress`, `input`, and `keyup` for every single character.
- The normalizer collects successive input characters into a pending buffer associated with the target element.
- The buffer is flushed into a single logical `input` step when:
  - The user blurs or leaves the field (`blur` or `focusout`).
  - The user presses `Enter` or `Tab`.
  - The user interacts with another element (click or navigation).
  - A configurable inactivity timer expires (default: 800ms).

### 2. Scroll Debouncing
- Rapid scroll actions emit dozens of events per second.
- The engine uses a 400ms debounce window.
- The resulting `scroll` step records only the final settling position:
  ```json
  {
    "type": "scroll",
    "position": { "x": 0, "y": 1420 }
  }
  ```

### 3. Redundant Action Suppression
- Clicking an `<input>` followed by typing into it does not create a superfluous `click` step; the interaction is merged cleanly into the `input` step.
- Repeated duplicate clicks within 200ms on the same element are merged into a single action or `dblclick`.
- Hover steps are recorded only when the user pauses over an element longer than `hoverDelayMs` (default: 500ms).

---

## Floating Controller Isolation

The on-screen recording controller allows the user to monitor elapsed time, view recorded step counts, and pause or stop recording directly from the target page.

### Shadow DOM Architecture
- Injected as `<workflow-recorder-controller>` with a closed Shadow DOM.
- Internal CSS uses CSS custom properties scoped strictly to the shadow root.
- All elements carry `data-workflow-recorder-ignore="true"`.
- `EventCapture` inspects `event.composedPath()`; if any ancestor has the ignore attribute or belongs to the shadow host, the event is immediately discarded.

---

## Multi-Tab & Lifecycle Tracking

The background service worker coordinates recording across browser tabs:
- `chrome.tabs.onCreated` and `chrome.tabs.onActivated` are monitored.
- Numeric runtime tab IDs are mapped to stable logical tab keys: `tab_1`, `tab_2`, `tab_3`.
- Tab operations emit:
  - `newTab`: Logical tab creation and navigation
  - `switchTab`: Switching focus between tabs
  - `closeTab`: Closing auxiliary tabs
