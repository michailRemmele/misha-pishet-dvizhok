import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import rss from '@astrojs/rss';
import { resolvePostPath } from '../lib/resolve-post-slugs';

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
      link: resolvePostPath(post)
    })),
    customData: '<language>ru</language>'
  });
};
