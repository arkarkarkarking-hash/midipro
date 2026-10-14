import { z } from 'zod';

export type BlogCategory = 'field' | 'guide';

export const CATEGORY_LABEL: Record<BlogCategory, string> = { field: '현장', guide: '정보' };

const MEDIA_BLOG = 'https://media.midipro.kr/blog/';

export const BlogFrontmatter = z.object({
  title: z.string().min(1).max(60),
  description: z.string().min(1).max(160),
  date: z.coerce.date(),
  category: z.enum(['field', 'guide']),
  tags: z.array(z.string()).default([]),
  cover: z.string().startsWith(MEDIA_BLOG, { message: `cover must start with ${MEDIA_BLOG}` }).optional(),
  draft: z.boolean().default(false),
});

export interface PostMeta {
  slug: string;
  title: string;
  description: string;
  date: Date;
  category: BlogCategory;
  tags: string[];
  cover?: string;
  draft: boolean;
}

export const publishedPosts = (all: PostMeta[]): PostMeta[] =>
  all.filter((p) => !p.draft).sort((a, b) => b.date.getTime() - a.date.getTime() || a.slug.localeCompare(b.slug));

export const relatedPosts = (posts: PostMeta[], current: PostMeta, n = 2): PostMeta[] =>
  posts.filter((p) => p.category === current.category && p.slug !== current.slug).slice(0, n);

export const postOgImage = (p: PostMeta): string => p.cover ?? `/og/blog/${p.slug}.png`;

// 2026.10.19 — fixed-width date label used on cards, post header and OG image
export const dateLabel = (d: Date): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d).replaceAll('-', '.');
