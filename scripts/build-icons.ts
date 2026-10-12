// Renders favicon.ico/svg, apple-touch-icon and PWA icons from src/assets/mark.svg.
import { readFileSync, writeFileSync } from 'node:fs';
import pngToIco from 'png-to-ico';
import sharp from 'sharp';

const ROOT = new URL('..', import.meta.url).pathname;
const mark = readFileSync(`${ROOT}src/assets/mark.svg`, 'utf8');
const inner = mark.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace('currentColor', '#E8E3D9');
const icon = (radius: number) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="${radius}" fill="#16171a"/>${inner}</svg>`;

writeFileSync(`${ROOT}public/favicon.svg`, icon(18));
const png = (size: number, radius = 0) => sharp(Buffer.from(icon(radius))).resize(size, size).png().toBuffer();
writeFileSync(`${ROOT}public/apple-touch-icon.png`, await png(180));
writeFileSync(`${ROOT}public/icon-192.png`, await png(192));
writeFileSync(`${ROOT}public/icon-512.png`, await png(512));
writeFileSync(`${ROOT}public/favicon.ico`, await pngToIco([await png(16, 18), await png(32, 18), await png(48, 18)]));
writeFileSync(`${ROOT}public/site.webmanifest`, JSON.stringify({
  name: '미디프로실용음악학원',
  short_name: 'MIDIPRO',
  start_url: '/',
  display: 'browser',
  theme_color: '#16171a',
  background_color: '#16171a',
  icons: [
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
  ],
}, null, 2) + '\n');
console.log('icons written');
