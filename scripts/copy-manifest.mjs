import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

/** Copy manifest.json and icons to dist/. */
function copyManifest() {
  const manifest = JSON.parse(
    readFileSync(resolve(root, 'manifest.json'), 'utf-8')
  );

  mkdirSync(resolve(root, 'dist'), { recursive: true });
  writeFileSync(
    resolve(root, 'dist/manifest.json'),
    JSON.stringify(manifest, null, 2)
  );

  // Copy icons
  const iconsDir = resolve(root, 'public/icons');
  const distIconsDir = resolve(root, 'dist/icons');
  mkdirSync(distIconsDir, { recursive: true });

  try {
    const icons = readdirSync(iconsDir);
    for (const icon of icons) {
      copyFileSync(resolve(iconsDir, icon), resolve(distIconsDir, icon));
    }
  } catch {
    console.warn('⚠️  No icons found in public/icons/');
  }

  console.log('✅ Manifest and icons copied to dist/.');
}

copyManifest();
