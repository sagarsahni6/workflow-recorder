/**
 * Canonical JSON Exporter.
 *
 * Serializes the complete workflow according to the formal JSON schema.
 */

import type { Workflow } from '@shared/types';
import { slugify } from '@shared/utils';

export function exportToJSON(workflow: Workflow): { content: string; filename: string; mimeType: string } {
  const content = JSON.stringify(workflow, null, 2);
  const slug = slugify(workflow.name) || 'workflow';
  return {
    content,
    filename: `${slug}.workflow.json`,
    mimeType: 'application/json',
  };
}
