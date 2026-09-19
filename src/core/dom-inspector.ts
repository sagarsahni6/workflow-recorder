/**
 * DOM Inspector — captures rich metadata about interacted DOM elements.
 *
 * Designed to be fast, non-intrusive, and memory-conscious.
 * Never stores entire DOM trees or sensitive data.
 */

import type { ElementTarget, FrameContext, Position, SelectorCandidate } from '@shared/types';
import { isDynamicSelector } from '@shared/utils';
import { PrivacyGuard } from './privacy-guard';

export interface InspectedElementInfo {
  tagName: string;
  id?: string;
  name?: string;
  type?: string;
  text?: string;
  ariaLabel?: string;
  role?: string;
  title?: string;
  placeholder?: string;
  labelText?: string;
  classes: string[];
  value?: string;
  checked?: boolean;
  href?: string;
  isSensitive: boolean;
  position: Position;
  frame: FrameContext;
}

export class DOMInspector {
  /** Max length of captured element text to avoid bloated workflows. */
  private static readonly MAX_TEXT_LENGTH = 120;

  /**
   * Inspects a DOM element and returns structured metadata.
   */
  public static inspect(element: Element): InspectedElementInfo {
    const tagName = element.tagName.toUpperCase();

    // Find meaningful attributes
    const id = element.id ? element.id.trim() : undefined;
    const name = element.getAttribute('name')?.trim() || undefined;
    const type = element.getAttribute('type')?.toLowerCase() || undefined;
    const role = element.getAttribute('role')?.trim() || undefined;
    const title = element.getAttribute('title')?.trim() || undefined;
    const placeholder = element.getAttribute('placeholder')?.trim() || undefined;
    const href = element.getAttribute('href')?.trim() || undefined;

    // Associated label text (for form controls)
    const labelText = this.findAssociatedLabel(element);

    // ARIA label or fallback to associated label
    const ariaLabel =
      element.getAttribute('aria-label')?.trim() ||
      labelText ||
      undefined;

    // Filter stable class names
    const classes = this.extractStableClasses(element);

    // Visible text content
    const text = this.extractText(element);

    // Form value / state
    const { value, checked } = this.extractFormState(element);

    // Sensitive field detection
    const isSensitive = this.detectSensitive(element, { id, name, placeholder, ariaLabel, type });

    // Center coordinates
    const position = this.getElementCenter(element);

    // Iframe hierarchy
    const frame = this.getFrameContext(element);

    return {
      tagName,
      id,
      name,
      type,
      text,
      ariaLabel,
      role,
      title,
      placeholder,
      labelText,
      classes,
      value,
      checked,
      href,
      isSensitive,
      position,
      frame,
    };
  }

  /**
   * Finds the label associated with a form element:
   * 1. aria-labelledby target
   * 2. <label for="..."> element
   * 3. Closest enclosing <label>
   */
  public static findAssociatedLabel(element: Element): string | undefined {
    try {
      const doc = element.ownerDocument;

      // 1. aria-labelledby
      const labelledBy = element.getAttribute('aria-labelledby');
      if (labelledBy) {
        const labelEl = doc.getElementById(labelledBy);
        if (labelEl) {
          const t = this.extractText(labelEl);
          if (t) return t;
        }
      }

      // 2. label[for="id"]
      if (element.id) {
        const forLabel = doc.querySelector(`label[for="${CSS.escape(element.id)}"]`);
        if (forLabel) {
          const t = this.extractText(forLabel);
          if (t) return t;
        }
      }

      // 3. Enclosing label
      const enclosingLabel = element.closest('label');
      if (enclosingLabel) {
        const t = this.extractText(enclosingLabel);
        if (t) return t;
      }
    } catch {
      // Ignore DOM lookup errors
    }

    return undefined;
  }

  /**
   * Finds the most logical interactive element (e.g., button, link) if the click
   * was received by a nested span, icon, or SVG.
   */
  public static findInteractiveAncestor(target: Element): Element {
    let current: Element | null = target;
    let depth = 0;
    const maxDepth = 6;

    while (current && current !== document.body && depth < maxDepth) {
      const tag = current.tagName.toUpperCase();

      // Form controls and interactive tags
      if (
        tag === 'BUTTON' ||
        tag === 'A' ||
        tag === 'INPUT' ||
        tag === 'SELECT' ||
        tag === 'TEXTAREA' ||
        current.getAttribute('role') === 'button' ||
        current.getAttribute('role') === 'link' ||
        current.getAttribute('role') === 'menuitem' ||
        current.getAttribute('role') === 'tab' ||
        current.getAttribute('contenteditable') === 'true' ||
        current.getAttribute('data-action') != null
      ) {
        return current;
      }

      // If element has a direct click listener or pointer cursor in inline style
      if (htmlHasPointerCursor(current)) {
        return current;
      }

      current = current.parentElement;
      depth++;
    }

    return target;
  }

