/**
 * Workflow Recorder — Advanced Product Landing & Developer Hub
 * Handles:
 * - Dark / Light Mode Theme Switcher with persistence
 * - Interactive Selector Resilience & Radial Gauge Visualizer
 * - Live Interactive Recording Simulator with multi-framework synthesis
 * - Advanced Exporter Studio with direct script file download
 * - Documentation Live Search Filter
 * - Multi-Framework Exporters tab switcher & Clipboard Copy
 * - Product Screenshot Gallery tab switcher
 * - Accessible FAQ accordion
 * - "Add to Chrome" modal install experience
 * - Sticky navigation observer & Toast notifications
 */

document.addEventListener('DOMContentLoaded', () => {
  initThemeToggle();
  initStickyHeader();
  initMobileMenu();
  initInteractiveDemo();
  initExporterTabs();
  initGalleryTabs();
  initFaqAccordion();
  initInstallModal();
  initCopyButtons();
  initSelectorGauge();
  initExporterStudio();
  initDocsSearch();
});

/* ==========================================================================
   1. Sticky Header & Mobile Nav
   ========================================================================== */
function initStickyHeader() {
  const header = document.getElementById('site-header');
  if (!header) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  }, { passive: true });
}

function initMobileMenu() {
  const toggleBtn = document.getElementById('mobile-menu-toggle');
  const nav = document.getElementById('desktop-nav');
  if (!toggleBtn || !nav) return;

  toggleBtn.addEventListener('click', () => {
    const isOpen = nav.style.display === 'flex';
    nav.style.display = isOpen ? 'none' : 'flex';
    nav.style.flexDirection = 'column';
    nav.style.position = 'absolute';
    nav.style.top = 'var(--header-height)';
    nav.style.left = '0';
    nav.style.width = '100%';
    nav.style.backgroundColor = '#ffffff';
    nav.style.padding = '20px';
    nav.style.boxShadow = 'var(--shadow-md)';
    nav.style.borderBottom = '1px solid var(--border-light)';
  });
}

/* ==========================================================================
   2. Live Interactive Recording Sandbox
   ========================================================================== */
