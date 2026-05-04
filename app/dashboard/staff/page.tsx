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
  deleteDoc,
  doc,
  updateDoc
} from 'firebase/firestore';
import { Button, Card, Input } from '@/components/ui';
import { Plus, User, Trash2, ShieldCheck, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function StaffPage() {
  const { user } = useAuth();
  const [staff, setStaff] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: '', role: '', active: true });

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'staff'),
      where('ownerId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setStaff(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribe();
  }, [user]);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newStaff.name) return;

    try {
      await addDoc(collection(db, 'staff'), {
        ...newStaff,
        ownerId: user.uid,
      });
      setNewStaff({ name: '', role: '', active: true });
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error adding staff:', error);
    }
  };

  const toggleStatus = async (id: string, current: boolean) => {
    try {
      await updateDoc(doc(db, 'staff', id), { active: !current });
    } catch (error) {
      console.error('Error updating staff status:', error);
    }
  };

  const handleDeleteStaff = async (id: string) => {
    if (confirm('Excluir este profissional?')) {
      try {
        await deleteDoc(doc(db, 'staff', id));
      } catch (error) {
        console.error('Error deleting staff:', error);
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Equipe</h1>
          <p className="text-zinc-500">Gerencie os profissionais que atendem no seu salão.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus size={18} />
          Novo Profissional
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {staff.map((member) => (
            <motion.div
              key={member.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <Card className={`group relative transition-all ${!member.active && 'opacity-60 grayscale'}`}>
                <div className="flex justify-between items-start mb-4">
                  <div className="h-16 w-16 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-100 border-2 border-zinc-700">
                    <User size={32} />
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => toggleStatus(member.id, member.active)} className="text-zinc-500 hover:text-zinc-100">
                      {member.active ? <ShieldCheck size={18} className="text-emerald-500" /> : <ShieldAlert size={18} className="text-zinc-500" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="text-zinc-500 hover:text-red-500" onClick={() => handleDeleteStaff(member.id)}>
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
                <h3 className="text-xl font-display font-bold">{member.name}</h3>
                <p className="text-sm text-zinc-500 mb-4">{member.role || 'Especialista'}</p>
                
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${member.active ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`} />
                  <span className="text-[10px] uppercase font-bold tracking-tighter text-zinc-400">
                    {member.active ? 'Ativo na Agenda' : 'Indisponível'}
                  </span>
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl"
          >
            <h2 className="text-2xl font-display font-bold mb-6 text-zinc-100">Novo Profissional</h2>
            <form onSubmit={handleAddStaff} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Nome do Profissional</label>
                <Input 
                  required 
                  value={newStaff.name}
                  onChange={(e) => setNewStaff({...newStaff, name: e.target.value})}
                  placeholder="Ex: Carlos Eduardo"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Especialidade / Cargo</label>
                <Input 
                  value={newStaff.role}
                  onChange={(e) => setNewStaff({...newStaff, role: e.target.value})}
                  placeholder="Ex: Barbeiro Master"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button variant="outline" className="flex-1" type="button" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                <Button className="flex-1" type="submit">Cadastrar</Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
