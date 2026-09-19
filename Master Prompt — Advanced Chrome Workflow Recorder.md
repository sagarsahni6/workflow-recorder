# MASTER PROMPT
## Build an Advanced Chrome Workflow Recorder & Automation Exporter Extension

You are a senior Chrome Extension architect, TypeScript engineer, frontend engineer, browser automation engineer, security engineer, and QA engineer.

Your task is to build a production-quality **Google Chrome Extension** from scratch called:

# Workflow Recorder

The extension records a user's browser workflow in detail, converts browser interactions into structured workflow steps, allows the user to edit and organize those steps, stores workflows locally, and exports them into JSON and multiple automation/code formats.

The architecture must be designed so AI-powered workflow analysis and browser automation can be added later without rewriting the core system.

---

# 1. PRODUCT VISION

The extension should work like this:

User opens Chrome.

User clicks:

> Start Recording

The extension records meaningful browser actions such as:

- page navigation
- clicks
- double clicks
- right clicks
- text input
- keyboard actions
- checkbox changes
- radio button changes
- dropdown/select changes
- scrolling
- hovering
- focus/blur
- file uploads
- downloads
- new tabs
- tab switching
- browser back/forward
- page reload
- popup/window-related events where technically possible
- iframe interactions where technically possible

The extension must NOT simply record mouse coordinates.

It must understand the target DOM element and store robust selectors and element metadata.

After recording, the user can open the Workflow Editor and see:

1. Open website
2. Click Login
3. Enter username
4. Enter password
5. Click Login
6. Select State
7. Upload document
8. Click Submit
9. Wait for result

The user can edit every step.

The workflow can then be exported as:

- JSON
- YAML
- CSV
- Markdown
- Playwright JavaScript
- Playwright TypeScript
- Puppeteer JavaScript
- Selenium Python

The internal JSON format must be the canonical workflow representation.

---

# 2. IMPORTANT DEVELOPMENT RULE

DO NOT attempt to implement the entire application in one giant step.

Build it in phases.

After each phase:

1. inspect the existing code
2. run type checking
3. run linting
4. run tests
5. build the Chrome extension
6. fix errors
7. verify the architecture
8. continue to the next phase

Do not leave placeholder implementations for core functionality.

If a feature cannot be implemented reliably because of Chrome platform limitations, document the limitation and implement the best possible fallback.

Never invent Chrome APIs.

---

# 3. TECHNOLOGY STACK

Use:

- TypeScript
- React
- Vite
- Chrome Extension Manifest V3
- IndexedDB
- Web APIs
- Chrome Extension APIs
- modern CSS

Use a clean component architecture.

Avoid unnecessary dependencies.

Prefer browser-native APIs where practical.

Do NOT use a backend for the initial version.

The extension must work locally.

Do NOT require user accounts.

Do NOT require an API key.

Do NOT require an AI API.

AI will be added later as an optional module.

---

# 4. UI REQUIREMENTS

Create three major UI surfaces.

## A. Popup

The popup should be compact.

Example:

```text
┌──────────────────────────────┐
│ Workflow Recorder            │
│                              │
│ ● Ready                      │
│                              │
│ [ Start Recording ]          │
│                              │
│ Recent Workflows             │
│                              │
│ Customer Registration        │
│ Portal Login                 │
│ Data Entry                   │
│                              │
│ [ View All Workflows ]       │
│                              │
│ ⚙ Settings                   │
└──────────────────────────────┘
```

Popup functionality:

- start recording
- stop recording if active
- pause recording
- resume recording
- show current recording status
- show action count
- open workflow editor
- open workflow library
- open settings

---

# 5. FLOATING RECORDING CONTROLLER

When recording is active, inject a small floating recording controller into supported web pages.

Example:

```text
┌─────────────────────────────────────┐
│ 🔴 Recording       00:03:42         │
│ 17 actions                          │
│                                     │
│ [ Pause ] [ Stop ] [ Settings ]     │
└─────────────────────────────────────┘
```

Requirements:

- draggable
- unobtrusive
- does not interfere with normal page interaction
- visually clear that recording is active
- should not itself generate recorded actions
- prevent recorder UI clicks from becoming workflow steps

---

# 6. FULL WORKFLOW EDITOR

Create a dedicated extension page.

Layout:

```text
┌──────────────────────────────────────────────────────────┐
│ Workflow: Customer Registration                           │
├──────────────┬───────────────────────────────┬───────────┤
│ STEPS        │ STEP DETAILS                  │ PREVIEW   │
│              │                               │           │
│ 1 Navigate   │ Action: Click                 │ Screenshot│
│ 2 Click      │                               │           │
│ 3 Input      │ Target: Submit                │           │
│ 4 Select     │ Selector: #submit             │           │
│ 5 Upload     │                               │           │
│ 6 Click      │ Wait: 1000ms                  │           │
│              │ Retry: 3                      │           │
│              │                               │           │
└──────────────┴───────────────────────────────┴───────────┘
```

Features:

- view all steps
- select step
- edit step
- delete step
- duplicate step
- reorder steps
- drag and drop steps
- rename workflow
- add manual step
- disable step
- enable step
- add comments
- add variables
- export workflow
- import workflow

---

# 7. RECORDING ENGINE

Create a modular recording engine.

Suggested architecture:

```text
RecorderEngine
    ↓
EventCapture
    ↓
EventNormalizer
    ↓
DOMInspector
    ↓
SelectorEngine
    ↓
StepBuilder
    ↓
WorkflowStore
```

Do not tightly couple browser event listeners directly to the UI.

The recorder engine must be independently testable.

---

# 8. EVENTS TO CAPTURE

Implement support for:

## Navigation

Record:

- initial URL
- navigation to another URL
- history navigation where detectable
- reload where appropriate

Example:

```json
{
  "type": "navigate",
  "url": "https://example.com"
}
```

---

## Click

Capture:

- left click
- double click
- right click if meaningful

Capture:

- target element
- coordinates
- DOM metadata
- selectors
- timestamp

Do not rely on coordinates as the primary replay method.

---

## Input

Capture text input.

For example:

```json
{
  "type": "input",
  "target": {},
  "value": "{{customer_name}}"
}
```

Implement intelligent input grouping.

If the user types:

```text
S
Sa
Sag
Saga
Sagar
```

DO NOT generate five workflow steps.

Generate one logical input action:

```text
Enter "Sagar"
```

---

# 9. PASSWORD AND SENSITIVE INPUTS

This is extremely important.

Never casually store sensitive information.

For:

```text
<input type="password">
```

do NOT store the actual password.

Store:

```json
{
  "type": "input",
  "sensitive": true,
  "value": "{{password}}"
}
```

For fields that appear to contain:

- password
- OTP
- Aadhaar
- PAN
- credit/debit card number
- CVV
- bank account number
- UPI information
- authentication tokens

apply sensitive-data protection.

Create a configurable privacy system.

Settings:

```text
Privacy

[✓] Mask password fields
[✓] Mask sensitive inputs
[✓] Mask OTP fields
[✓] Don't record clipboard contents
[✓] Don't record authentication headers
[✓] Don't record cookies
[✓] Don't record localStorage
[✓] Don't record sessionStorage
```

Never capture cookies, authentication tokens, HTTP authorization headers, or browser credentials.

---

# 10. VARIABLE DETECTION

The recorder should be able to identify dynamic input.

Example:

User types:

```text
Sagar
```

The extension should allow the user to convert it into:

```text
{{customer_name}}
```

Create a Variables panel.

Example:

```text
Variables

customer_name
Type: string
Required: true

mobile
Type: string
Required: true

state
Type: string
Required: true

document
Type: file
Required: true
```

Variable types:

- string
- number
- boolean
- date
- datetime
- email
- phone
- file
- URL
- JSON

---

# 11. SELECT / DROPDOWN

Record:

- HTML select
- custom dropdowns where detectable
- selected option
- visible text
- value

Example:

```json
{
  "type": "select",
  "target": {},
  "value": "Bihar",
  "label": "Bihar"
}
```

For custom dropdowns, capture the actual interaction steps when possible.

---

# 12. CHECKBOX / RADIO

Record:

```json
{
  "type": "checkbox",
  "target": {},
  "checked": true
}
```

and:

```json
{
  "type": "radio",
  "target": {},
  "value": "male"
}
```

---

# 13. SCROLL

Do not record hundreds of scroll events.

Debounce and intelligently normalize them.

Instead of:

```text
scroll
scroll
scroll
scroll
scroll
```

generate:

```json
{
  "type": "scroll",
  "position": {
    "x": 0,
    "y": 1200
  }
}
```

Allow settings:

```text
Scroll Recording

○ Don't record scroll
○ Record major scrolls
○ Record every scroll
```