function initInteractiveDemo() {
  const mockEmail = document.getElementById('mock-email');
  const mockPassword = document.getElementById('mock-password');
  const mockEnv = document.getElementById('mock-env');
  const mockSubmit = document.getElementById('mock-submit');
  const mockReset = document.getElementById('mock-reset');
  const stepCounter = document.getElementById('hud-step-counter');
  const selectorTag = document.getElementById('intel-active-selector');
  const scoreBadge = document.getElementById('intel-active-score');
  const demoCodeOutput = document.getElementById('demo-generated-code');
  const frameworkPills = document.querySelectorAll('.demo-framework-pill');

  let recordedSteps = [
    {
      action: 'navigate',
      url: 'https://app.example.com/login',
      selector: 'window',
      score: 100,
      value: null
    }
  ];

  let selectedFramework = 'playwright-ts';

  // Framework Pill Switching
  frameworkPills.forEach(pill => {
    pill.addEventListener('click', () => {
      frameworkPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      selectedFramework = pill.dataset.framework;
      updateGeneratedCode();
    });
  });

  function recordAction(action, selector, score, value = null) {
    recordedSteps.push({ action, selector, score, value });
    if (stepCounter) stepCounter.textContent = `${recordedSteps.length} Steps`;
    if (selectorTag) selectorTag.textContent = selector;
    if (scoreBadge) scoreBadge.textContent = `Score ${score}/100`;
    updateGeneratedCode();
  }

  // Interactive Mock Inputs
  if (mockEmail) {
    mockEmail.addEventListener('focus', () => {
      if (!recordedSteps.some(s => s.selector === '[data-testid="email-input"]')) {
        recordAction('fill', '[data-testid="email-input"]', 98, mockEmail.value || 'dev@example.com');
      }
    });
    mockEmail.addEventListener('input', () => {
      const existing = recordedSteps.find(s => s.selector === '[data-testid="email-input"]');
      if (existing) {
        existing.value = mockEmail.value || 'dev@example.com';
        updateGeneratedCode();
      }
    });
  }

  if (mockPassword) {
    mockPassword.addEventListener('focus', () => {
      if (!recordedSteps.some(s => s.selector === '[data-testid="password-input"]')) {
        recordAction('fill', '[data-testid="password-input"]', 96, '•••••••••••• (Masked)');
      }
    });
  }

  if (mockEnv) {
    mockEnv.addEventListener('change', () => {
      recordAction('select', 'select[name="environment"]', 89, mockEnv.value);
    });
  }

  if (mockSubmit) {
    mockSubmit.addEventListener('click', (e) => {
      e.preventDefault();
      recordAction('click', 'button[type="submit"]', 94, null);
      showToast('Step recorded! Playwright script updated.');
    });
  }

  if (mockReset) {
    mockReset.addEventListener('click', () => {
      recordedSteps = [
        {
          action: 'navigate',
          url: 'https://app.example.com/login',
          selector: 'window',
          score: 100,
          value: null
        }
      ];
      if (mockEmail) mockEmail.value = '';
      if (mockPassword) mockPassword.value = '';
      if (stepCounter) stepCounter.textContent = '1 Step';
      if (selectorTag) selectorTag.textContent = 'page.goto(...)';
      if (scoreBadge) scoreBadge.textContent = 'Score 100/100';
      updateGeneratedCode();
      showToast('Recording session reset.');
    });
  }

  function updateGeneratedCode() {
    if (!demoCodeOutput) return;

    if (selectedFramework === 'playwright-ts') {
      let lines = [
        `import { test, expect } from '@playwright/test';`,
        ``,
        `test('recorded user flow', async ({ page }) => {`,
        `  // Step 1: Initial Navigation`,
        `  await page.goto('https://app.example.com/login');`
      ];

      recordedSteps.slice(1).forEach((step, idx) => {
        lines.push(``);
        lines.push(`  // Step ${idx + 2}: [Confidence: ${step.score}%]`);
        if (step.action === 'fill' && step.selector.includes('password')) {
          lines.push(`  // PrivacyGuard: Sensitive field auto-bound to env variable`);
          lines.push(`  await page.locator('${step.selector}').fill(process.env.TEST_PASSWORD || '');`);
        } else if (step.action === 'fill') {
          lines.push(`  await page.locator('${step.selector}').fill('${step.value || 'test@example.com'}');`);
        } else if (step.action === 'select') {
          lines.push(`  await page.locator('${step.selector}').selectOption('${step.value}');`);
        } else if (step.action === 'click') {
          lines.push(`  await page.locator('${step.selector}').click();`);
          lines.push(`  await expect(page).toHaveURL(/.*dashboard/);`);
        }
      });

      lines.push(`});`);
      demoCodeOutput.textContent = lines.join('\n');
    } else if (selectedFramework === 'puppeteer') {
      let lines = [
        `import puppeteer from 'puppeteer';`,
        ``,
        `(async () => {`,
        `  const browser = await puppeteer.launch({ headless: false });`,
        `  const page = await browser.newPage();`,
        `  await page.goto('https://app.example.com/login', { waitUntil: 'networkidle2' });`
      ];

      recordedSteps.slice(1).forEach((step) => {
        if (step.action === 'fill') {
          lines.push(`  await page.waitForSelector('${step.selector}');`);
          lines.push(`  await page.type('${step.selector}', '${step.value || 'user@example.com'}');`);
        } else if (step.action === 'click') {
          lines.push(`  await page.click('${step.selector}');`);
        } else if (step.action === 'select') {
          lines.push(`  await page.select('${step.selector}', '${step.value}');`);
        }
      });

      lines.push(`  await browser.close();`);
      lines.push(`})();`);
      demoCodeOutput.textContent = lines.join('\n');
    } else if (selectedFramework === 'selenium-python') {
      let lines = [
        `from selenium import webdriver`,
        `from selenium.webdriver.common.by import By`,
        `from selenium.webdriver.support.ui import WebDriverWait`,
        `from selenium.webdriver.support import expected_conditions as EC`,
        ``,
        `driver = webdriver.Chrome()`,
        `wait = WebDriverWait(driver, 10)`,
        `driver.get("https://app.example.com/login")`
      ];

      recordedSteps.slice(1).forEach((step) => {
        if (step.action === 'fill') {
          lines.push(`wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, "${step.selector}"))).send_keys("${step.value || ''}")`);
        } else if (step.action === 'click') {
          lines.push(`wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "${step.selector}"))).click()`);
        }
      });

      lines.push(`driver.quit()`);
      demoCodeOutput.textContent = lines.join('\n');
    } else if (selectedFramework === 'json') {
      const canonicalData = {
        $schema: "https://schemas.workflowrecorder.dev/v1/workflow.schema.json",
        name: "Interactive Recorded Session",
        version: "1.0.0",
        steps: recordedSteps.map((s, i) => ({
          stepNumber: i + 1,
          type: s.action,
          target: {
            strategy: "data-testid",
            selector: s.selector,
            confidenceScore: s.score
          },
          value: s.value
        }))
      };
      demoCodeOutput.textContent = JSON.stringify(canonicalData, null, 2);
    }
  }

  // Initial code load
  updateGeneratedCode();
}

/* ==========================================================================
   3. Multi-Target Automation Exporters Showcase
   ========================================================================== */
