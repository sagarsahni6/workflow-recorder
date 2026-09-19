import { describe, it, expect } from 'vitest';
import { importFromJSON } from '../../src/imports/json';
import { importFromYAML, parseYAML } from '../../src/imports/yaml';
import { importFromCSV } from '../../src/imports/csv';
import { importWorkflowFile, detectFormat } from '../../src/imports/index';
import { exportToYAML } from '../../src/exporters/yaml';
import { exportToCSV } from '../../src/exporters/csv';
import type { Workflow } from '../../src/shared/types';

describe('Multi-Format Importer Engine', () => {
  const sampleWorkflow: Workflow = {
    schemaVersion: '1.0',
    id: 'wf_import_test_1',
    name: 'Sample Import Workflow',
    description: 'A test workflow for importers',
    createdAt: '2026-09-16T00:00:00.000Z',
    updatedAt: '2026-09-16T00:00:00.000Z',
    variables: [
      {
        name: 'username',
        type: 'string',
        required: true,
        defaultValue: 'admin',
      },
    ],
    settings: {
      defaultTimeout: 10000,
      defaultRetryCount: 2,
      screenshotsEnabled: false,
    },
    steps: [
      {
        id: 'step_001',
        type: 'navigate',
        url: 'https://example.com/login',
        description: 'Open login page',
      },
      {
        id: 'step_002',
        type: 'input',
        target: {
          tagName: 'INPUT',
          classes: [],
          selectors: [{ type: 'css', value: '#user', score: 0.95 }],
        },
        value: '{{username}}',
        sensitive: false,
        description: 'Enter username',
      },
      {
        id: 'step_003',
        type: 'click',
        target: {
          tagName: 'BUTTON',
          classes: [],
          selectors: [{ type: 'css', value: 'button[type="submit"]', score: 0.9 }],
        },
        clickType: 'left',
        description: 'Click Submit',
      },
    ],
  };

  describe('JSON Importer', () => {
    it('should successfully parse and validate canonical JSON workflow', () => {
      const jsonStr = JSON.stringify(sampleWorkflow, null, 2);
      const res = importFromJSON(jsonStr);
      expect(res.success).toBe(true);
      expect(res.workflow).toBeDefined();
      expect(res.workflow?.name).toBe('Sample Import Workflow');
      expect(res.workflow?.steps.length).toBe(3);
    });

    it('should return errors on invalid JSON syntax', () => {
      const res = importFromJSON('{ invalid json: ');
      expect(res.success).toBe(false);
      expect(res.errors[0]).toContain('JSON syntax error');
    });

    it('should return semantic validation errors on broken workflow', () => {
      const broken = {
        name: 'Broken',
        steps: [
          { id: 'step_1', type: 'click' }, // missing target!
        ],
      };
      const res = importFromJSON(JSON.stringify(broken));
      expect(res.success).toBe(false);
      expect(res.errors.length).toBeGreaterThan(0);
    });
  });

  describe('YAML Importer', () => {
    it('should correctly parse lightweight YAML structures', () => {
      const yaml = `
name: Test
count: 42
flag: true
items:
  - alpha
  - beta
`;
      const parsed = parseYAML(yaml) as Record<string, unknown>;
      expect(parsed.name).toBe('Test');
      expect(parsed.count).toBe(42);
      expect(parsed.flag).toBe(true);
      expect(Array.isArray(parsed.items)).toBe(true);
    });

    it('should successfully round-trip a workflow exported to YAML', () => {
      const yamlExport = exportToYAML(sampleWorkflow);
      const res = importFromYAML(yamlExport.content);
      expect(res.success).toBe(true);
      expect(res.workflow?.name).toBe('Sample Import Workflow');
      expect(res.workflow?.steps.length).toBe(3);
      expect(res.workflow?.steps[0]?.type).toBe('navigate');
    });
  });

  describe('CSV Importer', () => {
    it('should reconstruct a workflow from CSV exported table', () => {
      const csvExport = exportToCSV(sampleWorkflow);
      const res = importFromCSV(csvExport.content, 'Imported CSV Test');
      expect(res.success).toBe(true);
      expect(res.workflow).toBeDefined();
      expect(res.workflow?.name).toBe('Imported CSV Test');
      expect(res.workflow?.steps.length).toBe(3);
      expect(res.workflow?.steps[0]?.type).toBe('navigate');
      expect(res.workflow?.steps[1]?.type).toBe('input');
      expect(res.workflow?.steps[2]?.type).toBe('click');
    });

    it('should reject CSV without header', () => {
      const res = importFromCSV('no header just text');
      expect(res.success).toBe(false);
      expect(res.errors[0]).toContain('header');
    });
  });

  describe('Format Auto-Detection and Unified Dispatcher', () => {
    it('should detect file formats correctly by extension and content', () => {
      expect(detectFormat('test.json', '{}')).toBe('json');
      expect(detectFormat('test.yaml', 'name: 1')).toBe('yaml');
      expect(detectFormat('test.yml', 'name: 1')).toBe('yaml');
      expect(detectFormat('test.csv', 'step,type\n1,click')).toBe('csv');
      expect(detectFormat('unknown', '{"a": 1}')).toBe('json');
      expect(detectFormat('unknown', 'step,type,description\n1,navigate,Open')).toBe('csv');
    });

    it('should dispatch to appropriate importer in importWorkflowFile', () => {
      const jsonRes = importWorkflowFile(JSON.stringify(sampleWorkflow), 'workflow.json');
      expect(jsonRes.success).toBe(true);

      const yamlRes = importWorkflowFile(exportToYAML(sampleWorkflow).content, 'workflow.yaml');
      expect(yamlRes.success).toBe(true);

      const csvRes = importWorkflowFile(exportToCSV(sampleWorkflow).content, 'workflow.csv');
      expect(csvRes.success).toBe(true);
    });
  });
});
