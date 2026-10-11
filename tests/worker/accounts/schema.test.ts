import { afterEach, beforeEach, expect, test } from 'vitest';
import { makeEnv } from '../helpers';

let ctx: Awaited<ReturnType<typeof makeEnv>>;
beforeEach(async () => { ctx = await makeEnv(); });
afterEach(async () => { await ctx.dispose(); });

const insert = (loginId: string, role: string) =>
  ctx.env.DB.prepare("INSERT INTO users (login_id, name, role, password_hash, created_at) VALUES (?1, '테스트', ?2, 'x', 0)").bind(loginId, role).run();

test('role must be admin, teacher or student', async () => {
  await insert('stu_ok', 'student');
  await expect(insert('guest_1', 'guest')).rejects.toThrow();
});

test('login_id is unique', async () => {
  await insert('kim_01', 'student');
  await expect(insert('kim_01', 'teacher')).rejects.toThrow();
});

test('deleting a user removes sessions and track links', async () => {
  await insert('kim_01', 'student');
  await ctx.env.DB.prepare("INSERT INTO sessions VALUES ('h', 1, 9, 0)").run();
  await ctx.env.DB.prepare("INSERT INTO user_tracks VALUES (1, 'x')").run();
  await ctx.env.DB.prepare('DELETE FROM users WHERE id = 1').run();
  expect((await ctx.env.DB.prepare('SELECT COUNT(*) n FROM sessions').first()).n).toBe(0);
});
