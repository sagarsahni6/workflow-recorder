/**
 * Automation Exporter Registry.
 *
 * Central dispatcher for exporting canonical workflows to JSON,
 * YAML, CSV, Markdown, Playwright, Puppeteer, and Selenium.
 */

import type { Workflow, ExportFormat } from '@shared/types';
import { exportToJSON } from './json';
import { exportToYAML } from './yaml';
import { exportToCSV } from './csv';
import { exportToMarkdown } from './markdown';
import { exportToPlaywrightJS } from './playwright-js';
import { exportToPlaywrightTS } from './playwright-ts';
import { exportToPuppeteer } from './puppeteer';
import { exportToSeleniumPython } from './selenium-python';

export interface ExportResult {
  content: string;
  filename: string;
  mimeType: string;
}

export function exportWorkflow(workflow: Workflow, format: ExportFormat): ExportResult {
  switch (format) {
    case 'json':
      return exportToJSON(workflow);
    case 'yaml':
      return exportToYAML(workflow);
    case 'csv':
      return exportToCSV(workflow);
    case 'markdown':
      return exportToMarkdown(workflow);
    case 'playwright-js':
      return exportToPlaywrightJS(workflow);
    case 'playwright-ts':
      return exportToPlaywrightTS(workflow);
    case 'puppeteer':
      return exportToPuppeteer(workflow);
    case 'selenium-python':
      return exportToSeleniumPython(workflow);
    default:
      throw new Error(`Unsupported export format: ${String(format)}`);
  }
}

export {
  exportToJSON,
  exportToYAML,
  exportToCSV,
  exportToMarkdown,
  exportToPlaywrightJS,
  exportToPlaywrightTS,
  exportToPuppeteer,
  exportToSeleniumPython,
};
