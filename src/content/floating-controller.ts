/**
 * Floating Recording Controller.
 *
 * Injected into web pages during active recording.
 * Uses Shadow DOM for complete CSS and DOM isolation so neither the page
 * styles nor the controller styles interfere with each other.
 *
 * Draggable, sleek floating toolbar with:
 * - Red pulsing recording indicator / amber paused indicator
 * - Live monospace timer & step counter badge
 * - Prominent Pause / Resume button
 * - High-visibility Stop recording button
 * - Quick jump to Workflow Editor
 * - Minimize / Collapse toggle for minimal footprint
 * - Viewport-bounded dragging with session position persistence
 */

import { formatDuration } from '@shared/utils';

export interface ControllerCallbacks {
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onOpenEditor: () => void;
}

const STORAGE_KEY_POS = 'workflow_recorder_floating_pos';
const STORAGE_KEY_COLLAPSED = 'workflow_recorder_floating_collapsed';

export class FloatingController {
  private host: HTMLElement | null = null;
  private shadow: ShadowRoot | null = null;
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private startTime = 0;
  private elapsedMs = 0;
  private actionCount = 0;
  private isPaused = false;
  private isCollapsed = false;
  private callbacks: ControllerCallbacks;

  // Dragging state
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private initialLeft = 24;
  private initialTop = 24;

  constructor(callbacks: ControllerCallbacks) {
    this.callbacks = callbacks;
    try {
      this.isCollapsed = sessionStorage.getItem(STORAGE_KEY_COLLAPSED) === 'true';
    } catch {
      // sessionStorage may be restricted in sandboxed frames
    }
  }

