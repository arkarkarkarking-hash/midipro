import { expect, test } from 'vitest';
import { makeSeamless } from '../../scripts/build-texture';

test('seamless tile: opposite edges match their wrapped neighbours', () => {
  const w = 64, h = 64;
  const px = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) px[y * w + x] = (x * 4) % 256; // hard seam at the right edge
  const out = makeSeamless(px, w, h, 1);
  for (let y = 0; y < h; y++) {
    const jump = Math.abs(out[y * w + (w - 1)] - out[y * w]);
    expect(jump).toBeLessThan(12);
  }
});
