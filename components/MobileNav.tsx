'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from './ui';
import { 
  LayoutDashboard, 
  Calendar, 
  Star, 
  Settings,
  Users,
  Scissors,
  Plus
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { getTheme } from '@/lib/theme';

const links = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/dashboard?new=true', label: 'Novo', icon: Plus, role: 'admin' },
  { href: '/dashboard/appointments', label: 'Agenda', icon: Calendar },
  { href: '/dashboard/loyalty', label: 'Pontos', icon: Star },
  { href: '/dashboard/clients', label: 'Clientes', icon: Users, role: 'professional' },
  { href: '/dashboard/services', label: 'Serviços', icon: Scissors, role: 'professional' },
  { href: '/dashboard/settings', label: 'Perfil', icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();
  const { profile, isAdmin } = useAuth();
  const theme = getTheme(profile?.businessType, isAdmin ? 'admin' : profile?.role);
  const isClient = profile?.role === 'client';

  const filteredLinks = links.filter(link => {
    if (isAdmin) {
      if (link.role === 'professional') return false;
      return true;
    }
    if (isClient) {
      if (link.role === 'professional' || link.role === 'admin') return false;
      return true;
    }
    if (link.role === 'admin') return false;
    return true;
  }).slice(0, 5); // Keep max 5 for the bottom bar

  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 z-40 md:hidden border-t px-6 py-2 pb-8 flex items-center justify-between transition-colors duration-500",
      theme.navbarBg,
      "backdrop-blur-xl"
    )}>
      {filteredLinks.map((link) => {
        const Icon = link.icon;
        const isActive = pathname === link.href;

        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex flex-col items-center gap-1 min-w-[64px] transition-all",
              isActive ? theme.accent : "text-zinc-500"
            )}
          >
            <div className={cn(
                "p-2 rounded-xl transition-all",
                isActive && (theme.isBeauty ? "bg-pink-100/50" : "bg-amber-500/10")
            )}>
                <Icon size={22} className={cn(isActive ? "animate-pulse" : "")} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">{link.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
