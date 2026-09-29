import {
  LayoutDashboard,
  Map,
  Mic,
  BarChart3,
  Building2,
  Users,
  FileUser,
  Trophy,
  Send,
  PenTool,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  icon: LucideIcon;
  label: string;
  href: string;
}

export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

/** Single source of truth for the sidebar, the mobile drawer and the bottom bar. */
export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'main',
    label: 'Studio',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
      { icon: Map, label: 'Roadmaps', href: '/roadmap' },
      { icon: Mic, label: 'AI Interview', href: '/interview' },
      { icon: BarChart3, label: 'Reports', href: '/reports' },
    ],
  },
  {
    id: 'practice',
    label: 'Community',
    items: [
      { icon: Building2, label: 'Mock Companies', href: '/mock-company' },
      { icon: Users, label: 'Groups', href: '/groups' },
    ],
  },
  {
    id: 'tools',
    label: 'Career tools',
    items: [
      { icon: FileUser, label: 'Resume Builder', href: '/resume' },
      { icon: PenTool, label: 'Workspace', href: '/workspace' },
      { icon: Send, label: 'Applications', href: '/applications' },
      { icon: Trophy, label: 'Leaderboard', href: '/leaderboard' },
    ],
  },
];

export const BOTTOM_TABS: NavItem[] = [
  { icon: LayoutDashboard, label: 'Home', href: '/dashboard' },
  { icon: Map, label: 'Roadmap', href: '/roadmap' },
  { icon: Mic, label: 'Interview', href: '/interview' },
  { icon: BarChart3, label: 'Reports', href: '/reports' },
  { icon: FileUser, label: 'Resume', href: '/resume' },
];

export function isNavActive(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname.startsWith(href);
}
