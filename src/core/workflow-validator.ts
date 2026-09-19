/**
 * Workflow Validator.
 *
 * Performs structural and semantic validation on workflows and workflow steps:
 * - Verifies schema version
 * - Checks step ID uniqueness and format
 * - Checks target element and selector requirements
 * - Validates variables (naming, duplicates, undefined references in steps)
 * - Validates conditional branches and loop structures
 */

import type {
  Workflow,
  WorkflowStep,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ElementTarget,
} from '@shared/types';
import { SCHEMA_VERSION } from '@shared/constants';

export class WorkflowValidator {
  /**
   * Validates a complete Workflow object.
   */
  public static validate(workflow: Workflow): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // 1. Schema Version
    if (!workflow.schemaVersion) {
      errors.push({
        path: 'schemaVersion',
        message: 'Schema version is required.',
        code: 'MISSING_SCHEMA_VERSION',
      });
    } else if (workflow.schemaVersion !== SCHEMA_VERSION) {
      errors.push({
        path: 'schemaVersion',
        message: `Unsupported schema version "${workflow.schemaVersion}". Supported version is "${SCHEMA_VERSION}".`,
        code: 'UNSUPPORTED_SCHEMA_VERSION',
      });
    }

    // 2. ID and Name
    if (!workflow.id || typeof workflow.id !== 'string') {
      errors.push({
        path: 'id',
        message: 'Workflow ID is required and must be a string.',
        code: 'INVALID_WORKFLOW_ID',
      });
    }

    if (!workflow.name || typeof workflow.name !== 'string' || workflow.name.trim().length === 0) {
      errors.push({
        path: 'name',
        message: 'Workflow name is required and cannot be empty.',
        code: 'INVALID_WORKFLOW_NAME',
      });
    }

    // 3. Variables
    const definedVariables = new Set<string>();
    if (Array.isArray(workflow.variables)) {
      workflow.variables.forEach((variable, index) => {
        const path = `variables[${index}]`;

        if (!variable.name || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(variable.name)) {
          errors.push({
            path: `${path}.name`,
            message: `Variable name "${variable.name || ''}" is invalid. Must be an alphanumeric identifier.`,
            code: 'INVALID_VARIABLE_NAME',
          });
        } else if (definedVariables.has(variable.name)) {
          errors.push({
            path: `${path}.name`,
            message: `Duplicate variable name "${variable.name}".`,
            code: 'DUPLICATE_VARIABLE_NAME',
          });
        } else {
          definedVariables.add(variable.name);
        }

        if (!variable.type) {
          errors.push({
            path: `${path}.type`,
            message: `Variable "${variable.name}" is missing a type.`,
            code: 'MISSING_VARIABLE_TYPE',
          });
        }
      });
    } else {
      errors.push({
        path: 'variables',
        message: 'Variables must be an array.',
        code: 'INVALID_VARIABLES_ARRAY',
      });
    }

