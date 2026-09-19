/**
 * CSV Workflow Importer.
 *
 * Reconstructs workflow definitions from RFC 4180 CSV tables
 * exported with headers: step,type,description,target,selector,value,timeout,retry
 */

import type { Workflow, WorkflowStep, StepType, ElementTarget } from '@shared/types';
import { WorkflowValidator } from '@core/workflow-validator';
import { DEFAULT_WORKFLOW_SETTINGS } from '@shared/constants';
import type { ImportResult } from './json';

function parseCSVRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (insideQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"';
          i++; // skip escaped quote
        } else {
          insideQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (char === '\r' || char === '\n') {
        if (char === '\r' && nextChar === '\n') {
          i++; // Skip \n
        }
        currentRow.push(currentField.trim());
        currentField = '';
        if (currentRow.some((f) => f.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
      } else {
        currentField += char;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((f) => f.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

export function importFromCSV(content: string, workflowName = 'Imported Workflow'): ImportResult {
  const rows = parseCSVRows(content);
  if (rows.length < 2) {
    return {
      success: false,
      errors: ['CSV file must contain a header row and at least one step row.'],
    };
  }

  const headers = rows[0]!.map((h) => h.toLowerCase());
  const typeIdx = headers.indexOf('type');
  const descIdx = headers.indexOf('description');
  const targetIdx = headers.indexOf('target');
  const selectorIdx = headers.indexOf('selector');
  const valueIdx = headers.indexOf('value');
  const timeoutIdx = headers.indexOf('timeout');
  const retryIdx = headers.indexOf('retry');

  if (typeIdx === -1) {
    return {
      success: false,
      errors: ['CSV missing required "type" column header.'],
    };
  }

  const steps: WorkflowStep[] = [];
  const errors: string[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]!;
    const rawType = (row[typeIdx] || '').trim();
    if (!rawType) continue;

    const stepId = `step_${String(r).padStart(3, '0')}`;
    const description = descIdx !== -1 && row[descIdx] ? row[descIdx]! : `${rawType} action`;
    const tagName = targetIdx !== -1 && row[targetIdx] ? row[targetIdx]!.toUpperCase() : 'DIV';
    const selectorVal = selectorIdx !== -1 && row[selectorIdx] ? row[selectorIdx]! : '';
    const value = valueIdx !== -1 && row[valueIdx] ? row[valueIdx]! : '';
    const timeout = timeoutIdx !== -1 && row[timeoutIdx] ? parseInt(row[timeoutIdx]!, 10) : undefined;
    const retryCount = retryIdx !== -1 && row[retryIdx] ? parseInt(row[retryIdx]!, 10) : undefined;

    const target: ElementTarget = {
      tagName,
      classes: [],
      selectors: selectorVal
        ? [{ type: selectorVal.startsWith('//') ? 'xpath' : 'css', value: selectorVal, score: 0.9 }]
        : [{ type: 'css', value: tagName.toLowerCase(), score: 0.5 }],
    };

    const type = rawType as StepType;

    switch (type) {
      case 'navigate':
        steps.push({ id: stepId, type, url: value || 'https://example.com', description, timeout, retryCount });
        break;
      case 'click':
        steps.push({ id: stepId, type, target, clickType: 'left', description, timeout, retryCount });
        break;
      case 'input':
        steps.push({ id: stepId, type, target, value, sensitive: false, description, timeout, retryCount });
        break;
      case 'select':
        steps.push({ id: stepId, type, target, value, label: value, description, timeout, retryCount });
        break;
      case 'checkbox':
        steps.push({ id: stepId, type, target, checked: value === 'true', description, timeout, retryCount });
        break;
      case 'radio':
        steps.push({ id: stepId, type, target, value, description, timeout, retryCount });
        break;
      case 'scroll': {
        const parts = value.split(',').map((p) => parseInt(p.trim(), 10));
        steps.push({
          id: stepId,
          type,
          position: { x: parts[0] || 0, y: parts[1] || 0 },
          description,
          timeout,
          retryCount,
        });
        break;
      }
      case 'hover':
        steps.push({ id: stepId, type, target, description, timeout, retryCount });
        break;
      case 'keyPress':
        steps.push({ id: stepId, type, key: value || 'Enter', description, timeout, retryCount });
        break;
      case 'upload':
        steps.push({ id: stepId, type, target, file: value || '{{document}}', description, timeout, retryCount });
        break;
      case 'download':
        steps.push({ id: stepId, type, filename: value || 'downloaded_file', description, timeout, retryCount });
        break;
      case 'waitForElement':
      case 'waitForVisible':
        steps.push({ id: stepId, type, target, timeout: timeout || 15000, description, retryCount });
        break;
      case 'waitForURL':
        steps.push({ id: stepId, type, value: value || '', timeout: timeout || 15000, description, retryCount });
        break;
      case 'assert':
        steps.push({
          id: stepId,
          type,
          assertion: { target, operator: 'containsText', expected: value },
          description,
          timeout,
          retryCount,
        });
        break;
      default:
        errors.push(`Row ${r}: Unknown step type "${rawType}"`);
        break;
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  const now = new Date().toISOString();
  const workflow: Workflow = {
    schemaVersion: '1.0',
    id: `wf_${Date.now()}`,
    name: workflowName,
    description: `Reconstructed from CSV import`,
    createdAt: now,
    updatedAt: now,
    variables: [],
    settings: { ...DEFAULT_WORKFLOW_SETTINGS },
    steps,
  };

  const validation = WorkflowValidator.validate(workflow);
  if (!validation.valid) {
    return {
      success: false,
      errors: validation.errors.map((e) => `[${e.path}] ${e.message}`),
    };
  }

  return {
    success: true,
    workflow,
    errors: [],
  };
}
