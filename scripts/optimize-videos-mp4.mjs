import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const VIDEOS_DIR = path.join(ROOT, 'public', 'videos');
const VIDEO_EXT_RE = /\.(?:mp4|mov|m4v|webm|avi|mkv)$/i;

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const out = [];

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walk(full)));
      continue;
    }

    if (entry.isFile() && VIDEO_EXT_RE.test(entry.name)) {
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

function runFfmpeg(input, output) {
  return new Promise((resolve, reject) => {
    const args = [
      '-y',
      '-i',
      input,
      '-c:v',
      'libx264',
      '-preset',
      'slow',
      '-crf',
      '28',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      output,
    ];

    const proc = spawn('ffmpeg', args, { stdio: 'ignore' });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`ffmpeg exited with code ${code}`));
      }
    });
  });
}

async function main() {
  const files = await walk(VIDEOS_DIR);
  if (files.length === 0) {
    console.log('No video files found in public/videos.');
    return;
  }

  let beforeTotal = 0;
  let afterTotal = 0;
  let replaced = 0;
  let keptOriginal = 0;

  for (const file of files) {
    const before = await fileSize(file);
    beforeTotal += before;

    const tmp = `${file}.tmp.optimized.mp4`;
    try {
      await runFfmpeg(file, tmp);
      const optimized = await fileSize(tmp);

      if (optimized < before) {
        await fs.rename(tmp, file);
        afterTotal += optimized;
        replaced += 1;
      } else {
        await fs.unlink(tmp);
        afterTotal += before;
        keptOriginal += 1;
      }
    } catch (err) {
      await fs.rm(tmp, { force: true });
      afterTotal += before;
      keptOriginal += 1;
      console.error(`Skipping ${file}: ${err.message}`);
    }
  }

  const delta = afterTotal - beforeTotal;
  const pct = (Math.abs(delta) / beforeTotal) * 100;
  const direction = delta < 0 ? 'smaller' : delta > 0 ? 'larger' : 'unchanged';

  console.log(`Processed: ${files.length} videos`);
  console.log(`Replaced with optimized: ${replaced}`);
  console.log(`Kept original: ${keptOriginal}`);
  console.log(`Original total: ${formatBytes(beforeTotal)}`);
  console.log(`Final total: ${formatBytes(afterTotal)}`);
  console.log(`Result: ${formatBytes(Math.abs(delta))} ${direction} (${pct.toFixed(2)}%)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
