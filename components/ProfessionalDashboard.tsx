'use client';

import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  CheckCircle2, 
  ChevronRight, 
  ArrowRight,
  Star,
  TrendingUp,
  Search,
  MoreVertical,
  Share2,
  Copy,
  ExternalLink
} from 'lucide-react';
import { motion } from 'motion/react';
import { db } from '@/lib/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  limit, 
  orderBy, 
  updateDoc, 
  doc, 
  increment, 
  setDoc, 
  serverTimestamp,
  addDoc,
  onSnapshot
} from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, Input, Button } from '@/components/ui';

export function ProfessionalDashboard({ user, profile, theme }: any) {
  const router = useRouter();
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [stats, setStats] = useState({ revenue: 0, customers: 0, appointments: 0 });

  useEffect(() => {
    if (!user) return;

    // Listen to appointments
    const qApts = query(collection(db, 'appointments'), where('ownerId', '==', user.uid));
    const unsubApts = onSnapshot(qApts, async (snapshot) => {
      const apts = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const totalRevenue = apts.filter((a: any) => a.status === 'completed').reduce((acc: number, curr: any) => acc + (Number(curr.price) || 0), 0);
      
      const upcomingApts = apts
        .filter((a: any) => a.status === 'confirmed' || a.status === 'scheduled')
        .sort((a: any, b: any) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
        .slice(0, 5);

      setUpcoming(upcomingApts);
      setStats(prev => ({
        ...prev,
        revenue: totalRevenue,
        appointments: apts.length
      }));
    }, (error) => {
      console.error('Error in professional dashboard appointments snapshot:', error);
    });

    // Listen to clients
    const qClients = query(collection(db, 'clients'), where('ownerId', '==', user.uid));
    const unsubClients = onSnapshot(qClients, (snapshot) => {
      setStats(prev => ({
        ...prev,
        customers: snapshot.size
      }));
    }, (error) => {
      console.error('Error in professional dashboard clients snapshot:', error);
    });

    return () => {
      unsubApts();
      unsubClients();
    };
  }, [user]);

  const handleComplete = async (appointment: any) => {
    try {
      await updateDoc(doc(db, 'appointments', appointment.id), {
        status: 'completed',
        updatedAt: serverTimestamp()
      });

      const pointsToAdd = Math.floor(Number(appointment.price || 0));
      if (pointsToAdd > 0 && appointment.clientId) {
        const balanceRef = doc(db, 'loyalty_balances', `${appointment.clientId}_${user.uid}`);
        await setDoc(balanceRef, {
          userId: appointment.clientId,
          ownerId: user.uid,
          clientName: appointment.clientName,
          balance: increment(pointsToAdd),
          updatedAt: serverTimestamp()
        }, { merge: true });

        await addDoc(collection(db, 'loyalty_transactions'), {
          userId: appointment.clientId,
          ownerId: user.uid,
          points: pointsToAdd,
          type: 'earn',
          description: `Serviço: ${appointment.serviceName}`,
          createdAt: serverTimestamp()
        });
      }

      setUpcoming(prev => prev.filter(a => a.id !== appointment.id));
      setStats(prev => ({ ...prev, revenue: prev.revenue + (Number(appointment.price) || 0) }));
      alert(`Serviço concluído! ${pointsToAdd} pontos creditados ao cliente.`);
    } catch (error) {
       console.error(error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <header className="flex flex-col gap-2">
        <div className={`w-fit px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-[0.2em] ${theme.roleBadge}`}>
          👑 Painel Profissional
        </div>
        <motion.h1 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className={`text-3xl font-bold tracking-tight ${theme.fontDisplay} text-zinc-100`}
        >
          Bem-vindo, {user?.displayName?.split(' ')[0]}
        </motion.h1>
        <p className={`${theme.muted} text-lg font-light`}>Resumo de atendimentos e desempenho.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Receita Total', value: `R$ ${stats.revenue.toFixed(2)}`, icon: TrendingUp, color: 'text-emerald-500' },
          { label: 'Clientes Ativos', value: stats.customers, icon: Users, color: 'text-blue-500' },
          { label: 'Agendamentos', value: stats.appointments, icon: Calendar, color: 'text-amber-500' },
        ].map((stat, i) => (
          <Card key={i} className={`p-6 border transition-all ${theme.card}`}>
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl bg-zinc-950 border border-zinc-800 ${stat.color}`}>
                <stat.icon size={24} />
              </div>
              <div>
                <p className={`text-xs font-bold uppercase tracking-widest ${theme.muted}`}>{stat.label}</p>
                <p className="text-3xl font-bold text-zinc-100">{stat.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8 pt-4">
        <section className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2 text-zinc-100">
              <Calendar className="text-amber-500" size={20} />
              Próximos Atendimentos
            </h2>
            <Button variant="ghost" className="text-xs uppercase tracking-widest text-amber-500 font-bold" onClick={() => router.push('/dashboard/appointments')}>
              Ver Agenda Completa
            </Button>
          </div>
          <div className="space-y-4">
            {upcoming.length > 0 ? upcoming.map((apt) => (
              <Card key={apt.id} className={`group p-6 border transition-all hover:bg-zinc-900/40 ${theme.card}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl border border-zinc-800 flex flex-col items-center justify-center bg-zinc-950">
                      <span className="text-[10px] font-bold uppercase text-zinc-500">Hora</span>
                      <span className="font-bold text-amber-500">{apt.startTime}</span>
                    </div>
                    <div>
                      <p className="font-bold text-lg text-zinc-100">{apt.clientName}</p>
                      <p className={`text-sm ${theme.muted}`}>{apt.serviceName} • R$ {apt.price}</p>
                    </div>
                  </div>
                   <div className="flex items-center gap-3">
                    <button 
                      onClick={() => handleComplete(apt)}
                      className={`p-3 rounded-xl border border-zinc-800 hover:bg-emerald-500 hover:text-black transition-all text-zinc-500`}
                    >
                      <CheckCircle2 size={20} />
                    </button>
                    <button className={`p-3 rounded-xl border border-zinc-800 hover:bg-zinc-800 transition-all text-zinc-500`}>
                      <MoreVertical size={20} />
                    </button>
                  </div>
                </div>
              </Card>
            )) : (
              <div className="py-20 text-center border-2 border-dashed border-zinc-800 rounded-[32px]">
                <p className="text-zinc-500 italic">Nenhum atendimento para hoje.</p>
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-8">
          <Card className={`p-8 rounded-[32px] border ${theme.card}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500">
                <Share2 size={24} />
              </div>
              <h3 className="text-xl font-bold text-zinc-100">Portal Público</h3>
            </div>
            <p className={`text-sm mb-6 ${theme.muted}`}>Compartilhe o link do seu estabelecimento para receber agendamentos online.</p>
            
            <div className="space-y-3">
              <Button 
                className={`w-full py-6 rounded-2xl font-bold uppercase tracking-widest text-xs gap-2 ${theme.btn}`} 
                onClick={() => {
                  const url = `${window.location.origin}/book/${user?.uid}`;
                  navigator.clipboard.writeText(url);
                  alert('Link do estabelecimento copiado!');
                }}
              >
                <Copy size={16} />
                Copiar Link Principal
              </Button>
              <Button 
                variant="outline" 
                className="w-full py-6 rounded-2xl font-bold uppercase tracking-widest text-xs border-zinc-800 bg-zinc-900/50" 
                onClick={() => router.push('/dashboard/staff')}
              >
                Links Individuais (Equipe)
              </Button>
              <a 
                href={`/book/${user?.uid}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 text-xs font-bold text-zinc-500 hover:text-zinc-300 mt-2"
              >
                Ver como cliente <ExternalLink size={12} />
              </a>
            </div>
          </Card>

          <Card className={`p-8 rounded-[32px] overflow-hidden relative ${theme.card}`}>
            <h3 className="text-xl font-bold mb-4 relative z-10 text-zinc-100">Disponibilidade</h3>
            <p className={`text-sm mb-6 ${theme.muted}`}>Mantenha seus horários atualizados.</p>
            <Button className={`w-full py-6 rounded-2xl font-bold uppercase tracking-widest text-xs ${theme.btn}`} onClick={() => router.push('/dashboard/availability')}>
              Configurar Horários
            </Button>
          </Card>
        </aside>
      </div>
    </div>
  );
}
