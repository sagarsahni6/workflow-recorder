import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventNormalizer } from '@core/event-normalizer';
import type { InputStep, ClickStep, ScrollStep, ElementTarget } from '@shared/types';

describe('EventNormalizer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const dummyTarget: ElementTarget = {
    tagName: 'INPUT',
    id: 'nameInput',
    classes: ['form-control'],
    selectors: [{ type: 'id', value: '#nameInput', score: 0.99 }],
  };

  it('groups consecutive typing keystrokes into a single logical input step', () => {
    const emittedSteps: any[] = [];
    const normalizer = new EventNormalizer((step) => emittedSteps.push(step));

    const inputEl = document.createElement('input');

    // Simulate user typing "S", "Sa", "Sag", "Saga", "Sagar"
    const keystrokes = ['S', 'Sa', 'Sag', 'Saga', 'Sagar'];
    for (const val of keystrokes) {
      const step: InputStep = {
        id: 'temp',
        type: 'input',
        target: dummyTarget,
        value: val,
        sensitive: false,
        description: '',
      };
      normalizer.handleStep(step, inputEl);
    }

    // Nothing should be emitted immediately while typing is still active
    expect(emittedSteps.length).toBe(0);

    // Fast-forward past the input debounce timer (1200ms)
    vi.advanceTimersByTime(1300);

    // Exactly 1 consolidated step should be emitted
    expect(emittedSteps.length).toBe(1);
    expect(emittedSteps[0].type).toBe('input');
    expect(emittedSteps[0].value).toBe('Sagar');
    expect(emittedSteps[0].sensitive).toBe(false);
  });

  it('flushes pending input immediately when another action occurs', () => {
    const emittedSteps: any[] = [];
    const normalizer = new EventNormalizer((step) => emittedSteps.push(step));

    const inputEl = document.createElement('input');

    // User types in input
    normalizer.handleStep(
      {
        id: '1',
        type: 'input',
        target: dummyTarget,
        value: 'admin',
        sensitive: false,
        description: '',
      },
      inputEl
    );

    expect(emittedSteps.length).toBe(0);

    // User clicks submit button before timer finishes
    const clickStep: ClickStep = {
      id: '2',
      type: 'click',
      target: { tagName: 'BUTTON', classes: [], selectors: [] },
      clickType: 'left',
      description: 'Click Submit',
    };
    normalizer.handleStep(clickStep);

    // First step must be the flushed input, second must be the click
    expect(emittedSteps.length).toBe(2);
    expect(emittedSteps[0].type).toBe('input');
    expect(emittedSteps[0].value).toBe('admin');
    expect(emittedSteps[1].type).toBe('click');
  });

  it('masks value with {{password}} if the field is marked sensitive', () => {
    const emittedSteps: any[] = [];
    const normalizer = new EventNormalizer((step) => emittedSteps.push(step));

    const pwdEl = document.createElement('input');

    normalizer.handleStep(
      {
        id: '1',
        type: 'input',
        target: dummyTarget,
        value: 'SuperSecret123!',
        sensitive: true,
        description: '',
      },
      pwdEl
    );

    normalizer.flush();

    expect(emittedSteps.length).toBe(1);
    expect(emittedSteps[0].value).toBe('{{password}}');
    expect(emittedSteps[0].sensitive).toBe(true);
  });

  it('debounces rapid scroll events into a single final scroll step', () => {
    const emittedSteps: any[] = [];
    const normalizer = new EventNormalizer((step) => emittedSteps.push(step));

    // Simulate 5 consecutive scroll events
    for (let y = 100; y <= 500; y += 100) {
      const scrollStep: ScrollStep = {
        id: 'scroll',
        type: 'scroll',
        position: { x: 0, y },
        description: '',
      };
      normalizer.handleStep(scrollStep);
    }

    expect(emittedSteps.length).toBe(0);

    // Advance past scroll debounce (350ms)
    vi.advanceTimersByTime(400);

    expect(emittedSteps.length).toBe(1);
    expect(emittedSteps[0].type).toBe('scroll');
    expect(emittedSteps[0].position.y).toBe(500);
  });
});