const EXPORTER_CODE_SNIPPETS = {
  'playwright-ts': {
    filename: 'tests/workflow.spec.ts',
    code: `import { test, expect } from '@playwright/test';

interface WorkflowVariables {
  userEmail: string;
  authRole: string;
}

test('Enterprise Checkout & Order Verification', async ({ page }) => {
  const vars: WorkflowVariables = {
    userEmail: process.env.TEST_EMAIL || 'qa-engineer@enterprise.io',
    authRole: 'admin',
  };

  // Step 1: Open Application
  await page.goto('https://app.cloudcorp.com/dashboard');

  // Step 2: Resilient Selector with Multi-Candidate Fallback
  const searchInput = page.locator('[data-testid="search-bar"], #global-search, input[placeholder*="Search"]');
  await searchInput.fill('High-Performance Cluster');
  await searchInput.press('Enter');

  // Step 3: Wait for Results & Select Card
  const resultCard = page.locator('[data-testid="result-item-0"]');
  await expect(resultCard).toBeVisible({ timeout: 5000 });
  await resultCard.click();

  // Step 4: Add to Provision Queue
  await page.getByRole('button', { name: 'Provision Asset' }).click();

  // Step 5: Assertion
  await expect(page.locator('.toast-notification')).toContainText('Provisioning queued');
});`
  },
  'playwright-js': {
    filename: 'tests/workflow.spec.js',
    code: `const { test, expect } = require('@playwright/test');

test('E-Commerce Cart Flow', async ({ page }) => {
  await page.goto('https://shop.dev/catalog');

  // Multi-tier selector generated automatically
  await page.locator('[data-testid="add-cart-btn"]').first().click();

  // Smart wait for cart flyout drawer
  await expect(page.locator('#cart-drawer')).toBeVisible();
  await page.locator('#checkout-button').click();

  await expect(page).toHaveURL(/.*checkout/);
});`
  },
  'puppeteer': {
    filename: 'scripts/record-runner.mjs',
    code: `import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('https://app.cloudcorp.com/login', { waitUntil: 'networkidle2' });

  // Input credentials with smart delays
  await page.waitForSelector('[data-testid="email-input"]');
  await page.type('[data-testid="email-input"]', 'user@example.com', { delay: 25 });

  await page.waitForSelector('button[type="submit"]');
  await page.click('button[type="submit"]');

  await page.waitForNavigation({ waitUntil: 'networkidle0' });
  await browser.close();
})();`
  },
  'selenium-python': {
    filename: 'test_automation.py',
    code: `from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def test_user_workflow():
    driver = webdriver.Chrome()
    wait = WebDriverWait(driver, 10)

    try:
        driver.get("https://app.cloudcorp.com/login")

        # Multi-strategy resilient locator
        email_elem = wait.until(
            EC.visibility_of_element_located((By.CSS_SELECTOR, "[data-testid='email-input']"))
        )
        email_elem.send_keys("automation_runner@corp.com")

        submit_btn = wait.until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, "button[type='submit']"))
        )
        submit_btn.click()

        wait.until(EC.url_contains("/dashboard"))
        assert "Dashboard" in driver.title
    finally:
        driver.quit()`
  },
  'cypress': {
    filename: 'cypress/e2e/workflow.cy.ts',
    code: `describe('Automated Browser Workflow', () => {
  it('executes recorded sequence with resilient selectors', () => {
    cy.visit('https://app.cloudcorp.com/login');

    // Scored resilient selector
    cy.get('[data-testid="email-input"]')
      .should('be.visible')
      .type('cypress-runner@test.io');

    cy.get('button[type="submit"]').click();

    cy.url().should('include', '/dashboard');
    cy.contains('Welcome back').should('be.visible');
  });
});`
  },
  'json': {
    filename: 'workflow.canonical.json',
    code: `{
  "$schema": "https://schemas.workflowrecorder.dev/v1/workflow.schema.json",
  "id": "wf_rec_982b1c",
  "name": "Enterprise Login & Dashboard Nav",
  "version": "1.0.0",
  "viewport": { "width": 1440, "height": 900 },
  "steps": [
    {
      "id": "step_1",
      "type": "navigate",
      "url": "https://app.cloudcorp.com/login"
    },
    {
      "id": "step_2",
      "type": "input",
      "target": {
        "selectors": [
          { "strategy": "data-testid", "value": "email-input", "confidence": 98 },
          { "strategy": "id", "value": "#user-email", "confidence": 88 },
          { "strategy": "css", "value": "form input[type='email']", "confidence": 74 }
        ]
      },
      "value": "dev@enterprise.io"
    }
  ]
}`
  },
  'yaml': {
    filename: 'workflow.spec.yaml',
    code: `version: "1.0.0"
name: "Enterprise Login Workflow"
metadata:
  recordedWith: "Workflow Recorder Chrome Extension"
  totalSteps: 2
steps:
  - id: step_01
    action: navigate
    url: https://app.cloudcorp.com/login
  - id: step_02
    action: fill
    selector: '[data-testid="email-input"]'
    value: '{{USER_EMAIL}}'
    confidenceScore: 98`
  },
  'markdown': {
    filename: 'WORKFLOW_RUNBOOK.md',
    code: `# Workflow Runbook: Enterprise Login & Dashboard Nav

- **Generated By**: Workflow Recorder Chrome Extension (v1.0.0)
- **Engine**: Chrome Manifest V3 · PrivacyGuard Active
- **Target URL**: https://app.cloudcorp.com/login

## Execution Steps

| Step | Action | Selector Strategy | Value / Expression | Confidence |
|---|---|---|---|---|
| 1 | Navigate | \`window.location\` | \`https://app.cloudcorp.com/login\` | 100% |
| 2 | Input | \`[data-testid="email-input"]\` | \`dev@enterprise.io\` | 98% |
| 3 | Click | \`button[type="submit"]\` | *N/A* | 94% |
| 4 | Assert | \`.toast-notification\` | *Contains: "Welcome back"* | 90% |`
  }
};

function initExporterTabs() {
  const tabs = document.querySelectorAll('.exporter-tab-btn');
  const filenameTag = document.getElementById('exporter-filename');
  const codePre = document.getElementById('exporter-code-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const target = tab.dataset.target;
      const data = EXPORTER_CODE_SNIPPETS[target];
      if (data && codePre && filenameTag) {
        filenameTag.textContent = data.filename;
        codePre.textContent = data.code;
      }
    });
  });
}

/* ==========================================================================
   4. Product Screenshot Gallery
   ========================================================================== */
const GALLERY_ITEMS = {
  'editor': {
    src: 'assets/screenshot-1-workflow-editor.png',
    alt: 'Visual 3-Panel Workflow Editor with Step Inspector and Code Exporter',
    caption: 'Visual 3-Panel Workflow Editor: Inspect, reorder, and configure assertions with dynamic parameter binding.'
  },
  'hud': {
    src: 'assets/screenshot-2-live-recording.png',
    alt: 'Shadow DOM In-Page Floating Recording HUD on Webpage',
    caption: 'In-Page Floating HUD: Non-intrusive, draggable recording bar isolated via Shadow DOM.'
  },
  'exporters': {
    src: 'assets/screenshot-3-code-export.png',
    alt: 'Instant Multi-Framework Automation Code Exporter',
    caption: 'One-Click Code Exporters: Export directly to Playwright, Puppeteer, Cypress, Selenium Python, and JSON.'
  },
  'selectors': {
    src: 'assets/screenshot-4-selector-intelligence.png',
    alt: '7-Strategy Resilient Selector Engine with Fallback Scoring',
    caption: 'Selector Intelligence Engine: Automatically calculates 7 resilience tiers with confidence scoring (0–100).'
  }
};

