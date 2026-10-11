import { api, el, logout, onPage, type Role } from './api';

type User = { id: number; loginId: string; name: string; birthYear: number | null; age: number | null; role: Role; status: 'active' | 'disabled'; lastLoginAt: number | null };
type CatalogTrack = { slug: string; title: string; group: string };
type Calls = { from: string; to: string; total: number; byDay: { day: string; count: number }[]; byPath: { path: string; count: number }[]; byRef: { refHost: string; count: number }[] };

const ROLE_LABEL: Record<Role, string> = { admin: '관리자', teacher: '강사', student: '수강생' };
const seoulDate = (sec: number) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date(sec * 1000));
const key = (label: string, attrs: Record<string, string> = {}) => el('button', { type: 'button', class: 'key', ...attrs }, label);

onPage('[data-admin]', (root) => {
  const catalog: CatalogTrack[] = JSON.parse(root.querySelector('#acc-catalog')!.textContent!);
  const listEl = root.querySelector<HTMLElement>('[data-users]')!;
  const createForm = root.querySelector<HTMLFormElement>('[data-create-form]')!;
  const createMsg = createForm.querySelector<HTMLElement>('[data-error]')!;
  const pwDialog = root.querySelector<HTMLDialogElement>('[data-pw-dialog]')!;
  const panel = root.querySelector<HTMLElement>('[data-link-panel]')!;
  let users: User[] = [];

  root.querySelector('[data-logout]')!.addEventListener('click', logout);

  // ---- accounts ----
  async function loadUsers() {
    users = (await api<{ users: User[] }>('admin/users')).users;
    listEl.replaceChildren(...users.map(renderUser));
    root.hidden = false;
  }

  function renderUser(u: User) {
    const meta = [ROLE_LABEL[u.role], u.age !== null ? `${u.age}세 (${u.birthYear})` : '', u.status === 'disabled' ? '비활성' : '', u.lastLoginAt ? `최근 로그인 ${seoulDate(u.lastLoginAt)}` : '로그인 기록 없음'].filter(Boolean).join(' · ');
    const actions = el('div', { class: 'acc-actions' });
    const pw = key('비밀번호 재지정');
    pw.addEventListener('click', () => openPassword(u));
    const toggle = key(u.status === 'active' ? '비활성화' : '활성화');
    toggle.addEventListener('click', () => setStatus(u));
    actions.append(pw, toggle);
    if (u.role === 'student') {
      const link = key('곡 연결');
      link.addEventListener('click', () => openLinks(u));
      actions.append(link);
    }
    return el('li', { class: 'acc-row', 'data-user-row': u.loginId, 'data-status': u.status },
      el('div', { class: 'acc-row__main' }, el('span', { class: 'acc-row__name', text: u.name }), el('span', { class: 'acc-tag mono', text: u.loginId }), el('span', { class: 'acc-row__meta', text: meta })),
      actions,
    );
  }

  root.querySelector('[data-create-toggle]')!.addEventListener('click', () => {
    createForm.hidden = !createForm.hidden;
    if (!createForm.hidden) createForm.querySelector<HTMLInputElement>('input')!.focus();
  });

  createForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    createMsg.textContent = '';
    const d = new FormData(createForm);
    try {
      await api('admin/users', { json: { loginId: d.get('loginId'), name: d.get('name'), birthYear: d.get('birthYear') || null, role: d.get('role'), password: d.get('password') } });
      createForm.reset();
      createForm.hidden = true;
      await loadUsers();
    } catch (err) {
      createMsg.textContent = (err as Error).message;
    }
  });

  let pwTarget: User | null = null;
  const pwForm = pwDialog.querySelector('form')!;
  const pwError = pwDialog.querySelector<HTMLElement>('[data-error]')!;
  function openPassword(u: User) {
    pwTarget = u;
    pwForm.reset();
    pwError.textContent = '';
    pwDialog.querySelector('[data-pw-who]')!.textContent = `${u.name} (${u.loginId})`;
    pwDialog.showModal();
  }
  pwDialog.querySelector('[data-cancel]')!.addEventListener('click', () => pwDialog.close());
  pwForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!pwTarget) return;
    try {
      await api(`admin/users/${pwTarget.id}/password`, { json: { password: new FormData(pwForm).get('password') } });
      pwDialog.close();
    } catch (err) {
      pwError.textContent = (err as Error).message;
    }
  });

  async function setStatus(u: User) {
    const next = u.status === 'active' ? 'disabled' : 'active';
    if (next === 'disabled' && !confirm(`${u.name}(${u.loginId}) 계정을 비활성화할까요? 바로 로그아웃됩니다.`)) return;
    try {
      await api(`admin/users/${u.id}/status`, { json: { status: next } });
      await loadUsers();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  // ---- track links ----
  const checklist = panel.querySelector<HTMLElement>('[data-checklist]')!;
  const search = panel.querySelector<HTMLInputElement>('[data-search]')!;
  const status = panel.querySelector<HTMLElement>('[data-status]')!;
  let linkTarget: User | null = null;

  const groups = new Map<string, CatalogTrack[]>();
  for (const t of catalog) groups.set(t.group, [...(groups.get(t.group) ?? []), t]);

  async function openLinks(u: User) {
    linkTarget = u;
    status.textContent = '';
    search.value = '';
    panel.querySelector('[data-link-who]')!.textContent = `${u.name} (${u.loginId})`;
    const { tracks } = await api<{ tracks: { slug: string; title: string; missing: boolean }[] }>(`admin/users/${u.id}/tracks`);
    const linked = new Set(tracks.filter((t) => !t.missing).map((t) => t.slug));
    const missing = tracks.filter((t) => t.missing);
    const check = (t: CatalogTrack) => {
      const input = el('input', { type: 'checkbox', value: t.slug });
      input.checked = linked.has(t.slug);
      return el('label', { class: 'acc-check', 'data-title': t.title }, input, t.title);
    };
    checklist.replaceChildren(
      ...(missing.length ? [el('p', { class: 'acc-error', text: `삭제된 곡 ${missing.length}개가 연결되어 있습니다. 저장하면 연결이 지워집니다.` })] : []),
      ...[...groups].map(([name, list]) => el('div', { class: 'acc-group' }, el('p', { class: 'acc-group__title', text: name }), ...list.map(check))),
    );
    panel.hidden = false;
    panel.scrollIntoView({ block: 'start' });
  }

  search.addEventListener('input', () => {
    const q = search.value.trim();
    checklist.querySelectorAll<HTMLElement>('.acc-group').forEach((g) => {
      let any = false;
      g.querySelectorAll<HTMLElement>('.acc-check').forEach((c) => {
        const show = !q || c.dataset.title!.includes(q);
        c.hidden = !show;
        any ||= show;
      });
      g.hidden = !any;
    });
  });

  panel.querySelector('[data-save]')!.addEventListener('click', async () => {
    if (!linkTarget) return;
    const slugs = [...checklist.querySelectorAll<HTMLInputElement>('input:checked')].map((i) => i.value);
    status.textContent = '저장 중…';
    try {
      await api(`admin/users/${linkTarget.id}/tracks`, { json: { slugs } });
      status.textContent = '저장했습니다.';
    } catch (err) {
      status.textContent = (err as Error).message;
    }
  });
  panel.querySelector('[data-close]')!.addEventListener('click', () => { panel.hidden = true; linkTarget = null; });

  // ---- phone clicks ----
  async function loadCalls() {
    const c = await api<Calls>('admin/calls');
    const box = root.querySelector<HTMLElement>('[data-calls]')!;
    const rows = (items: [string, number][]) => (items.length ? items.map(([k, n]) => el('p', { class: 'acc-stat' }, el('span', { text: k }), el('span', { class: 'mono', text: String(n) }))) : [el('p', { class: 'muted', text: '기록 없음' })]);
    box.replaceChildren(
      el('p', { class: 'muted', text: `${c.from} ~ ${c.to}` }),
      el('p', { class: 'acc-total mono', text: String(c.total) }),
      el('div', { class: 'acc-stats' },
        el('div', {}, el('p', { class: 'acc-group__title', text: '유입 경로' }), ...rows(c.byRef.map((r) => [r.refHost === 'direct' ? '직접 방문' : r.refHost, r.count]))),
        el('div', {}, el('p', { class: 'acc-group__title', text: '페이지' }), ...rows(c.byPath.map((r) => [r.path, r.count]))),
        el('div', {}, el('p', { class: 'acc-group__title', text: '날짜' }), ...rows(c.byDay.map((r) => [r.day, r.count]))),
      ),
    );
  }

  void loadUsers().then(loadCalls).catch(() => {});
});
