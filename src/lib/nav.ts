import { getTeachers } from './content';

export interface NavItem { href: string; label: string; code: string; hidden?: boolean }

export const NAV: NavItem[] = [
  { href: '/', label: '홈', code: 'HOME' },
  { href: '/results', label: '입시 결과', code: 'RSLT' },
  { href: '/courses', label: '과정 소개', code: 'CRSE' },
  { href: '/music', label: '음원', code: 'MUSC' },
  { href: '/teachers', label: '강사진', code: 'TCHR', hidden: getTeachers().length === 0 },
  { href: '/location', label: '오시는 길', code: 'MAP' },
  { href: '/contact', label: '상담 안내', code: 'CALL' },
];

export const visibleNav = (): NavItem[] => NAV.filter((n) => !n.hidden);

export const isActive = (href: string, path: string): boolean =>
  href === '/' ? path === '/' : path === href || path.startsWith(`${href}/`);
