import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const dist = resolve(root, 'dist');

let errorCount = 0;
let warnCount = 0;

function pass(msg) {
  console.log(`  ✅ ${msg}`);
}

function warn(msg) {
  warnCount++;
  console.log(`  ⚠️  ${msg}`);
}

function fail(msg) {
  errorCount++;
  console.log(`  ❌ ${msg}`);
}

console.log('\n🔍 Running Chrome Web Store Pre-Submission Audit...\n');

// 1. Manifest verification
const manifestDistPath = resolve(dist, 'manifest.json');
if (!existsSync(manifestDistPath)) {
  fail('dist/manifest.json not found! Run "npm run build" first.');
  process.exit(1);
}

let manifest;
try {
  manifest = JSON.parse(readFileSync(manifestDistPath, 'utf-8'));
  pass('dist/manifest.json is valid JSON.');
} catch (err) {
  fail(`Invalid JSON in manifest.json: ${err.message}`);
  process.exit(1);
}

// MV3 check
if (manifest.manifest_version === 3) {
  pass('Manifest version is 3 (MV3 compliant).');
} else {
  fail(`Manifest version must be 3, found: ${manifest.manifest_version}`);
}

// Name checks
if (manifest.name && manifest.name.length <= 45) {
  pass(`Extension name: "${manifest.name}" (${manifest.name.length}/45 chars).`);
} else {
  fail(`Extension name must be <= 45 chars. Got: "${manifest.name}" (${manifest.name?.length || 0})`);
}

if (manifest.short_name) {
  if (manifest.short_name.length <= 12) {
    pass(`Short name: "${manifest.short_name}" (${manifest.short_name.length}/12 chars).`);
  } else {
    warn(`Short name should ideally be <= 12 chars. Got: "${manifest.short_name}" (${manifest.short_name.length})`);
  }
} else {
  warn('short_name is recommended for Chrome Web Store.');
}

// Description checks
if (manifest.description && manifest.description.length <= 132) {
  pass(`Description: "${manifest.description}" (${manifest.description.length}/132 chars).`);
} else {
  fail(`Description must be <= 132 chars. Got length: ${manifest.description?.length || 0}`);
}

// Version format check (semver)
if (/^\d+(\.\d+){1,3}$/.test(manifest.version)) {
  pass(`Version "${manifest.version}" matches Chrome Web Store version format.`);
} else {
  fail(`Version "${manifest.version}" does not follow valid version format (1 to 4 integers separated by dots).`);
}

// 2. Icons verification
console.log('\n🎨 Verifying Extension Icons...');
const requiredSizes = ['16', '32', '48', '128'];
const declaredIcons = { ...manifest.icons, ...(manifest.action?.default_icon || {}) };

for (const size of requiredSizes) {
  const relPath = declaredIcons[size];
  if (!relPath) {
    if (size === '32') {
      warn(`Icon size ${size} is not declared in manifest (recommended for high-DPI).`);
    } else {
      fail(`Mandatory icon size ${size} is not declared in manifest.`);
    }
    continue;
  }

  const iconFullPath = resolve(dist, relPath);
  if (!existsSync(iconFullPath)) {
    fail(`Icon file does not exist at: ${relPath}`);
    continue;
  }

  const buf = readFileSync(iconFullPath);
  if (buf.length < 24) {
    fail(`Icon ${relPath} is too small or corrupt (${buf.length} bytes).`);
    continue;
  }

  // Check PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
  const isPNG = buf.slice(0, 8).toString('hex') === '89504e470d0a1a0a';
  if (!isPNG) {
    fail(`Icon ${relPath} is not a valid PNG image (header mismatch).`);
    continue;
  }

  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  if (width === parseInt(size, 10) && height === parseInt(size, 10)) {
    pass(`Icon ${relPath} is valid PNG (${width}x${height}px, ${buf.length} bytes).`);
  } else {
    fail(`Icon ${relPath} declared as ${size}px, but actual dimensions are ${width}x${height}px.`);
  }
}

