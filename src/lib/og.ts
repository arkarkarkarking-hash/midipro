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
const logoSvg = readFileSync(new URL('src/assets/logo.svg', root), 'utf8').replace('currentColor', '#c4c2bc');
const logoUri = `data:image/svg+xml;base64,${Buffer.from(logoSvg).toString('base64')}`;

type Node = { type: string; props: Record<string, unknown> };
const h = (type: string, style: Record<string, unknown>, children?: unknown): Node => ({ type, props: { style, children } });

const screw = (pos: Record<string, number>) => h('div', { position: 'absolute', width: 14, height: 14, borderRadius: 7, background: '#5a5a5e', border: '2px solid #0d0d0e', ...pos });

export async function renderOg(opts: { eyebrow: string; title: string; sub?: string }): Promise<Buffer> {
  const tree = h('div', { position: 'relative', width: 1200, height: 630, display: 'flex', background: '#0e0e0f', fontFamily: 'Pretendard' }, [
    h('div', { position: 'absolute', left: 24, top: 24, right: 24, bottom: 24, display: 'flex', flexDirection: 'column', padding: '56px 88px', background: 'linear-gradient(180deg, #2a2a2d, #1a1a1c)', borderRadius: 4, border: '1px solid #3a3a3e' }, [
      screw({ left: 26, top: 26 }), screw({ left: 26, bottom: 26 }), screw({ right: 26, top: 26 }), screw({ right: 26, bottom: 26 }),
      h('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, [
        { type: 'img', props: { src: logoUri, width: 300, height: 30, style: {} } },
        h('div', { width: 64, height: 6, background: 'linear-gradient(90deg, #5b7cfa, #8f63f0)' }),
      ]),
      h('div', { display: 'flex', flexDirection: 'column', marginTop: 'auto' }, [
        h('div', { fontFamily: 'Plex', fontSize: 26, letterSpacing: 4, color: '#8e8c87' }, opts.eyebrow),
        h('div', { fontSize: 76, fontWeight: 700, color: '#ecebe7', marginTop: 14, lineHeight: 1.15, letterSpacing: -2 }, opts.title),
        ...(opts.sub ? [h('div', { fontSize: 30, color: '#8e8c87', marginTop: 16 }, opts.sub)] : []),
      ]),
    ]),
  ]);
  const svg = await satori(tree as unknown as Parameters<typeof satori>[0], { width: 1200, height: 630, fonts });
  return new Resvg(svg, { fitTo: { mode: 'width', value: 1200 }, font: { loadSystemFonts: false } }).render().asPng();
}
