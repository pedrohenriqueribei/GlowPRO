'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/context/auth-context';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { 
  collection, 
  query, 
  getDocs, 
  orderBy,
  addDoc,
  onSnapshot
} from 'firebase/firestore';
import { Card, Input, Button } from '@/components/ui';
import { 
  Building2, 
  Users, 
  Calendar, 
  ShieldCheck, 
  Search, 
  ArrowUpRight,
  Plus,
  X,
  Store,
  Mail,
  User as UserIcon,
  Phone,
  MapPin,
  ChevronLeft,
  Trash2,
  Briefcase,
  ExternalLink,
  Copy,
  Settings
} from 'lucide-react';
import { getTheme } from '@/lib/theme';
import { setDoc, doc, serverTimestamp, deleteDoc, where } from 'firebase/firestore';
import { useSearchParams } from 'next/navigation';

function AdminDashboardInner() {
  const { user: currentUser, profile, isAdmin } = useAuth();
  const theme = getTheme(profile?.businessType, 'admin');
  const searchParams = useSearchParams();
  
  const [activeTab, setActiveTab] = useState<'salons' | 'users' | 'appointments'>('salons');
  const [salons, setSalons] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Salon for detailed management
  const [selectedSalon, setSelectedSalon] = useState<any | null>(null);
  const [salonStaff, setSalonStaff] = useState<any[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);

  // New Establishment Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isSavingStaff, setIsSavingStaff] = useState(false);
  const [staffFormData, setStaffFormData] = useState({
    name: '',
    role: '',
    email: '',
  });

  const fetchSalonStaff = async (salonId: string) => {
    setLoadingStaff(true);
    try {
      const q = query(collection(db, 'staff'), where('ownerId', '==', salonId));
      const snap = await getDocs(q);
      setSalonStaff(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error('Error fetching staff:', error);
    } finally {
      setLoadingStaff(false);
    }
  };

  const handleManageStaff = (salon: any) => {
    setSelectedSalon(salon);
    fetchSalonStaff(salon.id);
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSalon) return;

    setIsSavingStaff(true);
    const path = 'staff';
    try {
      await addDoc(collection(db, path), {
        ownerId: selectedSalon.id,
        name: staffFormData.name,
        role: staffFormData.role,
        email: staffFormData.email,
        active: true,
        createdAt: serverTimestamp()
      });

      alert('Profissional adicionado com sucesso!');
      setIsStaffModalOpen(false);
      setStaffFormData({ name: '', role: '', email: '' });
      fetchSalonStaff(selectedSalon.id);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    } finally {
      setIsSavingStaff(false);
    }
  };

  const handleDeleteStaff = async (staffId: string) => {
    if (!confirm('Tem certeza que deseja remover este profissional?')) return;
    try {
      await deleteDoc(doc(db, 'staff', staffId));
      setSalonStaff(prev => prev.filter(s => s.id !== staffId));
    } catch (error) {
      console.error('Error deleting staff:', error);
    }
  };

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsModalOpen(true);
    }
  }, [searchParams]);

  const handleUpdateBusinessType = async (type: string) => {
    if (!selectedSalon) return;
    try {
      await setDoc(doc(db, 'users', selectedSalon.id), {
        businessType: type,
        updatedAt: serverTimestamp()
      }, { merge: true });
      setSelectedSalon({...selectedSalon, businessType: type});
      alert('Configuração atualizada!');
    } catch (e) {
      console.error(e);
      alert('Erro ao atualizar tipo de negócio.');
    }
  };

  const copyBookingLink = () => {
    if (!selectedSalon) return;
    const link = `${window.location.origin}/book/${selectedSalon.id}`;
    navigator.clipboard.writeText(link);
    alert('Link copiado para a área de transferência!');
  };

  // Auto-register Master Admin in database
  useEffect(() => {
    const ensureAdminData = async () => {
      if (currentUser && currentUser.email === 'pedrohenriqueribei@gmail.com') {
        try {
          await setDoc(doc(db, 'admins', currentUser.uid), {
            email: currentUser.email,
            updatedAt: serverTimestamp()
          }, { merge: true });
          
          await setDoc(doc(db, 'users', currentUser.uid), {
            role: 'admin',
            email: currentUser.email,
            updatedAt: serverTimestamp()
          }, { merge: true });
        } catch (e) {
          console.error('Error auto-registering admin:', e);
        }
      }
    };
    if (isAdmin) ensureAdminData();
  }, [currentUser, isAdmin]);

  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    businessName: '',
    businessType: 'barber',
    phone: '',
    address: ''
  });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.businessName) {
      alert('Por favor, preencha o Nome e o Email.');
      return;
    }

    setIsSaving(true);
    const path = 'users';
    try {
      console.log('Admin registration starting for:', formData.email);
      // Create the establishment user document
      const docRef = await addDoc(collection(db, path), {
        name: formData.name,
        email: formData.email.toLowerCase(),
        businessName: formData.businessName,
        businessType: formData.businessType,
        phone: formData.phone,
        address: formData.address,
        role: 'profissional',
        isOwner: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log('Registration success! Doc ID:', docRef.id);

      setIsModalOpen(false);
      setFormData({ name: '', email: '', businessName: '', businessType: 'barber', phone: '', address: '' });
      alert('Estabelecimento cadastrado com sucesso! O proprietário agora pode realizar o login com o email cadastrado.');
      
    } catch (error) {
      console.error('CRITICAL: Registration error details:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      alert(`Falha no cadastro:\n\n${errorMessage}\n\nVerifique sua conexão e permissões.`);
      
      try {
        handleFirestoreError(error, OperationType.WRITE, path);
      } catch (e) {
        // Log details but don't block
        console.error('Detailed Error Analysis:', e);
      }
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;

    // Users (Salons and Clients)
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersList = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setAllUsers(usersList);
      setSalons(usersList.filter((u: any) => u.role === 'professional' || u.role === 'profissional'));
      setLoading(false);
    }, (error) => {
      console.error('Error in admin users snapshot:', error);
      setLoading(false);
    });

    // Appointments
    const aptsQ = query(collection(db, 'appointments'), orderBy('createdAt', 'desc'));
    const unsubApts = onSnapshot(aptsQ, (snapshot) => {
      setAppointments(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      console.error('Error in admin appointments snapshot:', error);
    });

    return () => {
      unsubUsers();
      unsubApts();
    };
  }, [isAdmin]);

  const filteredData = () => {
    let data = activeTab === 'salons' ? salons : activeTab === 'users' ? allUsers : appointments;
    if (!searchQuery) return data;
    
    const query = searchQuery.toLowerCase();
    return data.filter((item: any) => 
      (item.businessName?.toLowerCase().includes(query)) ||
      (item.name?.toLowerCase().includes(query)) ||
      (item.email?.toLowerCase().includes(query)) ||
      (item.clientName?.toLowerCase().includes(query)) ||
      (item.serviceName?.toLowerCase().includes(query))
    );
  };

  return (
    <div className="space-y-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-zinc-900">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg ${theme.roleBadge}`}>
              <ShieldCheck size={20} />
            </div>
            <span className={`text-xs font-bold uppercase tracking-widest ${theme.accent}`}>Gestor da Plataforma</span>
          </div>
          {selectedSalon ? (
            <div className="flex items-center gap-4">
               <button 
                onClick={() => setSelectedSalon(null)}
                className="p-2 hover:bg-zinc-800 rounded-xl transition-colors"
               >
                 <ChevronLeft size={32} className="text-zinc-400 font-bold" />
               </button>
               <div>
                  <h1 className={`text-4xl md:text-5xl font-bold tracking-tight ${theme.fontDisplay} text-zinc-100`}>
                    {selectedSalon.businessName}
                  </h1>
                  <p className="text-zinc-500 font-medium">Gerenciando equipe e configurações</p>
               </div>
            </div>
          ) : (
            <>
              <h1 className={`text-4xl md:text-5xl font-bold tracking-tight ${theme.fontDisplay} text-zinc-100`}>Bem-vindo, Pedro</h1>
              <p className={`${theme.muted} mt-2 text-lg font-light`}>Visão global e controle master do GlowPRO.</p>
            </>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-center">
          {selectedSalon ? (
            <Button 
              onClick={() => setIsStaffModalOpen(true)}
              className={`w-full sm:w-auto h-14 px-8 rounded-2xl gap-2 font-bold uppercase tracking-widest text-xs ${theme.btn}`}
            >
              <Plus size={20} />
              Adicionar Profissional
            </Button>
          ) : (
            <Button 
              onClick={() => setIsModalOpen(true)}
              className={`w-full sm:w-auto h-14 px-8 rounded-2xl gap-2 font-bold uppercase tracking-widest text-xs ${theme.btn}`}
            >
              <Plus size={20} />
              Novo Estabelecimento
            </Button>
          )}

          {!selectedSalon && (
            <div className="flex bg-zinc-900 border border-zinc-800 p-1 rounded-2xl">
              {[
                { id: 'salons', label: 'Estabelecimentos', icon: Building2 },
                { id: 'users', label: 'Usuários', icon: Users },
                { id: 'appointments', label: 'Agendamentos', icon: Calendar },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold uppercase tracking-widest transition-all ${
                    activeTab === tab.id 
                      ? 'bg-zinc-800 text-amber-500' 
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Staff Registration Modal */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl">
            <header className="p-6 border-b border-zinc-800 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <UserIcon size={20} className="text-amber-500" />
                  Novo Profissional
                </h2>
                <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold mt-1">Alocar em {selectedSalon?.businessName}</p>
              </div>
              <button onClick={() => setIsStaffModalOpen(false)} className="p-2 hover:bg-zinc-800 rounded-xl">
                <X size={20} />
              </button>
            </header>

            <form onSubmit={handleAddStaff} className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                    <UserIcon size={12} />
                    Nome Completo
                  </label>
                  <Input 
                    value={staffFormData.name}
                    onChange={(e) => setStaffFormData({...staffFormData, name: e.target.value})}
                    placeholder="Ex: Carlos Barbeiro" required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                    <Briefcase size={12} />
                    Cargo / Especialidade
                  </label>
                  <Input 
                    value={staffFormData.role}
                    onChange={(e) => setStaffFormData({...staffFormData, role: e.target.value})}
                    placeholder="Ex: Barbeiro Senior, Especialista em Noivas" required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                    <Mail size={12} />
                    Email (Opcional)
                  </label>
                  <Input 
                    type="email"
                    value={staffFormData.email}
                    onChange={(e) => setStaffFormData({...staffFormData, email: e.target.value})}
                    placeholder="carlos@glowpro.com"
                  />
                </div>
              </div>

              <Button disabled={isSavingStaff} className={`w-full py-6 rounded-2xl font-bold uppercase tracking-widest text-xs mt-4 ${theme.btn}`}>
                {isSavingStaff ? 'Salvando...' : 'Adicionar à Equipe'}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Registration Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl">
            <header className="p-6 border-b border-zinc-800 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Building2 size={20} className="text-amber-500" />
                  Cadastrar Estabelecimento
                </h2>
                <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold mt-1">GlowPRO Master Panel</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-zinc-800 rounded-xl">
                <X size={20} />
              </button>
            </header>

            <form onSubmit={handleRegister} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                    <UserIcon size={12} />
                    Nome do Proprietário
                  </label>
                  <Input 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Ex: João Silva" required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                    <Mail size={12} />
                    Email
                  </label>
                  <Input 
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="joao@email.com" required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                    <Phone size={12} />
                    Telefone
                  </label>
                  <Input 
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                    <Store size={12} />
                    Nome do Estabelecimento
                  </label>
                  <Input 
                    value={formData.businessName}
                    onChange={(e) => setFormData({...formData, businessName: e.target.value})}
                    placeholder="Ex: Vintage Barber Shop" required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                    <MapPin size={12} />
                    Endereço
                  </label>
                  <Input 
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    placeholder="Rua, Número, Bairro, Cidade" required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Tipo de Negócio</label>
                  <select 
                    value={formData.businessType}
                    onChange={(e) => setFormData({...formData, businessType: e.target.value})}
                    className="w-full h-12 rounded-2xl bg-zinc-950 border border-zinc-800 px-4 text-sm text-zinc-100 focus:border-amber-500 outline-none"
                  >
                    <option value="barber">Barbearia</option>
                    <option value="beauty">Salão de Beleza</option>
                  </select>
                </div>
              </div>

              <Button disabled={isSaving} className={`w-full py-6 rounded-2xl font-bold uppercase tracking-widest text-xs mt-4 ${theme.btn}`}>
                {isSaving ? 'Registrando...' : 'Finalizar Cadastro'}
              </Button>
            </form>
          </div>
        </div>
      )}

      {selectedSalon ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <Card className={`p-8 border ${theme.card} flex flex-col gap-4`}>
                <div className="flex items-center gap-4">
                   <div className="p-4 rounded-3xl bg-zinc-950 border border-zinc-800 text-blue-500">
                      <Building2 size={32} />
                   </div>
                   <div>
                      <p className="text-sm font-bold text-zinc-100">{selectedSalon.businessName}</p>
                      <p className="text-xs text-zinc-500">Estabelecimento Ativo</p>
                   </div>
                </div>
                <div className="space-y-3 pt-4 border-t border-zinc-800/50">
                   <div className="flex items-center gap-3 text-xs text-zinc-400">
                      <UserIcon size={14} />
                      {selectedSalon.name}
                   </div>
                   <div className="flex items-center gap-3 text-xs text-zinc-400">
                      <Mail size={14} />
                      {selectedSalon.email}
                   </div>
                   <div className="flex items-center gap-3 text-xs text-zinc-400">
                      <MapPin size={14} />
                      <span className="truncate">{selectedSalon.address}</span>
                   </div>
                </div>
                <div className="pt-4 border-t border-zinc-800/50 space-y-4">
                   <div className="space-y-2">
                     <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Configuração do Portal</p>
                     <div className="flex gap-2">
                        <button 
                          onClick={() => handleUpdateBusinessType('barber')}
                          className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border ${
                            selectedSalon.businessType === 'barber' ? 'bg-amber-500 border-amber-500 text-zinc-950' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                          }`}
                        >
                          Barbearia
                        </button>
                        <button 
                          onClick={() => handleUpdateBusinessType('beauty')}
                          className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border ${
                            selectedSalon.businessType === 'beauty' ? 'bg-pink-500 border-pink-500 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                          }`}
                        >
                          Beleza
                        </button>
                     </div>
                   </div>

                   <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Portal de Agendamento</p>
                      <div className="flex gap-2">
                         <Button 
                          onClick={copyBookingLink}
                          variant="outline" 
                          className="flex-1 h-10 gap-2 text-[10px] border-zinc-800 bg-zinc-900"
                         >
                           <Copy size={14} />
                           Copiar Link
                         </Button>
                         <Button 
                          onClick={() => window.open(`/book/${selectedSalon.id}`, '_blank')}
                          className="flex-1 h-10 gap-2 text-[10px] bg-zinc-100 text-zinc-950 hover:bg-zinc-200"
                         >
                           <ExternalLink size={14} />
                           Abrir Portal
                         </Button>
                      </div>
                   </div>

                   <button 
                    onClick={async () => {
                      if (confirm('REMOVER ESTABELECIMENTO? Isso não remove o usuário, mas retira o status de profissional ativo.')) {
                        try {
                          await deleteDoc(doc(db, 'users', selectedSalon.id));
                          setSelectedSalon(null);
                          // Refresh
                          const usersSnap = await getDocs(collection(db, 'users'));
                          const usersList = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                          setSalons(usersList.filter((u: any) => u.role === 'professional'));
                        } catch (e) {
                          console.error(e);
                        }
                      }
                    }}
                    className="w-full py-3 rounded-2xl bg-red-500/10 text-red-500 text-[10px] font-bold uppercase tracking-widest hover:bg-red-500/20 transition-colors"
                   >
                     Remover Estabelecimento
                   </button>
                </div>
             </Card>

             <Card className={`md:col-span-2 p-8 border ${theme.card}`}>
                <div className="flex items-center justify-between mb-8">
                   <div>
                      <h3 className="text-xl font-bold flex items-center gap-2">
                        <Users size={20} className="text-amber-500" />
                        Equipe de Profissionais
                      </h3>
                      <p className="text-sm text-zinc-500">Pessoas alocadas neste estabelecimento</p>
                   </div>
                   <span className="text-xs font-black uppercase tracking-widest bg-zinc-800 px-3 py-1 rounded-lg text-zinc-400">
                      {salonStaff.length} Integrantes
                   </span>
                </div>

                {loadingStaff ? (
                  <div className="flex justify-center p-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500"></div>
                  </div>
                ) : salonStaff.length === 0 ? (
                  <div className="text-center p-12 border-2 border-dashed border-zinc-900 rounded-[32px]">
                    <p className="text-zinc-600 italic">Nenhum profissional cadastrado ainda.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {salonStaff.map((staff) => (
                      <div key={staff.id} className="p-6 rounded-[24px] bg-zinc-950 border border-zinc-900 flex justify-between items-start">
                        <div className="flex items-center gap-4">
                           <div className="p-3 bg-zinc-900 rounded-2xl text-amber-500/50">
                              <UserIcon size={20} />
                           </div>
                           <div>
                              <p className="font-bold text-zinc-100">{staff.name}</p>
                              <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold tracking-tighter">{staff.role}</p>
                           </div>
                        </div>
                        <button 
                          onClick={() => handleDeleteStaff(staff.id)}
                          className="p-2 text-zinc-700 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
             </Card>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { label: 'Total Estabelecimentos', value: salons.length, icon: Building2, color: 'text-blue-500' },
              { label: 'Total Usuários', value: allUsers.length, icon: Users, color: 'text-purple-500' },
              { label: 'Total Agendamentos', value: appointments.length, icon: Calendar, color: 'text-amber-500' },
              { label: 'Receita Est. Global', value: `R$ ${appointments.reduce((acc, curr) => acc + (Number(curr.price) || 0), 0).toFixed(2)}`, icon: ArrowUpRight, color: 'text-emerald-500' },
            ].map((stat, i) => (
              <Card key={i} className={`p-6 border ${theme.card}`}>
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl bg-zinc-950 border border-zinc-800 ${stat.color}`}>
                    <stat.icon size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{stat.label}</p>
                    <p className="text-2xl font-bold text-zinc-100">{stat.value}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="space-y-6">
            <div className="relative max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
              <Input 
                className="pl-12 h-14 rounded-2xl bg-zinc-900 border-zinc-800 focus:border-amber-500" 
                placeholder="Pesquisar em toda a rede..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Desktop Table View */}
            <Card className={`hidden md:block overflow-hidden border ${theme.card}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-900/50 border-b border-zinc-800">
                      {activeTab === 'salons' && (
                        <>
                          <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Estabelecimento</th>
                          <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Proprietário</th>
                          <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Endereço</th>
                          <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-right">Ações</th>
                        </>
                      )}
                      {activeTab === 'users' && (
                        <>
                          <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Usuário</th>
                          <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Email</th>
                          <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Cargo</th>
                        </>
                      )}
                      {activeTab === 'appointments' && (
                        <>
                          <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Cliente / Serviço</th>
                          <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Data e Hora</th>
                          <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Status</th>
                          <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Valor</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData().map((item: any) => (
                      <tr key={item.id} className="border-b border-zinc-900/30 hover:bg-zinc-900/10 transition-colors">
                        {activeTab === 'salons' && (
                          <>
                            <td className="p-6">
                                <p className="font-bold text-zinc-100">{item.businessName || 'Sem nome'}</p>
                                <p className="text-xs text-zinc-500">{item.id.slice(0, 12)}</p>
                            </td>
                            <td className="p-6">
                               <p className="text-sm font-medium text-zinc-300">{item.name}</p>
                               <p className="text-[10px] text-zinc-600">{item.email}</p>
                            </td>
                            <td className="p-6 text-sm text-zinc-400">
                               <span className="max-w-[200px] truncate block">{item.address || 'Não informado'}</span>
                            </td>
                            <td className="p-6 text-right">
                               <button 
                                onClick={() => handleManageStaff(item)}
                                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-amber-500 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors"
                               >
                                 Gerenciar
                               </button>
                            </td>
                          </>
                        )}
                        
                        {activeTab === 'users' && (
                           <>
                            <td className="p-6 text-sm font-bold text-zinc-100">{item.name}</td>
                            <td className="p-6 text-sm text-zinc-500">{item.email}</td>
                            <td className="p-6">
                               <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md ${
                                  (item.role === 'professional' || item.role === 'profissional') ? 'bg-amber-500/10 text-amber-500' : 'bg-zinc-800 text-zinc-500'
                               }`}>
                                  {(item.role === 'professional' || item.role === 'profissional') ? 'Profissional' : 'Cliente'}
                               </span>
                            </td>
                           </>
                        )}

                        {activeTab === 'appointments' && (
                           <>
                            <td className="p-6">
                               <p className="font-bold text-zinc-100 text-sm">{item.clientName}</p>
                               <p className="text-xs text-amber-500">{item.serviceName}</p>
                            </td>
                            <td className="p-6">
                               <p className="text-sm text-zinc-300">{item.date}</p>
                               <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">{item.startTime} - {item.endTime}</p>
                            </td>
                            <td className="p-6 text-xs capitalize text-zinc-400">{item.status}</td>
                            <td className="p-6 text-sm font-bold text-zinc-100 italic">
                               R$ {Number(item.price || 0).toFixed(2)}
                            </td>
                           </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Mobile List View */}
            <div className="md:hidden space-y-4">
              {filteredData().map((item: any) => (
                <Card key={item.id} className={`p-6 border ${theme.card}`}>
                  {activeTab === 'salons' && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-lg text-zinc-100">{item.businessName || 'Sem nome'}</p>
                          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">ID: {item.id.slice(0, 12)}</p>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md bg-zinc-800 text-zinc-400">
                          {item.businessType || 'N/A'}
                        </span>
                      </div>
                      <div className="pt-4 border-t border-zinc-800 space-y-3 text-sm">
                        <div className="flex justify-between items-center">
                          <p className="text-zinc-400">Proprietário:</p>
                          <p className="font-medium text-zinc-100">{item.name}</p>
                        </div>
                        <div className="flex justify-between items-start gap-4">
                          <p className="text-zinc-400">Endereço:</p>
                          <p className="font-medium text-zinc-300 text-right text-xs">{item.address || 'Não informado'}</p>
                        </div>
                      </div>
                      <Button 
                        onClick={() => handleManageStaff(item)}
                        className="w-full mt-2 bg-zinc-800 text-amber-500 border border-zinc-700/50 rounded-2xl h-12"
                      >
                        Gerenciar Equipe
                      </Button>
                    </div>
                  )}

              {activeTab === 'users' && (
                <div className="space-y-2">
                  <p className="font-bold text-zinc-100">{item.name}</p>
                  <p className="text-sm text-zinc-500">{item.email}</p>
                  <div className="pt-2">
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md ${
                      item.role === 'professional' ? 'bg-amber-500/10 text-amber-500' : 'bg-zinc-800 text-zinc-500'
                    }`}>
                      {item.role === 'professional' ? 'Profissional' : 'Cliente'}
                    </span>
                  </div>
                </div>
              )}

              {activeTab === 'appointments' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-zinc-100">{item.clientName}</p>
                      <p className="text-sm text-amber-500">{item.serviceName}</p>
                    </div>
                    <p className="font-bold text-emerald-500">R$ {Number(item.price || 0).toFixed(2)}</p>
                  </div>
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <div className="flex flex-col">
                      <p>{item.date}</p>
                      <p className="font-bold uppercase tracking-widest">{item.startTime} - {item.endTime}</p>
                    </div>
                    <p className="capitalize px-3 py-1 bg-zinc-800 rounded-lg">{item.status}</p>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
        
        {loading && (
          <div className="p-20 text-center text-sm text-zinc-500">
            Lendo base de dados global...
          </div>
        )}
      </div>
      </>
      )}
    </div>
  );
}

export default function AdminDashboardContent() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <AdminDashboardInner />
    </Suspense>
  );
}
