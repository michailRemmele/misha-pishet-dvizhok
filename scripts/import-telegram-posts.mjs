import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const EXPORT_DIR = path.join(ROOT, 'ChatExport_2026-02-16');
const RESULT_PATH = path.join(EXPORT_DIR, 'result.json');
const POSTS_DIR = path.join(ROOT, 'src', 'content', 'posts');
const PUBLIC_IMAGES_DIR = path.join(ROOT, 'public', 'images');
const PUBLIC_VIDEOS_DIR = path.join(ROOT, 'public', 'videos');

if (!fs.existsSync(RESULT_PATH)) {
  console.error(`Missing export file: ${RESULT_PATH}`);
  process.exit(1);
}

const translitMap = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i',
  й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
  у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y',
  ь: '', э: 'e', ю: 'yu', я: 'ya'
};

const data = JSON.parse(fs.readFileSync(RESULT_PATH, 'utf8'));
const messages = (data.messages || []).filter((message) => message.type === 'message');

const existingPostMeta = readExistingPostMeta(POSTS_DIR);
const usedSlugs = new Set([...existingPostMeta.values()].map((meta) => meta.postSlug));

let created = 0;
let skipped = 0;

for (const message of messages) {
  const dateIso = String(message.date || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) {
    skipped += 1;
    continue;
  }

  const year = dateIso.slice(0, 4);
  const yearDir = path.join(POSTS_DIR, year);
  fs.mkdirSync(yearDir, { recursive: true });
  const fileName = `${dateIso}-${String(message.id).padStart(4, '0')}.md`;
  const filePath = path.join(yearDir, fileName);

  const textMarkdown = textToMarkdown(message.text).trim();
  const title = deriveTitle(textMarkdown, dateIso, message.id);
  const existingMeta = existingPostMeta.get(filePath);
  const slug = existingMeta?.postSlug || uniqueSlug(baseSlugFromTitle(title, dateIso, message.id), usedSlugs);
  const excerpt = deriveExcerpt(textMarkdown, title);

  const imageRelDir = path.posix.join('/images', slug);
  const videoRelDir = path.posix.join('/videos', slug);
  const imageAbsDir = path.join(PUBLIC_IMAGES_DIR, slug);
  const videoAbsDir = path.join(PUBLIC_VIDEOS_DIR, slug);

  const imagePaths = [];
  const videoPaths = [];
  const videoThumbPaths = [];

  if (message.photo) {
    fs.mkdirSync(imageAbsDir, { recursive: true });
    const sourceAbs = path.join(EXPORT_DIR, message.photo);
    const ext = safeExt(message.photo, '.jpg');
    const targetAbs = path.join(imageAbsDir, `photo-1${ext}`);
    if (copyIfExists(sourceAbs, targetAbs)) {
      imagePaths.push(path.posix.join(imageRelDir, `photo-1${ext}`));
    }
  }

  if (message.media_type === 'video_file' && message.file) {
    fs.mkdirSync(videoAbsDir, { recursive: true });
    const sourceAbs = path.join(EXPORT_DIR, message.file);
    const ext = safeExt(message.file, '.mp4');
    const targetAbs = path.join(videoAbsDir, `video-1${ext}`);
    if (copyIfExists(sourceAbs, targetAbs)) {
      videoPaths.push(path.posix.join(videoRelDir, `video-1${ext}`));
    }

    if (message.thumbnail) {
      fs.mkdirSync(imageAbsDir, { recursive: true });
      const thumbSourceAbs = path.join(EXPORT_DIR, message.thumbnail);
      const thumbExt = safeExt(message.thumbnail, '.jpg');
      const thumbTargetAbs = path.join(imageAbsDir, `video-1-cover${thumbExt}`);
      if (copyIfExists(thumbSourceAbs, thumbTargetAbs)) {
        videoThumbPaths.push(path.posix.join(imageRelDir, `video-1-cover${thumbExt}`));
      }
    }
  }

  const cover = videoThumbPaths[0] || imagePaths[0];
  const coverAlt = cover
    ? videoThumbPaths[0]
      ? `Превью видео: ${title}`
      : `Обложка статьи: ${title}`
    : null;

  const articleBody = buildBody(textMarkdown, imagePaths, videoPaths, title);
  const frontmatter = [
    '---',
    `postSlug: '${escapeYaml(slug)}'`,
    `title: '${escapeYaml(title)}'`,
    `date: ${dateIso}`,
    `excerpt: '${escapeYaml(excerpt)}'`,
    ...(cover ? [`cover: '${escapeYaml(cover)}'`] : []),
    ...(coverAlt ? [`coverAlt: '${escapeYaml(coverAlt)}'`] : []),
    '---',
    ''
  ].join('\n');

  fs.writeFileSync(filePath, `${frontmatter}${articleBody}\n`, 'utf8');
  created += 1;
}