Default to major scrolls.

---

# 14. HOVER

Record hover only when it is meaningful.

Avoid recording accidental mouse movement.

For example:

```json
{
  "type": "hover",
  "target": {}
}
```

Only create a hover step after a configurable delay.

Default:

```text
500ms
```

---

# 15. KEYBOARD ACTIONS

Record meaningful keyboard actions:

- Enter
- Escape
- Tab
- Arrow keys
- Delete
- Backspace when relevant
- Ctrl+A
- Ctrl+C where appropriate
- Ctrl+V where appropriate

Do not store arbitrary sensitive clipboard contents.

Example:

```json
{
  "type": "keyPress",
  "key": "Enter"
}
```

---

# 16. FILE UPLOAD

Detect file input elements.

Record:

```json
{
  "type": "upload",
  "target": {},
  "file": "{{document}}"
}
```

Do not store private file contents inside workflow JSON.

Store a variable reference.

Example:

```text
{{document}}
```

---

# 17. DOWNLOAD DETECTION

Where technically possible, detect downloads initiated by the workflow.

Represent them as:

```json
{
  "type": "download",
  "filename": "{{filename}}"
}
```

Do not expose private filesystem paths.

---

# 18. TAB MANAGEMENT

Record:

- new tab
- tab activation
- tab navigation
- tab close where possible

Represent them using logical tab IDs.

Example:

```json
{
  "type": "newTab",
  "tabId": "tab_2"
}
```

Do not depend on Chrome's real numeric tab ID inside the exported workflow because it is runtime-specific.

---

# 19. IFRAME SUPPORT

Implement iframe-aware recording where technically possible.

The recorder should know:

```text
main page
iframe
nested iframe
```

Represent frame context:

```json
{
  "frame": {
    "type": "iframe",
    "selectors": []
  }
}
```

If cross-origin iframe restrictions prevent access, handle gracefully and show a clear limitation.

---

# 20. DOM INSPECTOR

For every meaningful action, capture useful metadata.

Example:

```json
{
  "tagName": "BUTTON",
  "id": "submitBtn",
  "name": "submit",
  "type": "submit",
  "text": "Submit Application",
  "ariaLabel": "Submit Application",
  "role": "button",
  "title": "Submit Application",
  "classes": [
    "btn",
    "btn-primary"
  ]
}
```

Do not capture the entire DOM.

Capture only relevant target information.

---

# 21. SMART SELECTOR ENGINE

This is a core component.

Create:

```text
SelectorEngine
```

It should generate multiple selector candidates.

Potential selectors:

1. unique ID
2. stable name
3. ARIA label
4. accessible role/name
5. data-testid
6. stable data attributes
7. semantic attributes
8. CSS selector
9. XPath
10. text-based selector where appropriate

Example:

```json
{
  "selectors": [
    {
      "type": "id",
      "value": "#submitBtn",
      "score": 0.99
    },
    {
      "type": "aria",
      "value": "Submit Application",
      "score": 0.95
    },
    {
      "type": "css",
      "value": "button.btn-primary",
      "score": 0.72
    },
    {
      "type": "xpath",
      "value": "//button[@id='submitBtn']",
      "score": 0.90
    }
  ]
}
```

Create a selector scoring algorithm.

The score should consider:

- uniqueness
- stability
- semantic meaning
- dynamic attributes
- number of DOM levels
- generated class names
- generated IDs
- text stability
- accessibility attributes

Avoid selectors containing obviously dynamic values such as:

```text
css-8d92ks
jss-382
random generated IDs
timestamps
UUID-like strings
```

---

# 22. SELECTOR VALIDATION

When generating a selector:

1. test it against the current DOM
2. determine number of matching elements
3. determine whether it identifies the intended element
4. assign confidence score

Example:

```text
#submitBtn
Matches: 1
Confidence: 99%
```

If a selector matches 12 elements:

```text
Confidence: low
```

Do not blindly trust it.

---

# 23. SELECTOR FALLBACK SYSTEM

Every actionable step should ideally contain multiple selector strategies.

Replay order:

```text
1. strongest selector
2. accessibility selector
3. stable CSS
4. XPath
5. semantic fallback
```

Do not implement AI visual fallback yet.

Design the architecture so it can be added later.

---

# 24. SMART WAIT SYSTEM

Avoid blindly generating:

```text
wait 3000ms
```

