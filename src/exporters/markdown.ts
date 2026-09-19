/**
 * Markdown Documentation Exporter.
 *
 * Generates structured, readable runbooks and workflow documentation.
 */

import type { Workflow } from '@shared/types';
import { slugify } from '@shared/utils';

export function exportToMarkdown(workflow: Workflow): { content: string; filename: string; mimeType: string } {
  const lines: string[] = [];

  lines.push(`# ${workflow.name}`);
  lines.push('');
  if (workflow.description) {
    lines.push(workflow.description);
    lines.push('');
  }

  lines.push('## Metadata');
  lines.push(`- **Workflow ID**: \`${workflow.id}\``);
  lines.push(`- **Schema Version**: \`${workflow.schemaVersion}\``);
  lines.push(`- **Total Steps**: ${workflow.steps.length}`);
  lines.push(`- **Created**: ${workflow.createdAt}`);
  lines.push(`- **Updated**: ${workflow.updatedAt}`);
  lines.push('');

  // Variables section
  lines.push('## Variables');
  if (workflow.variables.length === 0) {
    lines.push('No dynamic variables configured.');
  } else {
    lines.push('| Variable | Type | Required | Default Value | Description |');
    lines.push('| :--- | :--- | :--- | :--- | :--- |');
    workflow.variables.forEach((v) => {
      lines.push(
        `| \`{{${v.name}}}\` | ${v.type} | ${v.required ? 'Yes' : 'No'} | ${
          v.defaultValue !== undefined ? `\`${v.defaultValue}\`` : '—'
        } | ${v.description || '—'} |`
      );
    });
  }
  lines.push('');

  // Steps section
  lines.push('## Execution Steps');
  workflow.steps.forEach((step, idx) => {
    const num = idx + 1;
    const status = step.disabled ? ' *(Disabled)*' : '';
    lines.push(`### ${num}. ${step.description || step.type}${status}`);
    lines.push(`- **Action**: \`${step.type}\``);

    if ('target' in step && step.target) {
      const bestSelector = step.target.selectors?.[0];
      if (bestSelector) {
        lines.push(`- **Target Selector** (\`${bestSelector.type}\`): \`${bestSelector.value}\``);
      }
      if (step.target.ariaLabel) {
        lines.push(`- **ARIA Label**: ${step.target.ariaLabel}`);
      }
    }

    if ('value' in step && typeof step.value === 'string') {
      lines.push(`- **Value**: \`${step.value}\``);
    }
    if (step.type === 'navigate') {
      lines.push(`- **URL**: [${step.url}](${step.url})`);
    }
    if (step.timeout) {
      lines.push(`- **Timeout**: \`${step.timeout}ms\``);
    }
    if (step.comment) {
      lines.push(`- **Notes**: ${step.comment}`);
    }
    lines.push('');
  });

  const content = lines.join('\n');
  const slug = slugify(workflow.name) || 'workflow';

  return {
    content,
    filename: `${slug}.workflow.md`,
    mimeType: 'text/markdown',
  };
}
