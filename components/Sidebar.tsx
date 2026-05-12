'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn, Button } from './ui';
import { 
  LayoutDashboard, 
  Users, 
  Scissors, 
  Calendar, 
  Clock,
  Star,
  Settings,
  Plus,
  ShieldCheck,
  Building2
} from 'lucide-react';
import { motion } from 'motion/react';
import { getTheme } from '@/lib/theme';
import { useAuth } from '@/context/auth-context';

const links = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/appointments', label: 'Agenda', icon: Calendar },
  { href: '/dashboard/availability', label: 'Disponibilidade', icon: Clock },
  { href: '/dashboard/loyalty', label: 'Fidelidade', icon: Star },
  { href: '/dashboard/clients', label: 'Clientes', icon: Users },
  { href: '/dashboard/staff', label: 'Profissionais', icon: Users },
  { href: '/dashboard/services', label: 'Serviços', icon: Scissors },
  { href: '/dashboard/settings', label: 'Configurações', icon: Settings },
  { href: '/dashboard/admin', label: 'Admin', icon: ShieldCheck },
];

import { useRouter } from 'next/navigation';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, isAdmin } = useAuth();
  const theme = getTheme(profile?.businessType, isAdmin ? 'admin' : profile?.role);
  const isClient = profile?.role === 'cliente' || profile?.role === 'client';
  const isOwner = profile?.isOwner;

  const filteredLinks = links.map(link => {
    if (isClient) {
      if (link.label === 'Agenda') return { ...link, label: 'Minha Agenda' };
      if (link.label === 'Fidelidade') return { ...link, label: 'Meus Pontos' };
    }
    return link;
  }).filter(link => {
    if (isAdmin) {
      return ['Dashboard', 'Configurações'].includes(link.label);
    }
    if (isClient) {
      return ['Dashboard', 'Minha Agenda', 'Meus Pontos', 'Configurações'].includes(link.label);
    }
    // Only Owners can manage the team (Staff)
    if (link.label === 'Profissionais' && !isOwner) return false;

    // Professionals (Non-owners) might not see business-level settings if desired,
    // but for now we let them see core operational links.
    return link.label !== 'Admin';
  });

  const handleNewAction = () => {
    if (isAdmin) {
      router.push('/dashboard?new=true');
    } else if (isClient) {
       router.push('/dashboard'); // Go to home to search/book
    } else {
       router.push('/dashboard/appointments'); // Professional goes to agenda
    }
  };

  return (
    <aside className={cn(
      "fixed left-0 top-16 h-[calc(100vh-64px)] w-64 border-r hidden md:flex flex-col p-4 gap-4 transition-colors duration-500",
      theme.sidebarBg
    )}>
      <div className="flex-1 space-y-1">
        {filteredLinks.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold uppercase tracking-widest transition-all",
                isActive 
                  ? (theme.isBeauty ? "bg-pink-500 text-white shadow-lg shadow-pink-500/20" : "bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/20") 
                  : (theme.isBeauty ? "text-zinc-500 hover:bg-pink-50 hover:text-pink-600" : "text-zinc-500 hover:bg-zinc-900 hover:text-amber-500")
              )}
            >
              <Icon size={18} className={cn("transition-colors", isActive ? (theme.isBeauty ? "text-white" : "text-zinc-950") : theme.muted)} />
              {link.label}
              {isActive && (
                <motion.div
                  layoutId="active-nav"
                  className={cn("ml-auto h-2 w-2 rounded-full", theme.isBeauty ? "bg-white" : "bg-zinc-950")}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </div>

      <div className={cn("pt-6 border-t", theme.border)}>
        <Button 
          onClick={handleNewAction}
          className={cn("w-full py-6 gap-3 rounded-2xl shadow-xl font-bold uppercase tracking-widest text-xs", theme.accentBg)}
        >
          {isAdmin ? <Building2 size={18} /> : isClient ? <Calendar size={18} /> : <Plus size={18} />}
          {isAdmin ? 'Novo Estabelecimento' : isClient ? 'Agendar' : 'Novo'}
        </Button>
      </div>
    </aside>
  );
}
