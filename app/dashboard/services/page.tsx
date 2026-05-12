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
  doc
} from 'firebase/firestore';
import { Button, Card, Input } from '@/components/ui';
import { Plus, Scissors, Trash2, Clock, DollarSign, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getTheme } from '@/lib/theme';

export default function ServicesPage() {
  const { user, profile } = useAuth();
  const [services, setServices] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', duration: '', price: '', description: '' });
  const theme = getTheme(profile?.businessType);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'services'),
      where('ownerId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error('Error in services snapshot:', error);
    });

    return () => unsubscribe();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.name) return;

    try {
      if (editingService) {
        await updateDoc(doc(db, 'services', editingService.id), {
          ...formData,
          duration: Number(formData.duration),
          price: Number(formData.price),
        });
      } else {
        await addDoc(collection(db, 'services'), {
          ...formData,
          duration: Number(formData.duration),
          price: Number(formData.price),
          ownerId: user.uid,
        });
      }
      handleCloseModal();
    } catch (error) {
      console.error('Error saving service:', error);
    }
  };

  const handleEdit = (service: any) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      duration: service.duration.toString(),
      price: service.price.toString(),
      description: service.description || '',
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingService(null);
    setFormData({ name: '', duration: '', price: '', description: '' });
    setIsModalOpen(false);
  };

  const handleDeleteService = async (id: string) => {
    if (confirm('Excluir este serviço?')) {
      try {
        await deleteDoc(doc(db, 'services', id));
      } catch (error) {
        console.error('Error deleting service:', error);
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-12">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-8 border-b border-zinc-900">
        <div>
          <h1 className={`text-4xl md:text-5xl font-bold tracking-tight ${theme.fontDisplay} text-zinc-100`}>Serviços</h1>
          <p className={`${theme.muted} mt-2 text-lg font-light`}>Defina o menu de experiências do seu estabelecimento.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className={`gap-3 h-14 px-8 rounded-2xl font-bold uppercase tracking-widest text-xs ${theme.btn}`}>
          <Plus size={20} />
          Novo Serviço
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <AnimatePresence mode="popLayout">
          {services.map((service) => (
            <motion.div
              key={service.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <Card className={`group relative p-8 rounded-[32px] overflow-hidden transition-all hover:border-zinc-700 ${theme.card}`}>
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Scissors size={80} />
                </div>
                <div className="flex justify-between items-start mb-8 relative z-10">
                  <div className={`p-4 rounded-2xl ${theme.isBeauty ? 'bg-pink-100 text-pink-600' : 'bg-zinc-950 border border-zinc-800 text-amber-500'}`}>
                    <Scissors size={28} />
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-10 w-10 text-zinc-500 hover:text-amber-500 hover:bg-zinc-800 rounded-xl" onClick={() => handleEdit(service)}>
                      <Edit2 size={18} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-10 w-10 text-zinc-500 hover:text-rose-500 hover:bg-zinc-800 rounded-xl" onClick={() => handleDeleteService(service.id)}>
                      <Trash2 size={18} />
                    </Button>
                  </div>
                </div>
                <h3 className={`text-2xl font-bold mb-3 tracking-tight text-zinc-100 ${theme.fontDisplay}`}>{service.name}</h3>
                <p className={`text-sm ${theme.muted} mb-8 line-clamp-2 font-light leading-relaxed`}>{service.description || 'Uma experiência premium pensada para você.'}</p>
                
                <div className="flex items-center justify-between pt-6 border-t border-zinc-800/50 relative z-10">
                  <div className="flex items-center gap-2.5 text-zinc-400 font-medium">
                    <Clock size={16} className="text-amber-500" />
                    <span className="text-sm">{service.duration} min</span>
                  </div>
                  <div className="text-2xl font-bold text-zinc-100 tracking-tighter">
                    R$ {service.price}
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
            onClick={handleCloseModal}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className={`relative w-full max-w-md border rounded-[32px] p-10 shadow-2xl ${theme.isBeauty ? 'bg-white border-pink-100' : 'bg-zinc-900 border-zinc-800'}`}
          >
            <h2 className={`text-3xl font-bold mb-8 text-zinc-100 ${theme.fontDisplay}`}>
              {editingService ? 'Editar' : 'Novo'} <span className="text-amber-500">Serviço</span>
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 px-1">Nome do Experiência</label>
                <Input 
                  required 
                  className={`h-12 rounded-xl transition-all ${theme.isBeauty ? 'bg-white' : 'bg-black border-zinc-800 focus:border-amber-500'}`}
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Ex: Corte Artístico"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 px-1">Tempo (min)</label>
                  <Input 
                    type="number"
                    required 
                    className={`h-12 rounded-xl transition-all ${theme.isBeauty ? 'bg-white' : 'bg-black border-zinc-800 focus:border-amber-500'}`}
                    value={formData.duration}
                    onChange={(e) => setFormData({...formData, duration: e.target.value})}
                    placeholder="30"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 px-1">Valor (R$)</label>
                  <Input 
                    type="number"
                    required 
                    className={`h-12 rounded-xl transition-all ${theme.isBeauty ? 'bg-white' : 'bg-black border-zinc-800 focus:border-amber-500'}`}
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    placeholder="50"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 px-1">Breve Descrição</label>
                <textarea 
                  className={`w-full rounded-xl p-4 text-sm outline-none transition-all border ${theme.isBeauty ? 'bg-white border-pink-100 focus:border-pink-500' : 'bg-black border-zinc-800 focus:border-amber-500 text-zinc-300'}`}
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Descreva a experiência para seu cliente..."
                />
              </div>
              <div className="flex gap-4 pt-6">
                <Button variant="ghost" className="flex-1 h-14 rounded-2xl font-bold uppercase tracking-widest text-xs" type="button" onClick={handleCloseModal}>Cancelar</Button>
                <Button className={`flex-1 h-14 rounded-2xl font-bold uppercase tracking-widest text-xs ${theme.btn}`} type="submit">Salvar</Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