// 3. Entry points verification
console.log('\n📦 Verifying Extension Entry Points...');

// Service Worker
const swPath = manifest.background?.service_worker;
if (swPath && existsSync(resolve(dist, swPath))) {
  const swSize = statSync(resolve(dist, swPath)).size;
  pass(`Service worker bundle exists: ${swPath} (${(swSize / 1024).toFixed(1)} KB).`);
} else {
  fail(`Service worker bundle missing: ${swPath}`);
}

// Content scripts
if (Array.isArray(manifest.content_scripts)) {
  for (const cs of manifest.content_scripts) {
    for (const js of cs.js || []) {
      const csPath = resolve(dist, js);
      if (existsSync(csPath)) {
        const csSize = statSync(csPath).size;
        pass(`Content script exists: ${js} (${(csSize / 1024).toFixed(1)} KB).`);
      } else {
        fail(`Content script missing: ${js}`);
      }
    }
  }
}

// Popup HTML
const popupHtml = manifest.action?.default_popup;
if (popupHtml && existsSync(resolve(dist, popupHtml))) {
  pass(`Default popup HTML exists: ${popupHtml}`);
} else {
  fail(`Default popup HTML missing: ${popupHtml}`);
}

// Options HTML
const optionsHtml = manifest.options_page;
if (optionsHtml && existsSync(resolve(dist, optionsHtml))) {
  pass(`Options/Editor page exists: ${optionsHtml}`);
} else {
  fail(`Options page missing: ${optionsHtml}`);
}

// 4. Security & CSP audit
console.log('\n🛡️  Security & Content Security Policy Audit...');

function scanDirectoryForUnsafePatterns(dir) {
  const files = readdirSync(dir);
  for (const f of files) {
    const full = join(dir, f);
    if (statSync(full).isDirectory()) {
      scanDirectoryForUnsafePatterns(full);
    } else if (f.endsWith('.js')) {
      const content = readFileSync(full, 'utf-8');
      if (/\beval\s*\(/.test(content)) {
        fail(`Unsafe "eval()" detected in ${f}`);
      }
      if (/new\s+Function\s*\(/.test(content)) {
        fail(`Unsafe "new Function()" detected in ${f}`);
      }
      if (/document\.write\s*\(/.test(content)) {
        warn(`"document.write()" found in ${f}`);
      }
    } else if (f.endsWith('.html')) {
      const content = readFileSync(full, 'utf-8');
      if (/<script(?![^>]*\bsrc=)[^>]*>[\s\S]+?<\/script>/i.test(content)) {
        fail(`Inline executable script tag detected in ${f} (violates MV3 CSP).`);
      }
    }
  }
}

scanDirectoryForUnsafePatterns(dist);
pass('No prohibited dynamic code evaluation (eval / new Function) in production bundles.');

// 5. Bundle size audit
console.log('\n📊 Bundle Size Analysis...');
let totalDistBytes = 0;
function calcTotalSize(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    const s = statSync(p);
    if (s.isDirectory()) calcTotalSize(p);
    else totalDistBytes += s.size;
  }
}
calcTotalSize(dist);
const totalMB = (totalDistBytes / (1024 * 1024)).toFixed(2);
if (totalDistBytes < 10 * 1024 * 1024) {
  pass(`Total package payload: ${totalMB} MB (well within CWS limits).`);
} else {
  warn(`Total package payload is large: ${totalMB} MB.`);
}

// Final Summary
console.log('\n' + '─'.repeat(50));
if (errorCount === 0) {
  console.log(`✨ Chrome Web Store Pre-Submission Validation: PASSED! (${warnCount} warnings)`);
  console.log('─'.repeat(50) + '\n');
  process.exit(0);
} else {
  console.error(`💥 Chrome Web Store Validation: FAILED with ${errorCount} error(s) and ${warnCount} warning(s).`);
  console.log('─'.repeat(50) + '\n');
  process.exit(1);
}
