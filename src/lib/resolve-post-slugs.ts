import type { CollectionEntry } from 'astro:content';

type PostEntry = CollectionEntry<'posts'>;

export function resolvePostSlug(post: PostEntry): string {
  return post.data.postSlug.trim();
}

export function resolvePostDateSegment(post: PostEntry): string {
  const year = post.data.date.getUTCFullYear();
  const month = String(post.data.date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(post.data.date.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function resolvePostPath(post: PostEntry): string {
  return `/posts/${resolvePostDateSegment(post)}/${resolvePostSlug(post)}/`;
}