console.log(`Imported ${created} posts. Skipped ${skipped}.`);

function copyIfExists(source, target) {
  if (!fs.existsSync(source)) {
    return false;
  }

  fs.copyFileSync(source, target);
  return true;
}

function safeExt(filePath, fallback) {
  const ext = path.extname(filePath).toLowerCase();
  return ext || fallback;
}

function escapeYaml(value) {
  return String(value).replace(/'/g, "''");
}

function stripInvisible(text) {
  return String(text || '').replace(/[\u200B-\u200D\uFEFF]/g, '');
}

function isOnlyInvisibleOrSpaces(text) {
  return stripInvisible(text).trim().length === 0;
}

function textToMarkdown(rawText) {
  if (typeof rawText === 'string') {
    return stripInvisible(rawText);
  }

  if (!Array.isArray(rawText)) {
    return '';
  }

  return rawText
    .map((part) => {
      if (typeof part === 'string') {
        return stripInvisible(part);
      }

      if (!part || typeof part !== 'object') {
        return '';
      }

      const partText = stripInvisible(part.text || '');
      const href = part.href || '';

      if (part.type === 'text_link') {
        if (!isOnlyInvisibleOrSpaces(partText) && href) {
          return `[${partText}](${href})`;
        }

        if (href) {
          return `${href}\n\n`;
        }

        return '';
      }

      if (part.type === 'bold') return `**${partText}**`;
      if (part.type === 'italic') return `*${partText}*`;
      if (part.type === 'code') return `\`${partText}\``;
      if (part.type === 'pre') return `\n\`\`\`\n${partText}\n\`\`\`\n`;
      if (part.type === 'underline') return `<u>${partText}</u>`;
      if (part.type === 'strikethrough') return `~~${partText}~~`;

      return partText;
    })
    .join('')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function deriveTitle(markdown, dateIso, messageId) {
  const lines = markdown
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^https?:\/\//i.test(line));

  const base = lines[0] || `Post ${dateIso} ${messageId}`;
  const cleaned = base
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    .replace(/[*_`~#>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) {
    return `Post ${dateIso} ${messageId}`;
  }

  return cleaned.length > 90 ? `${cleaned.slice(0, 87).trim()}...` : cleaned;
}

function deriveExcerpt(markdown, fallback) {
  const plain = markdown
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    .replace(/[*_`~#>|]/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const source = plain || fallback;
  return source.length > 190 ? `${source.slice(0, 187).trim()}...` : source;
}

function baseSlugFromTitle(title, dateIso, messageId) {
  let slug = title
    .toLowerCase()
    .split('')
    .map((char) => translitMap[char] ?? char)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

  if (!slug) {
    slug = `post-${dateIso.replace(/-/g, '')}-${messageId}`;
  }

  return slug;
}

function uniqueSlug(base, taken) {
  let slug = base;
  let index = 2;

  while (taken.has(slug)) {
    slug = `${base}-${index}`;
    index += 1;
  }

  taken.add(slug);
  return slug;
}

function buildBody(markdownText, imagePaths, videoPaths, title) {
  const chunks = [];

  if (markdownText) {
    chunks.push(markdownText);
  }

  for (const imagePath of imagePaths) {
    chunks.push(`![${title}](${imagePath})`);
  }

  for (const videoPath of videoPaths) {
    chunks.push(
      [
        '<figure>',
        '  <video controls>',
        `    <source src="${videoPath}" type="video/mp4">`,
        '  </video>',
        '</figure>'
      ].join('\n')
    );
  }

  return chunks.join('\n\n').trim();
}

function readExistingPostMeta(postsDir) {
  const meta = new Map();

  if (!fs.existsSync(postsDir)) {
    return meta;
  }

  const files = [];
  walk(postsDir, files);

  for (const file of files) {
    if (!/\.(md|mdx)$/i.test(file)) {
      continue;
    }

    const content = fs.readFileSync(file, 'utf8');
    const slugMatch = content.match(/^(?:postSlug|slug):\s*['\"](.+?)['\"]/m);
    if (!slugMatch) {
      continue;
    }

    meta.set(file, { postSlug: slugMatch[1] });
  }

  return meta;
}

function walk(dir, result) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(fullPath, result);
      continue;
    }

    result.push(fullPath);
  }
}
