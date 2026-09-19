/**
 * Smart Selector Engine.
 *
 * Generates multiple robust selector candidates for DOM elements:
 * 1. Unique IDs (filtering dynamic IDs)
 * 2. Stable test attributes (data-testid, data-test-id, data-qa, data-cy)
 * 3. ARIA attributes (aria-label, accessible role + name)
 * 4. Stable form names
 * 5. Button/link text selectors
 * 6. Semantic and hierarchical CSS selectors
 * 7. XPath selectors
 *
 * Integrates SelectorValidator, SelectorScoring, and SelectorFallback
 * to validate, score, and rank candidates into a resilient fallback chain.
 */

import type { SelectorCandidate } from '@shared/types';
import { isDynamicSelector } from '@shared/utils';
import { SelectorValidator } from './selector-validator';
import { SelectorFallback } from './selector-fallback';
import { DOMInspector } from './dom-inspector';

export class SelectorEngine {
  /**
   * Generates all viable selector candidates for an element, validates them against
   * the live DOM, scores them using heuristic rules, and returns them sorted
   * by the standardized fallback hierarchy.
   */
  /**
   * Generates all viable selector candidates for an element.
   */
  public static generate(element: Element, doc: Document = document): SelectorCandidate[] {
    return this.generateSelectors(element, doc);
  }

  public static generateSelectors(element: Element, doc: Document = document): SelectorCandidate[] {
    const rawCandidates: SelectorCandidate[] = [];

    // 1. Unique ID
    const idSelector = this.generateIdSelector(element);
    if (idSelector) rawCandidates.push(idSelector);

    // 2. Data test attributes (data-testid, data-test-id, data-qa, data-cy)
    const testIdSelector = this.generateTestIdSelector(element);
    if (testIdSelector) rawCandidates.push(testIdSelector);

    // 3. ARIA label / Accessible Name
    const ariaSelector = this.generateAriaSelector(element);
    if (ariaSelector) rawCandidates.push(ariaSelector);

    // 4. Role selector (with accessible name if available)
    const roleSelector = this.generateRoleSelector(element);
    if (roleSelector) rawCandidates.push(roleSelector);

    // 5. Name attribute
    const nameSelector = this.generateNameSelector(element);
    if (nameSelector) rawCandidates.push(nameSelector);

    // 6. Title / Placeholder attribute
    const attrSelector = this.generateSemanticAttrSelector(element);
    if (attrSelector) rawCandidates.push(attrSelector);

    // 7. Text selector (buttons and links)
    const textSelector = this.generateTextSelector(element);
    if (textSelector) rawCandidates.push(textSelector);

    // 8. CSS Selector (tag + stable classes or hierarchical path)
    const cssSelector = this.generateCssSelector(element);
    if (cssSelector) rawCandidates.push(cssSelector);

    // 9. XPath Selector
    const xpathSelector = this.generateXPathSelector(element);
    if (xpathSelector) rawCandidates.push(xpathSelector);

    // Validate candidates against live DOM and score with heuristic rules
    const validated = SelectorValidator.validateAndScoreCandidates(rawCandidates, element, doc);

    // Sort by fallback hierarchy (Tier 1: ID/testId -> Tier 2: ARIA -> Tier 3: CSS -> Tier 4: XPath -> Tier 5: Semantic)
    return SelectorFallback.sortByFallbackHierarchy(validated);
  }

  /**
   * Validates a single candidate against the DOM and target element, returning
   * the scored candidate or null if invalid.
   */
  public static validateAndScore(
    candidate: SelectorCandidate,
    targetElement: Element,
    doc: Document = document
  ): SelectorCandidate | null {
    const validated = SelectorValidator.validateAndScoreCandidates([candidate], targetElement, doc);
    return validated[0] || null;
  }

  /**
   * Generates an ID selector `#my-id` if the ID is unique, non-empty, and stable.
   */
  private static generateIdSelector(element: Element): SelectorCandidate | null {
    const id = element.id ? element.id.trim() : '';
    if (!id) return null;

    if (isDynamicSelector(`#${id}`)) return null;

    return {
      type: 'id',
      value: `#${CSS.escape(id)}`,
      score: 0.99,
    };
  }

  /**
   * Generates data-testid / data-cy / data-qa selectors.
   */
  private static generateTestIdSelector(element: Element): SelectorCandidate | null {
    const testAttrs = ['data-testid', 'data-test-id', 'data-qa', 'data-cy', 'data-test'];

    for (const attr of testAttrs) {
      const val = element.getAttribute(attr)?.trim();
      if (val) {
        return {
          type: 'testId',
          value: `[${attr}="${escapeQuotes(val)}"]`,
          score: 0.97,
        };
      }
    }

    return null;
  }

  /**
   * Generates an ARIA-based selector (`tag[aria-label="..."]`).
   */
  private static generateAriaSelector(element: Element): SelectorCandidate | null {
    const ariaLabel =
      element.getAttribute('aria-label')?.trim() ||
      DOMInspector.findAssociatedLabel(element);

    if (ariaLabel && ariaLabel.length <= 80) {
      const tag = element.tagName.toLowerCase();
      return {
        type: 'aria',
        value: `${tag}[aria-label="${escapeQuotes(ariaLabel)}"]`,
        score: 0.92,
      };
    }

    return null;
  }

  /**
   * Generates a role-based selector with optional accessible name.
   */
  private static generateRoleSelector(element: Element): SelectorCandidate | null {
    const role = element.getAttribute('role')?.trim();
    if (role) {
      const ariaLabel =
        element.getAttribute('aria-label')?.trim() ||
        DOMInspector.findAssociatedLabel(element);

      const value = ariaLabel
        ? `[role="${escapeQuotes(role)}"][aria-label="${escapeQuotes(ariaLabel)}"]`
        : `[role="${escapeQuotes(role)}"]`;

      return {
        type: 'role',
        value,
        score: 0.88,
      };
    }

    return null;
  }

