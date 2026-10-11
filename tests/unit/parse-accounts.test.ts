import { expect, test } from 'vitest';
import { parseAccounts } from '../../scripts/lib/parse-accounts';

const memo = `-관리자-
id : Admin_One / pw : test1234 / name : 원장

-강사-
id : tea_kim / pw : abcd9999 / name : 김강사
id :

-수강생-
id : stu_lee / pw : pw12 34 / name : 이 학생 / birth : 2010
id : stu_park/pw:qwer5678/name:박학생/출생연도:2011
id :
`;

test('reads sections and lines in the memo format', () => {
  const { accounts, errors } = parseAccounts(memo, 2026);
  expect(errors).toEqual([]);
  expect(accounts).toEqual([
    { loginId: 'admin_one', password: 'test1234', name: '원장', birthYear: null, role: 'admin' },
    { loginId: 'tea_kim', password: 'abcd9999', name: '김강사', birthYear: null, role: 'teacher' },
    { loginId: 'stu_lee', password: 'pw12 34', name: '이 학생', birthYear: 2010, role: 'student' },
    { loginId: 'stu_park', password: 'qwer5678', name: '박학생', birthYear: 2011, role: 'student' },
  ]);
});

test('reports bad lines with line numbers and never echoes passwords', () => {
  const { accounts, errors } = parseAccounts(`-수강생-\nid : ab / pw : secret99 / name : 짧은아이디\nid : ok_one / pw : 12 / name : 비번짧음\nid : no_sec / name : 이름만\nid : dup_one / pw : pass1234 / name : 가\nid : DUP_one / pw : pass1234 / name : 나`, 2026);
  expect(accounts.map((a) => a.loginId)).toEqual(['dup_one']);
  expect(errors.map((e) => e.line)).toEqual([2, 3, 4, 6]);
  expect(JSON.stringify(errors)).not.toContain('secret99');
});

test('account line before any section is an error', () => {
  expect(parseAccounts('id : kim_01 / pw : pass1234 / name : 김', 2026).errors[0].line).toBe(1);
});
