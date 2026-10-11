// Works out what must change on the site so it matches the account memo (the memo is the source of truth).
import type { Role } from '../../worker/core/session';
import type { UserInput } from '../../worker/accounts/validate';

export type DbUser = { loginId: string; name: string; birthYear: number | null; role: Role; status: 'active' | 'disabled'; passwordHash: string };
export type FieldUpdate = { loginId: string; name: string; birthYear: number | null; role: Role; changes: string[] };
export type SyncPlan = {
  create: UserInput[];
  update: FieldUpdate[];
  /** Accounts whose memo password differs from the stored hash. */
  password: UserInput[];
  reactivate: string[];
  disable: string[];
};

/** More disables than this in one automatic run needs a person to confirm. */
export const MAX_AUTO_DISABLE = 2;

export async function planSync(memo: UserInput[], site: DbUser[], verify: (plain: string, hash: string) => Promise<boolean>): Promise<SyncPlan> {
  const byId = new Map(site.map((u) => [u.loginId, u]));
  const plan: SyncPlan = { create: [], update: [], password: [], reactivate: [], disable: [] };
  for (const m of memo) {
    const u = byId.get(m.loginId);
    if (!u) {
      plan.create.push(m);
      continue;
    }
    const changes = [u.name !== m.name && '이름', u.birthYear !== m.birthYear && '출생연도', u.role !== m.role && '구분'].filter((c): c is string => !!c);
    if (changes.length) plan.update.push({ loginId: m.loginId, name: m.name, birthYear: m.birthYear, role: m.role, changes });
    if (!(await verify(m.password, u.passwordHash))) plan.password.push(m);
    if (u.status === 'disabled') plan.reactivate.push(m.loginId);
  }
  const inMemo = new Set(memo.map((m) => m.loginId));
  plan.disable = site.filter((u) => u.status === 'active' && !inMemo.has(u.loginId)).map((u) => u.loginId);
  return plan;
}

export const isEmpty = (p: SyncPlan) => !p.create.length && !p.update.length && !p.password.length && !p.reactivate.length && !p.disable.length;

/** Reason an automatic run must stop and ask a person, or null when it is safe to apply. */
export function checkGuards(memo: UserInput[], plan: SyncPlan, site: DbUser[]): string | null {
  if (!memo.some((m) => m.role === 'admin')) return '메모에 관리자 계정이 없습니다. 모두 잠길 수 있어 반영하지 않았습니다.';
  const active = site.filter((u) => u.status === 'active').length;
  const many = plan.disable.length > MAX_AUTO_DISABLE || (plan.disable.length >= 2 && plan.disable.length * 2 >= active);
  if (many) {
    return `한 번에 ${plan.disable.length}개 계정을 비활성화하게 됩니다(활성 계정 ${active}개 중). 메모가 실수로 지워졌을 수 있어 자동 반영을 멈췄습니다.`;
  }
  return null;
}

export function describe(plan: SyncPlan): string[] {
  return [
    ...plan.create.map((a) => `새로 만들기   ${a.loginId}  ${a.name}`),
    ...plan.password.map((a) => `비밀번호 변경 ${a.loginId}`),
    ...plan.update.map((u) => `${u.changes.join('·')} 수정  ${u.loginId}`),
    ...plan.reactivate.map((id) => `다시 활성화   ${id}`),
    ...plan.disable.map((id) => `비활성화     ${id}`),
  ];
}
