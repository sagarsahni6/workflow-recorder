/**
 * File Upload Handler.
 *
 * Detects <input type="file"> interactions and generates privacy-safe UploadSteps
 * referencing dynamic variables rather than embedding local paths or binaries.
 */

import type { UploadStep, ElementTarget } from '@shared/types';
import { generateStepId, now, slugify } from '@shared/utils';
import { DOMInspector } from '@core/dom-inspector';
import { SelectorEngine } from '@core/selector-engine';

export class FileUploadHandler {
  /**
   * Processes a file input change event and constructs a standardized UploadStep.
   */
  public static handleFileInput(inputEl: HTMLInputElement): UploadStep {
    const inspected = DOMInspector.inspect(inputEl);
    const candidates = SelectorEngine.generate(inputEl);

    const target: ElementTarget = {
      tagName: inputEl.tagName.toUpperCase(),
      id: inspected.id,
      name: inspected.name,
      type: 'file',
      classes: inspected.classes,
      selectors: candidates,
    };

    // Derive a clean, recognizable variable name e.g. {{resume_document}}
    const rawCandidate = inspected.name || inspected.id || inspected.ariaLabel || 'document';
    const cleanVarName = slugify(rawCandidate).replace(/-/g, '_');
    const variableName = /^[a-zA-Z_]/.test(cleanVarName) ? cleanVarName : `file_${cleanVarName}`;

    return {
      id: generateStepId(),
      type: 'upload',
      target,
      file: `{{${variableName}}}`,
      timestamp: now(),
      description: `Upload document to ${target.name || target.id || 'file input'}`,
    };
  }
}
