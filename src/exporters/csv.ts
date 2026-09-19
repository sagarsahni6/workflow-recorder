/**
 * CSV Exporter.
 *
 * Exports tabular workflow steps following RFC 4180 rules.
 * Columns: step,type,description,target,selector,value,timeout,retry
 */

import type { Workflow } from '@shared/types';
import { slugify } from '@shared/utils';

function escapeCSV(field: unknown): string {
  if (field === null || field === undefined) return '';
  const str = String(field);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportToCSV(workflow: Workflow): { content: string; filename: string; mimeType: string } {
  const headers = ['step', 'type', 'description', 'target', 'selector', 'value', 'timeout', 'retry'];
  const rows: string[][] = [headers];

  workflow.steps.forEach((step, idx) => {
    let target = '';
    let selector = '';
    let value = '';

    if ('target' in step && step.target) {
      target = step.target.tagName || '';
      selector = step.target.selectors?.[0]?.value || '';
    }

    if ('value' in step && typeof step.value === 'string') {
      value = step.value;
    } else if (step.type === 'navigate') {
      value = step.url;
    } else if (step.type === 'keyPress') {
      value = step.key;
    } else if (step.type === 'checkbox') {
      value = String(step.checked);
    } else if (step.type === 'scroll') {
      value = `${step.position.x},${step.position.y}`;
    }

    rows.push([
      String(idx + 1),
      step.type,
      step.description || '',
      target,
      selector,
      value,
      step.timeout !== undefined ? String(step.timeout) : '',
      step.retryCount !== undefined ? String(step.retryCount) : '',
    ]);
  });

  const content = rows.map((row) => row.map(escapeCSV).join(',')).join('\r\n');
  const slug = slugify(workflow.name) || 'workflow';

  return {
    content,
    filename: `${slug}.workflow.csv`,
    mimeType: 'text/csv',
  };
}