Prefer:

```text
waitForElement
waitForVisible
waitForEnabled
waitForText
waitForURL
waitForDownload
waitForNavigation
```

Example:

```json
{
  "type": "waitForElement",
  "target": {},
  "timeout": 15000
}
```

Allow fallback timeout.

---

# 25. SCREENSHOTS

Implement optional screenshots.

Capture screenshots at meaningful points where Chrome permissions/API limitations allow.

Do not store huge uncompressed images.

Use compressed WebP where practical.

Workflow should reference screenshots rather than embedding massive base64 strings into JSON.

Example:

```json
{
  "stepId": "step_004",
  "screenshot": "screenshots/step-004.webp"
}
```

The workflow should still work if screenshots are deleted.

---

# 26. WORKFLOW DATA MODEL

Create strong TypeScript types.

Example:

```typescript
type Workflow = {
  schemaVersion: string;
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  browser?: BrowserMetadata;
  variables: WorkflowVariable[];
  steps: WorkflowStep[];
  settings: WorkflowSettings;
};
```

Use discriminated unions for workflow steps.

Example:

```typescript
type WorkflowStep =
  | NavigateStep
  | ClickStep
  | InputStep
  | SelectStep
  | CheckboxStep
  | RadioStep
  | ScrollStep
  | HoverStep
  | KeyPressStep
  | UploadStep
  | DownloadStep
  | WaitStep
  | ConditionStep
  | LoopStep
  | ScreenshotStep;
```

---

# 27. CANONICAL JSON FORMAT

Use this general structure:

```json
{
  "schemaVersion": "1.0",
  "workflow": {
    "id": "wf_001",
    "name": "Customer Registration",
    "description": "Customer registration workflow",
    "createdAt": "2026-09-15T00:00:00Z",
    "updatedAt": "2026-09-15T00:00:00Z"
  },
  "variables": [
    {
      "name": "customer_name",
      "type": "string",
      "required": true
    }
  ],
  "settings": {
    "defaultTimeout": 15000,
    "defaultRetryCount": 3
  },
  "steps": [
    {
      "id": "step_001",
      "type": "navigate",
      "url": "https://example.com"
    },
    {
      "id": "step_002",
      "type": "click",
      "target": {
        "selectors": []
      }
    }
  ]
}
```

Keep the schema versioned.

Future versions may be:

```text
1.0
1.1
2.0
```

Implement migration architecture.

---

# 28. CONDITIONS

Design the workflow engine to support conditions.

Example:

```json
{
  "type": "condition",
  "condition": {
    "target": {},
    "operator": "equals",
    "value": "Rejected"
  },
  "then": [],
  "else": []
}
```

Operators:

- equals
- notEquals
- contains
- notContains
- exists
- notExists
- visible
- hidden
- enabled
- disabled
- greaterThan
- lessThan

---

# 29. LOOPS

Support future loop structure.

Example:

```json
{
  "type": "loop",
  "source": "{{customers}}",
  "itemVariable": "customer",
  "steps": []
}
```

The recorder itself does not need to automatically discover loops.

The editor must be able to represent them.

---

# 30. ASSERTIONS

Add an assertion step type.

Examples:

```text
Verify element exists
Verify text
Verify URL
Verify value
Verify visible
Verify enabled
```

Example:

```json
{
  "type": "assert",
  "assertion": {
    "target": {},
    "operator": "containsText",
    "expected": "Success"
  }
}
```

---

# 31. LOCAL STORAGE

Use IndexedDB.

Create a clean repository abstraction:

```text
WorkflowRepository
ScreenshotRepository
SettingsRepository
```

Do not let React components directly manipulate IndexedDB.

Use a storage service.

---

# 32. WORKFLOW LIBRARY

Create a workflow library.

Features:

- create
- rename
- duplicate
- delete
- search
- sort
- import
- export
- favorite
- last modified
- action count

Example:

```text
My Workflows

⭐ Customer Registration
   24 steps

Portal Login
   8 steps

Invoice Download
   15 steps
```

---

# 33. IMPORT

Support:

```text
JSON
YAML
CSV
```

Initially, only import your own canonical JSON reliably.

For YAML/CSV:

- validate
- convert to canonical internal representation
- show validation errors

Do not silently create broken workflows.

---

# 34. EXPORT

Implement exporters as independent modules.

Architecture:

