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
import { Plus, Search, Trash2, Phone, Mail, MoreVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function ClientsPage() {
  const { user } = useAuth();
  const [clients, setClients] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [newClient, setNewClient] = useState({ name: '', email: '', phone: '', notes: '' });

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'clients'),
      where('ownerId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribe();
  }, [user]);

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newClient.name) return;

    try {
      await addDoc(collection(db, 'clients'), {
        ...newClient,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
      });
      setNewClient({ name: '', email: '', phone: '', notes: '' });
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error adding client:', error);
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este cliente?')) {
      try {
        await deleteDoc(doc(db, 'clients', id));
      } catch (error) {
        console.error('Error deleting client:', error);
      }
    }
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Clientes</h1>
          <p className="text-zinc-500">Gerencie sua lista de contatos e histórico.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus size={18} />
          Novo Cliente
        </Button>
      </header>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
        <Input 
          placeholder="Buscar por nome ou email..." 
          className="pl-10 h-12 bg-zinc-900 border-zinc-800"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredClients.map((client) => (
            <motion.div
              key={client.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <Card className="group hover:border-zinc-700 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="h-12 w-12 rounded-full bg-zinc-800 flex items-center justify-center text-xl font-bold border border-zinc-700">
                    {client.name[0]}
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-red-500" onClick={() => handleDeleteClient(client.id)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
                <h3 className="font-display font-bold text-lg mb-4">{client.name}</h3>
                <div className="space-y-2 text-sm text-zinc-400">
                  <div className="flex items-center gap-2">
                    <Mail size={14} />
                    {client.email || 'N/A'}
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone size={14} />
                    {client.phone || 'N/A'}
                  </div>
                </div>
                {client.notes && (
                  <div className="mt-4 pt-4 border-t border-zinc-800/50 text-xs text-zinc-500 italic">
                    {client.notes}
                  </div>
                )}
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
            <h2 className="text-2xl font-display font-bold mb-6">Novo Cliente</h2>
            <form onSubmit={handleAddClient} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Nome Completo</label>
                <Input 
                  required 
                  value={newClient.name}
                  onChange={(e) => setNewClient({...newClient, name: e.target.value})}
                  placeholder="Ex: João Silva"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Email</label>
                <Input 
                  type="email"
                  value={newClient.email}
                  onChange={(e) => setNewClient({...newClient, email: e.target.value})}
                  placeholder="joao@email.com"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Telefone</label>
                <Input 
                  value={newClient.phone}
                  onChange={(e) => setNewClient({...newClient, phone: e.target.value})}
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Notas</label>
                <textarea 
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm focus:ring-2 focus:ring-zinc-700 outline-none"
                  rows={3}
                  value={newClient.notes}
                  onChange={(e) => setNewClient({...newClient, notes: e.target.value})}
                  placeholder="Restrições, preferências, etc."
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button variant="outline" className="flex-1" type="button" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                <Button className="flex-1" type="submit">Salvar</Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
