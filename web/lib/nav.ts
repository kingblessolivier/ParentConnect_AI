import { LayoutDashboard, PieChart, LifeBuoy, ClipboardCheck, Star, Users, ScrollText, Phone, type LucideIcon } from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV: NavItem[] = [
  { href: '/', label: 'M&E dashboard', icon: LayoutDashboard },
  { href: '/indicators', label: 'Indicators', icon: PieChart },
  { href: '/referrals', label: 'Referral triage', icon: LifeBuoy },
  { href: '/content-review', label: 'Content review', icon: ClipboardCheck },
  { href: '/content-feedback', label: 'Content feedback', icon: Star },
  { href: '/users', label: 'Users & roles', icon: Users },
  { href: '/referral-directory', label: 'Referral directory', icon: Phone },
  { href: '/audit', label: 'Audit log', icon: ScrollText },
];

export function navLabelFor(pathname: string): string {
  const match = NAV.find((item) => (item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)));
  return match?.label ?? 'Sign in';
}
