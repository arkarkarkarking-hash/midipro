import { navigate } from 'astro:transitions/client';

export type Role = 'admin' | 'teacher' | 'student';
export type Me = { id: number; loginId: string; name: string; role: Role };

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/**
 * Calls /api/accounts/<path>. POST when `json` is given.
 * With `guard` (default), 401 sends the visitor to /login and 403 to /my.
 */
export async function api<T = unknown>(path: string, { json, guard = true }: { json?: unknown; guard?: boolean } = {}): Promise<T> {
  const res = await fetch(`/api/accounts/${path}`, {
    method: json === undefined ? 'GET' : 'POST',
    headers: json === undefined ? {} : { 'content-type': 'application/json' },
    body: json === undefined ? undefined : JSON.stringify(json),
    credentials: 'same-origin',
  });
  if (res.ok) return (res.headers.get('content-type')?.includes('json') && res.status !== 204 ? await res.json() : undefined) as T;
  let message = '잠시 후 다시 시도해 주세요.';
  try {
    message = ((await res.json()) as { error?: string }).error ?? message;
  } catch {
    // keep default
  }
  if (guard && res.status === 401) void navigate('/login');
  if (guard && res.status === 403) void navigate('/my');
  throw new ApiError(res.status, message);
}

export const homeFor = (role: Role) => (role === 'admin' ? '/admin' : '/my');

export async function logout() {
  try {
    await api('logout', { json: {}, guard: false });
  } finally {
    void navigate('/');
  }
}

/** Runs `init(root)` on every page view where `selector` exists (works with the client router). */
export function onPage(selector: string, init: (root: HTMLElement) => void) {
  document.addEventListener('astro:page-load', () => {
    const root = document.querySelector<HTMLElement>(selector);
    if (root && !root.dataset.ready) {
      root.dataset.ready = '1';
      init(root);
    }
  });
}

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string> = {}, ...children: (Node | string)[]) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else node.setAttribute(k, v);
  }
  node.append(...children);
  return node;
}
