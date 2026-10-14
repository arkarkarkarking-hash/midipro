import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { BlogFrontmatter } from './lib/blog';

// Only dated site posts (content/blog/YYYY-MM-DD-slug.md); README, naver/ and plan/ are excluded.
const blog = defineCollection({
  loader: glob({ pattern: '[0-9]*.md', base: './content/blog' }),
  schema: BlogFrontmatter,
});

export const collections = { blog };
