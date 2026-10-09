import tracksJson from '../data/tracks.json';

export type TrackCategory = 'admissions' | 'songcamp' | 'release';

export interface Track {
  slug: string;
  title: string;
  artists: string[];
  team?: string;
  category: TrackCategory;
  label: string;
  year: number;
  season?: string;
  file: string;
  duration: number;
  featured: boolean;
  links: Record<string, string>;
  sourceFile: string;
}

export const CATEGORY_LABEL: Record<TrackCategory, string> = { admissions: '입시곡', songcamp: '송캠프', release: '발매곡' };

const tracks = tracksJson as Track[];
const peaks = import.meta.glob<number[]>('../data/peaks/*.json', { eager: true, import: 'default' });

export const getTracks = (): Track[] => tracks;
export const getTrack = (slug: string): Track | undefined => tracks.find((t) => t.slug === slug);
export const getPeaks = (slug: string): number[] => peaks[`../data/peaks/${slug}.json`] ?? [];
