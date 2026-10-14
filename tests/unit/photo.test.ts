import sharp from 'sharp';
import { expect, test } from 'vitest';
import { processPhoto } from '../../scripts/lib/photo';

test('rotates by EXIF, caps long edge at 1600, strips EXIF/GPS', async () => {
  const input = await sharp({ create: { width: 3000, height: 2000, channels: 3, background: '#808080' } })
    .jpeg()
    .withMetadata({ orientation: 6, exif: { IFD0: { Make: 'TestCam' }, IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '36/1 48/1 0/1' } } })
    .toBuffer();
  expect((await sharp(input).metadata()).exif).toBeDefined();
  const meta = await sharp(await processPhoto(input)).metadata();
  expect(meta.format).toBe('jpeg');
  expect(meta.exif).toBeUndefined();
  expect(meta.orientation).toBeUndefined();
  expect([meta.width, meta.height]).toEqual([1067, 1600]);
});

test('does not enlarge small photos', async () => {
  const input = await sharp({ create: { width: 400, height: 300, channels: 3, background: '#808080' } }).jpeg().toBuffer();
  const meta = await sharp(await processPhoto(input)).metadata();
  expect([meta.width, meta.height]).toEqual([400, 300]);
});
