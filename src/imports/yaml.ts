/**
 * YAML Workflow Importer.
 *
 * Lightweight, zero-dependency YAML parser for workflow definitions.
 * Parses key-value mappings, lists, nested objects, and primitives.
 */

import { WorkflowValidator } from '@core/workflow-validator';
import { WorkflowMigrator } from '@core/workflow-migrator';
import type { ImportResult } from './json';

interface LineToken {
  indent: number;
  text: string;
  lineNum: number;
}

function parseScalar(val: string): unknown {
  const trimmed = val.trim();
  if (trimmed === '' || trimmed === 'null' || trimmed === '~') return null;
  if (trimmed === 'true' || trimmed === 'True' || trimmed === 'TRUE') return true;
  if (trimmed === 'false' || trimmed === 'False' || trimmed === 'FALSE') return false;
  if (/^-?\d+$/.test(trimmed)) return parseInt(trimmed, 10);
  if (/^-?\d+\.\d+$/.test(trimmed)) return parseFloat(trimmed);

  // Quoted strings
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    try {
      return JSON.parse(trimmed.startsWith("'") ? `"${trimmed.slice(1, -1).replace(/"/g, '\\"')}"` : trimmed);
    } catch {
      return trimmed.slice(1, -1);
    }
  }

  return trimmed;
}

function parseYamlLines(lines: LineToken[], startIndex: number, expectedIndent: number): [unknown, number] {
  let i = startIndex;
  const isList = lines[i]?.text.startsWith('- ') ?? false;

  if (isList) {
    const list: unknown[] = [];
    while (i < lines.length) {
      const line = lines[i];
      if (!line) break;
      if (line.indent < expectedIndent) break;
      if (line.indent === expectedIndent && line.text.startsWith('- ')) {
        const itemText = line.text.slice(2).trim();
        if (itemText === '') {
          // Nested block below
          if (i + 1 < lines.length && (lines[i + 1]?.indent ?? 0) > line.indent) {
            const [nestedVal, nextI] = parseYamlLines(lines, i + 1, lines[i + 1]!.indent);
            list.push(nestedVal);
            i = nextI;
          } else {
            list.push(null);
            i++;
          }
        } else if (itemText.includes(':')) {
          // Object starting on the same line as dash: "- id: step_1"
          const pseudoLines: LineToken[] = [
            { indent: line.indent + 2, text: itemText, lineNum: line.lineNum },
          ];
          let j = i + 1;
          while (j < lines.length && (lines[j]?.indent ?? 0) > line.indent) {
            pseudoLines.push(lines[j]!);
            j++;
          }
          const [objVal] = parseYamlLines(pseudoLines, 0, line.indent + 2);
          list.push(objVal);
          i = j;
        } else {
          list.push(parseScalar(itemText));
          i++;
        }
      } else {
        break;
      }
    }
    return [list, i];
  }

  // Object / Mapping
  const obj: Record<string, unknown> = {};
  while (i < lines.length) {
    const line = lines[i];
    if (!line) break;
    if (line.indent < expectedIndent) break;

    const colonIdx = line.text.indexOf(':');
    if (colonIdx === -1) {
      i++;
      continue;
    }

    const key = line.text.slice(0, colonIdx).trim().replace(/^["']|["']$/g, '');
    const remainder = line.text.slice(colonIdx + 1).trim();

    if (remainder === '') {
      // Nested mapping or list below
      if (i + 1 < lines.length && (lines[i + 1]?.indent ?? 0) > line.indent) {
        const nextIndent = lines[i + 1]!.indent;
        const [childVal, nextI] = parseYamlLines(lines, i + 1, nextIndent);
        obj[key] = childVal;
        i = nextI;
      } else {
        obj[key] = null;
        i++;
      }
    } else {
      obj[key] = parseScalar(remainder);
      i++;
    }
  }

  return [obj, i];
}

export function parseYAML(yamlString: string): unknown {
  const rawLines = yamlString.split(/\r?\n/);
  const tokens: LineToken[] = [];

  for (let idx = 0; idx < rawLines.length; idx++) {
    const line = rawLines[idx]!;
    // Strip comments
    const noComment = line.replace(/(^|\s)#.*$/, '');
    if (noComment.trim() === '') continue;

    const leadingSpaces = noComment.search(/\S/);
    tokens.push({
      indent: leadingSpaces === -1 ? 0 : leadingSpaces,
      text: noComment.trim(),
      lineNum: idx + 1,
    });
  }

  if (tokens.length === 0) return {};
  const [result] = parseYamlLines(tokens, 0, tokens[0]!.indent);
  return result;
}

export function importFromYAML(content: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = parseYAML(content);
  } catch (err) {
    return {
      success: false,
      errors: [`YAML parsing failed: ${err instanceof Error ? err.message : String(err)}`],
    };
  }

  if (!parsed || typeof parsed !== 'object') {
    return {
      success: false,
      errors: ['YAML document does not contain a valid workflow root object.'],
    };
  }

  const migrationResult = WorkflowMigrator.migrate(parsed as Record<string, unknown>);
  const workflow = migrationResult.workflow;
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
