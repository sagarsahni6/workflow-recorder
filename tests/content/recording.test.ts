import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EventCapture } from '@core/event-capture';
import type { WorkflowStep } from '@shared/types';

describe('EventCapture & Recording Pipeline', () => {
  let eventCapture: EventCapture;
  let capturedSteps: WorkflowStep[] = [];

  beforeEach(() => {
    document.body.innerHTML = '';
    capturedSteps = [];
    eventCapture = new EventCapture({
      onStep: (step) => capturedSteps.push(step),
    });
    eventCapture.start();
  });

  afterEach(() => {
    eventCapture.stop();
  });

  it('captures button click and emits ClickStep with target information', () => {
    document.body.innerHTML = '<button id="testBtn">Click Me</button>';
    const btn = document.getElementById('testBtn')!;

    btn.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 100, clientY: 200 }));

    expect(capturedSteps.length).toBe(1);
    expect(capturedSteps[0]!.type).toBe('click');
    const clickStep = capturedSteps[0] as any;
    expect(clickStep.target.id).toBe('testBtn');
    expect(clickStep.position.x).toBe(100);
    expect(clickStep.position.y).toBe(200);
  });

  it('ignores clicks occurring inside the floating controller', () => {
    document.body.innerHTML = `
      <div id="pageContent">
        <button id="regularBtn">Page Button</button>
        <workflow-recorder-controller data-workflow-recorder-ignore="true">
          <button id="controllerBtn">Pause</button>
        </workflow-recorder-controller>
      </div>
    `;

    const controllerBtn = document.getElementById('controllerBtn')!;
    controllerBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    // Must NOT record clicks inside controller
    expect(capturedSteps.length).toBe(0);

    // Regular page button click must still be recorded
    const regularBtn = document.getElementById('regularBtn')!;
    regularBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(capturedSteps.length).toBe(1);
    expect((capturedSteps[0] as any).target.id).toBe('regularBtn');
  });

  it('captures select element changes and emits SelectStep', () => {
    document.body.innerHTML = `
      <select id="stateSelect">
        <option value="CA">California</option>
        <option value="NY">New York</option>
      </select>
    `;
    const select = document.getElementById('stateSelect') as HTMLSelectElement;
    select.selectedIndex = 1;

    select.dispatchEvent(new Event('change', { bubbles: true }));

    expect(capturedSteps.length).toBe(1);
    expect(capturedSteps[0]!.type).toBe('select');
    const step = capturedSteps[0] as any;
    expect(step.value).toBe('NY');
    expect(step.label).toBe('New York');
  });

  it('captures checkbox changes and emits CheckboxStep', () => {
    document.body.innerHTML = '<input id="subscribe" type="checkbox" />';
    const checkbox = document.getElementById('subscribe') as HTMLInputElement;
    checkbox.checked = true;

    checkbox.dispatchEvent(new Event('change', { bubbles: true }));

    expect(capturedSteps.length).toBe(1);
    expect(capturedSteps[0]!.type).toBe('checkbox');
    expect((capturedSteps[0] as any).checked).toBe(true);
  });

  it('captures keypresses for Enter or Tab', () => {
    document.body.innerHTML = '<input id="searchField" type="text" />';
    const input = document.getElementById('searchField')!;

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(capturedSteps.length).toBe(1);
    expect(capturedSteps[0]!.type).toBe('keyPress');
    expect((capturedSteps[0] as any).key).toBe('Enter');
  });

  it('does not record events while paused', () => {
    document.body.innerHTML = '<button id="btn">Click</button>';
    const btn = document.getElementById('btn')!;

    eventCapture.pause();
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(capturedSteps.length).toBe(0);

    eventCapture.resume();
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(capturedSteps.length).toBe(1);
  });
});
