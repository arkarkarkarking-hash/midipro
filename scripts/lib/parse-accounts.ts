// Parses the academy's account memo:
//   -관리자- / -강사- / -수강생-   section headers
//   id : kim_01 / pw : 1234abcd / name : 김학생 / birth : 2010   (birth optional; "id :" with nothing is skipped)
import type { Role } from '../../worker/core/session';
import { validateUserInput, type UserInput } from '../../worker/accounts/validate';

const SECTIONS: Record<string, Role> = { 관리자: 'admin', 강사: 'teacher', 수강생: 'student' };
const KEYS: Record<string, keyof Omit<UserInput, 'role'>> = {
  id: 'loginId', 아이디: 'loginId',
  pw: 'password', 비밀번호: 'password', password: 'password',
  name: 'name', 이름: 'name',
  birth: 'birthYear', 출생연도: 'birthYear',
};

export type ParseError = { line: number; message: string };

export function parseAccounts(text: string, thisYear: number): { accounts: UserInput[]; errors: ParseError[] } {
  const accounts: UserInput[] = [];
  const errors: ParseError[] = [];
  const seen = new Set<string>();
  let role: Role | null = null;

  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    const n = i + 1;
    if (!line) return;
    const section = /^-+\s*(.+?)\s*-+$/.exec(line);
    if (section) {
      role = SECTIONS[section[1]] ?? null;
      if (!role) errors.push({ line: n, message: `알 수 없는 구분 "${section[1]}" (관리자·강사·수강생 중 하나)` });
      return;
    }
    const fields: Record<string, string> = {};
    for (const part of line.split('/')) {
      const at = part.indexOf(':');
      if (at < 0) continue;
      const key = KEYS[part.slice(0, at).trim().toLowerCase()];
      if (key) fields[key] = part.slice(at + 1).trim();
    }
    if (Object.keys(fields).length === 1 && fields.loginId === '') return; // empty template line "id :"
    if (!role) {
      errors.push({ line: n, message: '구분(-관리자- / -강사- / -수강생-) 아래에 적어 주세요.' });
      return;
    }
    if (fields.password === undefined) {
      errors.push({ line: n, message: 'pw 가 없습니다.' });
      return;
    }
    const v = validateUserInput({ ...fields, role }, thisYear);
    if (!v.ok) {
      errors.push({ line: n, message: v.error });
      return;
    }
    if (seen.has(v.value.loginId)) {
      errors.push({ line: n, message: `아이디 ${v.value.loginId} 가 메모에 두 번 있습니다.` });
      return;
    }
    seen.add(v.value.loginId);
    accounts.push(v.value);
  });
  return { accounts, errors };
}
