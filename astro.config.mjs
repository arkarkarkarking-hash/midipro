import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import teachers from './src/data/teachers.json' with { type: 'json' };

const excluded = ['/404', '/login', '/my', '/admin', ...(teachers.length === 0 ? ['/teachers'] : [])];

export default defineConfig({
  site: 'https://midipro.kr',
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file', inlineStylesheets: 'always' },
  integrations: [sitemap({ filter: (page) => !excluded.some((p) => new URL(page).pathname.replace(/\/$/, '') === p) })],
});
