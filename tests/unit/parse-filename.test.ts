import { expect, test } from 'vitest';
import { parseFilename } from '../../scripts/lib/parse-filename';

test('admissions files', () => {
  expect(parseFilename('admissions', '24_김선우_정시.mp3')).toMatchObject({
    title: '김선우 입시곡 (정시)', artists: ['김선우'], year: 2024, label: '입시곡', category: 'admissions',
  });
  expect(parseFilename('admissions', '25_황시윤_입시곡.mp3')).toMatchObject({ title: '황시윤 입시곡', year: 2025 });
});

test('songcamp with team name', () => {
  expect(parseFilename('songcamp', '[24년 하반기 송캠프] 18.5(김민규,안세린,권주연,장효정) - burn up! (feat.신하영).mp3')).toMatchObject({
    title: 'burn up! (feat.신하영)', team: '18.5', artists: ['김민규', '안세린', '권주연', '장효정'], year: 2024, season: '하반기', label: '송캠프',
  });
});

test('songcamp without team, double spaces', () => {
  expect(parseFilename('songcamp', '[21년 2분기 송캠프] 이윤아,강온유,윤하영  -  Fly Away.mp3')).toMatchObject({
    title: 'Fly Away', artists: ['이윤아', '강온유', '윤하영'], year: 2021, season: '2분기',
  });
});

test('cypher and adult labels', () => {
  expect(parseFilename('songcamp', '[22년 하반기 싸이퍼] 김서진,김민혁,김종후 - High!.mp3')).toMatchObject({ label: '싸이퍼', title: 'High!' });
  expect(parseFilename('songcamp', '[22년 상반기 성인 송캠프] 최연주,정결,조성수 - Personal Color.mp3')).toMatchObject({ label: '성인 송캠프' });
});

test('team with leader-only parenthesis', () => {
  expect(parseFilename('songcamp', '[23년 상반기 송캠프] PH(박시은팀) - Headache.mp3')).toMatchObject({
    team: 'PH', artists: ['박시은팀'], title: 'Headache',
  });
});

test('team name with spaces before parenthesis', () => {
  expect(parseFilename('songcamp', '[22년 상반기 송캠프] 탬버린을 딩동딩동 (정우영,이훈,김이건) - BOY.mp3')).toMatchObject({
    team: '탬버린을 딩동딩동', artists: ['정우영', '이훈', '김이건'], title: 'BOY',
  });
});
