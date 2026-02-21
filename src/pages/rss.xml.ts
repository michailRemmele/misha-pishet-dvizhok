import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import rss from '@astrojs/rss';
import sanitizeHtml from 'sanitize-html';
import MarkdownIt from 'markdown-it';
import { resolvePostPath } from '../lib/resolve-post-slugs';

const markdownParser = new MarkdownIt({ html: true });

const VIDEO_SRC_REGEX = /<(?:video|source)\b[^>]*\bsrc=(["'])(.*?)\1/i;
const VIDEO_TAG_REGEX = /<video\b[\s\S]*?<\/video>/gi;
const FIGURE_TAG_REGEX = /<figure\b[^>]*>([\s\S]*?)<\/figure>/gi;
const FIGCAPTION_TAG_REGEX = /<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i;
const RSS_ALLOWED_TAGS = sanitizeHtml.defaults.allowedTags
  .concat(['img'])
  .filter((tag) => tag !== 'figure' && tag !== 'figcaption');

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

export const GET: APIRoute = async (context) => {
  const posts = await getCollection('posts');
  posts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());

  return rss({
    title: 'Миша пишет движок',
    description: 'Личный блог о разработке игрового движка.',
    site: context.site ?? new URL('http://localhost:4321'),
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.excerpt,
      pubDate: post.data.date,
      link: resolvePostPath(post),
      content: post.body ? renderRssContent(post.body) : undefined
    })),
    customData: '<language>ru</language>'
  });
};
