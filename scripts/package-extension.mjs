import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { deflateRawSync } from 'zlib';
import { createHash } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const distDir = resolve(root, 'dist');
const releaseDir = resolve(root, 'release');

// CRC32 implementation
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[i] = c >>> 0;
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

/**
 * Pure Node.js zero-dependency zip creation.
 * Bundles directory contents directly at zip root.
 */
function createExtensionZip(sourceDir, outZipPath) {
  const files = [];

  function walk(dir, rel) {
    for (const f of readdirSync(dir)) {
      const full = join(dir, f);
      const relPath = rel ? rel + '/' + f : f;
      if (statSync(full).isDirectory()) {
        walk(full, relPath);
      } else {
        files.push({ full, relPath: relPath.replace(/\\/g, '/') });
      }
    }
  }

  walk(sourceDir, '');

  const localHeaders = [];
  const centralHeaders = [];
  let offset = 0;

  for (const file of files) {
    const data = readFileSync(file.full);
    const uncompressedSize = data.length;
    const fileCrc = crc32(data);
    const compressed = deflateRawSync(data, { level: 9 });
    const compressedSize = compressed.length;
    const nameBuf = Buffer.from(file.relPath, 'utf8');

    // Local Header (30 bytes + name length)
    const lh = Buffer.alloc(30 + nameBuf.length);
    lh.write('PK\x03\x04', 0);
    lh.writeUInt16LE(20, 4); // Version needed to extract: 2.0
    lh.writeUInt16LE(0, 6); // General purpose bit flag
    lh.writeUInt16LE(8, 8); // Compression method: Deflate
    lh.writeUInt16LE(0, 10); // Last mod file time
    lh.writeUInt16LE(0, 12); // Last mod file date
    lh.writeUInt32LE(fileCrc, 14);
    lh.writeUInt32LE(compressedSize, 18);
    lh.writeUInt32LE(uncompressedSize, 22);
    lh.writeUInt16LE(nameBuf.length, 26);
    lh.writeUInt16LE(0, 28); // Extra field length
    nameBuf.copy(lh, 30);

    localHeaders.push(lh, compressed);

    // Central Directory Header (46 bytes + name length)
    const cd = Buffer.alloc(46 + nameBuf.length);
    cd.write('PK\x01\x02', 0);
    cd.writeUInt16LE(20, 4); // Version made by
    cd.writeUInt16LE(20, 6); // Version needed to extract
    cd.writeUInt16LE(0, 8); // General purpose flags
    cd.writeUInt16LE(8, 10); // Compression method: Deflate
    cd.writeUInt16LE(0, 12); // Last mod file time
    cd.writeUInt16LE(0, 14); // Last mod file date
    cd.writeUInt32LE(fileCrc, 16);
    cd.writeUInt32LE(compressedSize, 20);
    cd.writeUInt32LE(uncompressedSize, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt16LE(0, 30); // Extra field length
    cd.writeUInt16LE(0, 32); // File comment length
    cd.writeUInt16LE(0, 34); // Disk number start
    cd.writeUInt16LE(0, 36); // Internal file attributes
    cd.writeUInt32LE(0, 38); // External file attributes
    cd.writeUInt32LE(offset, 42); // Relative offset of local header
    nameBuf.copy(cd, 46);

    centralHeaders.push(cd);
    offset += lh.length + compressed.length;
  }

  const cdOffset = offset;
  let cdSize = 0;
  for (const cd of centralHeaders) cdSize += cd.length;

  // End of Central Directory Record (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.write('PK\x05\x06', 0);
  eocd.writeUInt16LE(0, 4); // Disk number
  eocd.writeUInt16LE(0, 6); // Disk where central directory starts
  eocd.writeUInt16LE(files.length, 8); // Number of central directory records on this disk
  eocd.writeUInt16LE(files.length, 10); // Total number of central directory records
  eocd.writeUInt32LE(cdSize, 12); // Size of central directory
  eocd.writeUInt32LE(cdOffset, 16); // Offset of start of central directory
  eocd.writeUInt16LE(0, 20); // Comment length

  const finalZipBuffer = Buffer.concat([...localHeaders, ...centralHeaders, eocd]);
  writeFileSync(outZipPath, finalZipBuffer);

  return {
    fileCount: files.length,
    sizeBytes: finalZipBuffer.length,
    sha256: createHash('sha256').update(finalZipBuffer).digest('hex'),
  };
}

async function packageExtension() {
  console.log('\n📦 Packaging Chrome Extension for Web Store Submission...\n');

  if (!existsSync(distDir)) {
    console.error('❌ dist/ directory does not exist! Run "npm run build" first.');
    process.exit(1);
  }

  const manifestPath = resolve(distDir, 'manifest.json');
  if (!existsSync(manifestPath)) {
    console.error('❌ dist/manifest.json does not exist!');
    process.exit(1);
  }

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  const version = manifest.version || '1.0.0';

  mkdirSync(releaseDir, { recursive: true });

  const zipFilename = `workflow-recorder-v${version}.zip`;
  const outZipPath = resolve(releaseDir, zipFilename);

  const stats = createExtensionZip(distDir, outZipPath);

  console.log('🎉 Extension packaged successfully!');
  console.log('───────────────────────────────────────────────────');
  console.log(`📁 Output File: release/${zipFilename}`);
  console.log(`📊 Total Files: ${stats.fileCount}`);
  console.log(`⚖️  Archive Size: ${(stats.sizeBytes / 1024).toFixed(1)} KB (${stats.sizeBytes} bytes)`);
  console.log(`🔑 SHA-256:    ${stats.sha256}`);
  console.log('───────────────────────────────────────────────────');
  console.log('🚀 Ready to drag-and-drop into Chrome Web Store Developer Dashboard!');
  console.log('   Dashboard URL: https://chrome.google.com/webstore/devconsole\n');
}

packageExtension();
