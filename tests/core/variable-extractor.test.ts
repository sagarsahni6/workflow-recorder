import { describe, it, expect } from 'vitest';
import { VariableExtractor } from '@core/variable-extractor';
import { createEmptyWorkflow } from '@shared/utils';
import type { InputStep } from '@shared/types';

describe('VariableExtractor', () => {
  describe('inferVariableType()', () => {
    it('infers email type', () => {
      expect(VariableExtractor.inferVariableType('john.doe@company.org')).toBe('email');
    });

    it('infers phone type', () => {
      expect(VariableExtractor.inferVariableType('+1-555-234-5678')).toBe('phone');
      expect(VariableExtractor.inferVariableType('9876543210')).toBe('phone');
    });

    it('infers date type', () => {
      expect(VariableExtractor.inferVariableType('2024-12-25')).toBe('date');
    });

    it('infers number type', () => {
      expect(VariableExtractor.inferVariableType('42')).toBe('number');
      expect(VariableExtractor.inferVariableType('-15.75')).toBe('number');
    });

    it('infers URL type', () => {
      expect(VariableExtractor.inferVariableType('https://google.com')).toBe('url');
    });

    it('infers JSON type', () => {
      expect(VariableExtractor.inferVariableType('{"key": "value"}')).toBe('json');
    });

    it('defaults to string for general text', () => {
      expect(VariableExtractor.inferVariableType('Hello world')).toBe('string');
    });
  });

  describe('discoverSuggestions()', () => {
    it('discovers input values that can be converted to variables', () => {
      const wf = createEmptyWorkflow('Test');
      const step: InputStep = {
        id: 'step_1',
        type: 'input',
        target: {
          tagName: 'INPUT',
          name: 'user_email',
          classes: [],
          selectors: [{ type: 'id', value: '#email', score: 0.99 }],
        },
        value: 'alice@wonderland.com',
        sensitive: false,
        description: 'Enter email',
      };
      wf.steps = [step];

      const suggestions = VariableExtractor.discoverSuggestions(wf);
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0]!.stepId).toBe('step_1');
      expect(suggestions[0]!.type).toBe('email');
      expect(suggestions[0]!.suggestedName).toBe('user_email');
    });

    it('ignores masked passwords and already parameterized variables', () => {
      const wf = createEmptyWorkflow('Test');
      const pwdStep: InputStep = {
        id: 'pwd_step',
        type: 'input',
        target: { tagName: 'INPUT', classes: [], selectors: [] },
        value: '{{password}}',
        sensitive: true,
        description: 'Enter password',
      };
      const varStep: InputStep = {
        id: 'var_step',
        type: 'input',
        target: { tagName: 'INPUT', classes: [], selectors: [] },
        value: '{{customer_name}}',
        sensitive: false,
        description: 'Enter name',
      };
      wf.steps = [pwdStep, varStep];

      const suggestions = VariableExtractor.discoverSuggestions(wf);
      expect(suggestions).toHaveLength(0);
    });
  });

  describe('applyVariable()', () => {
    it('templates step value with {{varName}} and registers variable in workflow.variables', () => {
      const wf = createEmptyWorkflow('Test');
      const step: InputStep = {
        id: 'step_1',
        type: 'input',
        target: { tagName: 'INPUT', name: 'user_phone', classes: [], selectors: [] },
        value: '+1-555-123-4567',
        sensitive: false,
        description: 'Enter phone',
      };
      wf.steps = [step];

      const updatedWf = VariableExtractor.applyVariable(wf, 'step_1', 'user_phone');
      const updatedStep = updatedWf.steps[0] as InputStep;

      expect(updatedStep.value).toBe('{{user_phone}}');
      expect(updatedWf.variables).toHaveLength(1);
      expect(updatedWf.variables[0]!.name).toBe('user_phone');
      expect(updatedWf.variables[0]!.type).toBe('phone');
      expect(updatedWf.variables[0]!.defaultValue).toBe('+1-555-123-4567');
    });
  });
});
