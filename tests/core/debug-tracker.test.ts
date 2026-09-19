import { describe, it, expect, beforeEach } from 'vitest';
import { DebugTracker } from '../../src/core/debug-tracker';

describe('DebugTracker', () => {
  let tracker: DebugTracker;

  beforeEach(() => {
    tracker = DebugTracker.getInstance();
    tracker.reset();
  });

  it('should initialize with 0 counts', () => {
    const stats = tracker.getStats();
    expect(stats.eventsReceived).toBe(0);
    expect(stats.logicalActions).toBe(0);
    expect(stats.ignoredEvents).toBe(0);
    expect(stats.lastEvent).toBeNull();
  });

  it('should record raw events, logical actions, and ignored events', () => {
    tracker.recordRawEvent('pointerdown');
    tracker.recordRawEvent('pointerup');
    tracker.recordRawEvent('click');
    tracker.recordIgnoredEvent('duplicate-click', 'click');
    tracker.recordLogicalAction('click', '#submit-btn', 0.98);

    const stats = tracker.getStats();
    expect(stats.eventsReceived).toBe(3);
    expect(stats.ignoredEvents).toBe(1);
    expect(stats.logicalActions).toBe(1);
    expect(stats.lastEvent).toBeDefined();
    expect(stats.lastEvent?.type).toBe('CLICK');
    expect(stats.lastEvent?.selector).toBe('#submit-btn');
    expect(stats.lastEvent?.confidence).toBe(0.98);
  });

  it('should export formatted debug logs with statistics and redacted entries', () => {
    tracker.recordRawEvent('keydown');
    tracker.recordLogicalAction('input', 'input[name="token"]', 0.95);
    tracker.recordIgnoredEvent('debounce', 'scroll');

    const logs = tracker.exportLogs();
    expect(logs).toContain('=== WORKFLOW RECORDER DEBUG LOG ===');
    expect(logs).toContain('Events received: 1');
    expect(logs).toContain('Logical actions: 1');
    expect(logs).toContain('Ignored events: 1');
    expect(logs).toContain('Last event: INPUT');
  });

  it('should reset stats correctly on reset() call', () => {
    tracker.recordRawEvent('click');
    tracker.recordLogicalAction('click');
    tracker.reset();

    const stats = tracker.getStats();
    expect(stats.eventsReceived).toBe(0);
    expect(stats.logicalActions).toBe(0);
  });
});
