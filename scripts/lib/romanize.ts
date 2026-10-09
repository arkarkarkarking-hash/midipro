// Revised Romanization of Korean, syllable by syllable (no sound-change rules).
const INITIALS = ['g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h'];
const MEDIALS = ['a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i'];
const FINALS = ['', 'k', 'k', 'k', 'n', 'n', 'n', 't', 'l', 'k', 'm', 'l', 'l', 'l', 'p', 'l', 'm', 'p', 'p', 't', 't', 'ng', 't', 't', 'k', 't', 'p', 't'];

const SURNAMES: Record<string, string> = {
  김: 'kim', 이: 'lee', 박: 'park', 최: 'choi', 정: 'jung', 강: 'kang', 조: 'cho', 윤: 'yoon', 장: 'jang',
  임: 'lim', 한: 'han', 오: 'oh', 서: 'seo', 신: 'shin', 권: 'kwon', 황: 'hwang', 안: 'ahn', 송: 'song',
  류: 'ryu', 유: 'yoo', 전: 'jeon', 홍: 'hong', 고: 'ko', 문: 'moon', 양: 'yang', 손: 'son', 배: 'bae',
  백: 'baek', 허: 'heo', 남: 'nam', 심: 'shim', 노: 'noh', 하: 'ha', 곽: 'kwak', 성: 'sung', 차: 'cha',
  주: 'joo', 우: 'woo', 구: 'koo', 목: 'mok', 채: 'chae', 맹: 'maeng', 방: 'bang', 설: 'seol',
};

function romanizeSyllables(s: string): string {
  let out = '';
  for (const ch of s) {
    const code = ch.charCodeAt(0) - 0xac00;
    if (code < 0 || code > 11171) {
      out += ch;
      continue;
    }
    out += INITIALS[Math.floor(code / 588)] + MEDIALS[Math.floor((code % 588) / 28)] + FINALS[code % 28];
  }
  return out;
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function romanizeName(korean: string): string {
  const name = korean.trim();
  const [first, ...rest] = [...name];
  const surname = SURNAMES[first] ?? romanizeSyllables(first);
  return slugify(`${surname} ${romanizeSyllables(rest.join(''))}`);
}

export function romanizeText(s: string): string {
  return slugify(romanizeSyllables(s));
}
