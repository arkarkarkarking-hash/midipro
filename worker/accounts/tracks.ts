import tracksJson from '../../src/data/tracks.json';
import type { Env } from '../core/env';
import { empty, fail, json, readJson } from '../core/http';
import type { SessionUser } from '../core/session';

type TrackInfo = { slug: string; title: string; label: string; category: string; year: number; team?: string; file: string; duration: number };

/** Every published track by slug, in tracks.json order. */
export const trackIndex = new Map<string, TrackInfo>((tracksJson as TrackInfo[]).map((t) => [t.slug, t]));
const order = new Map([...trackIndex.keys()].map((slug, i) => [slug, i]));

// Same wording as src/lib/player/queue-items.ts subtitleOf().
const subtitleOf = (t: TrackInfo) => `${t.year} · ${t.label}${t.team ? ` · ${t.team}` : ''}`;

async function linkedSlugs(env: Env, userId: number): Promise<string[]> {
  const { results } = await env.DB.prepare('SELECT track_slug FROM user_tracks WHERE user_id = ?1').bind(userId).all<{ track_slug: string }>();
  return results.map((r) => r.track_slug).sort((a, b) => (order.get(a) ?? Infinity) - (order.get(b) ?? Infinity) || a.localeCompare(b));
}

const userRole = (env: Env, id: number) => env.DB.prepare('SELECT role FROM users WHERE id = ?1').bind(id).first<{ role: string }>();

export async function getUserTracks(env: Env, userId: number): Promise<Response> {
  if (!(await userRole(env, userId))) return fail('계정을 찾을 수 없습니다.', 404);
  const tracks = (await linkedSlugs(env, userId)).map((slug) => {
    const t = trackIndex.get(slug);
    return t ? { slug, title: t.title, missing: false } : { slug, title: '삭제된 곡', missing: true };
  });
  return json({ tracks });
}

/** Replaces the user's links with exactly `slugs`. */
export async function setUserTracks(req: Request, env: Env, userId: number): Promise<Response> {
  const body = await readJson(req);
  const slugs = body?.slugs;
  if (!Array.isArray(slugs) || slugs.length > 500 || !slugs.every((s) => typeof s === 'string')) return fail('곡 목록이 올바르지 않습니다.', 400);
  const unique = [...new Set(slugs as string[])];
  const unknown = unique.filter((s) => !trackIndex.has(s));
  if (unknown.length) return fail(`없는 곡입니다: ${unknown.slice(0, 3).join(', ')}`, 400);
  const user = await userRole(env, userId);
  if (!user) return fail('계정을 찾을 수 없습니다.', 404);
  if (user.role !== 'student') return fail('곡은 수강생 계정에만 연결할 수 있습니다.', 400);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM user_tracks WHERE user_id = ?1').bind(userId),
    ...unique.map((slug) => env.DB.prepare('INSERT INTO user_tracks (user_id, track_slug) VALUES (?1, ?2)').bind(userId, slug)),
  ]);
  return empty();
}

/** The logged-in user's own tracks, ready for the player queue. Never takes a user id from the request. */
export async function getMyTracks(env: Env, user: SessionUser): Promise<Response> {
  const base = (env.MEDIA_BASE ?? '').replace(/\/+$/, '');
  const tracks = (await linkedSlugs(env, user.id))
    .map((slug) => trackIndex.get(slug))
    .filter((t): t is TrackInfo => !!t)
    .map((t) => ({ slug: t.slug, title: t.title, subtitle: subtitleOf(t), label: t.label, year: t.year, src: `${base}/${t.file}`, duration: t.duration }));
  return json({ name: user.name, tracks });
}
