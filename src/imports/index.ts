/**
 * Importer Registry and Dispatcher.
 *
 * Exposes a unified interface to import workflows from JSON, YAML, and CSV.
 */

import type { ImportResult } from './json';
import { importFromJSON } from './json';
import { importFromYAML } from './yaml';
import { importFromCSV } from './csv';

export type ImportFormat = 'json' | 'yaml' | 'csv';

export function detectFormat(filename: string, content: string): ImportFormat {
  const lowerName = filename.toLowerCase();
  if (lowerName.endsWith('.json')) return 'json';
  if (lowerName.endsWith('.yaml') || lowerName.endsWith('.yml')) return 'yaml';
  if (lowerName.endsWith('.csv')) return 'csv';

  // Content-based heuristic
  const trimmed = content.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return 'json';
  }
  if (/^step\s*,\s*type/i.test(trimmed) || /^(?:\d+,[a-zA-Z]+,)/m.test(trimmed)) {
    return 'csv';
  }
  return 'yaml';
}

export function importWorkflowFile(
  content: string,
  filename: string,
  explicitFormat?: ImportFormat
): ImportResult {
  const format = explicitFormat || detectFormat(filename, content);

  switch (format) {
    case 'json':
      return importFromJSON(content);
    case 'yaml':
      return importFromYAML(content);
    case 'csv': {
      const baseName = filename.replace(/\.[^/.]+$/, '');
      return importFromCSV(content, baseName || 'Imported Workflow');
    }
    default:
      return {
        success: false,
        errors: [`Unsupported file format: ${format}`],
      };
  }
}

export { importFromJSON, importFromYAML, importFromCSV };
export type { ImportResult };
