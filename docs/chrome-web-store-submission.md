# Chrome Web Store Submission & Publishing Kit

- **Live Store Listing:** [Workflow Recorder on Chrome Web Store](https://chromewebstore.google.com/detail/workflow-recorder/ihgohoclialmggddniffeckbdllhiokp)
- **Extension ID:** `ihgohoclialmggddniffeckbdllhiokp`

This guide contains everything required to publish **Workflow Recorder** to the **Google Chrome Web Store (CWS)**, including exact copy-paste metadata, reviewer permission justifications, graphic specifications, and privacy disclosures.

---

## ⚡ 1. One-Click Build & Package

Before submitting, generate a clean, validated production ZIP archive:

```bash
npm run package
```

This single command:
1. Builds the React popup and editor pages (`vite build`).
2. Bundles the service worker and content script with tree-shaking and minification (`esbuild`).
3. Copies icons and Manifest V3 to `dist/`.
4. Executes the automated pre-submission validator (`scripts/validate-cws.mjs`).
5. Generates the ready-to-upload archive: **`release/workflow-recorder-v1.0.0.zip`**.

---

## 📋 2. Store Listing Metadata (Copy-Paste Ready)

### Basic Information
| Field | Value | Character Limit |
|---|---|---|
| **Name** | `Workflow Recorder` | 45 chars max (17 used) |
| **Short Name** | `WorkflowRec` | 12 chars max (11 used) |
| **Version** | `1.0.0` | Semver |
| **Summary / Short Description** | `Record browser workflows, edit steps, and export to Playwright, Puppeteer, Selenium, and more.` | 132 chars max (94 used) |
| **Primary Category** | `Developer Tools` | Dropdown |
| **Secondary Category** | `Productivity` | Dropdown (optional) |
| **Default Language** | `English` | Dropdown |

---

### Detailed Description (Formatted for Chrome Web Store)

Paste the following text directly into the **Detailed Description** box in the Chrome Web Store Developer Console:

```markdown
Workflow Recorder is a developer-grade browser extension that records your web interactions and automatically generates clean, resilient test automation scripts for Playwright, Puppeteer, Cypress, Selenium, and JSON.

Whether you are building automated end-to-end regression suites, web scrapers, or reproducible bug repros, Workflow Recorder saves hours of manual coding by turning browser clicks into production-ready test automation.

🚀 KEY FEATURES

• Resilient Multi-Strategy Selector Engine:
  Automatically generates and scores 7+ selector strategies for every recorded element (data-testid, semantic IDs, accessible ARIA roles, robust CSS paths, and full XPath). If an element's ID changes, fallback selectors ensure your scripts never fail.

• Instant Multi-Framework Export:
  Convert any recorded workflow into battle-tested code with 1 click:
  - Playwright (TypeScript / JavaScript)
  - Puppeteer (TypeScript / JavaScript)
  - Cypress (TypeScript / JavaScript)
  - Selenium WebDriver (JavaScript, Python, Java)
  - Structured JSON for custom CI/CD pipelines

• Visual Step-by-Step Workflow Editor:
  Inspect, reorder, delete, and fine-tune recorded steps. Add custom assertions (visible, text equals, value equals), configure wait delays, and simulate network throttles.

• Privacy-First by Design (Zero Telemetry):
  - Automatically identifies and masks passwords (`type="password"`).
  - Built-in PrivacyGuard redacts sensitive fields (SSNs, credit cards, CVVs, API tokens).
  - 100% Client-Side: Zero external analytics, zero tracking, zero remote servers.
  - All workflows are stored safely inside your browser's local IndexedDB.

• Full Shadow DOM & iFrame Intelligence:
  Seamlessly traverses nested shadow roots and complex iframes with pierceable selectors.

• In-Page Floating HUD:
  Pause, resume, add manual assertions, and discard actions directly on the page without switching tabs.

🔒 PRIVACY & SECURITY
Workflow Recorder operates completely offline and requires zero account sign-up. Your data never leaves your computer. 

🛠️ HOW TO USE
1. Click the Workflow Recorder icon in your Chrome toolbar.
2. Click "Start Recording".
3. Perform your actions on any website (clicks, typing, dropdowns, navigations).
4. Use the floating HUD on the page to pause, resume, or add assertions.
5. Click "Finish" to open the Workflow Editor, refine your steps, and export your automation script!
```

---

## 🖼️ 3. Store Graphic Assets Drop-Zone Mapping

Here is the exact mapping to the drop-zones in the Chrome Developer Console:

| Developer Console Slot | Required Dimensions & Format | File in Project to Upload |
|---|---|---|
| **Store icon \*** | `128 x 128` pixels (PNG) | [`docs/assets/store-icon-128.png`](file:///c:/Users/USER01/Documents/CHROME%20EXTENSION/WORKFLOW%20RECORDER/docs/assets/store-icon-128.png) |
| **Screenshots \*** *(Slot 1)* | `1,280 x 800` (24-bit PNG, no alpha) | [`docs/assets/screenshot-1-workflow-editor.png`](file:///c:/Users/USER01/Documents/CHROME%20EXTENSION/WORKFLOW%20RECORDER/docs/assets/screenshot-1-workflow-editor.png) |
| **Screenshots \*** *(Slot 2)* | `1,280 x 800` (24-bit PNG, no alpha) | [`docs/assets/screenshot-2-live-recording.png`](file:///c:/Users/USER01/Documents/CHROME%20EXTENSION/WORKFLOW%20RECORDER/docs/assets/screenshot-2-live-recording.png) |
| **Screenshots \*** *(Slot 3)* | `1,280 x 800` (24-bit PNG, no alpha) | [`docs/assets/screenshot-3-code-export.png`](file:///c:/Users/USER01/Documents/CHROME%20EXTENSION/WORKFLOW%20RECORDER/docs/assets/screenshot-3-code-export.png) |
| **Screenshots \*** *(Slot 4)* | `1,280 x 800` (24-bit PNG, no alpha) | [`docs/assets/screenshot-4-selector-intelligence.png`](file:///c:/Users/USER01/Documents/CHROME%20EXTENSION/WORKFLOW%20RECORDER/docs/assets/screenshot-4-selector-intelligence.png) |
| **Small promo tile** | `440 x 280 Canvas` (24-bit PNG, no alpha) | [`docs/assets/promo-small.png`](file:///c:/Users/USER01/Documents/CHROME%20EXTENSION/WORKFLOW%20RECORDER/docs/assets/promo-small.png) |
| **Marquee promo tile** | `1400 x 560 Canvas` (24-bit PNG, no alpha) | [`docs/assets/promo-marquee.png`](file:///c:/Users/USER01/Documents/CHROME%20EXTENSION/WORKFLOW%20RECORDER/docs/assets/promo-marquee.png) |

> [!NOTE]
> All screenshots and promo tiles have been compiled in **24-bit RGB Truecolor (Color Type 2, zero alpha)** to strictly conform to the Chrome Web Store upload validator and prevent "Image must not contain transparency" errors.

---

## 🔒 4. Privacy Practices Tab (Crucial for Fast Google Review)

In the **Privacy Practices** tab of the Chrome Developer Dashboard, Google reviewers require explicit justifications for all requested permissions and data collection disclosures.

### Single Purpose Description
> **Paste this into "Single purpose":**
> "Record user browser interactions, generate resilient multi-strategy DOM selectors, and export workflows into automated test scripts (Playwright, Puppeteer, Cypress, Selenium)."

---

### Permission Justifications
When prompted to explain why each permission is required:

| Permission | Justification for Reviewer (Copy & Paste) |
|---|---|
| `storage` | "Required to save user preferences, recording configurations, and workflow step data locally in the user's browser using chrome.storage.local and IndexedDB." |
| `tabs` | "Required to detect URL navigation changes during a recording session, identify the active tab when recording starts, and communicate between the background service worker and the recorded webpage." |
| `scripting` | "Required to dynamically inject the recording event listener content script into web pages and frames when the user initiates a recording session." |
| `downloads` | "Required solely to allow the user to export and download generated test automation code files (Playwright, Puppeteer, Cypress, Selenium, JSON) to their local computer." |
| `activeTab` | "Required to interact with the currently focused tab and capture visual screenshots of the recorded webpage when requested by the user." |
| `<all_urls>` | "Workflow Recorder is an automation test recorder that allows developers and QA engineers to record workflows across any website or web application of their choice." |

---

### Data Usage & Collection Questions
Answer the Chrome Web Store questionnaire as follows:

1. **Do you collect personal data?**
   - Select **NO**.
2. **Do you transfer data to external servers or third parties?**
   - Select **NO**. All processing occurs 100% client-side in the browser.
3. **Data Certification Checkboxes:**
   - [x] "I do not sell or transfer user data to third parties"
   - [x] "I do not use or transfer user data for purposes unrelated to the item's single purpose"
   - [x] "I do not use or transfer user data to determine creditworthiness or for lending purposes"

### Privacy Policy URL
Host `docs/privacy.html` on GitHub Pages or any static URL and paste the public link here:
- Example: `https://<your-username>.github.io/<repo>/privacy.html`

---

## 🚀 5. Step-by-Step Submission Walkthrough

1. **Open Developer Dashboard**: Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).
2. **One-Time Developer Fee**: If this is a new developer account, complete Google's $5 USD registration fee.
3. **Add New Item**:
   - Click the **"New Item"** button.
   - Drag and drop `release/workflow-recorder-v1.0.0.zip`.
4. **Store Listing Tab**:
   - Fill in Title, Short Description, and Detailed Description from Section 2 above.
   - Upload `public/icons/icon-128.png` as the Store Icon.
   - Upload `docs/assets/promo-small.png` and `docs/assets/promo-marquee.png`.
   - Upload your screenshots.
   - Select Category: **Developer Tools**.
5. **Privacy Practices Tab**:
   - Paste the Single Purpose description from Section 4.
   - Paste each permission justification from Section 4.
   - Check the three data certification boxes.
   - Provide your hosted Privacy Policy URL.
6. **Distribution Tab**:
   - Select **Public**.
   - Select **All Regions**.
7. **Submit for Review**:
   - Click **"Submit for Review"**.
   - Review turnaround for Manifest V3 extensions typically takes 24 to 72 hours.
