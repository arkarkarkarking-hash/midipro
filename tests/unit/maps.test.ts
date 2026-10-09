import { expect, test } from 'vitest';
import { kakaoMapUrl, naverMapUrl } from '../../src/lib/maps';

test('map links encode the address', () => {
  expect(naverMapUrl('천안시 서북구 불당21로 65')).toBe(`https://map.naver.com/p/search/${encodeURIComponent('천안시 서북구 불당21로 65')}`);
  expect(kakaoMapUrl('천안시 서북구 불당21로 65')).toBe(`https://map.kakao.com/link/search/${encodeURIComponent('천안시 서북구 불당21로 65')}`);
});
