import { describe, it, expect } from 'vitest';
import {
  exportWorkflow,
  exportToJSON,
  exportToYAML,
  exportToCSV,
  exportToMarkdown,
  exportToPlaywrightJS,
  exportToPlaywrightTS,
  exportToPuppeteer,
  exportToSeleniumPython,
} from '@exporters/index';
import type { Workflow } from '@shared/types';

describe('Phase 7 — Automation Exporters', () => {
  const testWorkflow: Workflow = {
    schemaVersion: '1.0',
    id: 'wf_test_suite',
    name: 'Customer Registration Flow',
    description: 'Automated end-to-end checkout and registration',
    createdAt: '2026-09-15T12:00:00.000Z',
    updatedAt: '2026-09-15T12:05:00.000Z',
    settings: {
      defaultTimeout: 10000,
      defaultRetryCount: 3,
      screenshotsEnabled: true,
    },
    variables: [
      {
        name: 'user_email',
        type: 'email',
        required: true,
        defaultValue: 'tester@domain.com',
        description: 'Customer contact email',
      },
      {
        name: 'user_count',
        type: 'number',
        required: false,
        defaultValue: '2',
      },
    ],
    steps: [
      {
        id: 'step_nav',
        type: 'navigate',
        url: 'https://app.example.com/signup',
        description: 'Open registration portal',
      },
      {
        id: 'step_email',
        type: 'input',
        target: {
          tagName: 'INPUT',
          classes: ['form-input'],
          selectors: [{ type: 'css', value: '#email', score: 0.95 }],
        },
        value: '{{user_email}}',
        sensitive: false,
        description: 'Enter email address',
      },
      {
        id: 'step_click',
        type: 'click',
        target: {
          tagName: 'BUTTON',
          classes: ['btn', 'btn-primary'],
          selectors: [{ type: 'id', value: '#submit-btn', score: 0.99 }],
        },
        clickType: 'left',
        description: 'Submit registration',
      },
      {
        id: 'step_wait',
        type: 'wait',
        timeout: 3000,
        description: 'Wait for response',
      },
      {
        id: 'step_assert',
        type: 'assert',
        assertion: {
          operator: 'contains',
          expected: 'Welcome aboard',
          target: {
            tagName: 'H1',
            classes: ['welcome-title'],
            selectors: [{ type: 'css', value: 'h1.welcome-title', score: 0.9 }],
          },
        },
        description: 'Verify registration success',
      },
    ],
  };

  it('exports canonical JSON and ensures roundtrip parseability', () => {
    const result = exportToJSON(testWorkflow);
    expect(result.filename).toBe('customer-registration-flow.workflow.json');
    expect(result.mimeType).toBe('application/json');

    const parsed = JSON.parse(result.content);
    expect(parsed.name).toBe('Customer Registration Flow');
    expect(parsed.steps).toHaveLength(5);
    expect(parsed.variables).toHaveLength(2);
  });

  it('exports valid YAML structure', () => {
    const result = exportToYAML(testWorkflow);
    expect(result.filename).toBe('customer-registration-flow.workflow.yaml');
    expect(result.mimeType).toBe('text/yaml');
    expect(result.content).toContain('schemaVersion: 1.0');
    expect(result.content).toContain('name: Customer Registration Flow');
    expect(result.content).toContain('- name: user_email');
    expect(result.content).toContain('type: email');
    expect(result.content).toContain('url: "https://app.example.com/signup"');
  });

  it('exports valid CSV with required RFC 4180 columns', () => {
    const result = exportToCSV(testWorkflow);
    expect(result.filename).toBe('customer-registration-flow.workflow.csv');
    expect(result.mimeType).toBe('text/csv');

    const lines = result.content.split('\r\n');
    expect(lines[0]).toBe('step,type,description,target,selector,value,timeout,retry');
    expect(lines).toHaveLength(6); // 1 header + 5 steps
    expect(lines[1]).toContain('navigate');
    expect(lines[2]).toContain('input');
  });

  it('exports readable Markdown documentation', () => {
    const result = exportToMarkdown(testWorkflow);
    expect(result.filename).toBe('customer-registration-flow.workflow.md');
    expect(result.mimeType).toBe('text/markdown');
    expect(result.content).toContain('# Customer Registration Flow');
    expect(result.content).toContain('| `{{user_email}}` | email | Yes |');
    expect(result.content).toContain('### 1. Open registration portal');
    expect(result.content).toContain('### 3. Submit registration');
  });

  it('exports executable Playwright JavaScript', () => {
    const result = exportToPlaywrightJS(testWorkflow);
    expect(result.filename).toBe('customer-registration-flow.playwright.js');
    expect(result.content).toContain('import { chromium } from "playwright";');
    expect(result.content).toContain('export async function runWorkflow(customVars = {})');
    expect(result.content).toContain('await page.goto("https://app.example.com/signup");');
    expect(result.content).toContain('await page.locator("#email").fill(vars.user_email);');
    expect(result.content).toContain('await page.locator("#submit-btn").click();');
  });

  it('exports strongly-typed Playwright TypeScript', () => {
    const result = exportToPlaywrightTS(testWorkflow);
    expect(result.filename).toBe('customer-registration-flow.playwright.ts');
    expect(result.content).toContain('import { chromium, Browser, BrowserContext, Page } from "playwright";');
    expect(result.content).toContain('export interface WorkflowVariables {');
    expect(result.content).toContain('user_email: string;');
    expect(result.content).toContain('user_count?: number;');
    expect(result.content).toContain('export async function runWorkflow(customVars: Partial<WorkflowVariables> = {}): Promise<void>');
  });

  it('exports Puppeteer automation script', () => {
    const result = exportToPuppeteer(testWorkflow);
    expect(result.filename).toBe('customer-registration-flow.puppeteer.js');
    expect(result.content).toContain('import puppeteer from "puppeteer";');
    expect(result.content).toContain('const browser = await puppeteer.launch(');
    expect(result.content).toContain('await page.waitForSelector("#submit-btn");');
    expect(result.content).toContain('await page.click("#submit-btn");');
  });

  it('exports Selenium Python script with WebDriver and explicit waits', () => {
    const result = exportToSeleniumPython(testWorkflow);
    expect(result.filename).toBe('customer-registration-flow.selenium.py');
    expect(result.content).toContain('from selenium import webdriver');
    expect(result.content).toContain('from selenium.webdriver.common.by import By');
    expect(result.content).toContain('from selenium.webdriver.support.ui import WebDriverWait');
    expect(result.content).toContain('driver.get("https://app.example.com/signup")');
    expect(result.content).toContain('DEFAULT_VARIABLES = {');
    expect(result.content).toContain('def run_workflow(custom_vars=None):');
  });

  it('dispatches seamlessly through exportWorkflow() for all 8 formats', () => {
    const formats = [
      'json',
      'yaml',
      'csv',
      'markdown',
      'playwright-js',
      'playwright-ts',
      'puppeteer',
      'selenium-python',
    ] as const;

    for (const fmt of formats) {
      const output = exportWorkflow(testWorkflow, fmt);
      expect(output.content).toBeTruthy();
      expect(output.filename).toBeTruthy();
      expect(output.mimeType).toBeTruthy();
    }
  });
});
