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
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button, Card, Input } from '@/components/ui';
import { Plus, User, Trash2, ShieldCheck, ShieldAlert, Edit2, Mail, Loader2, Share2, Copy, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function StaffPage() {
  const { user } = useAuth();
  const [staff, setStaff] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [newStaff, setNewStaff] = useState({ name: '', role: '', email: '', phone: '', active: true });
  const [isSendingReset, setIsSendingReset] = useState(false);

  const getPortalUrl = (staffId: string) => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/book/${user?.uid}?staffId=${staffId}`;
  };

  const copyLink = (staffId: string) => {
    const url = getPortalUrl(staffId);
    navigator.clipboard.writeText(url);
    alert('Link do portal do profissional copiado!');
  };

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'staff'),
      where('ownerId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setStaff(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error('Error in staff snapshot:', error);
    });

    return () => unsubscribe();
  }, [user]);

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newStaff.name) return;

    try {
      if (editingStaff) {
        await updateDoc(doc(db, 'staff', editingStaff.id), {
          ...newStaff,
          updatedAt: serverTimestamp()
        });
        
        // Also update their user profile if it exists (search by email or link)
        // This is optional but good practice if you have a shared 'users' collection
      } else {
        await addDoc(collection(db, 'staff'), {
          ...newStaff,
          ownerId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      setNewStaff({ name: '', role: '', email: '', phone: '', active: true });
      setEditingStaff(null);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving staff:', error);
    }
  };

  const handleEditClick = (member: any) => {
    setEditingStaff(member);
    setNewStaff({
      name: member.name,
      role: member.role || '',
      email: member.email || '',
      phone: member.phone || '',
      active: member.active
    });
    setIsModalOpen(true);
  };

  const handleSendPasswordReset = async () => {
    if (!newStaff.email) {
      alert('Email é obrigatório para redefinir a senha.');
      return;
    }
    
    setIsSendingReset(true);
    try {
      await sendPasswordResetEmail(auth, newStaff.email);
      alert('Link de redefinição de senha enviado para o email do profissional.');
    } catch (error) {
      console.error('Error sending reset email:', error);
      alert('Erro ao enviar email: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    } finally {
      setIsSendingReset(false);
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
                    <Button variant="ghost" size="icon" onClick={() => handleEditClick(member)} className="text-zinc-500 hover:text-zinc-100">
                      <Edit2 size={16} />
                    </Button>
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
                
                <div className="flex flex-col gap-3 mt-4">
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${member.active ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`} />
                    <span className="text-[10px] uppercase font-bold tracking-tighter text-zinc-400">
                      {member.active ? 'Ativo na Agenda' : 'Indisponível'}
                    </span>
                  </div>

                  <div className="pt-4 border-t border-zinc-800 flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 gap-2 text-xs h-9 bg-zinc-900 border-zinc-800"
                      onClick={() => copyLink(member.id)}
                    >
                      <Copy size={12} />
                      Copiar Portal
                    </Button>
                    <a 
                      href={getPortalUrl(member.id)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center p-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-colors"
                    >
                      <ExternalLink size={14} className="text-zinc-500" />
                    </a>
                  </div>
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
            <h2 className="text-2xl font-display font-bold mb-6 text-zinc-100">
              {editingStaff ? 'Editar Profissional' : 'Novo Profissional'}
            </h2>
            <form onSubmit={handleSaveStaff} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Nome</label>
                  <Input 
                    required 
                    value={newStaff.name}
                    onChange={(e) => setNewStaff({...newStaff, name: e.target.value})}
                    placeholder="Ex: Carlos Eduardo"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Cargo</label>
                  <Input 
                    value={newStaff.role}
                    onChange={(e) => setNewStaff({...newStaff, role: e.target.value})}
                    placeholder="Ex: Barbeiro Master"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">E-mail</label>
                  <Input 
                    type="email"
                    required
                    value={newStaff.email}
                    onChange={(e) => setNewStaff({...newStaff, email: e.target.value})}
                    placeholder="Ex: carlos@email.com"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Telefone</label>
                  <Input 
                    value={newStaff.phone}
                    onChange={(e) => setNewStaff({...newStaff, phone: e.target.value})}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              {editingStaff && (
                <div className="pt-2 border-t border-zinc-800 mt-4">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    className="w-full justify-start gap-2 text-zinc-400 hover:text-zinc-100 p-0 h-auto"
                    onClick={handleSendPasswordReset}
                    disabled={isSendingReset}
                  >
                    {isSendingReset ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Mail size={14} />
                    )}
                    Enviar link de redefinição de senha
                  </Button>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button variant="outline" className="flex-1" type="button" onClick={() => {
                  setIsModalOpen(false);
                  setEditingStaff(null);
                  setNewStaff({ name: '', role: '', email: '', phone: '', active: true });
                }}>Cancelar</Button>
                <Button className="flex-1" type="submit">
                  {editingStaff ? 'Salvar' : 'Cadastrar'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