```text
Exporter
├── JSONExporter
├── YAMLExporter
├── CSVExporter
├── MarkdownExporter
├── PlaywrightJSExporter
├── PlaywrightTSExporter
├── PuppeteerExporter
└── SeleniumPythonExporter
```

All exporters consume the same canonical Workflow object.

---

# 35. JSON EXPORT

Export the complete workflow.

Filename:

```text
customer-registration.workflow.json
```

Pretty print JSON.

---

# 36. YAML EXPORT

Filename:

```text
customer-registration.workflow.yaml
```

---

# 37. CSV EXPORT

Columns:

```text
step
type
description
target
selector
value
timeout
retry
```

---

# 38. MARKDOWN EXPORT

Generate readable documentation:

```markdown
# Customer Registration

## Variables

- customer_name
- mobile
- state

## Steps

1. Navigate to website
2. Click Login
3. Enter Customer Name
4. Select State
5. Upload Document
6. Click Submit
```

---

# 39. PLAYWRIGHT EXPORT

Generate valid Playwright JavaScript.

Example:

```javascript
import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage();

await page.goto("https://example.com");

await page.locator("#login").click();

await page.locator("#customerName").fill(customer_name);

await browser.close();
```

Use appropriate Playwright APIs.

Do not generate invalid or obsolete syntax.

---

# 40. PLAYWRIGHT TYPESCRIPT EXPORT

Same as above, but strongly typed.

Include:

```typescript
interface WorkflowVariables {
  customer_name: string;
  mobile: string;
}
```

---

# 41. PUPPETEER EXPORT

Generate valid Puppeteer code.

---

# 42. SELENIUM PYTHON EXPORT

Generate valid Python Selenium code.

Use:

```python
from selenium import webdriver
from selenium.webdriver.common.by import By
```

Generate readable code.

---

# 43. DESCRIPTION GENERATOR

Every recorded step should have a human-readable description.

Examples:

```text
Click "Login"
Enter customer name
Select "Bihar"
Upload document
Scroll to 1200px
Press Enter
```

Use deterministic logic.

Do not require AI.

---

# 44. STEP NORMALIZATION

The raw browser events should NOT directly become workflow steps.

Use:

```text
Raw Events
     ↓
Event Normalizer
     ↓
Logical Actions
     ↓
Workflow Steps
```

Example:

```text
keydown S
input S
input Sa
input Sag
input Saga
input Sagar
blur
```

should become:

```text
Input "Sagar"
```

---

# 45. DUPLICATE EVENT FILTERING

Avoid duplicate steps.

Examples:

- click + focus should usually not create two workflow actions
- repeated input events should be merged
- repeated scroll events should be normalized
- mouse movement should never become workflow steps
- browser UI actions should not be recorded as page actions

---

# 46. SETTINGS

Create settings page.

Settings:

```text
Recording

[✓] Record clicks
[✓] Record typing
[✓] Record selects
[✓] Record keyboard shortcuts
[✓] Record uploads
[✓] Record downloads
[✓] Record screenshots
[✓] Record scrolls
[ ] Record hover

Input

[✓] Detect variables
[✓] Mask sensitive fields

Timing

Default wait: 500ms
Element timeout: 15 seconds
Retry count: 3

Privacy

[✓] Never record passwords
[✓] Never record cookies
[✓] Never record authentication tokens
[✓] Never record clipboard contents
```

---

# 47. PERMISSION MINIMIZATION

Request only the Chrome permissions actually needed.

Do not request unnecessary permissions.

Design permissions carefully.

Potential permissions may include:

- storage
- tabs
- scripting
- downloads

Host permissions should be minimized.

Do not request `<all_urls>` unless the implementation genuinely requires it.

If broad host access is unavoidable for the recorder, document exactly why.

Never request:

- browsing history
- cookies
- passwords
- unnecessary identity permissions

unless absolutely required by a future explicitly implemented feature.

---

# 48. PRIVACY

The initial extension should be:

## Local-first

Workflow data stays locally in the browser.

Do not send:

- workflow data
- screenshots
- typed values
- page contents
- passwords
- personal information

to any server.

No analytics should be implemented unless explicitly requested.

---

# 49. CONTENT SCRIPT SAFETY

The content script must not break websites.

Use:

- event listeners carefully
- passive listeners where appropriate
- debouncing
- throttling
- Shadow DOM isolation for UI where practical
- unique CSS class names
- cleanup on recorder stop

The floating recorder UI must not modify page behavior.

