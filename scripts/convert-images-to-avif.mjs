import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const IMAGES_DIR = path.join(ROOT, 'public', 'images');
const POSTS_DIR = path.join(ROOT, 'src', 'content', 'posts');
const IMAGE_EXT_RE = /\.(?:jpe?g|png)$/i;

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const out = [];

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walk(full)));
      continue;
    }

    if (entry.isFile()) {
      out.push(full);
    }
  }

  return out;
}

async function fileSize(filePath) {
  const st = await fs.stat(filePath);
  return st.size;
}

function formatBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(unit === 0 ? 0 : 2)} ${units[unit]}`;
}

async function convertImages(files) {
  let originalBytes = 0;
  let avifBytes = 0;

  for (const input of files) {
    const output = input.replace(IMAGE_EXT_RE, '.avif');
    const originalSize = await fileSize(input);
    originalBytes += originalSize;

    const ext = path.extname(input).toLowerCase();
    const isPng = ext === '.png';
    const quality = isPng ? 58 : 50;

    await sharp(input).avif({ quality, effort: 6 }).toFile(output);
    avifBytes += await fileSize(output);
  }

  return { originalBytes, avifBytes };
}

async function updatePostReferences() {
  const postFiles = await walk(POSTS_DIR);
  let changedFiles = 0;

  for (const file of postFiles.filter((f) => f.endsWith('.md'))) {
    const before = await fs.readFile(file, 'utf8');
    const after = before.replace(
      /\/images\/([^"')\s]+?)\.(?:jpe?g|png)\b/gi,
      '/images/$1.avif',
    );

    if (after !== before) {
      await fs.writeFile(file, after, 'utf8');
      changedFiles += 1;
    }
  }

  return changedFiles;
}

async function deleteOriginals(files) {
  for (const file of files) {
    await fs.unlink(file);
  }
}

async function main() {
  const imageFiles = (await walk(IMAGES_DIR)).filter((file) =>
    IMAGE_EXT_RE.test(file),
  );
  if (imageFiles.length === 0) {
    console.log('No jpg/jpeg/png files found in public/images.');
    return;
  }

  const { originalBytes, avifBytes } = await convertImages(imageFiles);
  const changedPosts = await updatePostReferences();
  await deleteOriginals(imageFiles);

  const deltaBytes = avifBytes - originalBytes;
  const pct = (Math.abs(deltaBytes) / originalBytes) * 100;
  const direction =
    deltaBytes < 0 ? 'smaller' : deltaBytes > 0 ? 'larger' : 'unchanged';

  console.log(`Converted: ${imageFiles.length} images`);
  console.log(`Updated posts: ${changedPosts}`);
  console.log(`Original total: ${formatBytes(originalBytes)}`);
  console.log(`AVIF total: ${formatBytes(avifBytes)}`);
  console.log(
    `Result: ${formatBytes(Math.abs(deltaBytes))} ${direction} (${pct.toFixed(2)}%)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
