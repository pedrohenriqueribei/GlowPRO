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
  serverTimestamp,
  deleteDoc,
  doc
} from 'firebase/firestore';
import { Button, Card, Input } from '@/components/ui';
import { Clock, Calendar, Plus, Trash2, CheckCircle2, ChevronRight, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getTheme } from '@/lib/theme';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
];

export default function AvailabilityPage() {
  const { user, profile } = useAuth();
  const theme = getTheme(profile?.businessType);
  const [rules, setRules] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [newRule, setNewRule] = useState({
    startDate: '',
    endDate: '',
    startTime: '08:00',
    endTime: '18:00',
    daysOfWeek: [1, 2, 3, 4, 5], // Default Mon-Fri
  });

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'availability'), where('ownerId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRules(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      console.error('Error in availability snapshot:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleToggleDay = (day: number) => {
    setNewRule(prev => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter(d => d !== day)
        : [...prev.daysOfWeek, day]
    }));
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      await addDoc(collection(db, 'availability'), {
        ...newRule,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
      });
      setIsModalOpen(false);
      // Reset defaults but keep times maybe?
      setNewRule({
        startDate: '',
        endDate: '',
        startTime: '08:00',
        endTime: '18:00',
        daysOfWeek: [1, 2, 3, 4, 5],
      });
    } catch (error) {
      console.error('Error saving rule:', error);
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (confirm('Deseja remover esta regra de disponibilidade?')) {
      try {
        await deleteDoc(doc(db, 'availability', id));
      } catch (error) {
        console.error('Error deleting rule:', error);
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-12">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-8 border-b border-zinc-900">
        <div>
          <h1 className={`text-4xl md:text-5xl font-bold tracking-tight ${theme.fontDisplay} text-zinc-100`}>Disponibilidade</h1>
          <p className={`${theme.muted} mt-2 text-lg font-light`}>Abra sua agenda e defina quando você está pronto para atender.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className={`gap-3 h-14 px-8 rounded-2xl font-bold uppercase tracking-widest text-xs ${theme.btn}`}>
          <Plus size={20} />
          Abrir Agenda
        </Button>
      </header>

      <div className="grid lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
          <section className="space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-3 text-zinc-100">
              <Calendar size={28} className="text-amber-500" />
              Regras Ativas
            </h2>

            {loading ? (
              <div className="py-20 text-center text-zinc-500 italic">Carregando regras...</div>
            ) : rules.length > 0 ? (
              <div className="grid gap-6">
                <AnimatePresence mode="popLayout">
                  {rules.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds).map((rule) => (
                    <motion.div
                      key={rule.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                    >
                      <Card className={`group relative p-8 rounded-[32px] overflow-hidden transition-all hover:border-zinc-700 ${theme.card}`}>
                        <div className="flex justify-between items-start mb-6">
                          <div className={`p-4 rounded-2xl ${theme.isBeauty ? 'bg-pink-100 text-pink-600' : 'bg-zinc-950 border border-zinc-800 text-amber-500'}`}>
                            <Clock size={28} />
                          </div>
                          <Button variant="ghost" size="icon" className="h-10 w-10 text-zinc-600 hover:text-rose-500 hover:bg-zinc-800 rounded-xl" onClick={() => handleDeleteRule(rule.id)}>
                            <Trash2 size={20} />
                          </Button>
                        </div>

                        <div className="space-y-4">
                          <div className="flex flex-wrap gap-x-8 gap-y-4">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-1">Período</p>
                              <p className="text-lg font-bold text-zinc-100">{new Date(rule.startDate + 'T00:00:00').toLocaleDateString()} - {new Date(rule.endDate + 'T00:00:00').toLocaleDateString()}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-1">Horário</p>
                              <p className="text-lg font-bold text-zinc-100">{rule.startTime} @ {rule.endTime}</p>
                            </div>
                          </div>

                          <div className="pt-4 border-t border-zinc-800/50">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-3">Dias da Semana</p>
                            <div className="flex flex-wrap gap-2">
                              {DAYS_OF_WEEK.map((day) => (
                                <div 
                                  key={day.value}
                                  className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                    rule.daysOfWeek.includes(day.value)
                                      ? (theme.isBeauty ? 'bg-pink-500 text-white' : 'bg-amber-500 text-black')
                                      : 'bg-zinc-900 text-zinc-600'
                                  }`}
                                >
                                  {day.label}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className={`py-32 text-center rounded-[40px] border-2 border-dashed ${theme.isBeauty ? 'border-pink-100' : 'border-zinc-900 bg-zinc-950/20'}`}>
                <Calendar size={64} className="mx-auto mb-6 opacity-10" />
                <p className="italic text-lg text-zinc-500 font-light">Nenhuma regra de disponibilidade definida.</p>
                <Button onClick={() => setIsModalOpen(true)} className={`mt-10 px-10 py-7 rounded-2xl text-lg font-bold ${theme.btn}`}>Abrir Agenda Agora</Button>
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-8">
          <Card className={`p-8 rounded-[32px] ${theme.card}`}>
            <h2 className="text-xl font-bold mb-6 text-zinc-100 flex items-center gap-2">
               <Info size={18} className="text-amber-500" />
               Como funciona?
            </h2>
            <div className="space-y-6 text-sm text-zinc-400 font-light leading-relaxed">
              <p>
                Defina períodos nos quais você estará disponível. O sistema irá gerar slots para seus clientes baseados nessas regras.
              </p>
              <div className={`p-6 rounded-2xl ${theme.isBeauty ? 'bg-pink-50' : 'bg-black/40 border border-zinc-800'}`}>
                <p className="font-bold text-zinc-100 mb-2">Exemplo:</p>
                <p>Se você abrir das 08h às 18h de Seg a Sex, os clientes verão horários vagos dentro desse intervalo.</p>
              </div>
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
            onClick={() => setIsModalOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className={`relative w-full max-w-lg border rounded-[40px] p-10 shadow-2xl ${theme.isBeauty ? 'bg-white border-pink-100' : 'bg-zinc-900 border-zinc-800'}`}
          >
            <h2 className={`text-3xl font-bold mb-8 text-zinc-100 ${theme.fontDisplay}`}>
              Abrir <span className="text-amber-500">Agenda</span>
            </h2>
            <form onSubmit={handleSaveRule} className="space-y-8">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 px-1">Início do Período</label>
                  <Input 
                    type="date"
                    required
                    className={`h-14 rounded-2xl transition-all ${theme.isBeauty ? 'bg-white' : 'bg-black border-zinc-800 focus:border-amber-500'}`}
                    value={newRule.startDate}
                    onChange={(e) => setNewRule({...newRule, startDate: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 px-1">Fim do Período</label>
                  <Input 
                    type="date"
                    required
                    className={`h-14 rounded-2xl transition-all ${theme.isBeauty ? 'bg-white' : 'bg-black border-zinc-800 focus:border-amber-500'}`}
                    value={newRule.endDate}
                    onChange={(e) => setNewRule({...newRule, endDate: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 px-1">Hora Início</label>
                  <Input 
                    type="time"
                    required
                    className={`h-14 rounded-2xl transition-all ${theme.isBeauty ? 'bg-white' : 'bg-black border-zinc-800 focus:border-amber-500'}`}
                    value={newRule.startTime}
                    onChange={(e) => setNewRule({...newRule, startTime: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 px-1">Hora Fim</label>
                  <Input 
                    type="time"
                    required
                    className={`h-14 rounded-2xl transition-all ${theme.isBeauty ? 'bg-white' : 'bg-black border-zinc-800 focus:border-amber-500'}`}
                    value={newRule.endTime}
                    onChange={(e) => setNewRule({...newRule, endTime: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 px-1 block mb-2">Repetir nos dias</label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => handleToggleDay(day.value)}
                      className={`flex-1 min-w-[60px] py-4 rounded-2xl text-xs font-bold uppercase transition-all border ${
                        newRule.daysOfWeek.includes(day.value)
                          ? (theme.isBeauty ? 'bg-pink-500 border-pink-500 text-white' : 'bg-amber-500 border-amber-500 text-black')
                          : (theme.isBeauty ? 'bg-white border-pink-100 text-zinc-400' : 'bg-black border-zinc-800 text-zinc-600')
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <Button variant="ghost" className="flex-1 h-14 rounded-2xl font-bold uppercase tracking-widest text-xs" type="button" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                <Button className={`flex-1 h-14 rounded-2xl font-bold uppercase tracking-widest text-xs ${theme.btn}`} type="submit">Salvar Disponibilidade</Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
