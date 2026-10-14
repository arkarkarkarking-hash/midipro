// Copy rules shared by check-build (built site) and check-blog (manuscripts).
export const BANNED = ['합격곡', '1등', '최고'];
export const NAVER_BANNED = [...BANNED, '추천'];
export const NUMERIC_SUMMARY = /\d+\s*(곳|건)/;
export const PRICE = /\d[\d,]*\s*원/;

export function copyProblems(text: string, banned: string[]): string[] {
  const out = banned.filter((w) => text.includes(w)).map((w) => `금지어 "${w}"`);
  if (NUMERIC_SUMMARY.test(text)) out.push('숫자 요약 (N곳/N건)');
  if (PRICE.test(text)) out.push('금액 표기 (N원)');
  return out;
}

// Images must be served by the site itself or our media bucket (no external images — copyright history).
export function imageSrcProblem(src: string): string | null {
  if (src.startsWith('/') && !src.startsWith('//')) return null;
  if (src.startsWith('https://media.midipro.kr/')) return null;
  return `external image ${src}`;
}
