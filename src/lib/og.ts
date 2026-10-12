import { readFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';
import satori from 'satori';

const root = new URL('../../', import.meta.url);
const read = (p: string) => readFileSync(new URL(p, root));
const fonts = [
  { name: 'Pretendard', data: read('node_modules/pretendard/dist/public/static/Pretendard-Bold.otf'), weight: 700 as const },
  { name: 'Pretendard', data: read('node_modules/pretendard/dist/public/static/Pretendard-Regular.otf'), weight: 400 as const },
  { name: 'Plex', data: read('node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff'), weight: 400 as const },
];
const logoSvg = readFileSync(new URL('src/assets/logo.svg', root), 'utf8').replace('currentColor', '#e8e3d9');
const logoUri = `data:image/svg+xml;base64,${Buffer.from(logoSvg).toString('base64')}`;

type Node = { type: string; props: Record<string, unknown> };
const h = (type: string, style: Record<string, unknown>, children?: unknown): Node => ({ type, props: { style, children } });

// registration crosshair (+)
const cross = (pos: Record<string, number>, color = '#85827b') =>
  h('div', { position: 'absolute', width: 17, height: 17, display: 'flex', ...pos }, [
    h('div', { position: 'absolute', left: 8, top: 0, width: 1, height: 17, background: color }),
    h('div', { position: 'absolute', top: 8, left: 0, height: 1, width: 17, background: color }),
  ]);
const grid = 'linear-gradient(rgba(232,227,217,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(232,227,217,0.05) 1px, transparent 1px)';

export async function renderOg(opts: { eyebrow: string; title: string; sub?: string }): Promise<Buffer> {
  const tree = h('div', { position: 'relative', width: 1200, height: 630, display: 'flex', background: '#16171a', backgroundImage: grid, backgroundSize: '24px 24px', fontFamily: 'Pretendard' }, [
    h('div', { position: 'absolute', left: 24, top: 24, right: 24, bottom: 24, display: 'flex', flexDirection: 'column', padding: '56px 88px', border: '1px solid rgba(232,227,217,0.22)' }, [
      cross({ left: 14, top: 14 }), cross({ left: 14, bottom: 14 }), cross({ right: 14, top: 14 }), cross({ right: 14, bottom: 14 }, '#f25c2a'),
      h('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, [
        { type: 'img', props: { src: logoUri, width: 300, height: 30, style: {} } },
        h('div', { fontFamily: 'Plex', fontSize: 20, letterSpacing: 2, color: '#85827b', display: 'flex' }, 'A4 · 440.00 HZ'),
      ]),
      h('div', { display: 'flex', flexDirection: 'column', marginTop: 'auto' }, [
        h('div', { fontFamily: 'Plex', fontSize: 26, letterSpacing: 4, color: '#f25c2a' }, opts.eyebrow),
        h('div', { fontSize: 76, fontWeight: 700, color: '#e8e3d9', marginTop: 14, lineHeight: 1.15, letterSpacing: -2 }, opts.title),
        ...(opts.sub ? [h('div', { fontSize: 30, color: '#8e8c87', marginTop: 16 }, opts.sub)] : []),
      ]),
    ]),
  ]);
  const svg = await satori(tree as unknown as Parameters<typeof satori>[0], { width: 1200, height: 630, fonts });
  return new Resvg(svg, { fitTo: { mode: 'width', value: 1200 }, font: { loadSystemFonts: false } }).render().asPng();
}
