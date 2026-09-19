/**
 * YAML Exporter.
 *
 * Lightweight, zero-dependency YAML serializer designed for clean workflow representation.
 */

import type { Workflow } from '@shared/types';
import { slugify } from '@shared/utils';

function serializeValue(val: unknown, indent: number): string {
  const pad = ' '.repeat(indent);

  if (val === null || val === undefined) {
    return 'null';
  }
  if (typeof val === 'boolean' || typeof val === 'number') {
    return String(val);
  }
  if (typeof val === 'string') {
    if (val === '') return '""';
    // Quote string if it contains special characters, newlines, colons, or resembles numbers/booleans
    if (/[:#\n\r"'{}[\],&*?|<>=!%@`]/.test(val) || /^(true|false|null|\d+)$/i.test(val)) {
      return JSON.stringify(val);
    }
    return val;
  }
  if (Array.isArray(val)) {
    if (val.length === 0) return '[]';
    return '\n' + val.map((item) => {
      const itemStr = serializeValue(item, indent + 2);
      if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
        // Object in list: replace leading spaces on first line
        const trimmed = itemStr.replace(/^\s+/, '');
        return `${pad}- ${trimmed}`;
      }
      return `${pad}- ${itemStr.trim()}`;
    }).join('\n');
  }
  if (typeof val === 'object') {
    const entries = Object.entries(val).filter(([, v]) => v !== undefined);
    if (entries.length === 0) return '{}';
    return '\n' + entries.map(([k, v]) => {
      const vStr = serializeValue(v, indent + 2);
      if (typeof v === 'object' && v !== null && (Array.isArray(v) ? v.length > 0 : Object.keys(v).length > 0)) {
        return `${pad}${k}:${vStr}`;
      }
      return `${pad}${k}: ${vStr.trim()}`;
    }).join('\n');
  }

  return String(val);
}

export function exportToYAML(workflow: Workflow): { content: string; filename: string; mimeType: string } {
  let content = '# Workflow Recorder Specification\n';
  content += `schemaVersion: ${serializeValue(workflow.schemaVersion, 0).trim()}\n`;
  content += `id: ${serializeValue(workflow.id, 0).trim()}\n`;
  content += `name: ${serializeValue(workflow.name, 0).trim()}\n`;
  if (workflow.description) {
    content += `description: ${serializeValue(workflow.description, 0).trim()}\n`;
  }
  content += `createdAt: ${serializeValue(workflow.createdAt, 0).trim()}\n`;
  content += `updatedAt: ${serializeValue(workflow.updatedAt, 0).trim()}\n`;

  content += '\nsettings:';
  content += serializeValue(workflow.settings, 2) + '\n';

  content += '\nvariables:';
  content += serializeValue(workflow.variables, 2) + '\n';

  content += '\nsteps:';
  content += serializeValue(workflow.steps, 2) + '\n';

  const slug = slugify(workflow.name) || 'workflow';
  return {
    content,
    filename: `${slug}.workflow.yaml`,
    mimeType: 'text/yaml',
  };
}
