
export type BusinessType = 'barber' | 'beauty';

export function getTheme(type: BusinessType = 'barber') {
  const isBeauty = type === 'beauty';
  return {
    isBeauty,
    bg: isBeauty ? 'bg-[#FFF5F7]' : 'bg-zinc-950',
    sidebarBg: isBeauty ? 'bg-white/80 border-pink-100' : 'bg-zinc-950/50 border-zinc-800',
    navbarBg: isBeauty ? 'bg-white/80 border-pink-100' : 'bg-zinc-950/80 border-zinc-800',
    text: isBeauty ? 'text-zinc-900' : 'text-zinc-100',
    muted: isBeauty ? 'text-zinc-500' : 'text-zinc-500',
    accent: isBeauty ? 'text-pink-600' : 'text-amber-500',
    accentBg: isBeauty ? 'bg-pink-600 hover:bg-pink-700 text-white' : 'bg-amber-500 hover:bg-amber-600 text-zinc-950',
    accentGhost: isBeauty ? 'hover:bg-pink-50 text-pink-600' : 'hover:bg-amber-500/10 text-amber-500',
    border: isBeauty ? 'border-pink-100' : 'border-zinc-800',
    card: isBeauty ? 'bg-white border-pink-50 shadow-pink-500/5' : 'bg-zinc-900/40 border-zinc-800 backdrop-blur-xl',
    btn: isBeauty ? 'bg-pink-600 hover:bg-pink-700 text-white' : 'bg-amber-500 hover:bg-amber-600 text-zinc-950',
    fontDisplay: isBeauty ? 'font-serif' : 'font-display',
    // Colors
    primary: isBeauty ? 'pink-600' : 'amber-500',
    secondary: isBeauty ? 'pink-400' : 'amber-400',
    gradient: isBeauty ? 'from-pink-500 to-rose-500' : 'from-amber-500 to-orange-500',
  };
}
