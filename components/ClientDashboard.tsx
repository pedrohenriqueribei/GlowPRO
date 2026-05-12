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
  Scissors,
  Sparkles,
  Link as LinkIcon
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
  onSnapshot,
  updateDoc,
  doc
} from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, Input, Button } from '@/components/ui';

export function ClientDashboard({ user, profile, theme }: any) {
  const router = useRouter();
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [pastedLink, setPastedLink] = useState('');
  const isBeauty = theme.isBeauty;

  useEffect(() => {
    if (!user) return;

    // Listen to upcoming appointments
    const aptsQ = query(
      collection(db, 'appointments'), 
      where('clientId', '==', user.uid),
      where('status', '==', 'confirmed'),
      orderBy('date', 'asc'),
      limit(3)
    );
    const unsubApts = onSnapshot(aptsQ, (snapshot) => {
      setUpcoming(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error('Error in client dashboard appointments snapshot:', error);
    });

    // Listen to professionals (sample/featured)
    const profsQ = query(collection(db, 'users'), where('role', '==', 'professional'), limit(4));
    const unsubProfs = onSnapshot(profsQ, (snapshot) => {
      setProfessionals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error('Error in client dashboard professionals snapshot:', error);
    });

    return () => {
      unsubApts();
      unsubProfs();
    };
  }, [user]);

  const handleSearchLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;
    router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
  };

  const handleGoToLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastedLink) return;
    
    try {
      if (pastedLink.includes('/book/')) {
        const pathPart = pastedLink.split('/book/')[1];
        router.push(`/book/${pathPart}`);
      } else {
        alert('Link inválido. Por favor, cole um link de agendamento GlowPRO.');
      }
    } catch (err) {
      alert('Ocorreu um erro ao processar o link.');
    }
  };

  const toggleTheme = async (newType: 'barber' | 'beauty') => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        businessType: newType
      });
    } catch (error) {
      console.error('Error updating theme:', error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex flex-col gap-2">
              <div className={`w-fit px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-[0.2em] mb-2 ${theme.roleBadge}`}>
                ✨ Área do Cliente
              </div>
              <motion.h1 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`text-4xl md:text-5xl font-bold tracking-tight ${theme.fontDisplay} ${theme.text}`}
              >
                Olá, {user?.displayName?.split(' ')[0]}
              </motion.h1>
            </div>
            <p className={`${theme.muted} mt-2 text-lg font-light`}>Encontre seu estilo e agende sua próxima transformação.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className={`flex p-1 rounded-2xl ${isBeauty ? 'bg-pink-100' : 'bg-zinc-900'} border ${isBeauty ? 'border-pink-200' : 'border-zinc-800'}`}>
              <button 
                onClick={() => toggleTheme('barber')}
                className={`p-2 rounded-xl transition-all ${!isBeauty ? 'bg-zinc-100 text-zinc-950 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                title="Tema Barbearia"
              >
                <Scissors size={18} />
              </button>
              <button 
                onClick={() => toggleTheme('beauty')}
                className={`p-2 rounded-xl transition-all ${isBeauty ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/20' : 'text-zinc-500 hover:text-zinc-400'}`}
                title="Tema Salão"
              >
                <Sparkles size={18} />
              </button>
            </div>

            <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${isBeauty ? 'bg-pink-100' : 'bg-zinc-900'} border ${isBeauty ? 'border-pink-200' : 'border-zinc-800'}`}>
                <TrendingUp size={14} className={theme.accent} />
                <span className={`text-xs font-bold uppercase tracking-widest ${isBeauty ? 'text-pink-600' : 'text-zinc-400'}`}>Glow Rewards Ativo</span>
            </div>
          </div>
        </header>

        <div className="grid lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-10">
            <div 
              className="cursor-pointer"
              onClick={() => router.push('/dashboard/loyalty')}
            >
              <Card 
                className={`p-6 rounded-3xl border-2 ${isBeauty ? 'border-pink-500/20 bg-gradient-to-br from-pink-500/10' : 'border-amber-500/20 bg-gradient-to-br from-amber-500/10'} to-transparent flex items-center justify-between transition-all ${theme.card}`}
              >
                 <div className="flex items-center gap-4">
                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${theme.isBeauty ? 'bg-pink-100 text-pink-600' : 'bg-zinc-800 text-amber-500'}`}>
                       <Star size={24} fill="currentColor" />
                    </div>
                    <div>
                       <p className={`font-bold ${theme.text}`}>Ver Meus Pontos</p>
                       <p className={`text-xs ${theme.muted}`}>Você tem recompensas esperando por você!</p>
                    </div>
                 </div>
                 <ChevronRight size={20} className={theme.muted} />
              </Card>
            </div>

            <section className="space-y-6">
              <div className="flex flex-col gap-6">
                <form onSubmit={handleSearchLink} className="group relative">
                  <Search className={`absolute left-6 top-1/2 -translate-y-1/2 ${theme.muted} group-focus-within:${theme.accent} transition-colors`} size={20} />
                  <Input 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`pl-16 h-16 rounded-3xl ${isBeauty ? 'bg-white border-pink-100 shadow-pink-500/5' : 'bg-zinc-900/50 border-zinc-800 shadow-zinc-200/50'} shadow-xl focus:border-${theme.primary} text-lg`} 
                    placeholder="Encontre barbeiros, salões ou profissionais..." 
                  />
                  <Button type="submit" className={`absolute right-3 top-1/2 -translate-y-1/2 rounded-2xl h-10 px-6 ${theme.btn}`}>
                    Buscar
                  </Button>
                </form>
              </div>

              <div className="space-y-6 pt-4">
                <Card className={`p-8 rounded-[32px] border ${isBeauty ? 'border-pink-500/10 bg-pink-50/30' : 'border-zinc-800 bg-zinc-900/30'}`}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className={`p-3 rounded-2xl ${isBeauty ? 'bg-pink-500 text-white' : 'bg-amber-500 text-zinc-950'}`}>
                      <LinkIcon size={20} />
                    </div>
                    <div>
                      <h3 className={`text-xl font-bold ${theme.text}`}>Agendar com Link</h3>
                      <p className={`text-sm ${theme.muted}`}>Tem o link de um profissional? Cole-o abaixo.</p>
                    </div>
                  </div>
                  
                  <form onSubmit={handleGoToLink} className="flex gap-3">
                    <Input 
                      value={pastedLink}
                      onChange={(e) => setPastedLink(e.target.value)}
                      placeholder="Cole o link do portal aqui..."
                      className={`h-14 rounded-2xl flex-1 ${isBeauty ? 'bg-white border-pink-100' : 'bg-zinc-900 border-zinc-800'}`}
                    />
                    <Button type="submit" className={`h-14 px-8 rounded-2xl gap-2 ${theme.btn}`}>
                      Abrir Agenda
                      <ArrowRight size={18} />
                    </Button>
                  </form>
                </Card>

                <h3 className={`text-xl font-bold flex items-center gap-2 ${theme.text}`}>
                  <LayoutDashboard className={theme.accent} size={20} />
                  Destaques da Região
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {professionals.map((prof) => (
                    <div key={prof.id} onClick={() => router.push(`/book/${prof.id}`)}>
                      <Card className={`p-6 hover:translate-y-[-4px] transition-all cursor-pointer ${theme.card}`}>
                        <div className="flex items-center gap-4">
                          <div className={`h-16 w-16 ${isBeauty ? 'bg-pink-50' : 'bg-zinc-800'} rounded-2xl flex items-center justify-center overflow-hidden`}>
                            {prof.photoURL ? (
                              <img src={prof.photoURL} alt={prof.name} className="w-full h-full object-cover" />
                            ) : (
                              <Users size={24} className={theme.muted} />
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-lg">{prof.businessName || prof.name}</p>
                            <p className={`text-sm ${theme.muted} capitalize`}>{prof.businessType || 'Profissional'}</p>
                          </div>
                        </div>
                        <div className={`mt-6 flex items-center justify-between text-xs font-bold uppercase tracking-widest ${theme.accent}`}>
                          <span>Ver Perfil</span>
                          <ArrowRight size={14} />
                        </div>
                      </Card>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>

          <aside className="space-y-8">
            <section className="space-y-6">
              <h3 className={`text-xl font-bold px-2 ${theme.text}`}>Próximos Horários</h3>
              <div className="space-y-4">
                {upcoming.length > 0 ? upcoming.map((apt) => (
                  <Card key={apt.id} className={`p-6 border-l-4 ${isBeauty ? 'border-l-pink-500' : 'border-l-amber-500'} ${theme.card}`}>
                    <p className="font-bold text-lg">{apt.serviceName}</p>
                    <div className={`flex items-center gap-4 mt-2 text-sm ${theme.muted}`}>
                      <div className="flex items-center gap-1">
                        <Calendar size={14} />
                        {apt.date}
                      </div>
                      <div className="flex items-center gap-1">
                        <CheckCircle2 size={14} />
                        {apt.startTime}
                      </div>
                    </div>
                  </Card>
                )) : (
                  <div className={`py-12 ${isBeauty ? 'bg-pink-50/50' : 'bg-zinc-900/50'} rounded-3xl text-center border-2 border-dashed ${theme.border}`}>
                    <p className={`${theme.muted} italic text-sm`}>Nenhum agendamento ativo.</p>
                  </div>
                )}
              </div>
            </section>
          </aside>
        </div>
      </div>
  );
}
