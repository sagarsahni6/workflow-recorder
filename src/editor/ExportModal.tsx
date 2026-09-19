/**
 * Export Modal Component.
 *
 * Interactive preview and download modal supporting all 8 automation export targets.
 */

import React from 'react';
import { useState } from 'react';
import type { Workflow, ExportFormat } from '@shared/types';
import { exportWorkflow } from '@exporters/index';
import {
  IconCode,
  IconTheater,
  IconTent,
  IconTerminal,
  IconFile,
  IconFileText,
  IconBarChart,
  IconX,
  IconCheck,
  IconClipboard,
  IconDownload,
} from './Icons';

interface ExportModalProps {
  workflow: Workflow;
  onClose: () => void;
}

const FORMAT_OPTIONS: Array<{ format: ExportFormat; label: string; icon: React.FC<{ size?: number }> }> = [
  { format: 'json', label: 'JSON (Canonical)', icon: IconCode },
  { format: 'playwright-ts', label: 'Playwright TypeScript', icon: IconTheater },
  { format: 'playwright-js', label: 'Playwright JavaScript', icon: IconTheater },
  { format: 'puppeteer', label: 'Puppeteer JS', icon: IconTent },
  { format: 'selenium-python', label: 'Selenium Python', icon: IconTerminal },
  { format: 'yaml', label: 'YAML', icon: IconFile },
  { format: 'markdown', label: 'Markdown Docs', icon: IconFileText },
  { format: 'csv', label: 'CSV Spreadsheet', icon: IconBarChart },
];

export function ExportModal({ workflow, onClose }: ExportModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('playwright-ts');
  const [copied, setCopied] = useState(false);

  const exportResult = exportWorkflow(workflow, selectedFormat);

  const handleCopy = () => {
    navigator.clipboard.writeText(exportResult.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([exportResult.content], { type: exportResult.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exportResult.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="export-modal-overlay" onClick={onClose}>
      <div className="export-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="export-modal-header">
          <div className="modal-title">
            <h3>Export Workflow</h3>
            <p>Generate executable code or documents from &ldquo;{workflow.name}&rdquo;</p>
          </div>
          <button className="btn-close-modal" onClick={onClose}><IconX size={16} /></button>
        </div>

        <div className="format-selector-row">
          {FORMAT_OPTIONS.map((opt) => (
            <button
              key={opt.format}
              className={`btn-format-tab ${selectedFormat === opt.format ? 'active' : ''}`}
              onClick={() => setSelectedFormat(opt.format)}
            >
              <span className="format-icon"><opt.icon size={14} /></span>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>

        <div className="export-preview-box">
          <div className="preview-toolbar">
            <span className="file-info">{exportResult.filename}</span>
            <div className="preview-actions">
              <button className="btn-copy" onClick={handleCopy}>
                {copied ? <><IconCheck size={14} /> Copied!</> : <><IconClipboard size={14} /> Copy to Clipboard</>}
              </button>
              <button className="btn-download" onClick={handleDownload}>
                <IconDownload size={14} /> Download File
              </button>
            </div>
          </div>
          <pre className="code-viewer">{exportResult.content}</pre>
        </div>
      </div>
    </div>
  );
}
