import * as esbuild from 'esbuild';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

/** Build the service worker and content script as standalone bundles. */
async function buildScripts() {
  const sharedConfig = {
    bundle: true,
    minify: true,
    sourcemap: false,
    target: 'chrome120',
    logLevel: 'info',
    tsconfig: resolve(root, 'tsconfig.json'),
    alias: {
      '@shared': resolve(root, 'src/shared'),
      '@core': resolve(root, 'src/core'),
      '@storage': resolve(root, 'src/storage'),
      '@content': resolve(root, 'src/content'),
      '@background': resolve(root, 'src/background'),
    },
  };

  // Service Worker (Background Script) — ES module for Manifest V3
  await esbuild.build({
    ...sharedConfig,
    entryPoints: [resolve(root, 'src/background/service-worker.ts')],
    outfile: resolve(root, 'dist/background/service-worker.js'),
    format: 'esm',
  });

  // Content Script — IIFE for injection into web pages
  await esbuild.build({
    ...sharedConfig,
    entryPoints: [resolve(root, 'src/content/index.ts')],
    outfile: resolve(root, 'dist/content/index.js'),
    format: 'iife',
  });

  console.log('✅ Background and content scripts built successfully.');
}

buildScripts().catch((err) => {
  console.error('❌ Script build failed:', err);
  process.exit(1);
});
