import { expect, test, type Page, type Route } from '@playwright/test';

// The e2e server is `astro preview` (no Worker), so /api/accounts/* is faked here.
// Server behaviour is covered by tests/worker/accounts.
type User = { id: number; loginId: string; name: string; role: 'admin' | 'teacher' | 'student' };
const MEDIA = 'http://localhost:4322/admissions/2025-kim-seungyeon.mp3';
const myTracks = [
  { slug: '2025-kim-seungyeon', title: '김승연 입시곡', subtitle: '2025 · 입시곡', label: '입시곡', year: 2025, src: MEDIA, duration: 103 },
  { slug: '2025-kim-jihyeon', title: '김지현 입시곡', subtitle: '2025 · 입시곡', label: '입시곡', year: 2025, src: MEDIA, duration: 90 },
];

async function fakeApi(page: Page, opts: { user?: User | null; loginAs?: User } = {}) {
  let user = opts.user ?? null;
  const users: any[] = [{ id: 1, loginId: 'admin_test', name: '원장', birthYear: null, age: null, role: 'admin', status: 'active', lastLoginAt: null }];
  const links = new Map<number, string[]>();
  const posts: { path: string; body: any }[] = [];
  await page.route('https://challenges.cloudflare.com/**', (r) =>
    r.fulfill({ contentType: 'text/javascript', body: 'window.turnstile={render:(el,o)=>{setTimeout(()=>o.callback("ok"));return "w"},reset(){},remove(){}};' }),
  );
  await page.route('**/api/accounts/**', async (route: Route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname.replace('/api/accounts/', '');
    const body = req.postData() ? JSON.parse(req.postData()!) : null;
    const reply = (status: number, json?: unknown) => route.fulfill({ status, contentType: 'application/json', body: json === undefined ? '' : JSON.stringify(json) });
    if (req.method() === 'POST') posts.push({ path, body });
    if (path === 'login') {
      if (body.password !== 'pass1234' || !opts.loginAs) return reply(401, { error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
      user = opts.loginAs;
      return reply(200, { role: user.role, name: user.name });
    }
    if (path === 'logout') { user = null; return reply(204); }
    if (!user) return reply(401, { error: '로그인이 필요합니다.' });
    if (path === 'me') return reply(200, user);
    if (path === 'my/tracks') return user.role === 'teacher' ? reply(403, { error: '권한이 없습니다.' }) : reply(200, { name: user.name, tracks: user.role === 'student' ? myTracks : [] });
    if (user.role !== 'admin') return reply(403, { error: '권한이 없습니다.' });
    if (path === 'admin/users' && req.method() === 'GET') return reply(200, { users });
    if (path === 'admin/users') {
      const id = users.length + 1;
      users.push({ id, loginId: body.loginId.trim().toLowerCase(), name: body.name, birthYear: Number(body.birthYear) || null, age: body.birthYear ? 2026 - Number(body.birthYear) : null, role: body.role, status: 'active', lastLoginAt: null });
      return reply(201, { id });
    }
    const m = /^admin\/users\/(\d+)\/tracks$/.exec(path);
    if (m && req.method() === 'GET') return reply(200, { tracks: (links.get(+m[1]) ?? []).map((slug) => ({ slug, title: slug, missing: false })) });
    if (m) { links.set(+m[1], body.slugs); return reply(204); }
    if (path.startsWith('admin/calls')) return reply(200, { from: '2026-09-12', to: '2026-10-11', total: 3, byDay: [{ day: '2026-10-11', count: 3 }], byPath: [{ path: '/courses', count: 3 }], byRef: [{ refHost: 'search.naver.com', count: 3 }] });
    return reply(204);
  });
  return { posts };
}

const STUDENT: User = { id: 2, loginId: 'stu_test', name: '김학생', role: 'student' };
const ADMIN: User = { id: 1, loginId: 'admin_test', name: '원장', role: 'admin' };
const TEACHER: User = { id: 3, loginId: 'tea_test', name: '박강사', role: 'teacher' };

async function loginWith(page: Page, id: string, pw = 'pass1234') {
  await page.goto('/login');
  await page.getByLabel('아이디').fill(id);
  await page.getByLabel('비밀번호').fill(pw);
  await page.getByRole('button', { name: '로그인', exact: true }).click();
}

test('student logs in and plays own track', async ({ page }) => {
  const { posts } = await fakeApi(page, { loginAs: STUDENT });
  await loginWith(page, 'stu_test');
  await expect(page).toHaveURL(/\/my$/);
  await expect(page.getByText('김학생님')).toBeVisible();
  await expect(page.locator('[data-my-tracks] [data-track-row]')).toHaveCount(2);
  // The widget only renders when the build has PUBLIC_TURNSTILE_SITEKEY; the faked widget then hands back 'ok'.
  const hasKey = (await (await page.request.get('/login')).text()).match(/data-sitekey="[^"]+"/);
  expect(posts[0]).toEqual({ path: 'login', body: { loginId: 'stu_test', password: 'pass1234', turnstileToken: hasKey ? 'ok' : '' } });
  await page.locator('[data-my-tracks] [data-play-list]').first().click();
  await expect(page.getByTestId('mini-player')).toContainText('김승연 입시곡');
});

test('wrong password shows the generic message and stays on /login', async ({ page }) => {
  await fakeApi(page, { loginAs: STUDENT });
  await loginWith(page, 'stu_test', 'nope');
  await expect(page.getByRole('alert')).toHaveText('아이디 또는 비밀번호가 올바르지 않습니다.');
  await expect(page).toHaveURL(/\/login$/);
});

test('logged-in user opening /login goes straight to their page', async ({ page }) => {
  await fakeApi(page, { user: ADMIN });
  await page.goto('/login');
  await expect(page).toHaveURL(/\/admin$/);
});

test('student cannot open admin; anonymous /my goes to login', async ({ page }) => {
  await fakeApi(page, { user: STUDENT });
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/my$/);
  await page.unrouteAll({ behavior: 'ignoreErrors' });
  await fakeApi(page);
  await page.goto('/my');
  await expect(page).toHaveURL(/\/login$/);
});

test('student with no tracks sees one line', async ({ page }) => {
  await fakeApi(page, { user: { ...STUDENT } });
  await page.route('**/api/accounts/my/tracks', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ name: '김학생', tracks: [] }) }));
  await page.goto('/my');
  await expect(page.getByText('아직 연결된 곡이 없습니다.')).toBeVisible();
});

