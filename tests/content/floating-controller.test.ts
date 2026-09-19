import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FloatingController } from '../../src/content/floating-controller';

describe('FloatingController', () => {
  let controller: FloatingController;
  let onPauseMock = vi.fn();
  let onResumeMock = vi.fn();
  let onStopMock = vi.fn();
  let onOpenEditorMock = vi.fn();

  beforeEach(() => {
    document.body.innerHTML = '';
    onPauseMock = vi.fn();
    onResumeMock = vi.fn();
    onStopMock = vi.fn();
    onOpenEditorMock = vi.fn();

    controller = new FloatingController({
      onPause: onPauseMock,
      onResume: onResumeMock,
      onStop: onStopMock,
      onOpenEditor: onOpenEditorMock,
    });
  });

  afterEach(() => {
    controller.unmount();
  });

  it('mounts into DOM with isolated shadow root and proper ignore attributes', () => {
    controller.mount({ isPaused: false, actionCount: 2, startTime: Date.now() });

    const host = document.getElementById('workflow-recorder-floating-controller');
    expect(host).not.toBeNull();
    expect(host?.getAttribute('data-workflow-recorder-ignore')).toBe('true');
    expect(host?.shadowRoot).not.toBeNull();

    const shadow = host!.shadowRoot!;
    expect(shadow.getElementById('toolbar')).not.toBeNull();
    expect(shadow.getElementById('btnStop')).not.toBeNull();
    expect(shadow.getElementById('btnPause')).not.toBeNull();
    expect(shadow.getElementById('actionCount')?.textContent).toContain('2 steps');
  });

  it('triggers onPause when pause button is clicked while recording', () => {
    controller.mount({ isPaused: false, actionCount: 0 });

    const host = document.getElementById('workflow-recorder-floating-controller')!;
    const btnPause = host.shadowRoot!.getElementById('btnPause')!;

    btnPause.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onPauseMock).toHaveBeenCalledTimes(1);
    expect(onResumeMock).not.toHaveBeenCalled();
  });

  it('triggers onResume when pause button is clicked while paused', () => {
    controller.mount({ isPaused: true, actionCount: 3 });

    const host = document.getElementById('workflow-recorder-floating-controller')!;
    const btnPause = host.shadowRoot!.getElementById('btnPause')!;

    expect(btnPause.classList.contains('is-paused')).toBe(true);

    btnPause.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onResumeMock).toHaveBeenCalledTimes(1);
    expect(onPauseMock).not.toHaveBeenCalled();
  });

  it('triggers onStop when stop button is clicked', () => {
    controller.mount({ isPaused: false, actionCount: 5 });

    const host = document.getElementById('workflow-recorder-floating-controller')!;
    const btnStop = host.shadowRoot!.getElementById('btnStop')!;

    btnStop.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onStopMock).toHaveBeenCalledTimes(1);
  });

  it('triggers onOpenEditor when editor button is clicked', () => {
    controller.mount({ isPaused: false, actionCount: 1 });

    const host = document.getElementById('workflow-recorder-floating-controller')!;
    const btnEditor = host.shadowRoot!.getElementById('btnEditor')!;

    btnEditor.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onOpenEditorMock).toHaveBeenCalledTimes(1);
  });

  it('updates state dynamically and toggles pause/resume UI', () => {
    controller.mount({ isPaused: false, actionCount: 1 });

    const host = document.getElementById('workflow-recorder-floating-controller')!;
    const shadow = host.shadowRoot!;

    // Transition to paused
    controller.updateState({ isPaused: true, actionCount: 4 });

    expect(shadow.getElementById('statusLabel')?.textContent).toBe('PAUSED');
    expect(shadow.getElementById('actionCount')?.textContent).toBe('4 steps');
    expect(shadow.getElementById('btnPause')?.classList.contains('is-paused')).toBe(true);

    // Transition back to active recording
    controller.updateState({ isPaused: false, actionCount: 5 });

    expect(shadow.getElementById('statusLabel')?.textContent).toBe('REC');
    expect(shadow.getElementById('actionCount')?.textContent).toBe('5 steps');
    expect(shadow.getElementById('btnPause')?.classList.contains('is-paused')).toBe(false);
  });

  it('toggles collapse mode when collapse button is clicked', () => {
    controller.mount({ isPaused: false });

    const host = document.getElementById('workflow-recorder-floating-controller')!;
    const shadow = host.shadowRoot!;
    const toolbar = shadow.getElementById('toolbar')!;
    const btnCollapse = shadow.getElementById('btnCollapse')!;

    expect(toolbar.classList.contains('collapsed')).toBe(false);

    btnCollapse.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(toolbar.classList.contains('collapsed')).toBe(true);

    btnCollapse.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(toolbar.classList.contains('collapsed')).toBe(false);
  });

  it('unmounts cleanly from DOM', () => {
    controller.mount();
    expect(document.getElementById('workflow-recorder-floating-controller')).not.toBeNull();

    controller.unmount();
    expect(document.getElementById('workflow-recorder-floating-controller')).toBeNull();
  });
});
