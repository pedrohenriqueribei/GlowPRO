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
  updateDoc,
  doc,
  deleteDoc
} from 'firebase/firestore';
import { Button, Card, Input } from '@/components/ui';
import { Plus, Calendar as CalendarIcon, Clock, User, Scissors, Trash2, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function AppointmentsPage() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [newAppointment, setNewAppointment] = useState({
    clientId: '',
    serviceId: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '',
    notes: ''
  });

  useEffect(() => {
    if (!user) return;

    const qApts = query(collection(db, 'appointments'), where('ownerId', '==', user.uid));
    const unsubscribeApts = onSnapshot(qApts, (snapshot) => {
      setAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qClients = query(collection(db, 'clients'), where('ownerId', '==', user.uid));
    const unsubscribeClients = onSnapshot(qClients, (snapshot) => {
      setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qServices = query(collection(db, 'services'), where('ownerId', '==', user.uid));
    const unsubscribeServices = onSnapshot(qServices, (snapshot) => {
      setServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribeApts();
      unsubscribeClients();
      unsubscribeServices();
    };
  }, [user]);

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newAppointment.clientId || !newAppointment.serviceId) return;

    const client = clients.find(c => c.id === newAppointment.clientId);
    const service = services.find(s => s.id === newAppointment.serviceId);

    try {
      await addDoc(collection(db, 'appointments'), {
        ...newAppointment,
        clientName: client?.name,
        serviceName: service?.name,
        ownerId: user.uid,
        status: 'scheduled',
        createdAt: serverTimestamp(),
      });
      setIsModalOpen(false);
      setNewAppointment({
        clientId: '',
        serviceId: '',
        date: selectedDate,
        startTime: '',
        notes: ''
      });
    } catch (error) {
      console.error('Error creating appointment:', error);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await updateDoc(doc(db, 'appointments', id), { status });
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const deleteAppointment = async (id: string) => {
    if (confirm('Excluir este agendamento permanentemente?')) {
      try {
        await deleteDoc(doc(db, 'appointments', id));
      } catch (error) {
        console.error('Error deleting:', error);
      }
    }
  };

  const filteredAppointments = appointments
    .filter(a => a.date === selectedDate)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const pendingAppointments = appointments.filter(a => a.status === 'pending');

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-zinc-100">Agenda</h1>
          <p className="text-zinc-500">Controle de horários e atendimento.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus size={18} />
          Agendar Horário
        </Button>
      </header>

      {pendingAppointments.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-display font-bold flex items-center gap-2 text-amber-500 px-2">
            <Clock size={18} />
            Solicitações Pendentes ({pendingAppointments.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingAppointments.map(apt => (
              <Card key={apt.id} className="border-amber-500/20 bg-amber-500/[0.02] p-4 flex justify-between items-center group">
                <div>
                  <p className="font-bold">{apt.clientName}</p>
                  <p className="text-xs text-zinc-500">{apt.serviceName} • {apt.date} {apt.startTime}</p>
                  {apt.clientPhone && <p className="text-[10px] text-zinc-600 mt-1">{apt.clientPhone} (Public Booking)</p>}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-8 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/10" onClick={() => updateStatus(apt.id, 'scheduled')}>
                    Confirmar
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 border-red-500/20 text-red-500 hover:bg-red-500/10" onClick={() => updateStatus(apt.id, 'cancelled')}>
                    Recusar
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      <div className="flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-80 space-y-4">
          <Card className="p-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4 px-2">Selecionar Data</h3>
            <Input 
              type="date" 
              value={selectedDate} 
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-zinc-950 border-zinc-800"
            />
          </Card>
          
          <Card className="p-6 bg-zinc-900/20 border-zinc-800/50">
            <h3 className="font-display font-bold mb-4">Resumo do dia</h3>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">Total</span>
                <span className="text-zinc-100 font-bold">{filteredAppointments.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Concluídos</span>
                <span className="text-emerald-500 font-bold">{filteredAppointments.filter(a => a.status === 'completed').length}</span>
              </div>
            </div>
          </Card>
        </div>

        <div className="flex-1 space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredAppointments.length > 0 ? (
              filteredAppointments.map((apt) => (
                <motion.div
                  key={apt.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <Card className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4 transition-all group ${
                    apt.status === 'completed' ? 'opacity-50 border-zinc-900' : 'hover:border-zinc-700'
                  }`}>
                    <div className="flex items-center gap-6">
                      <div className="text-center min-w-[60px] border-r border-zinc-800 pr-4">
                        <p className="text-lg font-bold font-display">{apt.startTime}</p>
                        <p className="text-[10px] uppercase font-bold text-zinc-500">Horário</p>
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold flex items-center gap-2">
                          <User size={14} className="text-zinc-500" />
                          {apt.clientName}
                        </p>
                        <p className="text-xs text-zinc-400 flex items-center gap-2">
                          <Scissors size={14} className="text-zinc-500" />
                          {apt.serviceName} {apt.staffName && `• ${apt.staffName}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      {apt.status === 'scheduled' && (
                        <>
                          <Button variant="outline" size="sm" className="h-8 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/10" onClick={() => updateStatus(apt.id, 'completed')}>
                            <Check size={14} />
                          </Button>
                          <Button variant="outline" size="sm" className="h-8 text-red-500 border-red-500/20 hover:bg-red-500/10" onClick={() => updateStatus(apt.id, 'cancelled')}>
                            <X size={14} />
                          </Button>
                        </>
                      )}
                      {apt.status === 'completed' && (
                        <span className="text-xs font-bold uppercase text-emerald-500 px-2 py-1 bg-emerald-500/10 rounded">Concluído</span>
                      )}
                      {apt.status === 'cancelled' && (
                        <span className="text-xs font-bold uppercase text-red-500 px-2 py-1 bg-red-500/10 rounded">Cancelado</span>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-800 group-hover:text-zinc-500" onClick={() => deleteAppointment(apt.id)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-600 border-2 border-dashed border-zinc-900 rounded-3xl">
                <Clock size={48} className="mb-4 opacity-10" />
                <p className="italic">Nenhum agendamento para esta data.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
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
            <h2 className="text-2xl font-display font-bold mb-6 text-zinc-100">Agendar Horário</h2>
            <form onSubmit={handleCreateAppointment} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Cliente</label>
                <select 
                  className="w-full h-10 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-700 outline-none appearance-none"
                  required
                  value={newAppointment.clientId}
                  onChange={(e) => setNewAppointment({...newAppointment, clientId: e.target.value})}
                >
                  <option value="">Selecione um cliente</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Serviço</label>
                <select 
                  className="w-full h-10 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-700 outline-none appearance-none"
                  required
                  value={newAppointment.serviceId}
                  onChange={(e) => setNewAppointment({...newAppointment, serviceId: e.target.value})}
                >
                  <option value="">Selecione um serviço</option>
                  {services.map(s => <option key={s.id} value={s.id}>{s.name} - R$ {s.price}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Data</label>
                  <Input 
                    type="date"
                    required
                    value={newAppointment.date}
                    onChange={(e) => setNewAppointment({...newAppointment, date: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Início</label>
                  <Input 
                    type="time"
                    required
                    value={newAppointment.startTime}
                    onChange={(e) => setNewAppointment({...newAppointment, startTime: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Observações</label>
                <textarea 
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm focus:ring-2 focus:ring-zinc-700 outline-none text-zinc-100"
                  rows={2}
                  value={newAppointment.notes}
                  onChange={(e) => setNewAppointment({...newAppointment, notes: e.target.value})}
                  placeholder="Instruções especiais..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" className="flex-1" type="button" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                <Button className="flex-1" type="submit">Agendar</Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