function initGalleryTabs() {
  const tabs = document.querySelectorAll('.gallery-tab-btn');
  const image = document.getElementById('gallery-main-image');
  const caption = document.getElementById('gallery-caption-text');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const itemKey = tab.dataset.item;
      const item = GALLERY_ITEMS[itemKey];
      if (item && image && caption) {
        image.style.opacity = '0';
        setTimeout(() => {
          image.src = item.src;
          image.alt = item.alt;
          caption.textContent = item.caption;
          image.style.opacity = '1';
        }, 150);
      }
    });
  });
}

/* ==========================================================================
   5. Accessible FAQ Accordion
   ========================================================================== */
function initFaqAccordion() {
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach(item => {
    const questionBtn = item.querySelector('.faq-question');
    if (!questionBtn) return;

    questionBtn.addEventListener('click', () => {
      const isActive = item.classList.contains('active');

      // Close other items
      faqItems.forEach(otherItem => {
        if (otherItem !== item) {
          otherItem.classList.remove('active');
          const otherBtn = otherItem.querySelector('.faq-question');
          if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
        }
      });

      // Toggle current
      if (isActive) {
        item.classList.remove('active');
        questionBtn.setAttribute('aria-expanded', 'false');
      } else {
        item.classList.add('active');
        questionBtn.setAttribute('aria-expanded', 'true');
      }
    });
  });
}

/* ==========================================================================
   6. "Add to Chrome" Modal & Installation Handlers
   ========================================================================== */
function initInstallModal() {
  const modal = document.getElementById('install-modal');
  const openButtons = document.querySelectorAll('.js-open-install-modal');
  const closeButton = document.getElementById('modal-close-btn');

  if (!modal) return;

  function openModal(e) {
    if (e) e.preventDefault();
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  openButtons.forEach(btn => {
    btn.addEventListener('click', openModal);
  });

  if (closeButton) {
    closeButton.addEventListener('click', closeModal);
  }

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('open')) {
      closeModal();
    }
  });
}

/* ==========================================================================
   7. Copy to Clipboard Utility & Toast Notice
   ========================================================================== */
