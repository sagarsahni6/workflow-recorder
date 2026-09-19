/**
 * Workflow Builder.
 *
 * Provides a fluent, programmatic API for constructing, editing, reordering,
 * duplicating, and managing workflows and their variables.
 */

import type {
  Workflow,
  WorkflowStep,
  WorkflowVariable,
  WorkflowSettings,
} from '@shared/types';
import {
  createEmptyWorkflow,
  generateStepId,
  generateStepDescription,
  now,
} from '@shared/utils';

export class WorkflowBuilder {
  private workflow: Workflow;

  constructor(workflow?: Workflow) {
    this.workflow = workflow
      ? JSON.parse(JSON.stringify(workflow)) // Deep clone
      : createEmptyWorkflow();
  }

  /**
   * Creates a new builder initialized with a fresh empty workflow.
   */
  public static create(name: string = 'Untitled Workflow'): WorkflowBuilder {
    return new WorkflowBuilder(createEmptyWorkflow(name));
  }

  /**
   * Creates a builder from an existing workflow.
   */
  public static fromWorkflow(workflow: Workflow): WorkflowBuilder {
    return new WorkflowBuilder(workflow);
  }

  /**
   * Alias for fromWorkflow.
   */
  public static from(workflow: Workflow): WorkflowBuilder {
    return this.fromWorkflow(workflow);
  }

  /**
   * Sets the workflow name.
   */
  public setName(name: string): this {
    this.workflow.name = name.trim();
    this.touch();
    return this;
  }

  /**
   * Sets the workflow description.
   */
  public setDescription(description: string): this {
    this.workflow.description = description.trim();
    this.touch();
    return this;
  }

  /**
   * Sets workflow execution settings.
   */
  public setSettings(settings: Partial<WorkflowSettings>): this {
    this.workflow.settings = {
      ...this.workflow.settings,
      ...settings,
    };
    this.touch();
    return this;
  }

  // ─── Step Operations ──────────────────────────────────────────────────

  /**
   * Appends a step to the workflow.
   */
  public addStep(step: WorkflowStep): this {
    const preparedStep = this.prepareStep(step);
    this.workflow.steps.push(preparedStep);
    this.touch();
    return this;
  }

  /**
   * Inserts a step at the given index.
   */
  public insertStepAt(index: number, step: WorkflowStep): this {
    const preparedStep = this.prepareStep(step);
    const targetIndex = Math.max(0, Math.min(this.workflow.steps.length, index));
    this.workflow.steps.splice(targetIndex, 0, preparedStep);
    this.touch();
    return this;
  }

  /**
   * Removes a step by its ID.
   */
  public removeStep(stepId: string): this {
    this.workflow.steps = this.workflow.steps.filter((s) => s.id !== stepId);
    this.touch();
    return this;
  }

  /**
   * Moves a step from one index to another (drag and drop reordering).
   */
  public moveStep(fromIndex: number, toIndex: number): this {
    const len = this.workflow.steps.length;
    if (fromIndex < 0 || fromIndex >= len || toIndex < 0 || toIndex >= len) {
      return this;
    }

    const [movedStep] = this.workflow.steps.splice(fromIndex, 1);
    if (movedStep) {
      this.workflow.steps.splice(toIndex, 0, movedStep);
      this.touch();
    }
    return this;
  }

  /**
   * Duplicates an existing step and inserts it immediately after the original,
   * assigning it a brand new unique ID.
   */
  public duplicateStep(stepId: string): this {
    const index = this.workflow.steps.findIndex((s) => s.id === stepId);
    if (index === -1) return this;

    const original = this.workflow.steps[index]!;
    const clone: WorkflowStep = {
      ...JSON.parse(JSON.stringify(original)),
      id: generateStepId(),
      timestamp: now(),
      description: original.description ? `${original.description} (Copy)` : undefined,
    };

    this.workflow.steps.splice(index + 1, 0, clone);
    this.touch();
    return this;
  }

  /**
   * Toggles the disabled status of a step.
   */
  public toggleStepDisabled(stepId: string): this {
    const step = this.workflow.steps.find((s) => s.id === stepId);
    if (step) {
      step.disabled = !step.disabled;
      this.touch();
    }
    return this;
  }

  /**
   * Updates an existing step with partial properties.
   */
  public updateStep(stepId: string, updates: Partial<WorkflowStep>): this {
    const index = this.workflow.steps.findIndex((s) => s.id === stepId);
    if (index !== -1) {
      const current = this.workflow.steps[index]!;
      const merged = { ...current, ...updates } as WorkflowStep;

      // Update description if not explicitly provided
      if (!updates.description) {
        merged.description = generateStepDescription(merged);
      }

      this.workflow.steps[index] = merged;
      this.touch();
    }
    return this;
  }

  // ─── Variable Operations ──────────────────────────────────────────────

  /**
   * Adds a new variable to the workflow.
   */
  public addVariable(variable: WorkflowVariable): this {
    const exists = this.workflow.variables.some((v) => v.name === variable.name);
    if (!exists) {
      this.workflow.variables.push({ ...variable });
      this.touch();
    }
    return this;
  }

  /**
   * Removes a variable by name.
   */
  public removeVariable(name: string): this {
    this.workflow.variables = this.workflow.variables.filter((v) => v.name !== name);
    this.touch();
    return this;
  }

  /**
   * Updates an existing variable.
   */
  public updateVariable(name: string, updates: Partial<WorkflowVariable>): this {
    const variable = this.workflow.variables.find((v) => v.name === name);
    if (variable) {
      Object.assign(variable, updates);
      this.touch();
    }
    return this;
  }

  // ─── Build & Helpers ──────────────────────────────────────────────────

  /**
   * Returns a copy of the finalized workflow.
   */
  public build(): Workflow {
    return JSON.parse(JSON.stringify(this.workflow));
  }

  /**
   * Updates the workflow updatedAt timestamp.
   */
  private touch(): void {
    this.workflow.updatedAt = now();
  }

  /**
   * Ensures the step has a valid ID, timestamp, and description.
   */
  private prepareStep(step: WorkflowStep): WorkflowStep {
    const s = { ...step };
    if (!s.id) {
      s.id = generateStepId();
    }
    if (!s.timestamp) {
      s.timestamp = now();
    }
    if (!s.description) {
      s.description = generateStepDescription(s);
    }
    return s;
  }
}
