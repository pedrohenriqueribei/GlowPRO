'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc,
  updateDoc 
} from 'firebase/firestore';
import { Card, Button } from '@/components/ui';
import { 
  Calendar, 
  Users, 
  Clock, 
  CheckCircle2, 
  XCircle,
  RefreshCcw,
  User as UserIcon,
  Phone,
  Copy,
  ExternalLink,
  Share2
} from 'lucide-react';
import { getTheme } from '@/lib/theme';

export default function StaffDashboardContent() {
  const { currentUser, userProfile } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [salonInfo, setSalonInfo] = useState<any>(null);
  const [staffId, setStaffId] = useState<string>('');
  const theme = getTheme(salonInfo?.businessType || 'barber');

  const fetchData = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const staffQuery = query(
        collection(db, 'staff'),
        where('email', '==', currentUser.email)
      );
      const staffSnap = await getDocs(staffQuery);
      
      if (!staffSnap.empty) {
        const staffDoc = staffSnap.docs[0];
        const staffData = staffDoc.data();
        setStaffId(staffDoc.id);
        
        const salonSnap = await getDoc(doc(db, 'users', staffData.ownerId));
        if (salonSnap.exists()) {
          setSalonInfo(salonSnap.data());
        }

        // Get Appointments for this staff
        const q = query(
          collection(db, 'appointments'),
          where('staffId', '==', staffDoc.id)
        );
        const appSnap = await getDocs(q);
        const list = appSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
        // Sort by date and time
        list.sort((a, b) => {
          const dateA = new Date(`${a.date}T${a.startTime}`);
          const dateB = new Date(`${b.date}T${b.startTime}`);
          return dateA.getTime() - dateB.getTime();
        });
        setAppointments(list);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [currentUser]);

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateDoc(doc(db, 'appointments', id), { status });
      setAppointments(appointments.map(a => a.id === id ? { ...a, status } : a));
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'appointments');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCcw className="animate-spin text-amber-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-2 h-2 rounded-full ${theme.accentBg} animate-pulse`} />
            <span className={`text-xs font-bold uppercase tracking-widest ${theme.accent}`}>Painel do Profissional</span>
          </div>
          <h1 className={`text-4xl md:text-5xl font-bold tracking-tight ${theme.fontDisplay} text-zinc-100 uppercase`}>
            Olá, {currentUser?.displayName?.split(' ')[0]}
          </h1>
          <p className="text-zinc-500 font-medium">Sua agenda em {salonInfo?.businessName || 'GlowPRO'}</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            onClick={() => {
              const url = `${window.location.origin}/book/${salonInfo?.uid}?staffId=${staffId}`;
              navigator.clipboard.writeText(url);
              alert('Seu link de agendamento foi copiado!');
            }}
            variant="outline" 
            className="h-14 px-8 rounded-2xl gap-2 border-zinc-800 bg-zinc-900/50 text-amber-500 hover:text-amber-400"
          >
            <Share2 size={18} />
            Compartilhar Portal
          </Button>
          <Button onClick={fetchData} variant="outline" className="h-14 px-8 rounded-2xl gap-2 border-zinc-800 bg-zinc-900/50">
            <RefreshCcw size={18} />
            Sincronizar Agenda
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className={`p-8 border ${theme.card} md:col-span-2`}>
           <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Calendar size={20} className="text-amber-500" />
                Agendamentos Próximos
              </h2>
              <span className="text-[10px] font-black uppercase tracking-widest bg-zinc-900 px-3 py-1 rounded-lg text-amber-500/50">
                {appointments.length} Atendimentos
              </span>
           </div>

           {appointments.length === 0 ? (
             <div className="text-center py-20 border-2 border-dashed border-zinc-900 rounded-[32px]">
                <Clock size={48} className="mx-auto text-zinc-800 mb-4" />
                <p className="text-zinc-500 font-medium italic">Nenhum agendamento para exibir no momento.</p>
             </div>
           ) : (
             <div className="space-y-4">
                {appointments.map((app) => (
                   <div key={app.id} className="p-6 rounded-[28px] bg-zinc-950 border border-zinc-900 group hover:border-zinc-800 transition-all">
                      <div className="flex flex-col sm:flex-row justify-between gap-4">
                         <div className="flex gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-zinc-900 flex items-center justify-center text-zinc-500 group-hover:text-amber-500 transition-colors">
                               <UserIcon size={24} />
                            </div>
                            <div>
                               <p className="font-bold text-zinc-100 text-lg">{app.clientName}</p>
                               <div className="flex items-center gap-4 mt-1">
                                  <p className="text-xs text-amber-500 font-bold uppercase tracking-widest">{app.serviceName}</p>
                                  <div className="flex items-center gap-1 text-[10px] text-zinc-600">
                                     <Clock size={12} />
                                     {app.startTime}
                                  </div>
                               </div>
                            </div>
                         </div>

                         <div className="flex items-center gap-2">
                            {app.status === 'scheduled' && (
                               <>
                                  <button 
                                    onClick={() => handleStatusChange(app.id, 'completed')}
                                    className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl hover:bg-emerald-500/20 transition-all"
                                    title="Concluir Atendimento"
                                  >
                                    <CheckCircle2 size={20} />
                                  </button>
                                  <button 
                                    onClick={() => handleStatusChange(app.id, 'cancelled')}
                                    className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition-all"
                                    title="Cancelar"
                                  >
                                    <XCircle size={20} />
                                  </button>
                               </>
                            )}
                            {app.status === 'completed' && (
                               <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-lg">
                                  Concluído
                               </span>
                            )}
                            {app.status === 'cancelled' && (
                               <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 bg-red-500/10 text-red-500 rounded-lg">
                                  Cancelado
                               </span>
                            )}
                         </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-zinc-900 flex flex-wrap gap-4 text-xs text-zinc-500">
                         <div className="flex items-center gap-2">
                            <Calendar size={14} />
                            {new Date(app.date).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                         </div>
                         <div className="flex items-center gap-2">
                            <Phone size={14} />
                            {app.clientPhone || 'Sem telefone'}
                         </div>
                      </div>
                   </div>
                ))}
             </div>
           )}
        </Card>

        <Card className={`p-8 border ${theme.card} flex flex-col gap-6`}>
           <div>
              <h3 className="text-xl font-bold flex items-center gap-2 mb-2">
                <Users size={20} className="text-amber-500" />
                Resumo do Dia
              </h3>
              <p className="text-sm text-zinc-500">Métricas de hoje, {new Date().toLocaleDateString('pt-BR')}</p>
           </div>

           <div className="grid gap-4 mt-4">
              <div className="p-6 rounded-3xl bg-zinc-950 border border-zinc-900">
                 <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-1">Concluídos hoje</p>
                 <p className="text-3xl font-bold text-zinc-100">
                    {appointments.filter(a => a.status === 'completed').length}
                 </p>
              </div>
              <div className="p-6 rounded-3xl bg-zinc-950 border border-zinc-900">
                 <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-1">Pendentes</p>
                 <p className="text-3xl font-bold text-amber-500">
                    {appointments.filter(a => a.status === 'scheduled').length}
                 </p>
              </div>
           </div>

           <div className="mt-auto pt-6 border-t border-zinc-800">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-amber-500">
                    <UserIcon size={24} />
                 </div>
                 <div>
                    <p className="font-bold text-sm text-zinc-100">{currentUser?.displayName}</p>
                    <p className="text-[10px] uppercase font-bold text-zinc-600 tracking-widest">{userProfile?.role === 'staff' ? 'Profissional Colaborador' : 'Profissional'}</p>
                 </div>
              </div>
           </div>
        </Card>
      </div>
    </div>
  );
}
