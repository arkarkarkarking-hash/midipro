import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://midipro.kr',
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file' },
});