test('teacher sees the coming-soon notice and can log out', async ({ page }) => {
  await fakeApi(page, { user: TEACHER });
  await page.goto('/my');
  await expect(page.getByText('강사 기능은 준비 중입니다.')).toBeVisible();
  await expect(page.locator('[data-my-tracks]')).toBeHidden();
  await page.getByRole('button', { name: '로그아웃' }).click();
  await expect(page).toHaveURL(/\/$/);
});

test('admin creates a student and links a track', async ({ page }) => {
  const { posts } = await fakeApi(page, { user: ADMIN });
  await page.goto('/admin');
  await expect(page.getByText('search.naver.com')).toBeVisible();
  await page.getByRole('button', { name: '계정 만들기' }).click();
  const form = page.locator('[data-create-form]');
  await form.getByLabel('아이디').fill('Kim_01');
  await form.getByLabel('이름').fill('김신입');
  await form.getByLabel('출생연도').fill('2010');
  await form.getByLabel('역할').selectOption('student');
  await form.getByLabel('비밀번호').fill('pass1234');
  await form.getByRole('button', { name: '만들기' }).click();
  const row = page.locator('[data-user-row="kim_01"]');
  await expect(row).toContainText('김신입');
  await expect(row).toContainText('16세');
  await row.getByRole('button', { name: '곡 연결' }).click();
  const panel = page.locator('[data-link-panel]');
  await expect(panel).toContainText('김신입');
  await panel.getByPlaceholder('곡 검색').fill('김승연');
  await panel.getByLabel('김승연 입시곡').check();
  await panel.getByRole('button', { name: '저장' }).click();
  await expect(panel.getByRole('status')).toHaveText('저장했습니다.');
  expect(posts.at(-1)).toEqual({ path: 'admin/users/2/tracks', body: { slugs: ['2025-kim-seungyeon'] } });
  await row.getByRole('button', { name: '곡 연결' }).click();
  await expect(panel.getByLabel('김승연 입시곡')).toBeChecked();
});

test('account pages are noindex', async ({ request }) => {
  for (const p of ['/login', '/my', '/admin']) expect(await (await request.get(p)).text()).toContain('<meta name="robots" content="noindex">');
});