function initCopyButtons() {
  const copyButtons = document.querySelectorAll('.js-copy-btn');

  copyButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetSelector = btn.dataset.copyTarget;
      const targetElement = document.querySelector(targetSelector);
      if (!targetElement) return;

      const textToCopy = targetElement.textContent;
      navigator.clipboard.writeText(textToCopy).then(() => {
        const originalText = btn.innerHTML;
        btn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          Copied!
        `;
        showToast('Code copied to clipboard!');
        setTimeout(() => {
          btn.innerHTML = originalText;
        }, 2000);
      }).catch(() => {
        showToast('Failed to copy. Please select text manually.');
      });
    });
  });
}

function showToast(message) {
  let toast = document.getElementById('site-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'site-toast';
    toast.className = 'toast-notice';
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}

/* ==========================================================================
   8. Dark / Light Mode Theme Controller
   ========================================================================== */
function initThemeToggle() {
  const toggleBtn = document.getElementById('theme-toggle');
  const savedTheme = localStorage.getItem('theme');
  const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const currentTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');

  document.documentElement.setAttribute('data-theme', currentTheme);

  if (!toggleBtn) return;

  toggleBtn.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const nextTheme = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('theme', nextTheme);
    showToast(`Switched to ${nextTheme} theme`);
  });
}

/* ==========================================================================
   9. Interactive Selector Resilience & Radial Gauge Evaluator
   ========================================================================== */
function initSelectorGauge() {
  const input = document.getElementById('gauge-selector-input');
  const evalBtn = document.getElementById('gauge-eval-btn');
  const presets = document.querySelectorAll('.js-gauge-preset');
  const meter = document.getElementById('gauge-circle-meter');
  const scoreVal = document.getElementById('gauge-score-val');
  const verdictBadge = document.getElementById('gauge-verdict');
  const metricTier = document.getElementById('gauge-metric-tier');
  const metricUniq = document.getElementById('gauge-metric-uniq');
  const metricPenalty = document.getElementById('gauge-metric-penalty');

  if (!meter || !scoreVal) return;

  function evaluateSelector(selector) {
    const sel = (selector || '').trim();
    if (!sel) {
      updateUI(0, 'Tier 0', '0 matches', '0%', 'Fragile (Empty)', 'fragile', '#ef4444');
      return;
    }

    let baseScore = 55;
    let tier = 'Tier 3 (CSS)';
    let penalty = 0;
    let uniq = 'Unique (1:1)';

    if (/data-(?:testid|test|qa|cy)=/i.test(sel) || /^\[data-test/i.test(sel)) {
      baseScore = 100;
      tier = 'Tier 1 (Test ID)';
    } else if (/^#[a-zA-Z][\w-]*$/.test(sel) && !/(?:[0-9a-f]{6,}|css-|sc-|\d{5,})/i.test(sel)) {
      baseScore = 95;
      tier = 'Tier 1 (ID Anchor)';
    } else if (/aria-(?:label|labelledby)|role=/i.test(sel)) {
      baseScore = 90;
      tier = 'Tier 2 (ARIA Semantics)';
    } else if (/name=/i.test(sel) || /input\[type=/i.test(sel)) {
      baseScore = 84;
      tier = 'Tier 3 (Form Control)';
    } else if (/^\/\//.test(sel) || /^xpath=/i.test(sel)) {
      baseScore = 65;
      tier = 'Tier 4 (XPath)';
    } else if (/>/.test(sel) || /:nth-child/i.test(sel)) {
      baseScore = 48;
      tier = 'Tier 5 (Hierarchical)';
    }

    // Penalties for dynamic or fragile patterns
    if (/(?:css-[a-z0-9]+|sc-[a-z0-9]+|jss\d+|[0-9a-f]{8,}|\b\d{8,}\b)/i.test(sel)) {
      penalty += 45;
    }
    const depth = (sel.match(/[ >+~]/g) || []).length;
    if (depth > 4) {
      penalty += Math.min(25, depth * 5);
    }
    if (sel.length > 70) {
      penalty += 15;
    }

    const finalScore = Math.max(10, Math.min(100, Math.round(baseScore - penalty)));

    let verdict = 'Rock Solid';
    let verdictClass = 'gauge-verdict-solid';
    let strokeColor = '#10b981';

    if (finalScore >= 90) {
      verdict = 'Rock Solid';
      verdictClass = 'gauge-verdict-solid';
      strokeColor = '#10b981';
    } else if (finalScore >= 75) {
      verdict = 'High Reliability';
      verdictClass = 'gauge-verdict-high';
      strokeColor = '#3b82f6';
    } else if (finalScore >= 50) {
      verdict = 'Moderate Stability';
      verdictClass = 'gauge-verdict-fair';
      strokeColor = '#f59e0b';
    } else {
      verdict = 'Fragile (Flake Risk)';
      verdictClass = 'gauge-verdict-fragile';
      strokeColor = '#ef4444';
    }

    updateUI(
      finalScore,
      tier,
      uniq,
      penalty > 0 ? `-${penalty}%` : '0%',
      verdict,
      verdictClass,
      strokeColor
    );
  }

  function updateUI(score, tier, uniq, penalty, verdict, verdictClass, color) {
    const circumference = 565.48; // 2 * PI * 90
    const offset = circumference - (score / 100) * circumference;
    meter.style.strokeDashoffset = offset;
    meter.style.stroke = color;

    scoreVal.textContent = score;

    if (verdictBadge) {
      verdictBadge.className = `gauge-verdict-badge ${verdictClass}`;
      verdictBadge.textContent = verdict;
    }
    if (metricTier) metricTier.textContent = tier;
    if (metricUniq) metricUniq.textContent = uniq;
    if (metricPenalty) metricPenalty.textContent = penalty;
  }

  if (evalBtn && input) {
    evalBtn.addEventListener('click', () => evaluateSelector(input.value));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') evaluateSelector(input.value);
    });
    input.addEventListener('input', () => evaluateSelector(input.value));
  }

  presets.forEach(preset => {
    preset.addEventListener('click', () => {
      const val = preset.dataset.selector || preset.textContent.trim();
      if (input) input.value = val;
      evaluateSelector(val);
      showToast(`Evaluated: ${val}`);
    });
  });

  // Initial evaluation
  if (input && input.value) {
    evaluateSelector(input.value);
  } else {
    evaluateSelector('[data-testid="submit-checkout-btn"]');
  }
}

/* ==========================================================================
   10. Advanced Exporter Studio Workbench
   ========================================================================== */
function initExporterStudio() {
  const scenarioSelect = document.getElementById('studio-scenario-select');
  const frameworkPills = document.querySelectorAll('.studio-pill');
  const codeDisplay = document.getElementById('studio-code-output');
  const fileLabel = document.getElementById('studio-file-label');
  const copyBtn = document.getElementById('studio-copy-btn');
  const downloadBtn = document.getElementById('studio-download-btn');

  if (!codeDisplay) return;

  let currentScenario = 'auth';
  let currentFramework = 'playwright-ts';

  const STUDIO_CODE_TEMPLATES = {
    auth: {
      'playwright-ts': {
        filename: 'auth-login.spec.ts',
        code: `import { test, expect } from '@playwright/test';

interface AuthWorkflowVariables {
  username: string;
  app_url: string;
  expected_user: string;
}

const variables: AuthWorkflowVariables = {
  username: 'engineer@enterprise.io',
  app_url: 'https://app.workflowrecorder.dev/login',
  expected_user: 'Alex Rivera (Lead Architect)',
};

test.describe('Authentication & Session Workflow', () => {
  test('Complete login sequence with 2FA checkpoint', async ({ page }) => {
    // Step 1: Navigate to authorization portal
    await page.goto(variables.app_url);
    await expect(page).toHaveTitle(/Workflow Portal/i);

    // Step 2: Fill corporate email (Tier 1 selector)
    const emailInput = page.locator('[data-testid="email-input"]');
    await emailInput.waitFor({ state: 'visible' });
    await emailInput.fill(variables.username);

    // Step 3: Enter encrypted credentials (Auto-masked by PrivacyGuard)
    const passwordInput = page.locator('input[name="password"]');
    await passwordInput.fill(process.env.TEST_SECRET_PASSWORD || 'SecretToken_2026');

    // Step 4: Submit primary authentication form
    await page.locator('button[type="submit"]').click();

    // Step 5: Handle dynamic OTP Verification Screen
    const otpField = page.locator('[data-testid="mfa-token-input"]');
    await otpField.waitFor({ state: 'visible', timeout: 10000 });
    await otpField.fill('849201');

    // Step 6: Verify workspace landing & user identity
    const userBadge = page.locator('[data-testid="current-user-badge"]');
    await expect(userBadge).toContainText(variables.expected_user);
  });
});`
      },
      'playwright-js': {
        filename: 'auth-login.spec.js',
        code: `import { test, expect } from '@playwright/test';

const variables = {
  username: 'engineer@enterprise.io',
  app_url: 'https://app.workflowrecorder.dev/login',
  expected_user: 'Alex Rivera (Lead Architect)',
};

test('Authentication Flow with 2FA Token', async ({ page }) => {
  await page.goto(variables.app_url);
  await page.locator('[data-testid="email-input"]').fill(variables.username);
  await page.locator('input[name="password"]').fill(process.env.TEST_PASSWORD || 'SecretToken_2026');
  await page.locator('button[type="submit"]').click();

  await page.locator('[data-testid="mfa-token-input"]').fill('849201');
  await expect(page.locator('[data-testid="current-user-badge"]')).toContainText(variables.expected_user);
});`
      },
      'puppeteer': {
        filename: 'auth-login.puppeteer.js',
        code: `const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  const appUrl = 'https://app.workflowrecorder.dev/login';
  await page.goto(appUrl, { waitUntil: 'networkidle2' });

  // Fill email via reliable test ID
  await page.waitForSelector('[data-testid="email-input"]');
  await page.type('[data-testid="email-input"]', 'engineer@enterprise.io', { delay: 30 });

  // Fill password
  await page.type('input[name="password"]', process.env.TEST_PASSWORD || 'SecretToken_2026');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle0' }),
    page.click('button[type="submit"]')
  ]);

  // MFA Verification
  await page.waitForSelector('[data-testid="mfa-token-input"]');
  await page.type('[data-testid="mfa-token-input"]', '849201');
  await page.click('button[type="submit"]');

  await browser.close();
})();`
      },
      'selenium-py': {
        filename: 'auth_login.py',
        code: `import os
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

