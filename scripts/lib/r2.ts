import { createHash } from 'node:crypto';

// Blog photos can be replaced (re-blurred, swapped) under the same key, so they must not be cached as immutable.
export const BLOG_CACHE_CONTROL = 'public, max-age=3600';

// R2's ETag for a single-part upload is the object's MD5.
export const sameObject = (local: Buffer, etag: string | null): boolean =>
  etag !== null && etag.replaceAll('"', '') === createHash('md5').update(local).digest('hex');
