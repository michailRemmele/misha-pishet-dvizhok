import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import rss from '@astrojs/rss';
import sanitizeHtml from 'sanitize-html';
import MarkdownIt from 'markdown-it';
import { resolvePostPath } from '../lib/resolve-post-slugs';

const markdownParser = new MarkdownIt({ html: true });

const MAX_ITEMS = 50;
const VIDEO_SRC_REGEX = /<(?:video|source)\b[^>]*\bsrc=(["'])(.*?)\1/i;
const VIDEO_TAG_REGEX = /<video\b[\s\S]*?<\/video>/gi;
const FIGURE_TAG_REGEX = /<figure\b[^>]*>([\s\S]*?)<\/figure>/gi;
const FIGCAPTION_TAG_REGEX = /<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i;
const RSS_ALLOWED_TAGS = sanitizeHtml.defaults.allowedTags
  .concat(['img'])
  .filter((tag) => tag !== 'figure' && tag !== 'figcaption');
const COVER_MIME_TYPES: Record<string, string> = {
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp'
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const replaceVideoEmbedsWithLinks = (markdown: string): string => {
  return markdown.replace(VIDEO_TAG_REGEX, (videoHtml) => {
    const srcMatch = videoHtml.match(VIDEO_SRC_REGEX);
    const videoSrc = srcMatch?.[2];

    if (!videoSrc) {
      return '';
    }

    const escapedSrc = escapeHtml(videoSrc);
    return `<p><a href="${escapedSrc}">Смотреть видео</a></p>`;
  });
};

const flattenFigureBlocksForRss = (markdown: string): string => {
  return markdown.replace(FIGURE_TAG_REGEX, (_, figureInnerHtml: string) => {
    const captionMatch = figureInnerHtml.match(FIGCAPTION_TAG_REGEX);
    const captionHtml = captionMatch?.[1]?.trim();

    const contentWithoutCaption = figureInnerHtml
      .replace(FIGCAPTION_TAG_REGEX, '')
      .trim();

    const parts: string[] = [];
    if (contentWithoutCaption) {
      parts.push(contentWithoutCaption);
    }
    if (captionHtml) {
      parts.push(`<p>${captionHtml}</p>`);
    }

    return parts.join('\n');
  });
};

const renderRssContent = (markdown: string): string =>
  sanitizeHtml(
    markdownParser.render(
      flattenFigureBlocksForRss(replaceVideoEmbedsWithLinks(markdown))
    ),
    {
      allowedTags: RSS_ALLOWED_TAGS
    }
  );

const getCoverMimeType = (coverUrl: string): string | null => {
  try {
    const { pathname } = new URL(coverUrl);
    const lowerPath = pathname.toLowerCase();
    const extMatch = /\.[a-z0-9]+$/i.exec(lowerPath);
    if (!extMatch) {
      return null;
    }

    return COVER_MIME_TYPES[extMatch[0]] ?? null;
  } catch {
    return null;
  }
};

export const GET: APIRoute = async (context) => {
  const posts = await getCollection('posts');
  posts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
  const feedPosts = posts.slice(0, MAX_ITEMS);
  const siteUrl = context.site ?? new URL('http://localhost:4321');
  const lastBuildDate = new Date().toUTCString();
  const channelImageUrl = new URL('favicon-96x96.png', siteUrl).toString();

  return rss({
    title: 'Миша пишет движок',
    description: 'Личный блог о разработке игрового движка.',
    site: siteUrl,
    items: feedPosts.map((post) => {
      const coverMimeType = post.data.cover
        ? getCoverMimeType(post.data.cover)
        : null;

      return {
        title: post.data.title,
        description: post.data.excerpt,
        pubDate: post.data.date,
        link: resolvePostPath(post),
        content: post.body ? renderRssContent(post.body) : undefined,
        enclosure:
          post.data.cover && coverMimeType
            ? {
                url: post.data.cover,
                length: 0,
                type: coverMimeType
              }
            : undefined
      };
    }),
    customData: `<language>ru</language><lastBuildDate>${lastBuildDate}</lastBuildDate><ttl>60</ttl><image><url>${channelImageUrl}</url><title>Миша пишет движок</title><link>${siteUrl.toString()}</link><width>96</width><height>96</height></image>`
  });
};