  /**
   * Mounts the floating controller onto the document body.
   */
  public mount(initialState?: { isPaused?: boolean; actionCount?: number; startTime?: number }): void {
    if (this.host) return; // Already mounted

    this.isPaused = !!initialState?.isPaused;
    this.actionCount = initialState?.actionCount || 0;
    this.startTime = initialState?.startTime || Date.now();
    this.elapsedMs = this.isPaused ? 0 : Math.max(0, Date.now() - this.startTime);

    // Create custom host element
    this.host = document.createElement('workflow-recorder-controller');
    this.host.id = 'workflow-recorder-floating-controller';
    this.host.setAttribute('data-workflow-recorder-ignore', 'true');

    // Retrieve saved position or default to bottom-right
    let savedPos: { left?: number; top?: number } | null = null;
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY_POS);
      if (stored) savedPos = JSON.parse(stored);
    } catch {
      // Ignore storage read error
    }

    // Host positioning
    Object.assign(this.host.style, {
      position: 'fixed',
      zIndex: '2147483647', // Maximum browser z-index
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      userSelect: 'none',
      cursor: 'default',
      transition: 'opacity 0.2s ease, transform 0.2s ease',
    });

    if (savedPos && typeof savedPos.left === 'number' && typeof savedPos.top === 'number') {
      const maxLeft = Math.max(10, window.innerWidth - 380);
      const maxTop = Math.max(10, window.innerHeight - 60);
      const left = Math.min(Math.max(10, savedPos.left), maxLeft);
      const top = Math.min(Math.max(10, savedPos.top), maxTop);
      this.host.style.left = `${left}px`;
      this.host.style.top = `${top}px`;
      this.host.style.bottom = 'auto';
      this.host.style.right = 'auto';
    } else {
      this.host.style.bottom = '24px';
      this.host.style.right = '24px';
    }

    // Create isolated Shadow DOM
    this.shadow = this.host.attachShadow({ mode: 'open' });
    this.render();
    this.setupEvents();

    document.body.appendChild(this.host);

    // Start live clock
    if (!this.isPaused) {
      this.startTimer();
    }
  }

  /**
   * Updates state (e.g. action recorded, pause state changed).
   */
  public updateState(state: { isPaused?: boolean; actionCount?: number; elapsedMs?: number }): void {
    if (state.isPaused !== undefined && state.isPaused !== this.isPaused) {
      this.isPaused = state.isPaused;
      if (this.isPaused) {
        this.stopTimer();
      } else {
        this.startTime = Date.now() - (this.elapsedMs || 0);
        this.startTimer();
      }
    }

    if (state.actionCount !== undefined) {
      this.actionCount = state.actionCount;
    }

    if (state.elapsedMs !== undefined) {
      this.elapsedMs = state.elapsedMs;
    }

    this.updateDom();
  }

  /**
   * Unmounts and removes the floating controller.
   */
  public unmount(): void {
    this.stopTimer();
    if (this.host && this.host.parentNode) {
      this.host.parentNode.removeChild(this.host);
    }
    this.host = null;
    this.shadow = null;
  }

  // ─── Rendering ────────────────────────────────────────────────────────

  private render(): void {
    if (!this.shadow) return;

    const styles = `
      :host {
        all: initial;
        display: block;
      }

      *, *::before, *::after {
        box-sizing: border-box;
      }

      .floating-toolbar {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: rgba(255, 255, 255, 0.96);
        color: #0f172a;
        padding: 6px 10px;
        border-radius: 9999px;
        border: 1px solid rgba(203, 213, 225, 0.9);
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.8) inset;
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        font-size: 13px;
        user-select: none;
        transition: box-shadow 0.2s ease, border-color 0.2s ease, padding 0.2s ease;
      }

      .floating-toolbar:hover {
        box-shadow: 0 14px 30px -5px rgba(0, 0, 0, 0.16), 0 10px 12px -6px rgba(0, 0, 0, 0.1);
        border-color: #94a3b8;
      }

      /* Drag Grip Handle */
      .drag-handle {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 18px;
        height: 28px;
        cursor: grab;
        color: #94a3b8;
        border-radius: 4px;
        transition: color 0.15s ease, background 0.15s ease;
      }

      .drag-handle:hover {
        color: #475569;
        background: #f1f5f9;
      }

      .drag-handle:active {
        cursor: grabbing;
      }

      /* Status Pill (Indicator + Clock) */
      .status-pill {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        border-radius: 9999px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        font-weight: 600;
        font-size: 12px;
      }

      .pulse-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background-color: #ef4444;
        box-shadow: 0 0 8px #ef4444;
        animation: recPulse 1.5s infinite ease-in-out;
      }

      .pulse-dot.paused {
        background-color: #f59e0b;
        box-shadow: 0 0 6px #f59e0b;
        animation: none;
      }

      @keyframes recPulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.25); opacity: 0.7; }
      }

      .status-label {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.5px;
        color: #ef4444;
        text-transform: uppercase;
      }

      .status-label.paused {
        color: #d97706;
      }

      .timer-display {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 12px;
        color: #334155;
        font-weight: 600;
      }

      /* Steps badge */
      .steps-badge {
        display: inline-flex;
        align-items: center;
        padding: 3px 8px;
        border-radius: 9999px;
        background: #f0f9ff;
        color: #0284c7;
        border: 1px solid #bae6fd;
        font-size: 11px;
        font-weight: 600;
        white-space: nowrap;
      }

      /* Divider */
      .divider {
        width: 1px;
        height: 20px;
        background: #e2e8f0;
        margin: 0 2px;
      }

      /* Button Base */
      button {
        border: none;
        outline: none;
        padding: 5px 12px;
        border-radius: 9999px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
        transition: all 0.15s ease;
        line-height: 1.2;
      }

      button:active {
        transform: scale(0.96);
      }

      /* Pause / Resume Button */
      .btn-pause {
        background: #f1f5f9;
        border: 1px solid #cbd5e1;
        color: #1e293b;
      }

      .btn-pause:hover {
        background: #e2e8f0;
        border-color: #94a3b8;
      }

      .btn-pause.is-paused {
        background: #fef3c7;
        border-color: #fcd34d;
        color: #b45309;
        box-shadow: 0 0 8px rgba(245, 158, 11, 0.25);
      }

      .btn-pause.is-paused:hover {
        background: #fde68a;
      }

      /* Stop Button */
      .btn-stop {
        background: #dc2626;
        border: 1px solid #b91c1c;
        color: #ffffff;
        box-shadow: 0 2px 4px rgba(220, 38, 38, 0.25);
      }

      .btn-stop:hover {
        background: #b91c1c;
        border-color: #991b1b;
        box-shadow: 0 4px 8px rgba(220, 38, 38, 0.35);
      }

      /* Icon Buttons (Editor, Collapse) */
      .btn-icon {
        background: transparent;
        border: 1px solid transparent;
        color: #64748b;
        padding: 6px;
        border-radius: 50%;
        width: 28px;
        height: 28px;
      }

      .btn-icon:hover {
        background: #f1f5f9;
        border-color: #e2e8f0;
        color: #0f172a;
      }

      /* Collapsed Mode */
      .floating-toolbar.collapsed .steps-badge,
      .floating-toolbar.collapsed .status-label,
      .floating-toolbar.collapsed .btn-label {
        display: none;
      }

      .floating-toolbar.collapsed button {
        padding: 6px;
        width: 28px;
        height: 28px;
        border-radius: 50%;
      }
    `;

    const isPaused = this.isPaused;
    const collapsedClass = this.isCollapsed ? 'collapsed' : '';

    this.shadow.innerHTML = `
      <style>${styles}</style>
      <div class="floating-toolbar ${collapsedClass}" id="toolbar">
        <!-- Drag Handle -->
        <div class="drag-handle" id="dragHandle" title="Drag to reposition anywhere on screen">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="9" cy="5" r="2"/><circle cx="15" cy="5" r="2"/>
            <circle cx="9" cy="12" r="2"/><circle cx="15" cy="12" r="2"/>
            <circle cx="9" cy="19" r="2"/><circle cx="15" cy="19" r="2"/>
          </svg>
        </div>

        <!-- Status & Live Timer -->
        <div class="status-pill" id="statusPill" title="${isPaused ? 'Recording Paused' : 'Recording in Progress'}">
          <span class="pulse-dot ${isPaused ? 'paused' : ''}" id="pulseDot"></span>
          <span class="status-label ${isPaused ? 'paused' : ''}" id="statusLabel">${isPaused ? 'PAUSED' : 'REC'}</span>
          <span class="timer-display" id="timerText">${formatDuration(this.elapsedMs)}</span>
        </div>

        <!-- Actions Counter -->
        <span class="steps-badge" id="actionCount">${this.actionCount} steps</span>

        <div class="divider"></div>

        <!-- Pause / Resume Button -->
        <button class="btn-pause ${isPaused ? 'is-paused' : ''}" id="btnPause" title="${isPaused ? 'Resume Recording (Alt+P)' : 'Pause Recording (Alt+P)'}">
          <span id="pauseIcon">${isPaused ? this.getPlaySvg() : this.getPauseSvg()}</span>
          <span class="btn-label" id="pauseLabel">${isPaused ? 'Resume' : 'Pause'}</span>
        </button>

        <!-- Stop Button -->
        <button class="btn-stop" id="btnStop" title="Stop Recording & Save Workflow (Alt+S)">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <rect x="4" y="4" width="16" height="16" rx="2"/>
          </svg>
          <span class="btn-label">Stop</span>
        </button>

        <!-- Open Editor Button -->
        <button class="btn-icon" id="btnEditor" title="Open Workflow Editor">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
        </button>

        <!-- Collapse / Expand Toggle Button -->
        <button class="btn-icon" id="btnCollapse" title="${this.isCollapsed ? 'Expand Toolbar' : 'Minimize Toolbar'}">
          <svg id="collapseIcon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            ${this.isCollapsed ? '<polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>' : '<polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/>'}
          </svg>
        </button>
      </div>
    `;
  }

  private getPauseSvg(): string {
    return `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <rect x="6" y="4" width="4" height="16" rx="1"/>
      <rect x="14" y="4" width="4" height="16" rx="1"/>
    </svg>`;
  }

  private getPlaySvg(): string {
    return `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <polygon points="5 3 19 12 5 21 5 3"/>
    </svg>`;
  }

  private updateDom(): void {
    if (!this.shadow) return;

    const pulseDot = this.shadow.getElementById('pulseDot');
    const statusLabel = this.shadow.getElementById('statusLabel');
    const timerText = this.shadow.getElementById('timerText');
    const actionCount = this.shadow.getElementById('actionCount');
    const btnPause = this.shadow.getElementById('btnPause');
    const pauseIcon = this.shadow.getElementById('pauseIcon');
    const pauseLabel = this.shadow.getElementById('pauseLabel');

    if (pulseDot) {
      pulseDot.className = `pulse-dot ${this.isPaused ? 'paused' : ''}`;
    }
    if (statusLabel) {
      statusLabel.className = `status-label ${this.isPaused ? 'paused' : ''}`;
      statusLabel.textContent = this.isPaused ? 'PAUSED' : 'REC';
    }
    if (timerText) {
      timerText.textContent = formatDuration(this.elapsedMs);
    }
    if (actionCount) {
      actionCount.textContent = `${this.actionCount} steps`;
    }
    if (btnPause) {
      btnPause.className = `btn-pause ${this.isPaused ? 'is-paused' : ''}`;
      btnPause.title = this.isPaused ? 'Resume Recording (Alt+P)' : 'Pause Recording (Alt+P)';
    }
    if (pauseIcon) {
      pauseIcon.innerHTML = this.isPaused ? this.getPlaySvg() : this.getPauseSvg();
    }
    if (pauseLabel) {
      pauseLabel.textContent = this.isPaused ? 'Resume' : 'Pause';
    }
  }

  // ─── Events & Dragging ────────────────────────────────────────────────

  private setupEvents(): void {
    if (!this.shadow || !this.host) return;

    // Prevent any events within controller from leaking to the webpage
    const isolateEvent = (e: Event) => {
      e.stopPropagation();
    };

    const eventNames = ['click', 'mousedown', 'mouseup', 'pointerdown', 'pointerup', 'keydown', 'keyup', 'dblclick', 'contextmenu'];
    for (const name of eventNames) {
      this.shadow.addEventListener(name, isolateEvent);
    }

    // Buttons
    const btnPause = this.shadow.getElementById('btnPause');
    const btnStop = this.shadow.getElementById('btnStop');
    const btnEditor = this.shadow.getElementById('btnEditor');
    const btnCollapse = this.shadow.getElementById('btnCollapse');
    const toolbar = this.shadow.getElementById('toolbar');

    btnPause?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.isPaused) {
        this.callbacks.onResume();
      } else {
        this.callbacks.onPause();
      }
    });

    btnStop?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.callbacks.onStop();
    });

    btnEditor?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.callbacks.onOpenEditor();
    });

    btnCollapse?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.isCollapsed = !this.isCollapsed;
      try {
        sessionStorage.setItem(STORAGE_KEY_COLLAPSED, String(this.isCollapsed));
      } catch {
        // Ignore
      }
      if (toolbar) {
        toolbar.classList.toggle('collapsed', this.isCollapsed);
      }
      btnCollapse.title = this.isCollapsed ? 'Expand Toolbar' : 'Minimize Toolbar';
      const icon = this.shadow?.getElementById('collapseIcon');
      if (icon) {
        icon.innerHTML = this.isCollapsed
          ? '<polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>'
          : '<polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/>';
      }
    });

    // Dragging
    const dragHandle = this.shadow.getElementById('dragHandle');
    if (dragHandle) {
      dragHandle.addEventListener('mousedown', (e: MouseEvent) => {
        if (e.button !== 0) return; // Left mouse only
        this.isDragging = true;
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;

        const rect = this.host!.getBoundingClientRect();
        this.initialLeft = rect.left;
        this.initialTop = rect.top;

        // Switch positioning from bottom/right to top/left for smooth positioning
        this.host!.style.bottom = 'auto';
        this.host!.style.right = 'auto';
        this.host!.style.left = `${this.initialLeft}px`;
        this.host!.style.top = `${this.initialTop}px`;

        const onMouseMove = (moveEvent: MouseEvent) => {
          if (!this.isDragging || !this.host) return;
          const deltaX = moveEvent.clientX - this.dragStartX;
          const deltaY = moveEvent.clientY - this.dragStartY;

          const hostWidth = this.host.offsetWidth || 340;
          const hostHeight = this.host.offsetHeight || 44;

          const newLeft = Math.max(10, Math.min(window.innerWidth - hostWidth - 10, this.initialLeft + deltaX));
          const newTop = Math.max(10, Math.min(window.innerHeight - hostHeight - 10, this.initialTop + deltaY));

          this.host.style.left = `${newLeft}px`;
          this.host.style.top = `${newTop}px`;
        };

        const onMouseUp = () => {
          this.isDragging = false;
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);

          // Persist position for page reloads / cross-page navigation
          if (this.host) {
            const finalRect = this.host.getBoundingClientRect();
            try {
              sessionStorage.setItem(
                STORAGE_KEY_POS,
                JSON.stringify({ left: Math.round(finalRect.left), top: Math.round(finalRect.top) })
              );
            } catch {
              // Ignore
            }
          }
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
      });
    }
  }

  // ─── Timer ────────────────────────────────────────────────────────────

  private startTimer(): void {
    if (this.timerInterval) return;

    this.timerInterval = setInterval(() => {
      if (!this.isPaused) {
        this.elapsedMs = Date.now() - this.startTime;
        const timerText = this.shadow?.getElementById('timerText');
        if (timerText) {
          timerText.textContent = formatDuration(this.elapsedMs);
        }
      }
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }
}
