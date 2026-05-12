
export type BusinessType = 'barber' | 'beauty';
export type UserRole = 'profissional' | 'cliente' | 'admin' | 'staff' | 'professional' | 'client';

export function getTheme(type: BusinessType = 'barber', role: UserRole = 'profissional') {
  const isClient = role === 'cliente' || role === 'client';
  const isAdmin = role === 'admin';
  const isBeauty = type === 'beauty';
  
  if (isAdmin) {
    return {
      isBeauty: false,
      isClient: false,
      isAdmin: true,
      bg: 'bg-zinc-950',
      sidebarBg: 'bg-zinc-950 border-amber-500/20',
      navbarBg: 'bg-zinc-950/80 border-zinc-800',
      text: 'text-zinc-100',
      muted: 'text-zinc-500',
      accent: 'text-amber-500',
      accentBg: 'bg-amber-500 hover:bg-amber-600 text-zinc-950',
      accentGhost: 'hover:bg-amber-500/10 text-amber-500',
      border: 'border-zinc-800',
      card: 'bg-zinc-900 border-zinc-800 shadow-2xl shadow-black',
      btn: 'bg-amber-500 hover:bg-amber-600 text-zinc-950 shadow-lg shadow-amber-500/20',
      fontDisplay: 'font-display',
      roleBadge: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      primary: 'amber-500',
      secondary: 'amber-400',
      gradient: 'from-amber-500 to-orange-500',
    };
  }

  return {
    isBeauty,
    isClient,
    isAdmin,
    bg: isBeauty ? 'bg-[#FFF5F7]' : 'bg-zinc-950',
    sidebarBg: isBeauty ? 'bg-white/80 border-pink-100' : 'bg-zinc-950/50 border-zinc-800',
    navbarBg: isBeauty ? 'bg-white/80 border-pink-100' : 'bg-zinc-950/80 border-zinc-800',
    text: isBeauty ? 'text-zinc-900' : 'text-zinc-100',
    muted: isBeauty ? 'text-zinc-500' : 'text-zinc-500',
    accent: isBeauty ? 'text-pink-600' : 'text-amber-500',
    accentBg: isBeauty ? 'bg-pink-600 hover:bg-pink-700 text-white' : 'bg-amber-500 hover:bg-amber-600 text-zinc-950',
    accentGhost: isBeauty ? 'hover:bg-pink-50 text-pink-600' : 'hover:bg-amber-500/10 text-amber-500',
    border: isBeauty ? 'border-pink-100' : 'border-zinc-800',
    card: isBeauty ? 'bg-white border-pink-100 shadow-xl shadow-pink-500/5' : 'bg-zinc-900/40 border-zinc-800 backdrop-blur-xl shadow-2xl shadow-black/50',
    btn: isBeauty ? 'bg-pink-600 hover:bg-pink-700 text-white shadow-lg shadow-pink-500/20' : 'bg-amber-500 hover:bg-amber-600 text-zinc-950 shadow-lg shadow-amber-500/20',
    fontDisplay: isBeauty ? 'font-serif' : 'font-display',
    // Role specific
    roleBadge: isBeauty 
      ? 'bg-pink-100 text-pink-600 border-pink-200' 
      : 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    // Colors
    primary: isBeauty ? 'pink-600' : 'amber-500',
    secondary: isBeauty ? 'pink-400' : 'amber-400',
    gradient: isBeauty ? 'from-pink-500 to-rose-500' : 'from-amber-500 to-orange-500',
  };
}
