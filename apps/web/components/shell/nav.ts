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
  BrainCircuit,
  MessageSquareCode,
  DollarSign,
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
    label: 'Practice',
    items: [
      { icon: PenTool, label: 'Workspace', href: '/workspace' },
      { icon: BrainCircuit, label: 'Flashcards', href: '/flashcards' },
      { icon: MessageSquareCode, label: 'STAR stories', href: '/behavioral' },
      { icon: Building2, label: 'Mock companies', href: '/mock-company' },
    ],
  },
  {
    id: 'tools',
    label: 'Career',
    items: [
      { icon: FileUser, label: 'Resume builder', href: '/resume' },
      { icon: Send, label: 'Applications', href: '/applications' },
      { icon: DollarSign, label: 'Offer coach', href: '/negotiation' },
    ],
  },
  {
    id: 'community',
    label: 'Community',
    items: [
      { icon: Users, label: 'Groups', href: '/groups' },
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
