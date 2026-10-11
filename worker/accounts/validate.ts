import type { Role } from '../core/session';

export const ROLES: Role[] = ['admin', 'teacher', 'student'];
export const LOGIN_ID_RE = /^[a-z0-9_]{4,20}$/;

export type UserInput = { loginId: string; name: string; birthYear: number | null; role: Role; password: string };
type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export const seoulYear = (now: number): number =>
  Number(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric' }).format(new Date(now * 1000)));

export function validatePassword(v: unknown): Result<string> {
  if (typeof v !== 'string' || v.length < 4 || v.length > 64) return { ok: false, error: '비밀번호는 4~64자로 정해 주세요.' };
  return { ok: true, value: v };
}

export function validateUserInput(body: Record<string, unknown>, thisYear: number): Result<UserInput> {
  const loginId = typeof body.loginId === 'string' ? body.loginId.trim().toLowerCase() : '';
  if (!LOGIN_ID_RE.test(loginId)) return { ok: false, error: '아이디는 영문 소문자·숫자·밑줄(_) 4~20자로 정해 주세요.' };
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (name.length < 1 || name.length > 20) return { ok: false, error: '이름은 1~20자로 입력해 주세요.' };
  let birthYear: number | null = null;
  if (body.birthYear !== undefined && body.birthYear !== null && body.birthYear !== '') {
    const y = Number(body.birthYear);
    if (!Number.isInteger(y) || y < 1940 || y > thisYear) return { ok: false, error: `출생연도는 1940~${thisYear} 사이로 입력해 주세요.` };
    birthYear = y;
  }
  if (!ROLES.includes(body.role as Role)) return { ok: false, error: '역할을 선택해 주세요.' };
  const pw = validatePassword(body.password);
  if (!pw.ok) return pw;
  return { ok: true, value: { loginId, name, birthYear, role: body.role as Role, password: pw.value } };
}
