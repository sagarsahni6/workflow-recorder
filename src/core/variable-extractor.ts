/**
 * Variable Extractor.
 *
 * Scans recorded workflow steps to identify dynamic values (emails, phones,
 * dates, order numbers, credentials) and suggests parameterized workflow variables.
 * Provides templating functions to replace literal step values with `{{variable_name}}`.
 */

import type {
  Workflow,
  WorkflowStep,
  WorkflowVariable,
  VariableType,
  VariableSuggestion,
} from '@shared/types';
import { slugify } from '@shared/utils';

export class VariableExtractor {
  /** Regular expressions for detecting semantic variable types. */
  private static readonly TYPE_PATTERNS: Array<{ type: VariableType; pattern: RegExp }> = [
    { type: 'email', pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/ },
    { type: 'phone', pattern: /^(\+?\d{1,3}[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}$/ },
    { type: 'date', pattern: /^\d{4}[-/.]\d{2}[-/.]\d{2}$/ },
    { type: 'datetime', pattern: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?/ },
    { type: 'url', pattern: /^https?:\/\/[^\s$.?#].[^\s]*$/i },
    { type: 'number', pattern: /^-?\d+(\.\d+)?$/ },
    { type: 'boolean', pattern: /^(true|false)$/i },
  ];

  /**
   * Scans a workflow and discovers candidates that could be converted to variables.
   */
  public static discoverSuggestions(workflow: Workflow): VariableSuggestion[] {
    const suggestions: VariableSuggestion[] = [];

    for (const step of workflow.steps) {
      if (step.disabled) continue;

      if (step.type === 'input') {
        const val = step.value.trim();

        // Skip values that are already parameterized or masked passwords
        if (!val || val === '{{password}}' || /^\{\{[a-zA-Z0-9_]+\}\}$/.test(val)) {
          continue;
        }

        const suggestedName = this.inferVariableName(step);
        const inferredType = this.inferVariableType(val);

        suggestions.push({
          stepId: step.id,
          field: 'value',
          suggestedName,
          type: inferredType,
          literalValue: val,
        });
      }
    }

    return suggestions;
  }

  /**
   * Alias for discoverSuggestions.
   */
  public static scan(workflow: Workflow): VariableSuggestion[] {
    return this.discoverSuggestions(workflow);
  }

  /**
   * Infers the semantic type of a string value.
   */
  public static inferVariableType(value: string): VariableType {
    const trimmed = value.trim();

    for (const { type, pattern } of this.TYPE_PATTERNS) {
      if (pattern.test(trimmed)) {
        return type;
      }
    }

    // Try parsing JSON
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        JSON.parse(trimmed);
        return 'json';
      } catch {
        // Not valid JSON
      }
    }

    return 'string';
  }

  /**
   * Infers a clean variable identifier name from step target metadata.
   */
  public static inferVariableName(step: WorkflowStep): string {
    if (step.type === 'input' || step.type === 'select') {
      const target = step.target;
      const rawCandidate =
        target.name ||
        target.id ||
        target.placeholder ||
        target.ariaLabel ||
        'input_value';

      const cleaned = slugify(rawCandidate).replace(/-/g, '_');
      // Ensure it starts with a letter or underscore
      return /^[a-zA-Z_]/.test(cleaned) ? cleaned : `var_${cleaned}`;
    }

    return 'workflow_var';
  }

  /**
   * Converts a step's literal value into a variable reference {{varName}} and
   * adds the variable definition to workflow.variables.
   */
  public static applyVariable(
    workflow: Workflow,
    stepId: string,
    variableName: string,
    variableType?: VariableType
  ): Workflow {
    const clone: Workflow = JSON.parse(JSON.stringify(workflow));
    const step = clone.steps.find((s) => s.id === stepId);

    if (!step) return clone;

    let originalValue = '';

    if (step.type === 'input') {
      originalValue = step.value;
      step.value = `{{${variableName}}}`;
    } else if (step.type === 'select') {
      originalValue = step.value;
      step.value = `{{${variableName}}}`;
    }

    // Ensure variable is registered in workflow.variables
    const existingVar = clone.variables.find((v) => v.name === variableName);
    if (!existingVar) {
      const type = variableType || this.inferVariableType(originalValue);
      const newVar: WorkflowVariable = {
        name: variableName,
        type,
        required: true,
        defaultValue: originalValue,
        description: `Auto-extracted variable for step "${step.description}"`,
      };
      clone.variables.push(newVar);
    }

    return clone;
  }
}