driver = webdriver.Chrome()
wait = WebDriverWait(driver, 15)

try:
    # Step 1: Open Login URL
    driver.get("https://app.workflowrecorder.dev/login")

    # Step 2: Fill Email
    email_field = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "[data-testid='email-input']")))
    email_field.clear()
    email_field.send_keys("engineer@enterprise.io")

    # Step 3: Fill Password
    pw_field = driver.find_element(By.NAME, "password")
    pw_field.send_keys(os.getenv("TEST_PASSWORD", "SecretToken_2026"))

    # Step 4: Click Submit
    driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()

    # Step 5: Wait for MFA Token Input
    mfa_field = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "[data-testid='mfa-token-input']")))
    mfa_field.send_keys("849201")
    driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()

    # Step 6: Assert User Profile
    badge = wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, "[data-testid='current-user-badge']")))
    assert "Alex Rivera" in badge.text
    print("Authentication flow completed successfully!")

finally:
    driver.quit()`
      },
      'cypress': {
        filename: 'auth_login.cy.ts',
        code: `describe('Authentication & MFA Verification', () => {
  it('navigates and logs in with resilient selectors', () => {
    cy.visit('https://app.workflowrecorder.dev/login');

    cy.get('[data-testid="email-input"]')
      .should('be.visible')
      .clear()
      .type('engineer@enterprise.io');

    cy.get('input[name="password"]')
      .type(Cypress.env('TEST_PASSWORD') || 'SecretToken_2026', { log: false });

    cy.get('button[type="submit"]').click();

    cy.get('[data-testid="mfa-token-input"]').type('849201');
    cy.get('button[type="submit"]').click();

    cy.get('[data-testid="current-user-badge"]')
      .should('contain.text', 'Alex Rivera');
  });
});`
      },
      'json': {
        filename: 'auth-workflow.schema.json',
        code: `{
  "$schema": "https://workflowrecorder.dev/schemas/workflow.schema.json",
  "version": "1.0.0",
  "id": "wf_auth_981240",
  "title": "Corporate Authentication & MFA",
  "variables": {
    "username": "engineer@enterprise.io",
    "app_url": "https://app.workflowrecorder.dev/login"
  },
  "steps": [
    { "id": "step_1", "type": "navigate", "url": "${`\${app_url}`}" },
    { "id": "step_2", "type": "input", "selector": "[data-testid='email-input']", "value": "${`\${username}`}" },
    { "id": "step_3", "type": "input", "selector": "input[name='password']", "value": "{{password}}", "sensitive": true },
    { "id": "step_4", "type": "click", "selector": "button[type='submit']" },
    { "id": "step_5", "type": "input", "selector": "[data-testid='mfa-token-input']", "value": "849201" },
    { "id": "step_6", "type": "assertText", "selector": "[data-testid='current-user-badge']", "expected": "Alex Rivera" }
  ]
}`
      },
      'yaml': {
        filename: 'auth-workflow.yaml',
        code: `version: 1.0.0
id: wf_auth_981240
title: Corporate Authentication & MFA
variables:
  username: engineer@enterprise.io
  app_url: https://app.workflowrecorder.dev/login
steps:
  - id: step_1
    type: navigate
    url: \${app_url}
  - id: step_2
    type: input
    selector: "[data-testid='email-input']"
    value: \${username}
  - id: step_3
    type: input
    selector: "input[name='password']"
    value: "{{password}}"
    sensitive: true
  - id: step_4
    type: click
    selector: "button[type='submit']"
  - id: step_5
    type: input
    selector: "[data-testid='mfa-token-input']"
    value: "849201"
  - id: step_6
    type: assertText
    selector: "[data-testid='current-user-badge']"
    expected: "Alex Rivera"`
      }
    },
    checkout: {
      'playwright-ts': {
        filename: 'ecommerce-checkout.spec.ts',
        code: `import { test, expect } from '@playwright/test';

