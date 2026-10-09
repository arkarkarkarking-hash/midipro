import type { Track } from '../tracks';
import { mediaUrl } from '../media';
import type { QueueItem } from './controller';

export const subtitleOf = (t: Track): string => `${t.year} · ${t.label}${t.team ? ` · ${t.team}` : ''}`;

export const toQueueItem = (t: Track): QueueItem => ({
  slug: t.slug,
  title: t.title,
  subtitle: subtitleOf(t),
  src: mediaUrl(t.file),
  duration: t.duration,
});

export const formatTime = (sec: number): string => {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
