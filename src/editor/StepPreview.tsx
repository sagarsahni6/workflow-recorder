/**
 * Step Preview Component.
 *
 * Displays visual thumbnail / screenshot from IndexedDB, or element target
 * metadata inspector when screenshots are not captured or disabled.
 */

import { useState, useEffect } from 'react';
import type { WorkflowStep } from '@shared/types';
import { ScreenshotRepository } from '@storage/screenshot-repository';
import { IconEye } from './Icons';

interface StepPreviewProps {
  step: WorkflowStep | null;
}

export function StepPreview({ step }: StepPreviewProps) {
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const stepId = step?.id;

  useEffect(() => {
    if (!stepId) {
      setScreenshotUrl(null);
      return;
    }

    let active = true;
    setLoading(true);

    ScreenshotRepository.get(stepId)
      .then((url) => {
        if (active) {
          setScreenshotUrl(url);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setScreenshotUrl(null);
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [stepId]);

  if (!step) {
    return (
      <div className="step-preview empty">
        <div className="empty-preview-state">
          <IconEye size={32} className="preview-icon" />
          <p>Select a step to view preview and DOM target details</p>
        </div>
      </div>
    );
  }

  const hasTarget = 'target' in step && step.target;

  return (
    <div className="step-preview">
      <div className="preview-header">
        <h3>Step Preview</h3>
        <span className="step-type-pill">{step.type}</span>
      </div>

      {loading ? (
        <div className="preview-loading">Loading thumbnail...</div>
      ) : screenshotUrl ? (
        <div className="preview-image-wrapper">
          <img src={screenshotUrl} alt={`Screenshot for step ${step.id}`} className="preview-img" />
        </div>
      ) : (
        <div className="preview-placeholder">
          <div className="no-screenshot-badge">No Screenshot Captured</div>
        </div>
      )}

      {hasTarget && step.target && (
        <div className="target-inspector">
          <h4>DOM Target Information</h4>
          <div className="target-prop">
            <span className="prop-label">Tag Name:</span>
            <code>{step.target.tagName}</code>
          </div>
          {step.target.id && (
            <div className="target-prop">
              <span className="prop-label">ID:</span>
              <code>#{step.target.id}</code>
            </div>
          )}
          {step.target.name && (
            <div className="target-prop">
              <span className="prop-label">Name:</span>
              <code>{step.target.name}</code>
            </div>
          )}
          {step.target.role && (
            <div className="target-prop">
              <span className="prop-label">Role:</span>
              <code>{step.target.role}</code>
            </div>
          )}
          {step.target.ariaLabel && (
            <div className="target-prop">
              <span className="prop-label">ARIA Label:</span>
              <span>{step.target.ariaLabel}</span>
            </div>
          )}
          {step.target.text && (
            <div className="target-prop">
              <span className="prop-label">Text:</span>
              <span className="prop-text-truncate">&ldquo;{step.target.text}&rdquo;</span>
            </div>
          )}
          {step.target.classes && step.target.classes.length > 0 && (
            <div className="target-prop">
              <span className="prop-label">Classes:</span>
              <div className="class-pills">
                {step.target.classes.map((cls, idx) => (
                  <span key={idx} className="class-pill">.{cls}</span>
                ))}
              </div>
            </div>
          )}
          {step.target.frame && (
            <div className="target-prop">
              <span className="prop-label">Frame Context:</span>
              <span className="badge badge-frame">{step.target.frame.type}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