test('E-Commerce Multi-Item Checkout Flow', async ({ page }) => {
  // Step 1: Open store catalog
  await page.goto('https://store.example.com/catalog');

  // Step 2: Search item
  await page.locator('[data-testid="search-bar"]').fill('Mechanical Keyboard');
  await page.locator('[data-testid="search-submit"]').click();

  // Step 3: Add first result to cart
  const itemCard = page.locator('[data-testid="product-card-104"]').first();
  await itemCard.locator('button[aria-label="Add to cart"]').click();

  // Step 4: Open Slide-Over Cart Drawer
  await page.locator('[data-testid="nav-cart-btn"]').click();
  await expect(page.locator('.cart-drawer')).toBeVisible();

  // Step 5: Proceed to checkout
  await page.locator('[data-testid="checkout-btn"]').click();
  await page.locator('input[name="shipping_zip"]').fill('94105');
  await page.locator('[data-testid="place-order-button"]').click();

  // Step 6: Confirmation checkpoint
  await expect(page.locator('.order-receipt-id')).toHaveText(/ORD-[0-9]{6}/);
});`
      },
      'playwright-js': {
        filename: 'ecommerce-checkout.spec.js',
        code: `import { test, expect } from '@playwright/test';

test('E-Commerce Cart Checkout', async ({ page }) => {
  await page.goto('https://store.example.com/catalog');
  await page.locator('[data-testid="search-bar"]').fill('Mechanical Keyboard');
  await page.locator('[data-testid="search-submit"]').click();
  await page.locator('[data-testid="product-card-104"]').locator('button[aria-label="Add to cart"]').click();
  await page.locator('[data-testid="nav-cart-btn"]').click();
  await page.locator('[data-testid="checkout-btn"]').click();
  await expect(page.locator('.order-receipt-id')).toBeVisible();
});`
      },
      'puppeteer': {
        filename: 'ecommerce-checkout.puppeteer.js',
        code: `const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('https://store.example.com/catalog');
  await page.type('[data-testid="search-bar"]', 'Mechanical Keyboard');
  await page.click('[data-testid="search-submit"]');
  await page.waitForSelector('[data-testid="nav-cart-btn"]');
  await page.click('[data-testid="nav-cart-btn"]');
  await browser.close();
})();`
      },
      'selenium-py': {
        filename: 'ecommerce_checkout.py',
        code: `from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

driver = webdriver.Chrome()
wait = WebDriverWait(driver, 10)

try:
    driver.get("https://store.example.com/catalog")
    search = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "[data-testid='search-bar']")))
    search.send_keys("Mechanical Keyboard")
    driver.find_element(By.CSS_SELECTOR, "[data-testid='search-submit']").click()
    cart_btn = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "[data-testid='nav-cart-btn']")))
    cart_btn.click()
finally:
    driver.quit()`
      },
      'cypress': {
        filename: 'ecommerce_checkout.cy.ts',
        code: `describe('E-Commerce Checkout', () => {
  it('adds item to cart and navigates to checkout', () => {
    cy.visit('https://store.example.com/catalog');
    cy.get('[data-testid="search-bar"]').type('Mechanical Keyboard{enter}');
    cy.get('[data-testid="nav-cart-btn"]').click();
    cy.get('.cart-drawer').should('be.visible');
  });
});`
      },
      'json': {
        filename: 'ecommerce-workflow.json',
        code: `{
  "version": "1.0.0",
  "title": "E-Commerce Checkout",
  "steps": [
    { "type": "navigate", "url": "https://store.example.com/catalog" },
    { "type": "input", "selector": "[data-testid='search-bar']", "value": "Mechanical Keyboard" },
    { "type": "click", "selector": "[data-testid='search-submit']" },
    { "type": "click", "selector": "[data-testid='nav-cart-btn']" },
    { "type": "assertVisible", "selector": ".cart-drawer" }
  ]
}`
      },
      'yaml': {
        filename: 'ecommerce-workflow.yaml',
        code: `version: 1.0.0
title: E-Commerce Checkout
steps:
  - type: navigate
    url: https://store.example.com/catalog
  - type: input
    selector: "[data-testid='search-bar']"
    value: Mechanical Keyboard
  - type: click
    selector: "[data-testid='search-submit']"
  - type: click
    selector: "[data-testid='nav-cart-btn']"
  - type: assertVisible
    selector: .cart-drawer`
      }
    },
    settings: {
      'playwright-ts': {
        filename: 'admin-settings.spec.ts',
        code: `import { test, expect } from '@playwright/test';

test('Admin Webhook Configuration Flow', async ({ page }) => {
  await page.goto('https://cloud.workflowrecorder.dev/settings/webhooks');

  // Add new webhook target
  await page.locator('[data-testid="create-webhook-btn"]').click();
  await page.locator('input[name="webhook_name"]').fill('CI/CD Deployment Alert');
  await page.locator('input[name="webhook_url"]').fill('https://api.ops.internal/hooks/v1/trigger');

  // Select events checkboxes
  await page.locator('input[type="checkbox"][value="workflow.recorded"]').check();
  await page.locator('input[type="checkbox"][value="test.failed"]').check();

  // Save changes
  await page.locator('[data-testid="save-webhook-btn"]').click();
  await expect(page.locator('.toast-success')).toHaveText('Webhook configured successfully');
});`
      },
      'playwright-js': {
        filename: 'admin-settings.spec.js',
        code: `import { test, expect } from '@playwright/test';

