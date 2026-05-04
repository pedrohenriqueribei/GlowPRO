'use client';

import { useAuth } from '@/context/auth-context';
import { Card, Button } from '@/components/ui';
import { 
  Users, 
  Scissors, 
  Calendar, 
  TrendingUp,
  Clock,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  Star
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
  addDoc
} from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getTheme } from '@/lib/theme';

export default function Dashboard() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState({ clients: 0, appointments: 0, revenue: 0 });
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [loading_data, setLoadingData] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const router = useRouter();
  const theme = getTheme(profile?.businessType);

  const isClient = profile?.role === 'client';

  const handleComplete = async (appointment: any) => {
    if (!user || isClient) return;

    try {
      // 1. Update appointment status
      await updateDoc(doc(db, 'appointments', appointment.id), {
        status: 'completed',
        updatedAt: serverTimestamp()
      });

      // 2. Add points to client (1 point per R$ 1.00)
      const pointsToAdd = Math.floor(Number(appointment.price || 0));
      
      if (pointsToAdd > 0 && appointment.clientId) {
        const balanceRef = doc(db, 'loyalty_balances', `${appointment.clientId}_${user.uid}`);
        
        // Use setDoc with merge to ensure balance document exists
        await setDoc(balanceRef, {
          userId: appointment.clientId,
          ownerId: user.uid,
          clientName: appointment.clientName,
          balance: increment(pointsToAdd),
          updatedAt: serverTimestamp()
        }, { merge: true });

        // Record transaction
        await addDoc(collection(db, 'loyalty_transactions'), {
          userId: appointment.clientId,
          ownerId: user.uid,
          points: pointsToAdd,
          type: 'earn',
          description: `Serviço: ${appointment.serviceName}`,
          createdAt: serverTimestamp()
        });
      }

      // Refresh data
      setUpcoming(prev => prev.filter(a => a.id !== appointment.id));
      setStats(prev => ({ ...prev, revenue: prev.revenue + (Number(appointment.price) || 0) }));
      
      alert(`Serviço concluído! ${pointsToAdd} pontos creditados ao cliente.`);
    } catch (error) {
      console.error('Error completing appointment:', error);
    }
  };

  const handleSearchLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;

    // Handle full URLs
    if (searchQuery.includes('/book/')) {
      const parts = searchQuery.split('/book/');
      const ownerId = parts[parts.length - 1].split('?')[0];
      router.push(`/book/${ownerId}`);
      return;
    }

    // Handle just IDs
    if (searchQuery.length > 20 && !searchQuery.includes(' ')) {
      router.push(`/book/${searchQuery}`);
      return;
    }

    handleSearchName();
  };

  const handleSearchName = async () => {
    setIsSearching(true);
    try {
      const q = query(
        collection(db, 'users'), 
        where('role', '==', 'professional'),
        limit(20)
      );
      const snap = await getDocs(q);
      const allProfs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Filter by name locally (Firestore doesn't support easy case-insensitive contains search)
      const filtered = allProfs.filter((p: any) => 
        p.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.salonName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      
      setProfessionals(filtered);
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (!user) return;

    // Fetch stats
    const fetchData = async () => {
      try {
        if (isClient) {
          const appointmentsSnap = await getDocs(query(
            collection(db, 'appointments'), 
            where('clientId', '==', user.uid),
            orderBy('createdAt', 'desc')
          ));
          setUpcoming(appointmentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } else {
          const clientsSnap = await getDocs(query(collection(db, 'clients'), where('ownerId', '==', user.uid)));
          const appointmentsSnap = await getDocs(query(collection(db, 'appointments'), where('ownerId', '==', user.uid)));
          
          setStats({
            clients: clientsSnap.size,
            appointments: appointmentsSnap.size,
            revenue: 0, 
          });

          const upcomingQuery = query(
            collection(db, 'appointments'),
            where('ownerId', '==', user.uid),
            where('status', '==', 'scheduled'),
            limit(10)
          );
          const upcomingSnap = await getDocs(upcomingQuery);
          setUpcoming(upcomingSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [user, isClient]);

  if (loading_data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${theme.isBeauty ? 'border-pink-500' : 'border-white'}`}></div>
      </div>
    );
  }

  if (isClient) {
    return (
      <div className="max-w-7xl mx-auto space-y-10">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <motion.h1 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`text-4xl md:text-5xl font-bold tracking-tight ${theme.fontDisplay} text-zinc-100`}
            >
              Olá, {user?.displayName?.split(' ')[0]}
            </motion.h1>
            <p className={`${theme.muted} mt-2 text-lg font-light`}>Encontre seu estilo e agende sua próxima transformação.</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900 border border-zinc-800">
            <TrendingUp size={14} className="text-amber-500" />
            <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Glow Rewards Ativo</span>
          </div>
        </header>

        <div className="grid lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-10">
            {/* Loyalty Quick Access */}
            <div 
              className="cursor-pointer"
              onClick={() => router.push('/dashboard/loyalty')}
            >
              <Card 
                className={`p-6 rounded-3xl border-2 border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-transparent flex items-center justify-between hover:border-amber-500/40 transition-all ${theme.card}`}
              >
                 <div className="flex items-center gap-4">
                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${theme.isBeauty ? 'bg-pink-100 text-pink-600' : 'bg-zinc-800 text-amber-500'}`}>
                       <Star size={24} fill="currentColor" />
                    </div>
                    <div>
                       <p className="text-zinc-100 font-bold">Ver Meus Pontos</p>
                       <p className="text-xs text-zinc-500">Você tem recompensas esperando por você!</p>
                    </div>
                 </div>
                 <ChevronRight size={20} className="text-zinc-700" />
              </Card>
            </div>

            <section className="space-y-6">
              <div className="flex flex-col gap-6">
                <form onSubmit={handleSearchLink} className="group relative">
                  <div className={`absolute -inset-1 bg-gradient-to-r ${theme.gradient} rounded-2xl blur opacity-20 group-focus-within:opacity-40 transition-opacity`} />
                  <div className="relative flex gap-2">
                    <div className="relative flex-1">
                      <input 
                        type="text" 
                        placeholder="Cole o link do profissional ou busque por nome..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`w-full h-14 pl-12 pr-10 rounded-xl border appearance-none outline-none transition-all text-lg ${theme.isBeauty ? 'bg-white border-pink-100 focus:border-pink-500' : 'bg-black border-zinc-800 focus:border-amber-500'}`}
                      />
                      <Scissors size={20} className={`absolute left-4 top-1/2 -translate-y-1/2 ${theme.muted}`} />
                    </div>
                    <Button type="submit" className={`h-14 px-8 rounded-xl text-lg font-bold ${theme.btn}`} disabled={isSearching}>
                      {isSearching ? '...' : 'Buscar'}
                    </Button>
                  </div>
                </form>

                {professionals.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-6 rounded-3xl border shadow-2xl ${theme.isBeauty ? 'bg-white border-pink-100' : 'bg-zinc-950 border-zinc-800'}`}
                  >
                    <div className="flex items-center justify-between mb-6 px-2">
                      <h3 className="text-xs font-bold uppercase tracking-widest opacity-40">Profissionais Encontrados</h3>
                      <button onClick={() => setProfessionals([])} className="text-xs text-amber-500 hover:underline">Limpar busca</button>
                    </div>
                    <div className="grid gap-3">
                      {professionals.map((prof) => (
                        <button 
                          key={prof.id} 
                          onClick={() => router.push(`/book/${prof.id}`)}
                          className={`group flex items-center justify-between p-5 rounded-2xl border transition-all ${theme.isBeauty ? 'bg-pink-50/50 border-pink-100' : 'bg-zinc-900/50 border-zinc-800 hover:border-amber-500/50'}`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`h-14 w-14 rounded-full flex items-center justify-center font-bold text-xl ${theme.isBeauty ? 'bg-pink-100 text-pink-600' : 'bg-zinc-800 text-amber-500'}`}>
                              {prof.displayName?.[0] || 'P'}
                            </div>
                            <div className="text-left">
                              <p className="font-bold text-lg group-hover:text-amber-500 transition-colors">{prof.displayName}</p>
                              <p className={`text-sm ${theme.muted}`}>{prof.salonName || prof.profession || 'Barbeiro Profissional'}</p>
                            </div>
                          </div>
                          <div className={`p-2 rounded-full ${theme.isBeauty ? 'bg-pink-100' : 'bg-zinc-800'} group-hover:bg-amber-500 group-hover:text-black transition-all`}>
                            <ChevronRight size={20} />
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
            </section>

            <section className="space-y-6">
              <h2 className={`text-2xl font-bold flex items-center gap-3 ${theme.fontDisplay} text-zinc-100`}>
                <Calendar size={28} className="text-amber-500" />
                Seus Agendamentos
              </h2>

              {upcoming.length > 0 ? (
                <div className="grid gap-4">
                  {upcoming.map((apt) => (
                    <div key={apt.id} className={`group p-8 rounded-3xl border flex flex-col sm:flex-row sm:items-center justify-between gap-6 transition-all hover:border-zinc-700 ${theme.isBeauty ? 'bg-white border-pink-100 shadow-sm' : 'bg-zinc-900 border-zinc-800'}`}>
                      <div className="flex items-center gap-6">
                         <div className={`h-16 w-16 rounded-2xl flex flex-col items-center justify-center border ${theme.isBeauty ? 'bg-pink-50 border-pink-100 text-pink-600' : 'bg-zinc-950 border-zinc-800 text-zinc-100'}`}>
                            <span className="text-xs uppercase font-bold opacity-50">{apt.date?.split('/')[0]}</span>
                            <span className="text-2xl font-display font-bold leading-none">{apt.date?.split('/')[1] || '01'}</span>
                         </div>
                        <div>
                          <h3 className="font-bold text-xl group-hover:text-amber-500 transition-colors">{apt.serviceName}</h3>
                          <p className={`text-sm ${theme.muted} mt-1`}>Com <span className="text-zinc-300 font-medium">{apt.staffName || 'Profissional'}</span></p>
                          <div className="flex items-center gap-4 mt-3">
                            <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-400">
                               <Clock size={14} className="text-amber-500" />
                               {apt.startTime}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center sm:flex-col sm:items-end sm:justify-center gap-4 border-t sm:border-t-0 pt-4 sm:pt-0 border-zinc-800">
                        <span className={`text-[10px] uppercase font-bold px-3 py-1.5 rounded-full ${
                          apt.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 
                          apt.status === 'pending' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-zinc-500/10 text-zinc-500 border border-zinc-500/20'
                        }`}>
                          {apt.status === 'pending' ? 'Pendente' : apt.status === 'confirmed' ? 'Confirmado' : apt.status}
                        </span>
                        <p className="font-display font-bold text-xl text-zinc-100">R$ {apt.price || '0,00'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`py-32 text-center rounded-3xl border-2 border-dashed ${theme.isBeauty ? 'bg-white border-pink-100' : 'bg-zinc-950/20 border-zinc-900'}`}>
                  <Calendar size={64} className="mx-auto mb-6 opacity-5" />
                  <p className={`${theme.muted} text-lg italic font-light`}>Você ainda não possui agendamentos ativos.</p>
                  <Button className={`mt-10 px-10 py-7 rounded-2xl text-lg font-bold ${theme.btn}`}>Explorar Serviços Agora</Button>
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-8">
            <Card className={`p-8 rounded-[32px] ${theme.card}`}>
              <h2 className="text-xl font-bold mb-6 text-zinc-100">Ação Rápida</h2>
              <div className="space-y-4">
                <button className={`w-full py-5 px-6 rounded-2xl flex items-center justify-between gap-3 border transition-all ${theme.isBeauty ? 'bg-pink-50 border-pink-100 hover:bg-pink-100' : 'bg-black border-zinc-800 hover:border-amber-500 group'}`}>
                  <div className="flex items-center gap-3">
                    <Scissors size={20} className="text-amber-500 group-hover:scale-110 transition-transform" />
                    <span className="font-bold">Agendar Novo</span>
                  </div>
                  <ArrowRight size={18} className="opacity-30 group-hover:opacity-100 translate-x-0 group-hover:translate-x-1 transition-all" />
                </button>
                <div className={`p-6 rounded-2xl ${theme.isBeauty ? 'bg-pink-50' : 'bg-zinc-950/50 border border-zinc-800'}`}>
                   <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">Dica do Dia</p>
                   <p className="text-sm text-zinc-400 font-light leading-relaxed">Mantenha seu perfil completo para facilitar que novos profissionais te encontrem.</p>
                </div>
              </div>
            </Card>

            <Card className={`p-8 rounded-[32px] overflow-hidden relative ${theme.card}`}>
                <div className="absolute top-0 right-0 p-4 opacity-5">
                    <TrendingUp size={80} />
                </div>
                <h2 className="text-xl font-bold mb-2 text-zinc-100">Premium Glow</h2>
                <p className="text-sm text-zinc-500 font-light mb-6">Desbloqueie benefícios exclusivos em estabelecimentos parceiros.</p>
                <Button variant="outline" className="w-full h-12 rounded-xl border-amber-500 text-amber-500 hover:bg-amber-500 hover:text-black font-bold">Saiba Mais</Button>
            </Card>
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <header>
        <motion.h1 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className={`text-3xl font-bold tracking-tight ${theme.fontDisplay}`}
        >
          Bem-vindo, {user?.displayName?.split(' ')[0]}
        </motion.h1>
        <p className={`${theme.muted} mt-1`}>Aqui está o que está acontecendo no seu {theme.isBeauty ? 'salão' : 'estabelecimento'} hoje.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total de Clientes', value: stats.clients, icon: Users, trend: '+12%', color: 'text-blue-500' },
          { label: 'Agendamentos', value: stats.appointments, icon: Calendar, trend: '+5%', color: 'text-amber-500' },
          { label: 'Serviços Ativos', value: 12, icon: Scissors, trend: 'Estável', color: 'text-emerald-500' },
          { label: 'Receita Est.', value: `R$ ${stats.revenue}`, icon: TrendingUp, trend: '+8%', color: 'text-rose-500' },
        ].map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className={`group relative p-6 flex flex-col gap-6 overflow-hidden ${theme.card}`}>
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <item.icon size={80} />
              </div>
              <div className="flex items-center justify-between relative z-10">
                <div className={`p-3 rounded-2xl ${theme.isBeauty ? 'bg-pink-100 text-pink-600' : 'bg-zinc-950 border border-zinc-800 ' + item.color}`}>
                  <item.icon size={24} />
                </div>
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${theme.isBeauty ? 'text-pink-600 bg-pink-100' : 'text-emerald-400 bg-emerald-400/10 border border-emerald-400/20'}`}>
                  <TrendingUp size={12} />
                  {item.trend}
                </div>
              </div>
              <div className="relative z-10">
                <p className={`text-xs font-bold uppercase tracking-widest ${theme.muted} mb-1`}>{item.label}</p>
                <p className={`text-4xl font-bold ${theme.fontDisplay} text-zinc-100 tracking-tighter`}>{item.value}</p>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <Card className={`lg:col-span-2 p-8 rounded-[32px] ${theme.card}`}>
          <div className="flex items-center justify-between mb-8">
            <h2 className={`text-2xl font-bold flex items-center gap-3 ${theme.fontDisplay} text-zinc-100`}>
              <Clock size={24} className="text-amber-500" />
              Próximos Agendamentos
            </h2>
            <button className={`text-sm font-bold uppercase tracking-widest text-amber-500 hover:text-amber-400 transition-colors`}>Ver Agenda Completa</button>
          </div>
          
          {upcoming.length > 0 ? (
            <div className="space-y-4">
              {upcoming.map((apt, i) => (
                <div key={apt.id} className={`group flex items-center justify-between p-6 rounded-2xl border transition-all hover:bg-zinc-800/40 ${theme.isBeauty ? 'bg-pink-50/30 border-pink-100' : 'bg-black border-zinc-800/50'}`}>
                  <div className="flex items-center gap-5">
                    <div className={`h-14 w-14 rounded-full flex items-center justify-center font-bold text-xl border-2 ${theme.isBeauty ? 'bg-pink-100 border-white text-pink-500' : 'bg-zinc-900 border-zinc-800 text-amber-500'}`}>
                      {apt.clientName?.[0]}
                    </div>
                    <div>
                      <p className={`font-bold text-lg group-hover:text-amber-500 transition-colors ${theme.text}`}>{apt.clientName}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-medium`}>{apt.serviceName}</span>
                        <span className={`text-xs text-zinc-500 flex items-center gap-1`}><Clock size={12} /> {apt.startTime}</span>
                      </div>
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
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={`flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-[32px] ${theme.isBeauty ? 'border-pink-100 text-pink-300' : 'border-zinc-900 text-zinc-600'}`}>
              <Calendar size={64} className="mb-6 opacity-10" />
              <p className="italic text-lg font-light">Nenhum agendamento para hoje.</p>
              <Button className="mt-8 rounded-xl border-zinc-800" variant="outline">Marcar Horário</Button>
            </div>
          )}
        </Card>

        <Card className={theme.card}>
          <h2 className={`text-xl font-bold mb-6 ${theme.fontDisplay}`}>Atalhos Rápidos</h2>
          <div className="grid grid-cols-1 gap-3">
            {[
              { label: 'Novo Cliente', icon: Users },
              { label: 'Novo Serviço', icon: Scissors },
              { label: 'Bloquear Horário', icon: Calendar },
            ].map((shortcut, i) => (
              <button 
                key={i} 
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left group ${
                  theme.isBeauty ? 'border-pink-100 hover:bg-pink-50' : 'border-zinc-800 hover:bg-zinc-800'
                }`}
              >
                <div className={`p-2 rounded transition-transform group-hover:scale-110 ${theme.accentBg}`}>
                  <shortcut.icon size={16} />
                </div>
                <span className="text-sm font-medium">{shortcut.label}</span>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
