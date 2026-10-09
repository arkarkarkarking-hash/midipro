export interface QueueItem { slug: string; title: string; subtitle: string; src: string; duration: number }
export type PlayerStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error';
export interface PlayerState { current?: QueueItem; index: number; status: PlayerStatus; position: number; duration: number }

export interface AudioLike {
  src: string;
  currentTime: number;
  duration: number;
  paused: boolean;
  play(): Promise<void>;
  pause(): void;
  load(): void;
  addEventListener(type: string, fn: () => void): void;
}

export interface SessionLike {
  metadata: unknown;
  setActionHandler(action: string, handler: ((details?: { seekTime?: number }) => void) | null): void;
}

type MetadataFactory = (init: { title: string; artist: string; album: string }) => unknown;

const RESTART_THRESHOLD = 3;

export class PlayerController {
  queue: QueueItem[] = [];
  private s: PlayerState = { index: 0, status: 'idle', position: 0, duration: 0 };
  private listeners = new Set<(s: PlayerState) => void>();

  constructor(private audio: AudioLike, private session?: SessionLike, private makeMetadata?: MetadataFactory) {
    audio.addEventListener('playing', () => this.set({ status: 'playing' }));
    audio.addEventListener('pause', () => this.s.status !== 'error' && this.set({ status: 'paused' }));
    audio.addEventListener('waiting', () => this.set({ status: 'loading' }));
    audio.addEventListener('timeupdate', () => this.set({ position: audio.currentTime }));
    audio.addEventListener('loadedmetadata', () => this.set({ duration: audio.duration }));
    audio.addEventListener('error', () => this.set({ status: 'error' }));
    audio.addEventListener('ended', () => {
      if (this.s.index < this.queue.length - 1) void this.load(this.s.index + 1);
      else this.set({ status: 'paused' });
    });
    if (session) {
      session.setActionHandler('play', () => void this.audio.play());
      session.setActionHandler('pause', () => this.audio.pause());
      session.setActionHandler('previoustrack', () => this.prev());
      session.setActionHandler('nexttrack', () => this.next());
      session.setActionHandler('seekto', (d) => d?.seekTime !== undefined && this.seek(d.seekTime));
    }
  }

  get state(): PlayerState { return { ...this.s, current: this.queue[this.s.index] }; }

  subscribe(fn: (s: PlayerState) => void): () => void {
    this.listeners.add(fn);
    fn(this.state);
    return () => this.listeners.delete(fn);
  }

  async playList(items: QueueItem[], startIndex: number): Promise<void> {
    this.queue = items;
    await this.load(startIndex);
  }

  toggle(): void {
    if (!this.queue.length) return;
    if (this.audio.paused) void this.audio.play().catch(() => this.set({ status: 'error' }));
    else this.audio.pause();
  }

  next(): void {
    if (this.s.index < this.queue.length - 1) void this.load(this.s.index + 1);
  }

  prev(): void {
    if (this.audio.currentTime > RESTART_THRESHOLD || this.s.index === 0) this.seek(0);
    else void this.load(this.s.index - 1);
  }

  seek(seconds: number): void {
    this.audio.currentTime = seconds;
    this.set({ position: seconds });
  }

  private async load(index: number): Promise<void> {
    const item = this.queue[index];
    if (!item) return;
    this.set({ index, status: 'loading', position: 0, duration: item.duration });
    this.audio.src = item.src;
    this.audio.load();
    if (this.session && this.makeMetadata) this.session.metadata = this.makeMetadata({ title: item.title, artist: item.subtitle, album: 'MIDIPRO' });
    try {
      await this.audio.play();
    } catch {
      this.set({ status: 'error' });
    }
  }

  private set(patch: Partial<PlayerState>): void {
    this.s = { ...this.s, ...patch };
    const snapshot = this.state;
    for (const fn of this.listeners) fn(snapshot);
  }
}
