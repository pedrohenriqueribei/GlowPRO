'use client';

import { useState, useEffect, use } from 'react';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile 
} from '@/lib/firebase';
import { useAuth } from '@/context/auth-context';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  getDoc, 
  doc, 
  setDoc,
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { Button, Card, Input } from '@/components/ui';
import { 
  Scissors, 
  User, 
  Calendar as CalendarIcon, 
  Clock, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft,
  ChevronRight,
  Mail,
  Lock,
  Phone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function PublicBookingPage({ params }: { params: Promise<{ ownerId: string }> }) {
  const { ownerId } = use(params);
  const { user: currentUser, profile } = useAuth();
  const [salon, setSalon] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [availability, setAvailability] = useState<any[]>([]);
  const [appointmentsOnDate, setAppointmentsOnDate] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [bookingData, setBookingData] = useState({
    serviceId: '',
    serviceName: '',
    staffId: '',
    staffName: '',
    date: '',
    startTime: '',
    clientName: '',
    clientPhone: '',
  });

  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (currentUser?.uid && profile) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBookingData(prev => {
        if (prev.clientName || prev.clientPhone) return prev;
        return {
          ...prev,
          clientName: currentUser.displayName || '',
          clientPhone: (profile as any)?.phone || ''
        };
      });
    }
  }, [currentUser?.uid, profile, currentUser?.displayName]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const salonSnap = await getDoc(doc(db, 'users', ownerId));
        if (salonSnap.exists()) {
          setSalon(salonSnap.data());
          
          const servicesSnap = await getDocs(query(collection(db, 'services'), where('ownerId', '==', ownerId)));
          setServices(servicesSnap.docs.map(d => ({ id: d.id, ...d.data() })));

          const staffSnap = await getDocs(query(collection(db, 'staff'), where('ownerId', '==', ownerId), where('active', '==', true)));
          setStaff(staffSnap.docs.map(d => ({ id: d.id, ...d.data() })));

          const availabilitySnap = await getDocs(query(collection(db, 'availability'), where('ownerId', '==', ownerId)));
          setAvailability(availabilitySnap.docs.map(d => ({ id: d.id, ...d.data() })));
        }
      } catch (error) {
        console.error('Error fetching salon data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [ownerId]);

  useEffect(() => {
    if (!bookingData.date || !ownerId) return;
    const fetchAppointments = async () => {
      try {
        const q = query(
          collection(db, 'appointments'), 
          where('ownerId', '==', ownerId), 
          where('date', '==', bookingData.date)
        );
        const snap = await getDocs(q);
        const busy = snap.docs
          .map(d => d.data())
          .filter(a => ['pending', 'scheduled', 'confirmed'].includes(a.status));
        setAppointmentsOnDate(busy);
      } catch (error) {
        console.error('Error fetching occupied slots:', error);
      }
    };
    fetchAppointments();
  }, [bookingData.date, ownerId]);

  const handleClientLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(result.user, { displayName: bookingData.clientName });
        await setDoc(doc(db, 'users', result.user.uid), {
          uid: result.user.uid,
          email: result.user.email,
          displayName: bookingData.clientName,
          phone: bookingData.clientPhone,
          role: 'client',
          createdAt: serverTimestamp(),
        });
      }
      setStep(4);
    } catch (error: any) {
      alert('Erro na autenticação: ' + error.message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsAuthLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const userRef = doc(db, 'users', result.user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName,
          role: 'client',
          createdAt: serverTimestamp(),
        });
      }
      setStep(4);
    } catch (error: any) {
      alert('Erro no Google Login: ' + error.message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleBooking = async () => {
    if (!bookingData.clientName || !bookingData.clientPhone) return;
    try {
      await addDoc(collection(db, 'appointments'), {
        ...bookingData,
        ownerId,
        clientId: currentUser?.uid || null,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      setFinished(true);
    } catch (error) {
      console.error('Error creating appointment:', error);
      alert('Erro ao agendar. Tente novamente.');
    }
  };

  const getAvailableSlots = (dateString: string) => {
    if (!dateString) return [];
    const date = new Date(dateString + 'T00:00:00');
    const dayOfWeek = date.getDay();

    const activeRules = availability.filter(rule => {
      const start = new Date(rule.startDate + 'T00:00:00');
      const end = new Date(rule.endDate + 'T00:00:00');
      return date >= start && date <= end && rule.daysOfWeek.includes(dayOfWeek);
    });

    if (activeRules.length === 0) return [];

    const slots: string[] = [];
    activeRules.forEach(rule => {
      let current = rule.startTime;
      const end = rule.endTime;
      
      // Generate slots every 30 mins
      while (current < end) {
        slots.push(current);
        const [h, m] = current.split(':').map(Number);
        const nextMin = m + 30;
        const nextH = h + Math.floor(nextMin / 60);
        const nextM = nextMin % 60;
        current = `${nextH.toString().padStart(2, '0')}:${nextM.toString().padStart(2, '0')}`;
      }
    });

    const takenSlots = appointmentsOnDate.map(a => a.startTime);
    const availableSlots = Array.from(new Set(slots))
      .filter(s => !takenSlots.includes(s))
      .sort();

    return availableSlots;
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
    </div>
  );

  const isBeauty = salon?.businessType === 'beauty';
  const theme = {
    bg: isBeauty ? 'bg-[#FFF5F7]' : 'bg-zinc-950',
    card: isBeauty ? 'bg-white border-pink-100 shadow-xl shadow-pink-500/5' : 'bg-zinc-900/30 border-zinc-800 backdrop-blur-xl shadow-2xl',
    text: isBeauty ? 'text-zinc-900' : 'text-zinc-100',
    muted: isBeauty ? 'text-zinc-500' : 'text-zinc-500',
    accent: isBeauty ? 'bg-pink-500 text-white' : 'bg-amber-500 text-zinc-950',
    accentBorder: isBeauty ? 'border-pink-500' : 'border-amber-500',
    accentGhost: isBeauty ? 'text-pink-500 bg-pink-50' : 'text-amber-500 bg-amber-500/10',
    fontDisplay: isBeauty ? 'font-serif font-medium tracking-tight' : 'font-display font-bold',
    progress: isBeauty ? 'bg-pink-500' : 'bg-amber-500',
    btn: isBeauty ? 'bg-pink-600 hover:bg-pink-700 text-white' : 'bg-amber-500 hover:bg-amber-600 text-zinc-950',
  };

  if (!salon) return (
    <div className={`min-h-screen flex flex-col items-center justify-center ${theme.bg} ${theme.text} p-6 text-center`}>
      <h1 className={`text-4xl ${theme.fontDisplay} mb-4`}>404</h1>
      <p className="text-zinc-500">Salão não encontrado ou link inválido.</p>
    </div>
  );

  if (finished) return (
    <div className={`min-h-screen flex items-center justify-center ${theme.bg} p-6`}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
        <Card className={`max-w-md w-full text-center p-12 ${theme.card}`}>
          <div className={`h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-6 ${isBeauty ? 'bg-pink-500/10 text-pink-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
            <CheckCircle2 size={48} />
          </div>
          <h1 className={`text-2xl ${theme.fontDisplay} mb-2 ${theme.text}`}>Solicitação Enviada!</h1>
          <p className={`${theme.muted} text-sm mb-8`}>
            Seu agendamento para <strong>{bookingData.date}</strong> às <strong>{bookingData.startTime}</strong> com <strong>{bookingData.staffName}</strong> foi enviado. <br /> Aguarde a confirmação do {salon.salonName || 'nosso estabelecimento'}.
          </p>
          <Button className={`w-full ${theme.btn}`} onClick={() => window.location.reload()}>Fazer outro agendamento</Button>
        </Card>
      </motion.div>
    </div>
  );

  return (
    <div className={`min-h-screen ${theme.bg} ${theme.text} p-4 md:p-8 transition-colors duration-1000 font-sans`}>
      {/* Background Decor */}
      {!isBeauty && (
        <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #ffffff10 1px, transparent 0)', backgroundSize: '30px 30px' }} />
      )}

      <div className="max-w-xl mx-auto space-y-12 relative z-10">
        <header className="text-center space-y-6">
          <div className={`inline-flex h-20 w-20 items-center justify-center rounded-[24px] text-3xl font-bold shadow-2xl border transition-all ${
            isBeauty ? 'bg-white text-pink-500 border-pink-100' : 'bg-zinc-950 text-amber-500 border-amber-500/20'
          }`}>
            {salon.salonName?.[0] || 'G'}
          </div>
          <div>
            <h1 className={`text-4xl md:text-5xl tracking-tighter ${theme.fontDisplay}`}>{salon.salonName || 'Nosso Salão'}</h1>
            <div className="flex items-center justify-center gap-3 mt-3">
               <div className={`h-px w-8 ${isBeauty ? 'bg-pink-200' : 'bg-zinc-800'}`} />
               <p className={`${theme.muted} text-[10px] uppercase font-bold tracking-[0.3em]`}>Professional Booking</p>
               <div className={`h-px w-8 ${isBeauty ? 'bg-pink-200' : 'bg-zinc-800'}`} />
            </div>
          </div>
        </header>

        <div className={`flex gap-2 h-1.5 ${isBeauty ? 'bg-pink-100' : 'bg-zinc-900'} rounded-full overflow-hidden`}>
          {[1, 2, 3, 4, 5].map(s => (
            <div key={s} className={`flex-1 transition-all duration-700 ease-out rounded-full ${step >= s ? theme.progress : 'bg-transparent'}`} />
          ))}
        </div>

        <div className="relative overflow-hidden min-h-[450px]">
          <AnimatePresence mode="wait">
            {/* Step 1, 2, 3 remains same... */}
            {step === 1 && (
              <motion.div key="step1" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-6">
                <div className="space-y-1">
                  <h2 className={`text-xl ${theme.fontDisplay} flex items-center gap-2`}>
                    <Scissors size={20} className={isBeauty ? 'text-pink-500' : 'text-zinc-500'} />
                    O que vamos fazer hoje?
                  </h2>
                  <p className="text-xs text-zinc-500">Selecione um ou mais serviços do nosso menu.</p>
                </div>
                <div className="grid gap-3">
                  {services.map(s => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setBookingData({ ...bookingData, serviceId: s.id, serviceName: s.name });
                        setStep(2);
                      }}
                      className={`flex items-center justify-between p-6 rounded-[24px] border transition-all text-left group ${
                        bookingData.serviceId === s.id 
                          ? `${theme.accent} ${theme.accentBorder}` 
                          : `${isBeauty ? 'bg-white border-pink-100 hover:border-pink-300' : 'bg-black border-zinc-800 hover:border-amber-500/50'}`
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${bookingData.serviceId === s.id ? 'bg-black/20 text-black' : (isBeauty ? 'bg-pink-50 text-pink-500' : 'bg-zinc-900 text-amber-500')}`}>
                           <Scissors size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-lg leading-tight">{s.name}</p>
                          <p className={`text-xs opacity-60 mt-1`}>
                            {s.duration} min • R$ {s.price}
                          </p>
                        </div>
                      </div>
                      <ChevronRight size={18} className="opacity-40 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-6">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" onClick={() => setStep(1)} className={isBeauty ? 'hover:bg-pink-100' : ''}>
                    <ArrowLeft size={18} />
                  </Button>
                  <h2 className={`text-xl ${theme.fontDisplay} flex items-center gap-2`}>
                    <User size={20} className={isBeauty ? 'text-pink-500' : 'text-zinc-500'} />
                    Escolha o profissional
                  </h2>
                </div>
                <div className="grid gap-4">
                  {staff.length > 0 ? staff.map(st => (
                    <button
                      key={st.id}
                      onClick={() => {
                        setBookingData({ ...bookingData, staffId: st.id, staffName: st.name });
                        setStep(3);
                      }}
                      className={`flex items-center gap-5 p-6 rounded-[24px] border transition-all text-left ${
                        bookingData.staffId === st.id 
                          ? `${theme.accent} ${theme.accentBorder}` 
                          : `${isBeauty ? 'bg-white border-pink-100 hover:border-pink-300' : 'bg-black border-zinc-800 hover:border-amber-500/50'}`
                      }`}
                    >
                      <div className={`h-16 w-16 rounded-full flex items-center justify-center font-bold text-xl border-2 transition-all ${
                        bookingData.staffId === st.id 
                          ? 'bg-black/20 border-black/40 text-black' 
                          : (isBeauty ? 'bg-pink-50 border-pink-100 text-pink-500' : 'bg-zinc-900 border-zinc-800 text-amber-500 group-hover:border-amber-500')
                      }`}>
                        {st.name[0]}
                      </div>
                      <div>
                        <p className="font-bold text-xl leading-tight">{st.name}</p>
                        <p className={`text-xs opacity-60 mt-1 uppercase tracking-widest font-bold italic`}>{st.role || 'Professional'}</p>
                      </div>
                    </button>
                  )) : (
                    <div className="text-center py-12 text-zinc-500 italic">Nenhum profissional disponível hoje.</div>
                  )}
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-6">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" onClick={() => setStep(2)} className={isBeauty ? 'hover:bg-pink-100' : ''}>
                    <ArrowLeft size={18} />
                  </Button>
                  <h2 className={`text-xl ${theme.fontDisplay} flex items-center gap-2`}>
                    <CalendarIcon size={20} className={isBeauty ? 'text-pink-500' : 'text-zinc-500'} />
                    Quando deseja vir?
                  </h2>
                </div>
                <div className="space-y-6">
                  <div className="space-y-4">
                    <label className={`text-[10px] font-bold uppercase tracking-widest px-2 ${theme.muted}`}>Selecione o Dia</label>
                    <Input 
                      type="date" 
                      min={new Date().toISOString().split('T')[0]}
                      value={bookingData.date}
                      onChange={(e) => setBookingData({...bookingData, date: e.target.value})}
                      className={`h-14 rounded-2xl transition-all ${isBeauty ? 'bg-white border-pink-100 focus:border-pink-500 focus:ring-pink-500/20' : 'bg-black border-zinc-800 focus:border-amber-500'}`}
                    />
                  </div>
                  {bookingData.date && (
                    <div className="space-y-6">
                      <label className={`text-[10px] font-bold uppercase tracking-widest px-2 ${theme.muted}`}>Horários Disponíveis</label>
                      <div className="grid grid-cols-3 gap-3">
                        {getAvailableSlots(bookingData.date).length > 0 ? getAvailableSlots(bookingData.date).map(time => (
                          <button
                            key={time}
                            onClick={() => {
                              setBookingData({...bookingData, startTime: time});
                              if (!currentUser) {
                                setStep(4);
                              } else {
                                setStep(5);
                              }
                            }}
                            className={`p-5 rounded-2xl border text-base font-bold transition-all ${
                              bookingData.startTime === time 
                                ? theme.accent 
                                : `${isBeauty ? 'bg-white border-pink-100 hover:border-pink-300' : 'bg-black border-zinc-800 hover:border-amber-500'}`
                            }`}
                          >
                            {time}
                          </button>
                        )) : (
                          <div className="col-span-3 text-center py-8 text-zinc-500 italic text-sm">
                            Nenhum horário disponível para esta data.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="step4" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-10">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="icon" onClick={() => setStep(3)} className={`h-12 w-12 rounded-xl transition-all ${isBeauty ? 'hover:bg-pink-100' : 'hover:bg-zinc-800'}`}>
                    <ArrowLeft size={22} />
                  </Button>
                  <h2 className={`text-2xl font-bold tracking-tight ${theme.fontDisplay}`}>Identificação</h2>
                </div>

                <div className="space-y-8">
                  <div className={`flex p-1 rounded-2xl ${isBeauty ? 'bg-pink-50' : 'bg-black'} gap-1`}>
                    <button 
                      onClick={() => setAuthMode('login')}
                      className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest rounded-xl transition-all ${authMode === 'login' ? (isBeauty ? 'bg-pink-500 text-white shadow-lg' : 'bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/20') : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      Login
                    </button>
                    <button 
                      onClick={() => setAuthMode('register')}
                      className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest rounded-xl transition-all ${authMode === 'register' ? (isBeauty ? 'bg-pink-500 text-white shadow-lg' : 'bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/20') : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      Cadastro
                    </button>
                  </div>

                  <form onSubmit={handleClientLogin} className="space-y-4">
                    {authMode === 'register' && (
                      <>
                        <div className="space-y-2">
                          <label className={`text-[10px] font-bold uppercase tracking-widest ${theme.muted}`}>Seu Nome</label>
                          <div className="relative">
                            <User size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 ${theme.muted}`} />
                            <Input 
                              placeholder="Nome completo"
                              required
                              value={bookingData.clientName}
                              onChange={(e) => setBookingData({...bookingData, clientName: e.target.value})}
                              className={`pl-12 ${isBeauty ? 'bg-white border-pink-100' : ''}`}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className={`text-[10px] font-bold uppercase tracking-widest ${theme.muted}`}>Seu Telefone</label>
                          <div className="relative">
                            <Phone size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 ${theme.muted}`} />
                            <Input 
                              placeholder="(00) 00000-0000"
                              required
                              value={bookingData.clientPhone}
                              onChange={(e) => setBookingData({...bookingData, clientPhone: e.target.value})}
                              className={`pl-12 ${isBeauty ? 'bg-white border-pink-100' : ''}`}
                            />
                          </div>
                        </div>
                      </>
                    )}
                    <div className="space-y-2">
                      <label className={`text-[10px] font-bold uppercase tracking-widest ${theme.muted}`}>E-mail</label>
                      <div className="relative">
                        <Mail size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 ${theme.muted}`} />
                        <Input 
                          type="email"
                          placeholder="seu@email.com"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className={`pl-12 ${isBeauty ? 'bg-white border-pink-100' : ''}`}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className={`text-[10px] font-bold uppercase tracking-widest ${theme.muted}`}>Senha</label>
                      <div className="relative">
                        <Lock size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 ${theme.muted}`} />
                        <Input 
                          type="password"
                          placeholder="••••••••"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className={`pl-12 ${isBeauty ? 'bg-white border-pink-100' : ''}`}
                        />
                      </div>
                    </div>
                    <Button type="submit" className={`w-full py-8 text-lg font-bold rounded-2xl shadow-xl transition-all ${theme.btn}`} disabled={isAuthLoading}>
                      {isAuthLoading ? 'Carregando...' : authMode === 'login' ? 'Entrar e Continuar' : 'Cadastrar e Continuar'}
                    </Button>
                  </form>

                  <div className="relative my-8 text-center">
                    <div className={`absolute inset-x-0 top-1/2 h-px ${isBeauty ? 'bg-pink-100' : 'bg-zinc-800'}`} />
                    <span className={`relative px-4 text-[10px] uppercase font-bold ${isBeauty ? 'bg-white text-pink-300' : 'bg-zinc-950 text-zinc-600'}`}>ou</span>
                  </div>

                  <Button 
                    onClick={handleGoogleLogin} 
                    variant="outline" 
                    className={`w-full py-6 rounded-2xl flex items-center justify-center gap-3 border ${isBeauty ? 'border-pink-100 hover:bg-pink-50' : 'border-zinc-800 hover:bg-zinc-900 text-white'}`}
                    disabled={isAuthLoading}
                  >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="h-5 w-5" />
                    Continuar com Google
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 5 && (
              <motion.div key="step5" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-10">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="icon" onClick={() => currentUser ? setStep(3) : setStep(4)} className={`h-12 w-12 rounded-xl ${isBeauty ? 'hover:bg-pink-100' : 'hover:bg-zinc-800'}`}>
                    <ArrowLeft size={22} />
                  </Button>
                  <h2 className={`text-2xl font-bold tracking-tight ${theme.fontDisplay}`}>Revisão Final</h2>
                </div>
                
                <div className={`rounded-[32px] p-8 space-y-6 border ${theme.card}`}>
                  <div className="flex justify-between items-center pb-6 border-b border-zinc-800/50">
                    <span className={`text-xs uppercase tracking-[0.2em] font-bold ${theme.muted}`}>Experiência</span>
                    <span className="font-bold text-xl text-zinc-100 text-right">{bookingData.serviceName}</span>
                  </div>
                  <div className="flex justify-between items-center pb-6 border-b border-zinc-800/50">
                    <span className={`text-xs uppercase tracking-[0.2em] font-bold ${theme.muted}`}>Com Profissional</span>
                    <span className="font-bold text-xl text-zinc-100 text-right">{bookingData.staffName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`text-xs uppercase tracking-[0.2em] font-bold ${theme.muted}`}>Data & Hora</span>
                    <span className="font-bold text-xl text-amber-500 text-right">{bookingData.date} @ {bookingData.startTime}</span>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="p-6 rounded-2xl bg-zinc-900/10 border border-zinc-500/10">
                    <p className={`text-xs uppercase tracking-widest font-bold mb-2 ${theme.muted}`}>Sua Identificação</p>
                    <p className="font-bold">{bookingData.clientName}</p>
                    <p className="text-sm opacity-60">{bookingData.clientPhone}</p>
                    <button onClick={() => setStep(4)} className={`text-xs font-bold mt-4 underline ${theme.accent}`}>Alterar dados</button>
                  </div>

                  <Button 
                    className={`w-full gap-2 py-8 text-lg font-bold rounded-2xl shadow-xl transition-all active:scale-95 ${theme.btn} ${isBeauty ? 'shadow-pink-500/20' : 'shadow-zinc-100/5'}`} 
                    disabled={!bookingData.clientName || !bookingData.clientPhone}
                    onClick={handleBooking}
                  >
                    Confirmar Agendamento
                    <ArrowRight size={20} />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <footer className={`pt-20 text-center transition-opacity duration-1000 ${isBeauty ? 'opacity-40' : 'opacity-20'}`}>
          <p className="text-[10px] uppercase font-bold tracking-[0.4em]">Powered by GlowPRO</p>
        </footer>
      </div>
    </div>
  );
}
