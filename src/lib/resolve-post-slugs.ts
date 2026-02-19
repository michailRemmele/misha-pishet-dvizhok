import type { CollectionEntry } from 'astro:content';

type PostEntry = CollectionEntry<'posts'>;

export function resolvePostSlug(post: PostEntry): string {
  const baseSlug = post.data.postSlug.trim();
  const salt = shortHash(post.id);
  return `${baseSlug}-${salt}`;
}

function shortHash(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36).slice(0, 6);
}
