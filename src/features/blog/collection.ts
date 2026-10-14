import { getCollection, type CollectionEntry } from 'astro:content';
import { publishedPosts, type PostMeta } from './posts';

export const toMeta = (e: CollectionEntry<'blog'>): PostMeta => ({ slug: e.id, ...e.data });

export async function getPosts(): Promise<PostMeta[]> {
  return publishedPosts((await getCollection('blog')).map(toMeta));
}

export async function getPostEntries(): Promise<{ meta: PostMeta; entry: CollectionEntry<'blog'> }[]> {
  const entries = await getCollection('blog');
  const bySlug = new Map(entries.map((e) => [e.id, e]));
  return publishedPosts(entries.map(toMeta)).map((meta) => ({ meta, entry: bySlug.get(meta.slug)! }));
}