test('Admin Webhook Setup', async ({ page }) => {
  await page.goto('https://cloud.workflowrecorder.dev/settings/webhooks');
  await page.locator('[data-testid="create-webhook-btn"]').click();
  await page.locator('input[name="webhook_name"]').fill('CI/CD Deployment Alert');
  await page.locator('input[name="webhook_url"]').fill('https://api.ops.internal/hooks/v1/trigger');
  await page.locator('[data-testid="save-webhook-btn"]').click();
});`
      },
      'puppeteer': {
        filename: 'admin-settings.puppeteer.js',
        code: `const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('https://cloud.workflowrecorder.dev/settings/webhooks');
  await page.click('[data-testid="create-webhook-btn"]');
  await page.type('input[name="webhook_name"]', 'CI/CD Deployment Alert');
  await page.type('input[name="webhook_url"]', 'https://api.ops.internal/hooks/v1/trigger');
  await page.click('[data-testid="save-webhook-btn"]');
  await browser.close();
})();`
      },
      'selenium-py': {
        filename: 'admin_settings.py',
        code: `from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

driver = webdriver.Chrome()
wait = WebDriverWait(driver, 10)

try:
    driver.get("https://cloud.workflowrecorder.dev/settings/webhooks")
    wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "[data-testid='create-webhook-btn']"))).click()
    driver.find_element(By.NAME, "webhook_name").send_keys("CI/CD Deployment Alert")
    driver.find_element(By.NAME, "webhook_url").send_keys("https://api.ops.internal/hooks/v1/trigger")
    driver.find_element(By.CSS_SELECTOR, "[data-testid='save-webhook-btn']").click()
finally:
    driver.quit()`
      },
      'cypress': {
        filename: 'admin_settings.cy.ts',
        code: `describe('Admin Webhooks', () => {
  it('creates a new webhook subscriber', () => {
    cy.visit('https://cloud.workflowrecorder.dev/settings/webhooks');
    cy.get('[data-testid="create-webhook-btn"]').click();
    cy.get('input[name="webhook_name"]').type('CI/CD Deployment Alert');
    cy.get('input[name="webhook_url"]').type('https://api.ops.internal/hooks/v1/trigger');
    cy.get('[data-testid="save-webhook-btn"]').click();
    cy.get('.toast-success').should('be.visible');
  });
});`
      },
      'json': {
        filename: 'admin-webhook.json',
        code: `{
  "version": "1.0.0",
  "title": "Admin Webhook Setup",
  "steps": [
    { "type": "navigate", "url": "https://cloud.workflowrecorder.dev/settings/webhooks" },
    { "type": "click", "selector": "[data-testid='create-webhook-btn']" },
    { "type": "input", "selector": "input[name='webhook_name']", "value": "CI/CD Deployment Alert" },
    { "type": "input", "selector": "input[name='webhook_url']", "value": "https://api.ops.internal/hooks/v1/trigger" },
    { "type": "click", "selector": "[data-testid='save-webhook-btn']" }
  ]
}`
      },
      'yaml': {
        filename: 'admin-webhook.yaml',
        code: `version: 1.0.0
title: Admin Webhook Setup
steps:
  - type: navigate
    url: https://cloud.workflowrecorder.dev/settings/webhooks
  - type: click
    selector: "[data-testid='create-webhook-btn']"
  - type: input
    selector: input[name='webhook_name']
    value: CI/CD Deployment Alert
  - type: input
    selector: input[name='webhook_url']
    value: https://api.ops.internal/hooks/v1/trigger
  - type: click
    selector: "[data-testid='save-webhook-btn']"`
      }
    }
  };

  function updateStudioView() {
    const scenarioData = STUDIO_CODE_TEMPLATES[currentScenario];
    if (!scenarioData) return;
    const item = scenarioData[currentFramework] || scenarioData['playwright-ts'];

    codeDisplay.textContent = item.code;
    if (fileLabel) fileLabel.textContent = item.filename;
  }

  if (scenarioSelect) {
    scenarioSelect.addEventListener('change', () => {
      currentScenario = scenarioSelect.value;
      updateStudioView();
    });
  }

  frameworkPills.forEach(pill => {
    pill.addEventListener('click', () => {
      frameworkPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentFramework = pill.dataset.framework;
      updateStudioView();
    });
  });

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(codeDisplay.textContent).then(() => {
        showToast('Generated automation script copied!');
      });
    });
  }

  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      const scenarioData = STUDIO_CODE_TEMPLATES[currentScenario];
      const item = scenarioData ? (scenarioData[currentFramework] || scenarioData['playwright-ts']) : null;
      if (!item) return;

      const blob = new Blob([item.code], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = item.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`Downloaded ${item.filename}`);
    });
  }

  updateStudioView();
}

/* ==========================================================================
   11. Documentation Live Search Filter
   ========================================================================== */
function initDocsSearch() {
  const searchInput = document.getElementById('docs-search-input');
  const navLinks = document.querySelectorAll('.docs-nav-link');
  const sections = document.querySelectorAll('.docs-section');

  if (!searchInput) return;

  searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase().trim();

    if (!query) {
      navLinks.forEach(link => { link.style.display = 'block'; });
      sections.forEach(sec => { sec.style.display = 'block'; });
      return;
    }

    // Filter navigation links
    navLinks.forEach(link => {
      const text = link.textContent.toLowerCase();
      link.style.display = text.includes(query) ? 'block' : 'none';
    });

    // Filter documentation sections
    sections.forEach(sec => {
      const secText = sec.textContent.toLowerCase();
      sec.style.display = secText.includes(query) ? 'block' : 'none';
    });
  });
}
