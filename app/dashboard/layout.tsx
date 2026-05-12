'use client';

import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { MobileNav } from '@/components/MobileNav';
import { getTheme } from '@/lib/theme';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const theme = getTheme(profile?.businessType);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className={`flex min-h-screen items-center justify-center ${theme.bg}`}>
        <div className={`h-8 w-8 animate-spin rounded-full border-2 ${theme.isBeauty ? 'border-pink-500' : 'border-zinc-100'} border-t-transparent`} />
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme.bg} ${theme.text} transition-colors duration-500`}>
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 md:ml-64 p-4 md:p-8 min-h-[calc(100vh-64px)] pb-32 md:pb-8">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