  /**
   * Extracts clean, stable class names while ignoring dynamic/generated classes.
   */
  public static extractStableClasses(element: Element): string[] {
    const classAttr = element.getAttribute('class');
    if (!classAttr) return [];

    return classAttr
      .split(/\s+/)
      .map((c) => c.trim())
      .filter((c) => {
        if (!c) return false;
        // Ignore single-character classes or overly long hash classes
        if (c.length < 2 || c.length > 50) return false;
        // Reject dynamic classes matching common patterns (e.g. css-1234, jss321)
        return !isDynamicSelector(`.${c}`);
      });
  }

  /**
   * Extracts visible, trimmed text content without child explosion.
   */
  public static extractText(element: Element): string | undefined {
    const htmlEl = element as HTMLElement;
    const rawText = htmlEl.innerText || element.textContent || '';
    const cleanText = rawText.replace(/\s+/g, ' ').trim();

    if (!cleanText) return undefined;

    if (cleanText.length > this.MAX_TEXT_LENGTH) {
      return cleanText.substring(0, this.MAX_TEXT_LENGTH) + '...';
    }

    return cleanText;
  }

  /**
   * Extracts current value or checked state for input, textarea, and select elements.
   */
  public static extractFormState(element: Element): { value?: string; checked?: boolean } {
    const tag = element.tagName.toUpperCase();

    if (tag === 'INPUT') {
      const input = element as HTMLInputElement;
      const type = (input.type || 'text').toLowerCase();

      if (type === 'checkbox' || type === 'radio') {
        return { checked: input.checked, value: input.value };
      }
      return { value: input.value };
    }

    if (tag === 'TEXTAREA') {
      const textarea = element as HTMLTextAreaElement;
      return { value: textarea.value };
    }

    if (tag === 'SELECT') {
      const select = element as HTMLSelectElement;
      return { value: select.value };
    }

    return {};
  }

  /**
   * Determines whether an element handles sensitive information (passwords, card numbers, OTP, etc.).
   */
  public static detectSensitive(
    element: Element,
    hints: { id?: string; name?: string; placeholder?: string; ariaLabel?: string; type?: string }
  ): boolean {
    const autocomplete = element.getAttribute('autocomplete')?.toLowerCase();
    return PrivacyGuard.isSensitiveField({
      id: hints.id,
      name: hints.name,
      placeholder: hints.placeholder,
      ariaLabel: hints.ariaLabel,
      type: hints.type,
      autocomplete,
    });
  }

  /**
   * Calculates center coordinates of the element relative to viewport.
   */
  public static getElementCenter(element: Element): Position {
    try {
      const rect = element.getBoundingClientRect();
      return {
        x: Math.round(rect.left + rect.width / 2),
        y: Math.round(rect.top + rect.height / 2),
      };
    } catch {
      return { x: 0, y: 0 };
    }
  }

  /**
   * Determines if the element is inside an iframe and discovers the iframe's selector.
   */
  public static getFrameContext(element: Element): FrameContext {
    try {
      const ownerWindow = element.ownerDocument.defaultView;
      if (ownerWindow && ownerWindow !== ownerWindow.top) {
        const frameSelectors: SelectorCandidate[] = [];

        try {
          // Attempt to access parent document (same-origin check)
          const parentDoc = ownerWindow.parent.document;
          const iframes = Array.from(parentDoc.querySelectorAll('iframe'));

          for (const iframe of iframes) {
            if (iframe.contentWindow === ownerWindow) {
              if (iframe.id && !isDynamicSelector(`#${iframe.id}`)) {
                frameSelectors.push({
                  type: 'id',
                  value: `#${CSS.escape(iframe.id)}`,
                  score: 0.99,
                });
              } else if (iframe.getAttribute('name')) {
                frameSelectors.push({
                  type: 'name',
                  value: `iframe[name="${iframe.getAttribute('name')}"]`,
                  score: 0.90,
                });
              } else if (iframe.getAttribute('src')) {
                frameSelectors.push({
                  type: 'css',
                  value: `iframe[src="${iframe.getAttribute('src')}"]`,
                  score: 0.70,
                });
              }
              break;
            }
          }
        } catch {
          // Cross-origin restriction prevents parent access
        }

        return {
          type: 'iframe',
          depth: 1,
          selectors: frameSelectors,
        };
      }
    } catch {
      // Detached or unavailable window
    }

    return {
      type: 'main',
      depth: 0,
      selectors: [],
    };
  }

  /**
   * Converts inspected element information into an ElementTarget object.
   */
  public static toElementTarget(
    info: InspectedElementInfo,
    selectors: ElementTarget['selectors']
  ): ElementTarget {
    return {
      tagName: info.tagName,
      id: info.id,
      name: info.name,
      type: info.type,
      text: info.text,
      ariaLabel: info.ariaLabel,
      role: info.role,
      title: info.title,
      placeholder: info.placeholder,
      classes: info.classes,
      selectors,
      frame: info.frame,
    };
  }
}

function htmlHasPointerCursor(el: Element): boolean {
  try {
    const style = (el as HTMLElement).style;
    if (style && style.cursor === 'pointer') return true;
    if (typeof window !== 'undefined' && window.getComputedStyle) {
      const computed = window.getComputedStyle(el);
      return computed.cursor === 'pointer';
    }
  } catch {
    // Ignore error
  }
  return false;
}
