export type Category = 'admissions' | 'songcamp' | 'release';

export interface ParsedTrack {
  title: string;
  artists: string[];
  team?: string;
  category: Category;
  label: string;
  year: number;
  season?: string;
}

const ADMISSIONS = /^(\d{2})_(.+?)_(입시곡|수시|정시)\.mp3$/;
const SONGCAMP = /^\[(\d{2})년 (상반기|하반기|\d분기) (성인 송캠프|송캠프|싸이퍼)\]\s*(.+?)\s+-\s+(.+)\.mp3$/;

const splitNames = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);

export function parseFilename(category: 'admissions' | 'songcamp', fileName: string): ParsedTrack {
  const name = fileName.normalize('NFC');
  if (category === 'admissions') {
    const m = ADMISSIONS.exec(name);
    if (!m) throw new Error(`unrecognized admissions file: ${fileName}`);
    const [, yy, student, kind] = m;
    const suffix = kind === '입시곡' ? '' : ` (${kind})`;
    return { title: `${student} 입시곡${suffix}`, artists: [student], category, label: '입시곡', year: 2000 + Number(yy) };
  }
  const m = SONGCAMP.exec(name);
  if (!m) throw new Error(`unrecognized songcamp file: ${fileName}`);
  const [, yy, season, label, who, title] = m;
  const team = /^(.+?)\s*\(([^()]+)\)$/.exec(who.trim());
  const base = { title: title.trim(), category, label, year: 2000 + Number(yy), season };
  return team ? { ...base, team: team[1].trim(), artists: splitNames(team[2]) } : { ...base, artists: splitNames(who) };
}
