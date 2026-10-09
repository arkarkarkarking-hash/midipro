export const naverMapUrl = (address: string): string => `https://map.naver.com/p/search/${encodeURIComponent(address)}`;
export const kakaoMapUrl = (address: string): string => `https://map.kakao.com/link/search/${encodeURIComponent(address)}`;