---

# 50. MESSAGE ARCHITECTURE

Use typed messaging between:

```text
Popup
Content Script
Service Worker
Editor
Storage
```

Create a shared message type system.

Example:

```typescript
type ExtensionMessage =
  | {
      type: "START_RECORDING";
    }
  | {
      type: "STOP_RECORDING";
    }
  | {
      type: "PAUSE_RECORDING";
    }
  | {
      type: "RESUME_RECORDING";
    }
  | {
      type: "EVENT_RECORDED";
      event: RawBrowserEvent;
    };
```

Avoid arbitrary untyped messages.

---

# 51. ERROR HANDLING

The extension must never silently fail.

Show useful errors.

Examples:

```text
Could not identify the target element.

The page appears to use a cross-origin iframe.

This action cannot currently be recorded.

Selector is no longer unique.

Screenshot capture failed.
```

Errors should be logged in development mode.

Do not expose sensitive values in logs.

---

# 52. DEBUG MODE

Create developer debug mode.

Display:

```text
Recorder Debug

Events received: 182
Logical actions: 31
Ignored events: 151

Last event:
CLICK

Selector:
#submit

Confidence:
98%
```

Allow export of debug logs without sensitive information.

---

# 53. TESTING

Create unit tests for:

- selector generation
- selector scoring
- selector validation
- event normalization
- input grouping
- scroll grouping
- variable extraction
- workflow validation
- JSON serialization
- JSON parsing
- schema migration
- exporters

Create integration tests for:

- recording clicks
- recording inputs
- navigation
- workflow creation
- workflow saving
- workflow loading
- import/export

Do not claim tests pass unless they actually pass.

---

# 54. WORKFLOW VALIDATOR

Create:

```text
WorkflowValidator
```

It should detect:

- invalid step IDs
- missing targets
- invalid selectors
- missing variables
- duplicate variable names
- invalid condition structures
- invalid loop structures
- unsupported schema versions

Return structured validation errors.

Example:

```json
{
  "valid": false,
  "errors": [
    {
      "path": "steps[4].target",
      "message": "Target is missing"
    }
  ]
}
```

---

# 55. JSON SCHEMA

Create a formal JSON Schema for the workflow format.

Place it in:

```text
schemas/workflow.schema.json
```

Use it to validate imported workflows.

---

# 56. ACCESSIBILITY

The UI must support:

- keyboard navigation
- visible focus
- proper labels
- semantic buttons
- accessible dialogs
- sufficient contrast
- screen-reader-friendly names

Do not use clickable `<div>` elements where buttons should be used.

---

# 57. RESPONSIVE UI

The full editor should work on:

- 1280px desktop
- 1440px desktop
- smaller laptop screens

Popup should remain compact.

---

# 58. VISUAL DESIGN

Use a modern professional developer-tool interface.

Style direction:

- clean
- minimal
- professional
- compact
- readable
- no unnecessary animations

Use cards, panels, tabs, badges and icons where appropriate.

Do not over-design it.

The workflow steps should be the main focus.

---

# 59. PROJECT STRUCTURE

Use a structure approximately like:

```text
workflow-recorder/
│
├── src/
│   ├── background/
│   │   └── service-worker.ts
│   │
│   ├── content/
│   │   ├── recorder.ts
│   │   ├── event-capture.ts
│   │   ├── event-normalizer.ts
│   │   ├── dom-inspector.ts
│   │   ├── selector-engine.ts
│   │   └── overlay/
│   │
│   ├── popup/
│   │   ├── App.tsx
│   │   └── components/
│   │
│   ├── editor/
│   │   ├── WorkflowEditor.tsx
│   │   ├── StepList.tsx
│   │   ├── StepEditor.tsx
│   │   ├── VariablePanel.tsx
│   │   └── components/
│   │
│   ├── library/
│   │   └── WorkflowLibrary.tsx
│   │
│   ├── settings/
│   │   └── Settings.tsx
│   │
│   ├── core/
│   │   ├── recorder-engine.ts
│   │   ├── workflow-builder.ts
│   │   ├── workflow-validator.ts
│   │   └── workflow-migrator.ts
│   │
│   ├── storage/
│   │   ├── indexeddb.ts
│   │   ├── workflow-repository.ts
│   │   └── screenshot-repository.ts
│   │
│   ├── selectors/
│   │   ├── selector-engine.ts
│   │   ├── selector-scoring.ts
│   │   └── selector-validator.ts
│   │
│   ├── exporters/
│   │   ├── json.ts
│   │   ├── yaml.ts
│   │   ├── csv.ts
│   │   ├── markdown.ts
│   │   ├── playwright-js.ts
│   │   ├── playwright-ts.ts
│   │   ├── puppeteer.ts
│   │   └── selenium-python.ts
│   │
│   ├── imports/
│   │   ├── json.ts
│   │   ├── yaml.ts
│   │   └── csv.ts
│   │
│   ├── shared/
│   │   ├── types.ts
│   │   ├── messages.ts
│   │   ├── constants.ts
│   │   └── utils.ts
│   │
│   └── styles/
│
├── schemas/
│   └── workflow.schema.json
│
├── tests/
│
├── public/
│   └── icons/
│
├── manifest.json
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

You may adjust the structure if there is a better architecture, but preserve separation of concerns.

---

# 60. MANIFEST V3

Use Manifest V3.

Create a correct manifest.

Include:

- extension name
- description
- version
- action
- background service worker
- content scripts
- options/editor pages
- icons
- minimum permissions

Do not include obsolete Manifest V2 APIs.

---

# 61. BUILD SYSTEM

Configure:

```text
npm install
npm run dev
npm run build
npm run test
npm run lint
npm run typecheck
```

The final build should produce a Chrome-loadable extension directory such as:

```text
dist/
```

The build must not require a server.

---

# 62. DEVELOPMENT PHASES

Implement in exactly this general sequence.

## PHASE 1

Project foundation:

- Vite
- React
- TypeScript
- Manifest V3
- popup
- service worker
- content script
- build system
- linting
- testing

Then build and verify.

---

## PHASE 2

Recording:

- start/stop
- pause/resume
- click
- input
- navigation
- select
- checkbox
- radio
- keyboard
- scroll

Then test.

---

## PHASE 3

DOM intelligence:

- DOM inspector
- selector generation
- selector scoring
- selector validation
- element metadata
- iframe awareness

Then test.

---

## PHASE 4

Workflow engine:

- logical step normalization
- duplicate filtering
- input grouping
- workflow builder
- workflow validator
- canonical JSON schema

Then test.

---

## PHASE 5

Storage:

- IndexedDB
- workflow repository
- screenshot repository
- workflow library

Then test.

---

## PHASE 6

Editor:

- step list
- step editor
- variables
- manual steps
- reorder
- delete
- duplicate
- conditions
- loops
- assertions

Then test.

---

## PHASE 7

Exports:

- JSON
- YAML
- CSV
- Markdown
- Playwright JS
- Playwright TS
- Puppeteer
- Selenium Python

Then test generated output.

---

## PHASE 8

Advanced recording:

- uploads
- downloads
- tabs
- iframe handling
- screenshots
- hover
- smart waits

Then test.

---

## PHASE 9

Privacy and security hardening.

Review the entire codebase for:

- password leakage
- token leakage
- unnecessary permissions
- sensitive logging
- unsafe DOM injection
- XSS
- unsafe HTML rendering
- insecure serialization
- local storage exposure

---

## PHASE 10

Final QA.

Test on multiple real websites with:

- forms
- dynamic elements
- React applications
- SPA navigation
- dropdowns
- iframes
- file upload
- dynamically generated IDs
- websites with delayed loading

Document known limitations.

---

# 63. IMPORTANT: DO NOT BUILD REPLAY YET

The first production milestone is:

> Record → Edit → Store → Export

Do NOT build a full automation replay engine until the recording format is stable.

However, design the data model so replay can later consume it.

Future architecture:

```text
Workflow JSON
      ↓
Automation Engine
      ↓
Browser
```

---

# 64. FUTURE AI ARCHITECTURE

Do not implement AI now.

But create interfaces that allow future AI integration.

For example:

```typescript
interface WorkflowAI {
  analyze(workflow: Workflow): Promise<WorkflowAnalysis>;
  optimize(workflow: Workflow): Promise<Workflow>;
  suggestVariables(workflow: Workflow): Promise<VariableSuggestion[]>;
  repairStep(
    workflow: Workflow,
    stepId: string
  ): Promise<WorkflowStep>;
  generateCode(
    workflow: Workflow,
    target: ExportTarget
  ): Promise<string>;
}
```

Future AI features may include:

- clean workflow
- remove unnecessary actions
- create variables
- improve selectors
- explain workflow
- repair broken selectors
- convert natural language into workflow
- generate automation code
- visually identify elements

But do not call an AI API in the initial version.

---

# 65. FUTURE CLOUD ARCHITECTURE

Do not implement now.

The application should eventually support:

```text
Chrome Extension
       ↓
