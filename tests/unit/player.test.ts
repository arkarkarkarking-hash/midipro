import { beforeEach, expect, test } from 'vitest';
import { PlayerController, type QueueItem } from '../../src/lib/player/controller';

class FakeAudio {
  src = '';
  currentTime = 0;
  duration = 100;
  paused = true;
  plays = 0;
  listeners: Record<string, (() => void)[]> = {};
  addEventListener(type: string, fn: () => void) { (this.listeners[type] ??= []).push(fn); }
  dispatch(type: string) { for (const fn of this.listeners[type] ?? []) fn(); }
  async play() { this.plays++; this.paused = false; this.dispatch('playing'); }
  pause() { this.paused = true; this.dispatch('pause'); }
  load() {}
}

class FakeSession {
  metadata: { title: string; artist: string; album: string } | null = null;
  handlers: Record<string, unknown> = {};
  setActionHandler(a: string, h: unknown) { this.handlers[a] = h; }
}

const items: QueueItem[] = [0, 1, 2].map((i) => ({ slug: `s${i}`, title: `T${i}`, subtitle: `S${i}`, src: `u${i}.mp3`, duration: 100 }));
let audio: FakeAudio;
let session: FakeSession;
let p: PlayerController;

beforeEach(() => {
  audio = new FakeAudio();
  session = new FakeSession();
  p = new PlayerController(audio, session, (t) => new (globalThis as any).MediaMetadataStub(t));
  (globalThis as any).MediaMetadataStub = function (this: any, t: any) { Object.assign(this, t); };
});

test('ended advances to next, last ended pauses', async () => {
  await p.playList(items, 0);
  audio.dispatch('ended');
  await Promise.resolve();
  expect(p.state.index).toBe(1);
  expect(audio.src).toBe('u1.mp3');
  await p.playList(items, 2);
  audio.dispatch('ended');
  expect(p.state.status).toBe('paused');
  expect(p.state.index).toBe(2);
});

test('error sets error status and does not advance or retry', async () => {
  await p.playList(items, 0);
  const plays = audio.plays;
  audio.dispatch('error');
  expect(p.state.status).toBe('error');
  expect(p.state.index).toBe(0);
  expect(audio.plays).toBe(plays);
});

test('prev restarts when position > 3s, else goes back', async () => {
  await p.playList(items, 1);
  audio.currentTime = 10;
  p.prev();
  expect(audio.currentTime).toBe(0);
  expect(p.state.index).toBe(1);
  audio.currentTime = 1;
  p.prev();
  expect(p.state.index).toBe(0);
});

test('media session metadata reflects current track and handlers exist', async () => {
  await p.playList(items, 0);
  p.next();
  expect(session.metadata?.title).toBe('T1');
  expect(session.metadata?.album).toBe('MIDIPRO');
  for (const a of ['play', 'pause', 'previoustrack', 'nexttrack', 'seekto']) expect(session.handlers[a]).toBeTypeOf('function');
});

test('playList replaces queue and subscribers hear changes', async () => {
  const seen: string[] = [];
  p.subscribe((s) => seen.push(s.status));
  await p.playList(items, 0);
  await p.playList([items[2]], 0);
  expect(p.state.current?.slug).toBe('s2');
  expect(p.queue).toHaveLength(1);
  expect(seen).toContain('playing');
});

test('toggle pauses and resumes', async () => {
  await p.playList(items, 0);
  p.toggle();
  expect(audio.paused).toBe(true);
  p.toggle();
  expect(audio.paused).toBe(false);
});
