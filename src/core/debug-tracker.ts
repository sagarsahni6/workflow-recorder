/**
 * Developer Debug Tracker.
 *
 * Tracks live recording telemetry:
 * - Events received
 * - Logical actions recorded
 * - Ignored events (noise, controller clicks, filtered inputs)
 * - Last recorded event details (type, selector, confidence)
 * - Sanitized circular log buffer for debug export without sensitive leaks
 */

export interface DebugEventInfo {
  timestamp: string;
  type: string;
  selector?: string;
  confidence?: number;
  message?: string;
}

export interface DebugStats {
  eventsReceived: number;
  logicalActions: number;
  ignoredEvents: number;
  lastEvent: DebugEventInfo | null;
}

export class DebugTracker {
  private static instance: DebugTracker | null = null;

  private eventsReceived = 0;
  private logicalActions = 0;
  private ignoredEvents = 0;
  private lastEvent: DebugEventInfo | null = null;
  private logs: Array<{ timestamp: string; level: 'info' | 'warn' | 'debug'; message: string }> = [];
  private readonly maxLogs = 200;

  public static getInstance(): DebugTracker {
    if (!DebugTracker.instance) {
      DebugTracker.instance = new DebugTracker();
    }
    return DebugTracker.instance;
  }

  /**
   * Records a raw browser event arrival.
   */
  public recordRawEvent(type: string): void {
    this.eventsReceived++;
    this.addLog('debug', `Raw event received: ${type}`);
  }

  /**
   * Records a normalized logical action output.
   */
  public recordLogicalAction(type: string, selector?: string, confidence?: number): void {
    this.logicalActions++;
    this.lastEvent = {
      timestamp: new Date().toISOString(),
      type: type.toUpperCase(),
      selector,
      confidence,
    };
    this.addLog('info', `Logical action generated: ${type} [Selector: ${selector || 'none'}, Confidence: ${Math.round((confidence || 0) * 100)}%]`);
  }

  /**
   * Records an event ignored due to debouncing, noise filtering, or controller origin.
   */
  public recordIgnoredEvent(reason: string, type?: string): void {
    this.ignoredEvents++;
    this.addLog('debug', `Event ignored (${reason}): ${type || 'unknown'}`);
  }

  /**
   * Retrieves current debug metrics snapshot.
   */
  public getStats(): DebugStats {
    return {
      eventsReceived: this.eventsReceived,
      logicalActions: this.logicalActions,
      ignoredEvents: this.ignoredEvents,
      lastEvent: this.lastEvent,
    };
  }

  /**
   * Resets all counters for a new recording session.
   */
  public reset(): void {
    this.eventsReceived = 0;
    this.logicalActions = 0;
    this.ignoredEvents = 0;
    this.lastEvent = null;
    this.logs = [];
    this.addLog('info', 'Debug tracker session reset');
  }

  /**
   * Adds an entry to the circular log buffer.
   */
  private addLog(level: 'info' | 'warn' | 'debug', message: string): void {
    // Sanitization: Scrub sensitive credentials if any
    const sanitized = message.replace(/(?:password|token|secret|aadhaar|pan)=[^&\s]+/gi, '$1=[REDACTED]');
    this.logs.push({
      timestamp: new Date().toISOString(),
      level,
      message: sanitized,
    });
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  /**
   * Exports sanitized debug logs as formatted text.
   */
  public exportLogs(): string {
    const stats = this.getStats();
    let out = '=== WORKFLOW RECORDER DEBUG LOG ===\n';
    out += `Generated at: ${new Date().toISOString()}\n`;
    out += `Events received: ${stats.eventsReceived}\n`;
    out += `Logical actions: ${stats.logicalActions}\n`;
    out += `Ignored events: ${stats.ignoredEvents}\n`;
    if (stats.lastEvent) {
      out += `Last event: ${stats.lastEvent.type}\n`;
      out += `Selector: ${stats.lastEvent.selector || 'none'}\n`;
      out += `Confidence: ${Math.round((stats.lastEvent.confidence || 0) * 100)}%\n`;
    }
    out += '\n--- EVENT LOGS ---\n';
    for (const entry of this.logs) {
      out += `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}\n`;
    }
    return out;
  }
}
