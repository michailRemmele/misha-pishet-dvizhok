import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import rss from '@astrojs/rss';
import sanitizeHtml from 'sanitize-html';
import MarkdownIt from 'markdown-it';
import { resolvePostPath } from '../lib/resolve-post-slugs';

const parser = new MarkdownIt();

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
      content: post.body
        ? sanitizeHtml(parser.render(post.body), {
            allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img'])
          })
        : undefined
    })),
    customData: '<language>ru</language>'
  });
};
