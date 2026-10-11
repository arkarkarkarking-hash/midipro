import { expect, test } from 'vitest';
import { checkGuards, planSync, type DbUser } from '../../scripts/lib/account-sync';
import type { UserInput } from '../../worker/accounts/validate';

// Fake "hash": the stored hash is 'h:' + password, so verify is a string compare.
const verify = async (pw: string, hash: string) => hash === `h:${pw}`;
const memo = (loginId: string, role: UserInput['role'] = 'student', password = 'pass1234', name = loginId, birthYear: number | null = null): UserInput => ({ loginId, role, password, name, birthYear });
const db = (loginId: string, role: DbUser['role'] = 'student', password = 'pass1234', name = loginId, status: DbUser['status'] = 'active', birthYear: number | null = null): DbUser => ({ loginId, role, name, birthYear, status, passwordHash: `h:${password}` });

test('nothing to do when memo and site match', async () => {
  const plan = await planSync([memo('midipro', 'admin'), memo('stu_a')], [db('midipro', 'admin'), db('stu_a')], verify);
  expect(plan).toEqual({ create: [], update: [], password: [], reactivate: [], disable: [] });
});

test('new line creates, changed password resets, changed fields update', async () => {
  const plan = await planSync(
    [memo('midipro', 'admin'), memo('stu_a', 'student', 'newpass1'), memo('stu_b', 'teacher', 'pass1234', '비'), memo('stu_new')],
    [db('midipro', 'admin'), db('stu_a'), db('stu_b', 'student', 'pass1234', 'b')],
    verify,
  );
  expect(plan.create.map((a) => a.loginId)).toEqual(['stu_new']);
  expect(plan.password.map((a) => a.loginId)).toEqual(['stu_a']);
  expect(plan.update).toEqual([{ loginId: 'stu_b', name: '비', birthYear: null, role: 'teacher', changes: ['이름', '구분'] }]);
});

test('removed line disables; a disabled account back in the memo is reactivated', async () => {
  const plan = await planSync(
    [memo('midipro', 'admin'), memo('stu_back')],
    [db('midipro', 'admin'), db('stu_gone'), db('stu_back', 'student', 'pass1234', 'stu_back', 'disabled'), db('old_off', 'student', 'x', 'old_off', 'disabled')],
    verify,
  );
  expect(plan.disable).toEqual(['stu_gone']);
  expect(plan.reactivate).toEqual(['stu_back']);
});

test('guards stop auto mode from risky changes', async () => {
  const site = [db('midipro', 'admin'), db('a1'), db('a2'), db('a3'), db('a4'), db('a5'), db('a6'), db('a7')];
  // memo with no admin
  expect(checkGuards([memo('a1')], await planSync([memo('a1')], site, verify), site)).toContain('관리자');
  // a mostly emptied memo
  const few = [memo('midipro', 'admin'), memo('a1')];
  expect(checkGuards(few, await planSync(few, site, verify), site)).toContain('비활성화');
  // small site: wiping 2 of 3 accounts also stops; removing 1 does not
  const small = [db('midipro', 'admin'), db('tea'), db('stu')];
  const onlyAdmin = [memo('midipro', 'admin')];
  expect(checkGuards(onlyAdmin, await planSync(onlyAdmin, small, verify), small)).toContain('비활성화');
  const oneGone = [memo('midipro', 'admin'), memo('tea')];
  expect(checkGuards(oneGone, await planSync(oneGone, small, verify), small)).toBeNull();
  // a normal edit passes
  const ok = site.filter((u) => u.loginId !== 'a7').map((u) => memo(u.loginId, u.role));
  expect(checkGuards(ok, await planSync(ok, site, verify), site)).toBeNull();
});