  /**
   * Generates a name attribute selector (`input[name="..."]`).
   */
  private static generateNameSelector(element: Element): SelectorCandidate | null {
    const name = element.getAttribute('name')?.trim();
    if (!name) return null;

    const tag = element.tagName.toLowerCase();
    return {
      type: 'name',
      value: `${tag}[name="${escapeQuotes(name)}"]`,
      score: 0.85,
    };
  }

  /**
   * Generates semantic attribute selector for placeholders or titles.
   */
  private static generateSemanticAttrSelector(element: Element): SelectorCandidate | null {
    const placeholder = element.getAttribute('placeholder')?.trim();
    const tag = element.tagName.toLowerCase();

    if (placeholder && placeholder.length <= 50) {
      return {
        type: 'css',
        value: `${tag}[placeholder="${escapeQuotes(placeholder)}"]`,
        score: 0.82,
      };
    }

    const title = element.getAttribute('title')?.trim();
    if (title && title.length <= 50) {
      return {
        type: 'css',
        value: `${tag}[title="${escapeQuotes(title)}"]`,
        score: 0.80,
      };
    }

    return null;
  }

  /**
   * Generates a text-based selector for clickable elements (buttons, links).
   */
  private static generateTextSelector(element: Element): SelectorCandidate | null {
    const tag = element.tagName.toLowerCase();
    if (tag !== 'button' && tag !== 'a' && element.getAttribute('role') !== 'button') {
      return null;
    }

    const text = (element.textContent || '').trim().replace(/\s+/g, ' ');
    if (!text || text.length > 50) return null;

    return {
      type: 'text',
      value: `//${tag}[normalize-space()="${escapeQuotes(text)}"]`,
      score: 0.75,
    };
  }

  /**
   * Generates a stable CSS selector using tag and filtered classes,
   * or walking up to a stable parent if needed.
   */
  private static generateCssSelector(element: Element): SelectorCandidate | null {
    const tag = element.tagName.toLowerCase();

    // 1. Tag + stable classes
    const classes = DOMInspector.extractStableClasses(element);
    if (classes.length > 0) {
      const classSelector = `${tag}.${classes.map((c) => CSS.escape(c)).join('.')}`;
      return {
        type: 'css',
        value: classSelector,
        score: 0.72,
      };
    }

    // 2. Tag with type attribute (e.g. button[type="submit"])
    const type = element.getAttribute('type');
    if (type) {
      return {
        type: 'css',
        value: `${tag}[type="${escapeQuotes(type)}"]`,
        score: 0.70,
      };
    }

    // 3. Hierarchical path: parent > tag:nth-of-type
    const path = this.buildCssPath(element);
    if (path) {
      return {
        type: 'css',
        value: path,
        score: 0.65,
      };
    }

    return null;
  }

  /**
   * Generates a clean, readable XPath.
   */
  private static generateXPathSelector(element: Element): SelectorCandidate | null {
    const tag = element.tagName.toLowerCase();

    // If element has ID
    if (element.id && !isDynamicSelector(`#${element.id}`)) {
      return {
        type: 'xpath',
        value: `//${tag}[@id='${element.id.trim()}']`,
        score: 0.75,
      };
    }

    // If element has name
    const name = element.getAttribute('name');
    if (name) {
      return {
        type: 'xpath',
        value: `//${tag}[@name='${name.trim()}']`,
        score: 0.72,
      };
    }

    // Relative hierarchy XPath
    const xpath = this.buildXPath(element);
    if (xpath) {
      return {
        type: 'xpath',
        value: xpath,
        score: 0.65,
      };
    }

    return null;
  }

  /**
   * Builds a short CSS path by walking up parents up to 4 levels.
   */
  private static buildCssPath(element: Element): string {
    const parts: string[] = [];
    let curr: Element | null = element;
    let depth = 0;

    while (curr && curr !== document.body && depth < 4) {
      let part = curr.tagName.toLowerCase();

      if (curr.id && !isDynamicSelector(`#${curr.id}`)) {
        parts.unshift(`#${CSS.escape(curr.id)}`);
        break;
      }

      const parent: Element | null = curr.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(
          (c) => c.tagName === curr!.tagName
        );
        if (siblings.length > 1) {
          const index = siblings.indexOf(curr) + 1;
          part += `:nth-of-type(${index})`;
        }
      }

      parts.unshift(part);
      curr = parent;
      depth++;
    }

    return parts.join(' > ');
  }

  /**
   * Builds a basic hierarchical XPath.
   */
  private static buildXPath(element: Element): string {
    const paths: string[] = [];
    let curr: Element | null = element;
    let depth = 0;

    while (curr && curr.nodeType === Node.ELEMENT_NODE && depth < 5) {
      if (curr.id && !isDynamicSelector(`#${curr.id}`)) {
        paths.unshift(`//${curr.tagName.toLowerCase()}[@id='${curr.id}']`);
        break;
      }

      let index = 1;
      let sibling: Element | null = curr.previousElementSibling;
      while (sibling) {
        if (sibling.tagName === curr.tagName) index++;
        sibling = sibling.previousElementSibling;
      }

      const tag = curr.tagName.toLowerCase();
      paths.unshift(index > 1 ? `${tag}[${index}]` : tag);

      curr = curr.parentElement;
      depth++;
    }

    return paths.length > 0
      ? paths[0]!.startsWith('//')
        ? paths.join('/')
        : `//${paths.join('/')}`
      : `//${element.tagName.toLowerCase()}`;
  }
}

function escapeQuotes(str: string): string {
  return str.replace(/"/g, '\\"');
}
