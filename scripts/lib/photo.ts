import sharp from 'sharp';

// Upright, long edge ≤ 1600px, JPEG q82. No withMetadata(): EXIF (GPS, camera) is dropped.
export const processPhoto = (input: Buffer): Promise<Buffer> =>
  sharp(input).rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
