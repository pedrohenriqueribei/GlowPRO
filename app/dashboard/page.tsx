'use client';

import { useAuth } from '@/context/auth-context';
import { getTheme } from '@/lib/theme';
import { useRouter } from 'next/navigation';
import AdminDashboardContent from '@/components/AdminDashboardContent';
import StaffDashboardContent from '@/components/StaffDashboardContent';
import { ProfessionalDashboard } from '@/components/ProfessionalDashboard';
import { ClientDashboard } from '@/components/ClientDashboard';

export default function Dashboard() {
  const { user, profile, isAdmin: isMasterAdmin, loading } = useAuth();
  const router = useRouter();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (isMasterAdmin) {
    return <AdminDashboardContent />;
  }

  const role = profile?.role || 'cliente';
  const theme = getTheme(profile?.businessType, role);

  // New role-based routing
  if (role === 'admin') {
    return <AdminDashboardContent />;
  }

  if (role === 'cliente' || role === 'client') {
    return <ClientDashboard user={user} profile={profile} theme={theme} />;
  }

  if (role === 'profissional' || role === 'professional' || role === 'staff') {
    // If it's a professional, differentiate between Owner/Manager and Staff
    if (profile?.isOwner || role === 'professional') {
      return <ProfessionalDashboard user={user} profile={profile} theme={theme} />;
    }
    return <StaffDashboardContent />;
  }

  // Fallback
  return <ClientDashboard user={user} profile={profile} theme={theme} />;
}
