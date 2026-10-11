import { expect, test } from 'vitest';
import { hashPassword, verifyPassword } from '../../../worker/accounts/password';

test('hash roundtrip and format', async () => {
  const h = await hashPassword('pass1234');
  expect(h).toMatch(/^pbkdf2\$100000\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/);
  expect(await verifyPassword('pass1234', h)).toBe(true);
  expect(await verifyPassword('pass1235', h)).toBe(false);
});

test('same password gets a different salt each time', async () => {
  expect(await hashPassword('pass1234')).not.toBe(await hashPassword('pass1234'));
});

test('malformed stored hash never verifies', async () => {
  expect(await verifyPassword('x', 'plain')).toBe(false);
  expect(await verifyPassword('x', 'pbkdf2$1$a$b')).toBe(false);
});
