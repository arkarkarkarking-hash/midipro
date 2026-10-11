// PBKDF2-SHA256 password hashing on Web Crypto (works in Workers and Node).
// Stored format: pbkdf2$<iterations>$<salt b64>$<hash b64>
const ITERATIONS = 100_000; // Workers' maximum
const KEY_BYTES = 32;

const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const unb64 = (s: string): Uint8Array<ArrayBuffer> => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function derive(plain: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(plain), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, KEY_BYTES * 8));
}

export async function hashPassword(plain: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${ITERATIONS}$${b64(salt)}$${b64(await derive(plain, salt, ITERATIONS))}`;
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  const [scheme, iter, salt, hash] = stored.split('$');
  if (scheme !== 'pbkdf2' || Number(iter) !== ITERATIONS || !salt || !hash) return false;
  let expected: Uint8Array;
  try {
    expected = unb64(hash);
  } catch {
    return false;
  }
  const actual = await derive(plain, unb64(salt), ITERATIONS);
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
  return diff === 0;
}

/** Compared against when the login id does not exist, so unknown ids take as long as wrong passwords. */
export const DUMMY_HASH = `pbkdf2$${ITERATIONS}$${b64(new Uint8Array(16))}$${b64(new Uint8Array(KEY_BYTES))}`;
