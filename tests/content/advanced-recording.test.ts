import { describe, it, expect, vi } from 'vitest';
import { FileUploadHandler } from '../../src/content/file-upload-handler';
import { DownloadDetector } from '../../src/background/download-detector';
import { TabManager } from '../../src/background/tab-manager';
import { SmartWaitSystem } from '@core/smart-waits';
import type { ElementTarget, Workflow, ClickStep } from '@shared/types';
import { createEmptyWorkflow } from '@shared/utils';

describe('Phase 8 — Advanced Recording', () => {
  describe('FileUploadHandler', () => {
    it('creates a privacy-safe upload step from a file input element', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.id = 'avatar-upload';
      input.name = 'user_avatar';
      document.body.appendChild(input);

      const step = FileUploadHandler.handleFileInput(input);

      expect(step.type).toBe('upload');
      expect(step.target.tagName).toBe('INPUT');
      expect(step.target.id).toBe('avatar-upload');
      expect(step.file).toBe('{{user_avatar}}');
      expect(step.description).toContain('Upload document');

      document.body.removeChild(input);
    });
  });

  describe('DownloadDetector', () => {
    it('normalizes chrome download items into privacy-safe download steps without host paths', () => {
      const onStep = vi.fn();
      const detector = new DownloadDetector(onStep);

      detector.handleDownloadCreated({
        filename: 'C:\\Users\\Admin\\Downloads\\financial_report_2026.pdf',
        url: 'https://bank.com/statements/download?auth_token=secret123',
      });

      expect(onStep).toHaveBeenCalledTimes(1);
      const step = onStep.mock.calls[0]![0];
      expect(step.type).toBe('download');
      expect(step.filename).toBe('{{downloaded_financial_report_2026_pdf}}');
      expect(step.url).toBe('https://bank.com/statements/download'); // query params stripped
      expect(step.description).toBe('Wait for download "financial_report_2026.pdf"');
    });
  });

  describe('TabManager', () => {
    it('maps numerical Chrome tab IDs to logical tab IDs across creation and switching', () => {
      const recordedSteps: any[] = [];
      const manager = new TabManager((step) => recordedSteps.push(step));

      manager.start(101); // Initial active tab -> tab_1
      expect(manager.getLogicalId(101)).toBe('tab_1');

      // Create new tab 202
      manager.handleTabCreated({ id: 202, url: 'https://portal.example.com' });
      expect(manager.getLogicalId(202)).toBe('tab_2');
      expect(recordedSteps[0].type).toBe('newTab');
      expect(recordedSteps[0].tabId).toBe('tab_2');

      // Switch to tab 202
      manager.handleTabActivated({ tabId: 202 });
      expect(recordedSteps[1].type).toBe('switchTab');
      expect(recordedSteps[1].tabId).toBe('tab_2');

      // Close tab 202
      manager.handleTabRemoved(202);
      expect(recordedSteps[2].type).toBe('closeTab');
      expect(recordedSteps[2].tabId).toBe('tab_2');
    });
  });

  describe('SmartWaitSystem', () => {
    it('synthesizes element and URL smart waits', () => {
      const target: ElementTarget = {
        tagName: 'BUTTON',
        classes: [],
        selectors: [{ type: 'css', value: '#submit', score: 0.9 }],
      };

      const elemWait = SmartWaitSystem.synthesizeWait(target, 'waitForVisible', 8000);
      expect(elemWait.type).toBe('waitForVisible');
      expect(elemWait.timeout).toBe(8000);

      const urlWait = SmartWaitSystem.synthesizeURLWait('https://app.com/dashboard', 10000);
      expect(urlWait.type).toBe('waitForURL');
      expect(urlWait.value).toBe('https://app.com/dashboard');
    });

    it('optimizes workflows by replacing blind waits before action steps with smart waits', () => {
      const wf: Workflow = createEmptyWorkflow('Optimization Test');

      const blindWait = {
        id: 'w1',
        type: 'wait' as const,
        timeout: 2000,
        description: 'Wait 2000ms',
      };

      const clickAction: ClickStep = {
        id: 'c1',
        type: 'click',
        target: {
          tagName: 'BUTTON',
          classes: [],
          selectors: [{ type: 'id', value: '#login-btn', score: 0.95 }],
        },
        clickType: 'left',
        description: 'Click login',
      };

      wf.steps = [blindWait, clickAction];

      const optimized = SmartWaitSystem.optimizeWorkflowWaits(wf);
      expect(optimized.steps).toHaveLength(2);
      expect(optimized.steps[0]?.type).toBe('waitForVisible');
      expect(optimized.steps[0]?.timeout).toBe(5000);
      expect(optimized.steps[1]?.type).toBe('click');
    });
  });
});
