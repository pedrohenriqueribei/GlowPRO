'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc,
  deleteDoc,
  doc, 
  getDocs,
  serverTimestamp,
  increment,
  setDoc,
  orderBy
} from 'firebase/firestore';
import { Button, Card, Input } from '@/components/ui';
import { 
  Star, 
  Gift, 
  TrendingUp, 
  Users, 
  Plus, 
  Trash2, 
  Edit2, 
  History,
  Trophy,
  Award,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getTheme } from '@/lib/theme';

export default function LoyaltyPage() {
  const { user, profile } = useAuth();
  const theme = getTheme(profile?.businessType);
  const isProfessional = profile?.role === 'professional';

  const [rewards, setRewards] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    pointsRequired: '',
    description: '',
    active: true
  });

  // Client states
  const [clientBalances, setClientBalances] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    if (isProfessional) {
      // Rewards
      const rewardsQ = query(collection(db, 'loyalty_rewards'), where('ownerId', '==', user.uid));
      const unsubRewards = onSnapshot(rewardsQ, (snap) => {
        setRewards(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });

      // Balances
      const balancesQ = query(collection(db, 'loyalty_balances'), where('ownerId', '==', user.uid), orderBy('balance', 'desc'));
      const unsubBalances = onSnapshot(balancesQ, (snap) => {
        setBalances(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });

      // Transactions
      const transQ = query(
        collection(db, 'loyalty_transactions'), 
        where('ownerId', '==', user.uid), 
        orderBy('createdAt', 'desc')
      );
      const unsubTrans = onSnapshot(transQ, (snap) => {
        setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });

      return () => {
        unsubRewards();
        unsubBalances();
        unsubTrans();
      };
    } else {
      // Client view: Balances at different salons
      const clientBalancesQ = query(collection(db, 'loyalty_balances'), where('userId', '==', user.uid));
      const unsubClientBalances = onSnapshot(clientBalancesQ, async (snap) => {
        const bals = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
        setClientBalances(bals);
        
        // Fetch rewards for these salons
        if (bals.length > 0) {
          const ownerIds = bals.map(b => b.ownerId);
          const rewardsQ = query(collection(db, 'loyalty_rewards'), where('ownerId', 'in', ownerIds), where('active', '==', true));
          const rewardsSnap = await getDocs(rewardsQ);
          setRewards(rewardsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        }
      });
      return () => unsubClientBalances();
    }
  }, [user, isProfessional]);

  const handleRedeem = async (reward: any, salonBalance: any) => {
    if (!user) return;

    if (salonBalance.balance < reward.pointsRequired) {
      alert('Pontos insuficientes para este resgate.');
      return;
    }

    if (confirm(`Deseja resgatar "${reward.name}" por ${reward.pointsRequired} pontos? (Um cupom será gerado)`)) {
      try {
        const balanceRef = doc(db, 'loyalty_balances', salonBalance.id);
        
        // Deduct points
        await updateDoc(balanceRef, {
          balance: increment(-reward.pointsRequired),
          updatedAt: serverTimestamp()
        });

        // Record transaction
        await addDoc(collection(db, 'loyalty_transactions'), {
          userId: user.uid,
          ownerId: reward.ownerId,
          points: reward.pointsRequired,
          type: 'redeem',
          description: `Resgate: ${reward.name}`,
          createdAt: serverTimestamp()
        });

        alert(`Resgate realizado com sucesso! Mostre este histórico no estabelecimento para validar sua recompensa.`);
      } catch (error) {
        console.error('Error redeeming reward:', error);
      }
    }
  };

  const handleSubmitReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const data = {
      ...formData,
      pointsRequired: Number(formData.pointsRequired),
      ownerId: user.uid,
      updatedAt: serverTimestamp()
    };

    try {
      if (editingReward) {
        await updateDoc(doc(db, 'loyalty_rewards', editingReward.id), data);
      } else {
        await addDoc(collection(db, 'loyalty_rewards'), {
          ...data,
          createdAt: serverTimestamp()
        });
      }
      setIsModalOpen(false);
      setEditingReward(null);
      setFormData({ name: '', pointsRequired: '', description: '', active: true });
    } catch (error) {
      console.error('Error saving reward:', error);
    }
  };

  const handleDeleteReward = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta recompensa?')) {
      await deleteDoc(doc(db, 'loyalty_rewards', id));
    }
  };

  if (!isProfessional) {
    return (
      <div className="max-w-7xl mx-auto space-y-12">
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-8 border-b border-zinc-900">
          <div>
            <h1 className={`text-4xl md:text-5xl font-bold tracking-tight ${theme.fontDisplay} text-zinc-100`}>Seus Pontos</h1>
            <p className={`${theme.muted} mt-2 text-lg font-light`}>Acompanhe seus pontos e resgate recompensas exclusivas.</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20">
            <Trophy size={18} className="text-amber-500" />
            <span className="text-xs font-bold uppercase tracking-widest text-amber-500">Glow Rewards</span>
          </div>
        </header>

        {clientBalances.length > 0 ? (
          <div className="grid gap-12">
            {clientBalances.map((bal) => (
              <div key={bal.id} className="space-y-8">
                <Card className={`p-8 rounded-[32px] overflow-hidden transition-all border-2 border-amber-500/20 ${theme.card}`}>
                  <div className="flex flex-col md:flex-row justify-between gap-8">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${theme.isBeauty ? 'bg-pink-100 text-pink-600' : 'bg-zinc-800 text-amber-500'}`}>
                          <Star size={24} fill="currentColor" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-zinc-100">Seu Saldo</h3>
                          <p className={theme.muted}>No estabelecimento de ID: {bal.ownerId.slice(0, 8)}...</p>
                        </div>
                      </div>
                      <p className="text-7xl font-bold tracking-tighter text-amber-500">{bal.balance} <span className="text-2xl text-zinc-500 ml-2">pontos</span></p>
                    </div>
                    
                    <div className="flex-1 max-w-md space-y-4">
                      <h4 className="text-sm font-bold uppercase tracking-widest opacity-50">Regra de Acúmulo</h4>
                      <div className={`p-6 rounded-2xl ${theme.isBeauty ? 'bg-pink-50' : 'bg-zinc-950'} border border-zinc-900`}>
                         <p className="text-zinc-100 font-medium">Continue frequentando para ganhar mais!</p>
                         <p className="text-sm text-zinc-500 mt-1">A cada R$ 1,00 gasto em serviços agendados, você ganha 1 ponto.</p>
                      </div>
                    </div>
                  </div>
                </Card>

                <section className="space-y-6">
                   <h2 className="text-2xl font-bold flex items-center gap-3 text-zinc-100">
                     <Gift size={28} className="text-amber-500" />
                     Recompensas para Resgate
                   </h2>
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {rewards.filter(r => r.ownerId === bal.ownerId).map((reward) => (
                        <Card key={reward.id} className={`p-6 rounded-3xl border transition-all ${theme.card}`}>
                           <div className="flex justify-between items-start mb-4">
                              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${theme.isBeauty ? 'bg-pink-50 text-pink-600' : 'bg-zinc-900 text-amber-500'}`}>
                                 <Gift size={20} />
                              </div>
                              <span className="font-bold text-amber-500 text-sm">{reward.pointsRequired} pts</span>
                           </div>
                           <h4 className="font-bold text-zinc-100 mb-2">{reward.name}</h4>
                           <p className="text-xs text-zinc-500 mb-6 line-clamp-2">{reward.description}</p>
                           <Button 
                              onClick={() => handleRedeem(reward, bal)}
                              disabled={bal.balance < reward.pointsRequired}
                              className={`w-full h-11 rounded-xl text-xs font-bold uppercase tracking-widest ${bal.balance >= reward.pointsRequired ? theme.btn : 'opacity-20 cursor-not-allowed'}`}
                            >
                              {bal.balance >= reward.pointsRequired ? 'Resgatar Agora' : 'Pontos Insuficientes'}
                            </Button>
                        </Card>
                      ))}
                      {rewards.filter(r => r.ownerId === bal.ownerId).length === 0 && (
                        <div className="col-span-full py-16 text-center border border-dashed border-zinc-800 rounded-3xl">
                           <p className="text-zinc-500 italic">Este estabelecimento ainda não cadastrou recompensas.</p>
                        </div>
                      )}
                   </div>
                </section>
              </div>
            ))}
          </div>
        ) : (
          <div className={`py-32 text-center rounded-[40px] border-2 border-dashed ${theme.isBeauty ? 'border-pink-100' : 'border-zinc-900 bg-zinc-950/20'}`}>
            <Star size={64} className="mx-auto mb-6 opacity-10" />
            <p className="italic text-lg text-zinc-500 font-light">Você ainda não acumulou pontos em nenhum estabelecimento.</p>
            <Button className={`mt-10 px-10 py-7 rounded-2xl text-lg font-bold ${theme.btn}`}>Agendar agora e começar a ganhar</Button>
          </div>
        )}
      </div>
    );
  }

  // Professional View
  return (
    <div className="max-w-7xl mx-auto space-y-12">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-8 border-b border-zinc-900">
        <div>
          <h1 className={`text-4xl md:text-5xl font-bold tracking-tight ${theme.fontDisplay} text-zinc-100`}>Programa de Fidelidade</h1>
          <p className={`${theme.muted} mt-2 text-lg font-light`}>Crie engajamento com seus clientes através de recompensas e pontos.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className={`gap-3 h-14 px-8 rounded-2xl font-bold uppercase tracking-widest text-xs ${theme.btn}`}>
          <Plus size={20} />
          Nova Recompensa
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { label: 'Total de Pontos Emitidos', value: balances.reduce((acc, curr) => acc + curr.balance, 0), icon: TrendingUp, color: 'text-blue-500' },
          { label: 'Clientes no Programa', value: balances.length, icon: Users, color: 'text-amber-500' },
          { label: 'Recompensas Ativas', value: rewards.filter(r => r.active).length, icon: Gift, color: 'text-emerald-500' },
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

      <div className="grid lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          <section className="space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-3 text-zinc-100">
              <Award size={28} className="text-amber-500" />
              Suas Recompensas
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {rewards.length > 0 ? rewards.map((reward) => (
                <Card key={reward.id} className={`group relative p-8 rounded-[32px] overflow-hidden transition-all hover:border-zinc-700 ${theme.card}`}>
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                      <Gift size={80} />
                  </div>
                  <div className="flex justify-between items-start mb-6 relative z-10">
                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${theme.isBeauty ? 'bg-pink-100 text-pink-600' : 'bg-zinc-950 border border-zinc-800 text-amber-500'}`}>
                      <Gift size={24} />
                    </div>
                    <div className="flex gap-2">
                       <Button variant="ghost" size="icon" className="text-zinc-500 hover:text-amber-500" onClick={() => {
                          setEditingReward(reward);
                          setFormData({
                            name: reward.name,
                            pointsRequired: reward.pointsRequired.toString(),
                            description: reward.description || '',
                            active: reward.active
                          });
                          setIsModalOpen(true);
                       }}>
                          <Edit2 size={18} />
                       </Button>
                       <Button variant="ghost" size="icon" className="text-zinc-500 hover:text-rose-500" onClick={() => handleDeleteReward(reward.id)}>
                          <Trash2 size={18} />
                       </Button>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-zinc-100 mb-2">{reward.name}</h3>
                  <p className={`text-sm ${theme.muted} mb-6 line-clamp-2`}>{reward.description}</p>
                  <div className="flex items-center justify-between pt-4 border-t border-zinc-800/50">
                    <div className="flex items-center gap-2">
                      <Star size={16} className="text-amber-500" fill="currentColor" />
                      <span className="font-bold text-amber-500">{reward.pointsRequired} pts</span>
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${reward.active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-800 text-zinc-500'}`}>
                      {reward.active ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>
                </Card>
              )) : (
                <div className="col-span-2 py-20 text-center border-2 border-dashed border-zinc-800 rounded-3xl">
                  <p className="text-zinc-500 p-10 italic">Nenhuma recompensa cadastrada.</p>
                </div>
              )}
            </div>
          </section>

          <section className="space-y-6">
             <h2 className="text-2xl font-bold flex items-center gap-3 text-zinc-100">
               <History size={28} className="text-amber-500" />
               Histórico Recente
             </h2>
             <div className="space-y-4">
                {history.slice(0, 5).map((t) => (
                  <div key={t.id} className={`p-6 rounded-2xl border flex items-center justify-between gap-4 ${theme.card}`}>
                    <div className="flex items-center gap-4">
                       <div className={`h-10 w-10 rounded-full flex items-center justify-center ${t.type === 'earn' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                          {t.type === 'earn' ? <TrendingUp size={18} /> : <Gift size={18} />}
                       </div>
                       <div>
                          <p className="font-bold text-zinc-100">{t.description}</p>
                          <p className={`text-xs ${theme.muted}`}>Data: {t.createdAt?.toDate ? t.createdAt.toDate().toLocaleDateString() : 'Recent'}</p>
                       </div>
                    </div>
                    <div className={`font-bold text-lg ${t.type === 'earn' ? 'text-emerald-500' : 'text-rose-500'}`}>
                       {t.type === 'earn' ? '+' : '-'}{t.points}
                    </div>
                  </div>
                ))}
             </div>
          </section>
        </div>

        <aside className="space-y-8">
           <Card className={`p-8 rounded-[32px] ${theme.card}`}>
              <h2 className="text-xl font-bold mb-6 text-zinc-100">Ranking de Clientes</h2>
              <div className="space-y-6">
                 {balances.slice(0, 5).map((bal, idx) => (
                   <div key={bal.id} className="flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                         <div className={`h-10 w-10 rounded-full flex items-center justify-center bg-zinc-900 border border-zinc-800 text-sm font-bold ${idx === 0 ? 'text-amber-500' : 'text-zinc-500'}`}>
                            #{idx + 1}
                         </div>
                         <div className="text-left">
                            <p className="font-bold text-zinc-100 text-sm">{bal.clientName || 'Cliente'}</p>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{bal.balance} pontos</p>
                         </div>
                      </div>
                      <ChevronRight size={16} className="text-zinc-800 group-hover:text-amber-500 transition-colors" />
                   </div>
                 ))}
                 {balances.length === 0 && (
                   <p className="text-center text-xs italic text-zinc-500 py-10">Agende serviços para ver seus clientes aqui.</p>
                 )}
              </div>
           </Card>
        </aside>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md"
            onClick={() => {
              setIsModalOpen(false);
              setEditingReward(null);
              setFormData({ name: '', pointsRequired: '', description: '', active: true });
            }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className={`relative w-full max-w-lg border rounded-[40px] p-10 shadow-2xl ${theme.isBeauty ? 'bg-white border-pink-100' : 'bg-zinc-900 border-zinc-800'}`}
          >
            <h2 className={`text-3xl font-bold mb-8 text-zinc-100 ${theme.fontDisplay}`}>
              {editingReward ? 'Editar' : 'Nova'} <span className="text-amber-500">Recompensa</span>
            </h2>
            <form onSubmit={handleSubmitReward} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 px-1">Nome do Prêmio</label>
                <Input 
                  required
                  className={`h-14 rounded-2xl transition-all ${theme.isBeauty ? 'bg-white' : 'bg-black border-zinc-800 focus:border-amber-500'}`}
                  placeholder="Ex: Corte de Cabelo Grátis"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 px-1">Pontos Necessários</label>
                <Input 
                  type="number"
                  required
                  className={`h-14 rounded-2xl transition-all ${theme.isBeauty ? 'bg-white' : 'bg-black border-zinc-800 focus:border-amber-500'}`}
                  placeholder="Ex: 500"
                  value={formData.pointsRequired}
                  onChange={(e) => setFormData({...formData, pointsRequired: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 px-1">Regras/Descrição</label>
                <textarea 
                  className={`w-full rounded-2xl p-4 text-sm outline-none transition-all border ${theme.isBeauty ? 'bg-white border-pink-100 focus:border-pink-500' : 'bg-black border-zinc-800 focus:border-amber-500 text-zinc-300'}`}
                  rows={4}
                  placeholder="Descreva o que o cliente ganha e como resgatar..."
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>
              <div className="flex gap-4 pt-6">
                <Button variant="ghost" className="flex-1 h-14 rounded-2xl font-bold uppercase tracking-widest text-xs" type="button" onClick={() => {
                  setIsModalOpen(false);
                  setEditingReward(null);
                  setFormData({ name: '', pointsRequired: '', description: '', active: true });
                }}>Cancelar</Button>
                <Button className={`flex-1 h-14 rounded-2xl font-bold uppercase tracking-widest text-xs ${theme.btn}`} type="submit">Salvar Recompensa</Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
