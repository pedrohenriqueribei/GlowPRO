'use client';

import { useAuth } from '@/context/auth-context';
import { signOut, auth } from '@/lib/firebase';
import { Button } from './ui';
import { LogOut, User, Bell } from 'lucide-react';
import { motion } from 'motion/react';
import { getTheme } from '@/lib/theme';

export function Navbar() {
  const { user, profile } = useAuth();
  const theme = getTheme(profile?.businessType);

  return (
    <nav className={`sticky top-0 z-40 border-b ${theme.navbarBg} backdrop-blur-md transition-colors duration-500`}>
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-lg border border-white/10 ${theme.accentBg}`}
          >
            <span className="text-2xl font-bold tracking-tighter">G</span>
          </motion.div>
          <span className={`text-2xl font-bold tracking-tighter ${theme.fontDisplay} ${theme.text}`}>GlowPRO</span>
        </div>

        <div className="flex items-center gap-6">
          <Button variant="ghost" size="icon" className={`${theme.muted} hover:text-amber-500 transition-colors`}>
            <Bell size={20} />
          </Button>
          <div className={`flex items-center gap-4 border-l ${theme.border} pl-6`}>
            <div className="text-right hidden sm:block">
              <p className={`text-sm font-bold uppercase tracking-widest ${theme.text}`}>{user?.displayName?.split(' ')[0]}</p>
              <p className={`text-[10px] uppercase font-bold opacity-30`}>{profile?.role === 'professional' ? 'Master' : 'Membro'}</p>
            </div>
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Avatar" className={`h-10 w-10 rounded-full border-2 ${theme.isBeauty ? 'border-pink-500' : 'border-amber-500'}`} />
            ) : (
              <div className={`h-10 w-10 rounded-full ${theme.isBeauty ? 'bg-pink-100' : 'bg-zinc-900'} flex items-center justify-center border-2 ${theme.isBeauty ? 'border-pink-500' : 'border-amber-500/50'}`}>
                <User size={20} className={theme.isBeauty ? 'text-pink-600' : 'text-amber-500'} />
              </div>
            )}
            <Button variant="ghost" size="icon" onClick={() => signOut(auth)} className={`${theme.muted} hover:text-rose-500`}>
              <LogOut size={18} />
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
