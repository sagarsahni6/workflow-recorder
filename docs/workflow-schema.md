# Canonical Workflow Schema Specification

## Overview

All recordings are governed by the canonical JSON Schema defined in `schemas/workflow.schema.json` compliant with **JSON Schema Draft 2020-12**.

The schema uses a discriminated union pattern on `type` for workflow steps, ensuring strict typing, predictable serialization, and full cross-tool interoperability.

---

## Top-Level Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Workflow",
  "type": "object",
  "required": ["schemaVersion", "id", "name", "createdAt", "updatedAt", "variables", "steps", "settings"],
  "properties": {
    "schemaVersion": { "type": "string", "const": "1.0" },
    "id": { "type": "string", "pattern": "^wf_[a-zA-Z0-9_-]+$" },
    "name": { "type": "string", "minLength": 1, "maxLength": 200 },
    "description": { "type": "string", "maxLength": 2000 },
    "createdAt": { "type": "string", "format": "date-time" },
    "updatedAt": { "type": "string", "format": "date-time" },
    "browser": {
      "type": "object",
      "properties": {
        "name": { "type": "string" },
        "version": { "type": "string" },
        "viewport": {
          "type": "object",
          "properties": {
            "width": { "type": "integer" },
            "height": { "type": "integer" }
          }
        }
      }
    },
    "variables": { "type": "array", "items": { "$ref": "#/$defs/variable" } },
    "settings": { "$ref": "#/$defs/workflowSettings" },
    "steps": { "type": "array", "items": { "$ref": "#/$defs/step" } }
  }
}
```

---

## Workflow Step Types

Workflow steps are modeled as a discriminated union on the `type` field:

| Step Type | Description | Key Attributes |
| :--- | :--- | :--- |
| `navigate` | Browser navigation | `url: string` |
| `click` | Mouse click (left, double, right) | `target: ElementTarget`, `clickType: 'single' \| 'double' \| 'right'` |
| `input` | Text entry into form fields | `target: ElementTarget`, `value: string`, `sensitive?: boolean` |
| `select` | Dropdown option selection | `target: ElementTarget`, `value: string`, `label?: string` |
| `checkbox` | Checkbox toggle | `target: ElementTarget`, `checked: boolean` |
| `radio` | Radio option selection | `target: ElementTarget`, `value: string` |
| `scroll` | Page / element scroll position | `position: { x: number, y: number }`, `target?: ElementTarget` |
| `hover` | Mouse hover over element | `target: ElementTarget`, `delayMs?: number` |
| `keyPress` | Meaningful keyboard action | `key: string`, `modifiers?: string[]` |
| `upload` | File input selection | `target: ElementTarget`, `file: string` (e.g. `{{document}}`) |
| `download` | Browser file download | `filename: string` |
| `waitForElement` | Wait for selector presence | `target: ElementTarget`, `timeout: number` |
| `waitForVisible` | Wait for element visibility | `target: ElementTarget`, `timeout: number` |
| `waitForURL` | Wait for URL pattern | `url: string`, `timeout: number` |
| `assert` | Verification check | `target?: ElementTarget`, `operator: string`, `expected: string` |
| `condition` | Branching logic | `condition: { target, operator, value }`, `then: Step[]`, `else: Step[]` |
| `loop` | Repetitive iteration | `source: string`, `itemVariable: string`, `steps: Step[]` |
| `screenshot` | Captured visual checkpoint | `screenshotId: string`, `path?: string` |

---

## ElementTarget & Selector Model

```json
{
  "target": {
    "tagName": "BUTTON",
    "id": "submitBtn",
    "name": "submit",
    "type": "submit",
    "text": "Submit Application",
    "ariaLabel": "Submit Application",
    "role": "button",
    "classes": ["btn", "btn-primary"],
    "selectors": [
      { "type": "id", "value": "#submitBtn", "score": 0.99 },
      { "type": "aria", "value": "Submit Application", "score": 0.95 },
      { "type": "css", "value": "button.btn-primary", "score": 0.72 },
      { "type": "xpath", "value": "//button[@id='submitBtn']", "score": 0.90 }
    ],
    "frame": {
      "type": "iframe",
      "selectors": [{ "type": "id", "value": "#paymentFrame", "score": 0.95 }]
    }
  }
}
```

---

## Variables Model

Variables represent dynamic inputs parametrized across execution runs:

```json
{
  "name": "customer_email",
  "type": "email",
  "defaultValue": "test@example.com",
  "required": true,
  "description": "Customer registration email address"
}
```

Supported variable types:
- `string`
- `number`
- `boolean`
- `date`
- `datetime`
- `email`
- `phone`
- `file`
- `url`
- `json`