Workflow JSON
       ↓
Optional Cloud
       ↓
User Account
       ↓
Workflow Library
```

But Version 1 must remain local-first.

---

# 66. SECURITY RULES

Never:

- collect passwords
- collect cookies
- collect authentication tokens
- send page contents to external servers
- silently upload screenshots
- inject remote scripts
- use eval()
- use new Function()
- execute arbitrary imported JavaScript
- execute arbitrary workflow JSON as code

Imported workflows are DATA.

Treat them as untrusted input.

---

# 67. IMPORTANT CHROME RESTRICTIONS

Respect Chrome's security model.

Do not attempt to bypass:

- Content Security Policy
- cross-origin restrictions
- Chrome Web Store security rules
- permission restrictions
- isolated worlds
- browser protected pages

Handle:

```text
chrome://
Chrome Web Store
extension pages
protected browser UI
```

gracefully.

The recorder should tell the user when a page cannot be recorded.

---

# 68. CODE QUALITY

Write production-quality code.

Requirements:

- strict TypeScript
- no `any` unless unavoidable and documented
- small modules
- reusable utilities
- clear naming
- comments only where useful
- no dead code
- no duplicate logic
- no giant components
- no giant functions
- no hardcoded environment-specific paths

---

# 69. DOCUMENTATION

Create a good README containing:

- what the extension does
- architecture
- installation
- development
- building
- loading unpacked extension
- permissions explanation
- workflow JSON format
- exporter system
- known Chrome limitations
- privacy model
- testing instructions
- future roadmap

Also create:

```text
docs/
├── architecture.md
├── workflow-schema.md
├── selector-engine.md
├── recording-engine.md
├── privacy.md
└── exporters.md
```

---

# 70. FINAL ACCEPTANCE CRITERIA

The project is complete only when:

### Recording

A user can:

- start recording
- navigate
- click
- type
- select
- check boxes
- use radio buttons
- scroll
- use keyboard actions
- stop recording

and receive clean logical workflow steps.

### DOM intelligence

Every relevant action contains:

- target metadata
- multiple selectors
- selector confidence

### Privacy

Passwords and sensitive fields are not stored as plaintext.

### Storage

Workflows survive browser restart.

### Editor

Users can:

- edit
- delete
- duplicate
- reorder
- rename
- add variables

### Export

At minimum:

- JSON
- YAML
- CSV
- Markdown
- Playwright JavaScript
- Playwright TypeScript
- Puppeteer
- Selenium Python

must work.

### Quality

The extension:

- builds successfully
- passes TypeScript checks
- passes tests
- has no obvious console errors
- has no unnecessary permissions
- does not require a backend
- does not require AI
- does not send user data externally

---

# 71. HOW YOU SHOULD WORK AS THE CODING AGENT

Before writing code:

1. inspect the repository
2. identify existing files
3. identify whether a project already exists
4. do not overwrite useful existing work without checking
5. create a development plan
6. implement Phase 1

After every phase:

```text
npm run typecheck
npm run lint
npm run test
npm run build
```

Fix every error before continuing.

Do not say:

> "This should work."

Actually run the checks.

When something fails, debug it.

---

# 72. OUTPUT FORMAT AFTER EACH PHASE

At the end of each phase, report:

```text
PHASE:
Status:

Implemented:
- ...
- ...
- ...

Files created:
- ...
- ...

Tests:
- ...
- ...

Build:
PASS / FAIL

Known limitations:
- ...

Next phase:
- ...
```

Keep this report concise.

---

# 73. START NOW

Start by inspecting the repository.

If the repository is empty:

1. initialize the project
2. install only necessary dependencies
3. create the folder structure
4. configure Vite
5. configure React
6. configure TypeScript
7. configure Manifest V3
8. create the popup
9. create service worker
10. create content script
11. create the first tests
12. build the extension

Do NOT implement all future phases immediately.

Start with **PHASE 1 only**.

After Phase 1 is verified, continue to Phase 2.

The ultimate goal is a robust, maintainable, privacy-first Chrome workflow recorder that can later become a full browser automation and AI workflow platform.