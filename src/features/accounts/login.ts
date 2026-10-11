import { navigate } from 'astro:transitions/client';
import { api, homeFor, onPage, type Me } from './api';

type Turnstile = { render(el: HTMLElement, opts: Record<string, unknown>): string; reset(id?: string): void };
declare global {
  interface Window { turnstile?: Turnstile }
}

const TURNSTILE_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

function loadTurnstile(): Promise<Turnstile> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = TURNSTILE_SRC;
    s.async = true;
    s.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('turnstile')));
    s.onerror = reject;
    document.head.append(s);
  });
}

onPage('[data-login]', async (root) => {
  // Already logged in: go straight to the right page.
  try {
    const me = await api<Me>('me', { guard: false });
    void navigate(homeFor(me.role));
    return;
  } catch {
    // not logged in
  }

  const form = root.querySelector<HTMLFormElement>('form')!;
  const error = root.querySelector<HTMLElement>('[data-error]')!;
  const submit = form.querySelector<HTMLButtonElement>('button[type=submit]')!;
  const box = root.querySelector<HTMLElement>('[data-turnstile]')!;
  let token = '';
  let widget: string | undefined;
  let ts: Turnstile | undefined;

  const sitekey = root.dataset.sitekey;
  if (sitekey) {
    try {
      ts = await loadTurnstile();
      widget = ts.render(box, {
        sitekey,
        language: 'ko',
        theme: 'dark',
        callback: (t: string) => { token = t; },
        'expired-callback': () => { token = ''; },
      });
    } catch {
      error.textContent = '자동 입력 방지 확인을 불러오지 못했습니다. 새로고침해 주세요.';
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    error.textContent = '';
    const data = new FormData(form);
    submit.disabled = true;
    try {
      const res = await api<{ role: Me['role'] }>('login', {
        guard: false,
        json: { loginId: String(data.get('loginId') ?? ''), password: String(data.get('password') ?? ''), turnstileToken: token },
      });
      void navigate(homeFor(res.role));
    } catch (err) {
      error.textContent = (err as Error).message;
      token = '';
      ts?.reset(widget);
    } finally {
      submit.disabled = false;
    }
  });
});
