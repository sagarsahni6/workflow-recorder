# Automation Exporters Specification

## Overview

The Exporter Subsystem (`src/exporters/`) translates canonical `Workflow` structures into production-ready test scripts and human-readable documentation. Exporters operate purely on in-memory workflow definitions and produce syntax-highlighted code with direct copy-to-clipboard and file download capabilities.

---

## Supported Export Targets

| Target | Module | Output Format | Primary Features |
| :--- | :--- | :--- | :--- |
| **Playwright TypeScript** | `playwright-ts.ts` | `.spec.ts` | Typed `WorkflowVariables` interface, `page.locator()`, fallback selectors, auto-waits |
| **Playwright JavaScript** | `playwright-js.ts` | `.spec.js` | Modern ES modules, async/await, locator chaining, viewport configuration |
| **Puppeteer** | `puppeteer.ts` | `.js` | Node.js automation script, `page.waitForSelector()`, frame context tracking |
| **Selenium Python** | `selenium-python.ts` | `.py` | Idiomatic Python 3, `WebDriverWait`, `expected_conditions`, `By` locators |
| **Canonical JSON** | `json.ts` | `.workflow.json` | 2-space indented schema-compliant JSON backup |
| **YAML** | `yaml.ts` | `.workflow.yaml` | Zero-dependency YAML serialization with nested lists and mapping |
| **CSV** | `csv.ts` | `.workflow.csv` | RFC 4180 tabular format (`step,type,description,target,selector,value,timeout,retry`) |
| **Markdown** | `markdown.ts` | `.md` | Executive runbook summary with variable tables, numbered steps, and locator details |

---

## Playwright TypeScript Example

```typescript
import { test, expect } from '@playwright/test';

interface WorkflowVariables {
  customer_name: string;
  email: string;
}

const variables: WorkflowVariables = {
  customer_name: 'Jane Doe',
  email: 'jane@example.com',
};

test('Customer Registration', async ({ page }) => {
  // Step 1: Navigate to portal
  await page.goto('https://portal.example.com/register');

  // Step 2: Enter customer name
  await page.locator('#customerName').fill(variables.customer_name);

  // Step 3: Enter email address
  await page.locator('input[name="email"]').fill(variables.email);

  // Step 4: Click submit
  await page.locator('button[type="submit"]').click();

  // Step 5: Verify confirmation message
  await expect(page.locator('.confirmation-banner')).toContainText('Registration Successful');
});
```

---

## Selenium Python Example

```python
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

variables = {
    "customer_name": "Jane Doe",
    "email": "jane@example.com"
}

driver = webdriver.Chrome()
wait = WebDriverWait(driver, 15)

try:
    # Step 1: Navigate to portal
    driver.get("https://portal.example.com/register")

    # Step 2: Enter customer name
    elem_2 = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "#customerName")))
    elem_2.clear()
    elem_2.send_keys(variables["customer_name"])

    # Step 3: Enter email address
    elem_3 = wait.until(EC.element_to_be_clickable((By.NAME, "email")))
    elem_3.clear()
    elem_3.send_keys(variables["email"])

    # Step 4: Click submit
    elem_4 = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "button[type='submit']")))
    elem_4.click()

finally:
    driver.quit()
```