    // 4. Steps
    const seenStepIds = new Set<string>();
    if (Array.isArray(workflow.steps)) {
      this.validateStepList(workflow.steps, 'steps', seenStepIds, definedVariables, errors, warnings);
    } else {
      errors.push({
        path: 'steps',
        message: 'Steps must be an array.',
        code: 'INVALID_STEPS_ARRAY',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validates a list of steps (recursively for conditions and loops).
   */
  private static validateStepList(
    steps: WorkflowStep[],
    basePath: string,
    seenIds: Set<string>,
    definedVariables: Set<string>,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    steps.forEach((step, index) => {
      const stepPath = `${basePath}[${index}]`;

      // Step ID
      if (!step.id || typeof step.id !== 'string') {
        errors.push({
          path: `${stepPath}.id`,
          message: 'Step ID is required and must be a string.',
          code: 'INVALID_STEP_ID',
        });
      } else if (seenIds.has(step.id)) {
        errors.push({
          path: `${stepPath}.id`,
          message: `Duplicate step ID "${step.id}".`,
          code: 'DUPLICATE_STEP_ID',
        });
      } else {
        seenIds.add(step.id);
      }

      // Type
      if (!step.type) {
        errors.push({
          path: `${stepPath}.type`,
          message: 'Step type is required.',
          code: 'MISSING_STEP_TYPE',
        });
        return;
      }

      // Step-specific validations
      switch (step.type) {
        case 'navigate':
          if (!step.url || typeof step.url !== 'string') {
            errors.push({
              path: `${stepPath}.url`,
              message: 'Navigate step requires a valid url string.',
              code: 'INVALID_URL',
            });
          }
          this.checkVariableReferences(step.url, `${stepPath}.url`, definedVariables, warnings);
          break;

        case 'click':
        case 'input':
        case 'select':
        case 'checkbox':
        case 'radio':
        case 'hover':
        case 'upload':
          this.validateTarget(step.target, `${stepPath}.target`, errors);

          if (step.type === 'input') {
            if (typeof step.value !== 'string') {
              errors.push({
                path: `${stepPath}.value`,
                message: 'Input step requires a string value.',
                code: 'INVALID_INPUT_VALUE',
              });
            } else {
              this.checkVariableReferences(step.value, `${stepPath}.value`, definedVariables, warnings);
            }
          }
          break;

        case 'keyPress':
          if (!step.key || typeof step.key !== 'string') {
            errors.push({
              path: `${stepPath}.key`,
              message: 'KeyPress step requires a valid key string.',
              code: 'INVALID_KEY',
            });
          }
          if (step.target) {
            this.validateTarget(step.target, `${stepPath}.target`, errors);
          }
          break;

        case 'scroll':
          if (!step.position || typeof step.position.x !== 'number' || typeof step.position.y !== 'number') {
            errors.push({
              path: `${stepPath}.position`,
              message: 'Scroll step requires valid numeric x and y position coordinates.',
              code: 'INVALID_SCROLL_POSITION',
            });
          }
          break;

        case 'condition':
          if (!step.condition || !step.condition.operator) {
            errors.push({
              path: `${stepPath}.condition`,
              message: 'Condition step requires a valid condition and operator.',
              code: 'INVALID_CONDITION',
            });
          }
          if (Array.isArray(step.then)) {
            this.validateStepList(step.then, `${stepPath}.then`, seenIds, definedVariables, errors, warnings);
          } else {
            errors.push({
              path: `${stepPath}.then`,
              message: 'Condition step requires a then array of steps.',
              code: 'INVALID_THEN_BRANCH',
            });
          }
          if (step.else && Array.isArray(step.else)) {
            this.validateStepList(step.else, `${stepPath}.else`, seenIds, definedVariables, errors, warnings);
          }
          break;

        case 'loop':
          if (!step.source || !step.itemVariable) {
            errors.push({
              path: `${stepPath}`,
              message: 'Loop step requires source and itemVariable.',
              code: 'INVALID_LOOP',
            });
          }
          if (Array.isArray(step.steps)) {
            this.validateStepList(step.steps, `${stepPath}.steps`, seenIds, definedVariables, errors, warnings);
          } else {
            errors.push({
              path: `${stepPath}.steps`,
              message: 'Loop step requires a steps array.',
              code: 'INVALID_LOOP_STEPS',
            });
          }
          break;
      }
    });
  }

  /**
   * Validates an ElementTarget.
   */
  private static validateTarget(target: ElementTarget | undefined, path: string, errors: ValidationError[]): void {
    if (!target) {
      errors.push({
        path,
        message: 'Target is missing for action step.',
        code: 'MISSING_TARGET',
      });
      return;
    }

    if (!target.tagName) {
      errors.push({
        path: `${path}.tagName`,
        message: 'Target tagName is required.',
        code: 'MISSING_TARGET_TAGNAME',
      });
    }

    if (!Array.isArray(target.selectors) || target.selectors.length === 0) {
      errors.push({
        path: `${path}.selectors`,
        message: 'Step requires at least one selector candidate.',
        code: 'MISSING_SELECTORS',
      });
    } else {
      target.selectors.forEach((sel, i) => {
        if (!sel.value || !sel.type) {
          errors.push({
            path: `${path}.selectors[${i}]`,
            message: 'Selector candidate requires valid type and value.',
            code: 'INVALID_SELECTOR',
          });
        }
      });
    }
  }

  /**
   * Checks for {{variable_name}} tokens and warns if variable is not defined in workflow.variables.
   */
  private static checkVariableReferences(
    text: string | undefined,
    path: string,
    definedVariables: Set<string>,
    warnings: ValidationWarning[]
  ): void {
    if (!text) return;

    const matches = text.matchAll(/\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g);
    for (const match of matches) {
      const varName = match[1];
      if (varName && !definedVariables.has(varName) && varName !== 'password' && varName !== 'sensitive') {
        warnings.push({
          path,
          message: `Reference to undefined variable "{{${varName}}}".`,
          code: 'UNDEFINED_VARIABLE_REFERENCE',
        });
      }
    }
  }
}
