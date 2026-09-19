/**
 * Popup App — Main component for the extension popup.
 *
 * Displays:
 * - Recording status indicator (idle / recording / paused)
 * - Start / Stop / Pause / Resume recording buttons
 * - Action counter and elapsed time during recording
 * - Recent workflows list
 * - Quick links to Editor, Library, Settings
 */

import { useState, useEffect, useCallback } from 'react';
import type { RecordingState, WorkflowSummary } from '@shared/types';
import type {
  RecordingStateResponse,
  RecentWorkflowsResponse,
} from '@shared/messages';
import { sendToBackground } from '@shared/messages';
import { DEFAULT_RECORDING_STATE } from '@shared/constants';
import { formatElapsedTime, formatRelativeTime } from '@shared/utils';
import {
  IconPause,
  IconStop,
  IconPlay,
  IconEdit,
  IconBook,
  IconSettings,
  IconX,
} from '../editor/Icons';

export function App() {
  const [state, setState] = useState<RecordingState>({
    ...DEFAULT_RECORDING_STATE,
  });
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  // ─── Fetch State ──────────────────────────────────────────────────

  const fetchState = useCallback(async () => {
    try {
      const response = await sendToBackground<RecordingStateResponse>({
        type: 'GET_RECORDING_STATE',
      });
      if (response.type === 'RECORDING_STATE') {
        setState(response.state);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch state');
    }
  }, []);

  const fetchWorkflows = useCallback(async () => {
    try {
      const response = await sendToBackground<RecentWorkflowsResponse>({
        type: 'GET_RECENT_WORKFLOWS',
        limit: 5,
      });
      if (response.type === 'RECENT_WORKFLOWS') {
        setWorkflows(response.workflows);
      }
    } catch {
      // Silently fail for recent workflows
    }
  }, []);

  useEffect(() => {
    void fetchState();
    void fetchWorkflows();
  }, [fetchState, fetchWorkflows]);

  // Refresh elapsed time while recording
  useEffect(() => {
    if (state.status !== 'recording') return;

    const interval = setInterval(() => {
      void fetchState();
    }, 1000);

    return () => clearInterval(interval);
  }, [state.status, fetchState]);

  // ─── Actions ──────────────────────────────────────────────────────

  const handleStartRecording = async () => {
    try {
      setError(null);
      const response = await sendToBackground<RecordingStateResponse>({
        type: 'START_RECORDING',
      });
      if (response.type === 'RECORDING_STATE') {
        setState(response.state);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start');
    }
  };

  const handleStopRecording = async () => {
    try {
      setError(null);
      const response = await sendToBackground<RecordingStateResponse>({
        type: 'STOP_RECORDING',
      });
      if (response.type === 'RECORDING_STATE') {
        setState(response.state);
      }
      void fetchWorkflows();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop');
    }
  };

  const handlePauseRecording = async () => {
    try {
      const response = await sendToBackground<RecordingStateResponse>({
        type: 'PAUSE_RECORDING',
      });
      if (response.type === 'RECORDING_STATE') {
        setState(response.state);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pause');
    }
  };

  const handleResumeRecording = async () => {
    try {
      const response = await sendToBackground<RecordingStateResponse>({
        type: 'RESUME_RECORDING',
      });
      if (response.type === 'RECORDING_STATE') {
        setState(response.state);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resume');
    }
  };

  const handleOpenEditor = async () => {
    try {
      await sendToBackground({ type: 'OPEN_EDITOR' });
    } catch {
      // Ignore — window may close before response
    }
  };

  // ─── Status Helpers ───────────────────────────────────────────────

  const statusLabel =
    state.status === 'recording'
      ? 'Recording'
      : state.status === 'paused'
        ? 'Paused'
        : 'Ready';

  const statusClass = `status-indicator status-${state.status}`;

  // ─── Render ───────────────────────────────────────────────────────

  return (
    <div className="popup-container">
      {/* Header */}
      <header className="popup-header">
        <div className="logo-section">
          <div className="logo-icon">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          <h1 className="app-title">Workflow Recorder</h1>
        </div>
        <div className={statusClass}>
          <span className="status-dot" />
          <span className="status-text">{statusLabel}</span>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button
            className="error-dismiss"
            onClick={() => setError(null)}
            aria-label="Dismiss error"
          >
            <IconX size={14} />
          </button>
        </div>
      )}

      {/* Recording Info */}
      {state.status !== 'idle' && (
        <div className="recording-info">
          <div className="info-item">
            <span className="info-label">Actions</span>
            <span className="info-value">{state.actionCount}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Elapsed</span>
            <span className="info-value">
              {formatElapsedTime(state.elapsedMs)}
            </span>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="controls">
        {state.status === 'idle' && (
          <button
            id="btn-start-recording"
            className="btn btn-primary btn-record"
            onClick={handleStartRecording}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="currentColor"
            >
              <circle cx="8" cy="8" r="6" />
            </svg>
            Start Recording
          </button>
        )}

        {state.status === 'recording' && (
          <>
            <button
              id="btn-pause-recording"
              className="btn btn-secondary"
              onClick={handlePauseRecording}
            >
              <IconPause size={14} /> Pause
            </button>
            <button
              id="btn-stop-recording"
              className="btn btn-danger"
              onClick={handleStopRecording}
            >
              <IconStop size={14} /> Stop
            </button>
          </>
        )}

        {state.status === 'paused' && (
          <>
            <button
              id="btn-resume-recording"
              className="btn btn-primary"
              onClick={handleResumeRecording}
            >
              <IconPlay size={14} /> Resume
            </button>
            <button
              id="btn-stop-recording-paused"
              className="btn btn-danger"
              onClick={handleStopRecording}
            >
              <IconStop size={14} /> Stop
            </button>
          </>
        )}
      </div>

      {/* Recent Workflows */}
      <section className="section">
        <h2 className="section-title">Recent Workflows</h2>
        {workflows.length === 0 ? (
          <p className="empty-message">No workflows yet. Start recording!</p>
        ) : (
          <ul className="workflow-list">
            {workflows.map((wf) => (
              <li key={wf.id} className="workflow-item">
                <div className="workflow-item-info">
                  <span className="workflow-name">{wf.name}</span>
                  <span className="workflow-meta">
                    {wf.stepCount} steps · {formatRelativeTime(wf.updatedAt)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Footer Links */}
      <footer className="popup-footer">
        <button className="link-btn" onClick={handleOpenEditor}>
          <IconEdit size={14} /> Editor
        </button>
        <button className="link-btn" onClick={handleOpenEditor}>
          <IconBook size={14} /> Library
        </button>
        <button className="link-btn" onClick={handleOpenEditor}>
          <IconSettings size={14} /> Settings
        </button>
      </footer>
    </div>
  );
}
