'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { 
  signInWithPopup, 
  auth, 
  googleProvider, 
  db, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  updateProfile 
} from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp, query, where, getDocs, updateDoc, deleteDoc, collection } from 'firebase/firestore';
import { Button, Input } from '@/components/ui';
import { motion, AnimatePresence } from 'motion/react';
import { Scissors, Calendar, Users, Star, ArrowRight, X, Mail, Lock, User, Phone, Briefcase, Sparkles, CheckCircle2 } from 'lucide-react';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [landingTheme, setLandingTheme] = useState<'barber' | 'beauty'>('barber');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [profession, setProfession] = useState('');
  const [selectedRole, setSelectedRole] = useState<'profissional' | 'cliente'>('profissional');
  const [error, setError] = useState('');

  const isBeauty = landingTheme === 'beauty';

  const theme = {
    bg: isBeauty ? 'bg-[#FFF5F7]' : 'bg-zinc-950',
    text: isBeauty ? 'text-zinc-900' : 'text-zinc-100',
    muted: isBeauty ? 'text-zinc-500' : 'text-zinc-500',
    accent: isBeauty ? 'text-pink-600' : 'text-zinc-100',
    btn: isBeauty ? 'bg-pink-600 hover:bg-pink-700 text-white' : 'bg-amber-500 hover:bg-amber-600 text-zinc-950',
    card: isBeauty ? 'bg-white border-pink-100 shadow-xl shadow-pink-500/5' : 'bg-zinc-900/30 border-zinc-800 backdrop-blur-xl',
    font: isBeauty ? 'font-serif' : 'font-display',
    gradient: isBeauty ? 'from-pink-600 to-rose-400' : 'from-amber-400 to-amber-600',
  };

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  const handleGoogleLogin = async () => {
    try {
      setIsSubmitting(true);
      setError('');
      const result = await signInWithPopup(auth, googleProvider);
      const userRef = doc(db, 'users', result.user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        const userEmail = result.user.email?.toLowerCase();
        
        // Check for existing linkage (from auth-context logic)
        const staffQuery = query(collection(db, 'staff'), where('email', '==', userEmail));
        const staffSnap = await getDocs(staffQuery);
        
        const profQuery = query(collection(db, 'users'), where('email', '==', userEmail));
        const profSnap = await getDocs(profQuery);
        let existingProf = profSnap.docs.find(d => (d.data().role === 'professional' || d.data().role === 'profissional') && d.id !== result.user.uid);

        if (!staffSnap.empty) {
          const staffDoc = staffSnap.docs[0];
          const staffData = staffDoc.data();
          await setDoc(userRef, {
            uid: result.user.uid,
            email: userEmail,
            displayName: result.user.displayName || staffData.name,
            role: 'profissional',
            isOwner: false,
            salonId: staffData.ownerId,
            staffId: staffDoc.id,
            photoURL: result.user.photoURL,
            createdAt: serverTimestamp(),
          });
          await updateDoc(doc(db, 'staff', staffDoc.id), { userId: result.user.uid });
        } else if (existingProf) {
          const profData = existingProf.data();
          await setDoc(userRef, {
            ...profData,
            uid: result.user.uid,
            email: userEmail,
            displayName: result.user.displayName || profData.name,
            role: 'profissional',
            isOwner: true,
            photoURL: result.user.photoURL,
            updatedAt: serverTimestamp(),
          });
          await deleteDoc(doc(db, 'users', existingProf.id));
        } else {
          await setDoc(userRef, {
            uid: result.user.uid,
            email: userEmail,
            displayName: result.user.displayName,
            photoURL: result.user.photoURL,
            role: selectedRole,
            businessType: landingTheme,
            createdAt: serverTimestamp(),
          });
        }
      }
      router.push('/dashboard');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const cleanEmail = email.toLowerCase().trim();
      if (authMode === 'register') {
        const result = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        await updateProfile(result.user, { displayName: name });
        
        // Link checking
        const staffQuery = query(collection(db, 'staff'), where('email', '==', cleanEmail));
        const staffSnap = await getDocs(staffQuery);
        
        const profQuery = query(collection(db, 'users'), where('email', '==', cleanEmail));
        const profSnap = await getDocs(profQuery);
        let existingProf = profSnap.docs.find(d => (d.data().role === 'professional' || d.data().role === 'profissional') && d.id !== result.user.uid);

        if (!staffSnap.empty) {
          const staffDoc = staffSnap.docs[0];
          const staffData = staffDoc.data();
          await setDoc(doc(db, 'users', result.user.uid), {
            uid: result.user.uid,
            email: cleanEmail,
            displayName: name || staffData.name,
            role: 'profissional',
            isOwner: false,
            salonId: staffData.ownerId,
            staffId: staffDoc.id,
            phone: phone || staffData.phone || '',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          await updateDoc(doc(db, 'staff', staffDoc.id), { userId: result.user.uid });
        } else if (existingProf) {
          const profData = existingProf.data();
          await setDoc(doc(db, 'users', result.user.uid), {
            ...profData,
            uid: result.user.uid,
            email: cleanEmail,
            displayName: name || profData.name,
            role: 'profissional',
            isOwner: true,
            phone: phone || profData.phone || '',
            createdAt: profData.createdAt || serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          await deleteDoc(doc(db, 'users', existingProf.id));
        } else {
          // Default registration
          await setDoc(doc(db, 'users', result.user.uid), {
            uid: result.user.uid,
            email: cleanEmail,
            displayName: name,
            role: selectedRole,
            phone,
            businessType: landingTheme, // Added default businessType for everyone
            ...(selectedRole === 'profissional' ? {
              profession,
              salonName: '',
              isOwner: false, // By default via landing page, they aren't owner unless linked above
              businessType: profession.toLowerCase().includes('barbe') ? 'barber' : 'beauty',
            } : {}),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
      } else {
        await signInWithEmailAndPassword(auth, cleanEmail, password);
      }
      router.push('/dashboard');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return null;

  return (
    <div className={`min-h-screen ${theme.bg} ${theme.text} transition-colors duration-1000 relative overflow-hidden font-sans`}>
      {/* Decorative Grid for Barber */}
      {!isBeauty && (
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #ffffff10 1px, transparent 0)', backgroundSize: '40px 40px' }} />
      )}
      
      {/* Theme Switcher Floating */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 p-2 rounded-full bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 shadow-2xl">
        <button 
          onClick={() => setLandingTheme('barber')}
          className={`p-3 rounded-full transition-all ${!isBeauty ? 'bg-zinc-100 text-zinc-950' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <Scissors size={20} />
        </button>
        <button 
          onClick={() => setLandingTheme('beauty')}
          className={`p-3 rounded-full transition-all ${isBeauty ? 'bg-pink-500 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <Sparkles size={20} />
        </button>
      </div>

      <nav className="relative z-10 flex items-center justify-between px-6 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold shadow-2xl ${isBeauty ? 'bg-pink-500 text-white' : 'bg-zinc-100 text-zinc-950'}`}>
            <span className="text-2xl">G</span>
          </div>
          <span className={`text-2xl font-bold tracking-tight ${theme.font} ${theme.text}`}>GlowPRO</span>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" className={`text-zinc-500 hover:${theme.accent}`} onClick={() => { setAuthMode('login'); setIsAuthModalOpen(true); }}>
            Entrar
          </Button>
          <Button onClick={() => { setAuthMode('register'); setIsAuthModalOpen(true); }} className={`hidden md:flex rounded-full ${theme.btn}`}>
            Criar conta
          </Button>
        </div>
      </nav>

      <main className="relative z-10 pt-10 md:pt-20 pb-20 px-6 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-widest mb-10 ${isBeauty ? 'bg-pink-50 border-pink-100 text-pink-600' : 'bg-zinc-900 border-zinc-800 text-amber-500'}`}>
              <Star size={12} className={isBeauty ? 'text-pink-500' : 'text-amber-500'} fill="currentColor" />
              <span>{isBeauty ? 'Elegância em cada detalhe' : 'O padrão ouro da barbearia'}</span>
            </div>
            <h1 className={`text-6xl md:text-[120px] font-bold leading-[0.85] tracking-tighter mb-10 ${theme.font}`}>
              {isBeauty ? 'SUA BELEZA' : 'BARBER'} <br /> 
              <span className={`bg-gradient-to-r ${theme.gradient} bg-clip-text text-transparent`}>
                {isBeauty ? 'TRANSFORMADA.' : 'CONTROL.'}
              </span>
            </h1>
            <p className={`text-xl mb-12 max-w-lg leading-relaxed opacity-60 font-light`}>
              {isBeauty 
                ? 'A plataforma definitiva para salões de beleza e manicures que buscam excelência no atendimento e gestão elegante.'
                : 'A produtividade que sua barbearia precisa com o estilo que seus clientes exigem. Controle sua marca e sua agenda hoje.'}
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className={`px-10 py-8 text-lg rounded-full transition-all active:scale-95 ${theme.btn} ${isBeauty ? 'shadow-lg shadow-pink-500/20' : 'shadow-zinc-100/5 shadow-xl'}`} onClick={() => { setAuthMode('register'); setIsAuthModalOpen(true); }}>
                Começar Agora
                <ArrowRight className="ml-2" />
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="hidden lg:block relative"
          >
            <div className={`relative z-10 rounded-2xl border p-2 backdrop-blur-xl shadow-2xl ${theme.card}`}>
              <div className={`w-full overflow-hidden rounded-xl aspect-video relative ${isBeauty ? 'bg-pink-50/50' : 'bg-zinc-900/50'}`}>
                {/* Mock UI Representation */}
                <div className="p-8 space-y-6">
                  <div className={`h-4 w-32 rounded-full ${isBeauty ? 'bg-pink-100' : 'bg-zinc-800'}`} />
                  <div className="grid grid-cols-2 gap-4">
                    <div className={`h-32 rounded-2xl ${isBeauty ? 'bg-white shadow-sm border border-pink-50' : 'bg-zinc-950 border border-zinc-800'}`} />
                    <div className={`h-32 rounded-2xl ${isBeauty ? 'bg-pink-100/50' : 'bg-zinc-800'}`} />
                  </div>
                  <div className="space-y-3 pt-2">
                     {[1,2].map(i => (
                       <div key={i} className={`h-12 w-full rounded-xl flex items-center px-4 ${isBeauty ? 'bg-white border border-pink-50 shadow-sm' : 'bg-zinc-900/50 border border-zinc-800'}`}>
                         <div className={`h-2 w-24 rounded-full ${isBeauty ? 'bg-pink-50' : 'bg-zinc-800'}`} />
                       </div>
                     ))}
                  </div>
                </div>
              </div>
            </div>
            
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className={`absolute -right-6 top-10 z-20 p-4 rounded-xl border shadow-2xl backdrop-blur-md ${isBeauty ? 'bg-white border-pink-100 text-zinc-900' : 'bg-zinc-950/90 border-zinc-700 text-white'}`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${isBeauty ? 'bg-pink-500 text-white' : 'bg-zinc-100 text-zinc-950'}`}>
                  <Calendar size={16} />
                </div>
                <div>
                  <p className={`text-[10px] uppercase tracking-widest font-bold opacity-60`}>Amanhã</p>
                  <p className={`text-lg font-bold ${theme.font}`}>15 Agendamentos</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        <section className="mt-40 grid md:grid-cols-3 gap-8">
          {[
            { icon: Calendar, title: "Gestão de Tempo", desc: "Controle total sobre lacunas na agenda e cancelamentos de última hora." },
            { icon: Users, title: "Liderança de Equipe", desc: "Gerencie múltiplos profissionais com comissões e horários distintos." },
            { icon: Scissors, title: "Identidade Única", desc: "Seu portal de agendamento se adapta ao estilo do seu negócio." }
          ].map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`p-10 rounded-[32px] border transition-all hover:scale-[1.02] ${theme.card}`}
            >
              <div className={`h-14 w-14 rounded-2xl flex items-center justify-center mb-8 ${isBeauty ? 'bg-pink-50 text-pink-600' : 'bg-amber-500/10 text-amber-500'}`}>
                <feature.icon size={28} />
              </div>
              <h3 className={`text-2xl font-bold mb-4 ${theme.font}`}>{feature.title}</h3>
              <p className="opacity-40 leading-relaxed text-sm font-light">{feature.desc}</p>
            </motion.div>
          ))}
        </section>
      </main>

      {/* Auth Modal */}
      <AnimatePresence>
        {isAuthModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAuthModalOpen(false)}
              className={`absolute inset-0 backdrop-blur-sm ${isBeauty ? 'bg-pink-900/20' : 'bg-zinc-950/90'}`}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`relative w-full max-w-md border rounded-3xl p-8 shadow-2xl overflow-hidden ${isBeauty ? 'bg-white border-pink-100' : 'bg-zinc-900 border-zinc-800'}`}
            >
              {/* Login/Register Toggle */}
              <div className="flex gap-4 mb-8">
                <button 
                  onClick={() => setAuthMode('login')}
                  className={`text-sm font-bold uppercase tracking-widest pb-2 border-b-2 transition-colors ${authMode === 'login' ? (isBeauty ? 'border-pink-500 text-pink-600' : 'border-zinc-100 text-zinc-100') : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
                >
                  Entrar
                </button>
                <button 
                  onClick={() => setAuthMode('register')}
                  className={`text-sm font-bold uppercase tracking-widest pb-2 border-b-2 transition-colors ${authMode === 'register' ? (isBeauty ? 'border-pink-500 text-pink-600' : 'border-zinc-100 text-zinc-100') : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
                >
                  Cadastrar
                </button>
              </div>

              <div className="mb-8">
                <h2 className={`text-3xl font-bold ${theme.font} ${theme.text}`}>
                  {authMode === 'login' ? 'Bem-vindo de volta' : (selectedRole === 'profissional' ? 'Inicie seu Negócio' : 'Crie sua Conta')}
                </h2>
                <p className={`${theme.muted} text-sm mt-2`}>
                  {authMode === 'login' ? 'Acesse seu painel administrativo.' : (selectedRole === 'profissional' ? 'Crie sua conta profissional agora.' : 'Agende seus serviços favoritos.')}
                </p>
              </div>

              {authMode === 'register' && (
                <div className="flex p-1 rounded-2xl bg-zinc-100 dark:bg-zinc-950 mb-8 gap-1">
                  <button
                    onClick={() => setSelectedRole('profissional')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all ${selectedRole === 'profissional' ? (isBeauty ? 'bg-pink-600 text-white' : 'bg-white text-zinc-950 shadow-sm') : (isBeauty ? 'text-zinc-500 hover:text-pink-600' : 'text-zinc-500 hover:text-zinc-300')}`}
                  >
                    <Scissors size={14} />
                    Profissional
                  </button>
                  <button
                    onClick={() => setSelectedRole('cliente')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all ${selectedRole === 'cliente' ? (isBeauty ? 'bg-pink-600 text-white' : 'bg-white text-zinc-950 shadow-sm') : (isBeauty ? 'text-zinc-500 hover:text-pink-600' : 'text-zinc-500 hover:text-zinc-300')}`}
                  >
                    <Users size={14} />
                    Cliente
                  </button>
                </div>
              )}

              {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
                  {error}
                </div>
              )}

              <form onSubmit={handleEmailAuth} className="space-y-4">
                {authMode === 'register' && (
                  <>
                    <div className="space-y-2">
                      <label className={`text-[10px] uppercase font-bold px-1 ${theme.muted}`}>Nome Completo</label>
                      <div className="relative">
                        <User size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 ${theme.muted}`} />
                        <Input
                          required
                          type="text"
                          placeholder="Ex: João Silva"
                          className={`pl-12 border ${isBeauty ? 'bg-white border-pink-100 focus:border-pink-500' : 'bg-zinc-950 border-zinc-800 focus:border-zinc-100'}`}
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className={`text-[10px] uppercase font-bold px-1 ${theme.muted}`}>Telefone / WhatsApp</label>
                      <div className="relative">
                        <Phone size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 ${theme.muted}`} />
                        <Input
                          required
                          type="tel"
                          placeholder="(00) 00000-0000"
                          className={`pl-12 border ${isBeauty ? 'bg-white border-pink-100 focus:border-pink-500' : 'bg-zinc-950 border-zinc-800 focus:border-zinc-100'}`}
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                        />
                      </div>
                    </div>
                    {selectedRole === 'profissional' && (
                      <div className="space-y-2">
                        <label className={`text-[10px] uppercase font-bold px-1 ${theme.muted}`}>Profissão</label>
                        <div className="relative">
                          <Briefcase size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 ${theme.muted}`} />
                          <Input
                            required
                            type="text"
                            placeholder="Ex: Barbeiro, Manicure, Esteticista"
                            className={`pl-12 border ${isBeauty ? 'bg-white border-pink-100 focus:border-pink-500' : 'bg-zinc-950 border-zinc-800 focus:border-zinc-100'}`}
                            value={profession}
                            onChange={(e) => setProfession(e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}
                <div className="space-y-2">
                  <label className={`text-[10px] uppercase font-bold px-1 ${theme.muted}`}>{selectedRole === 'profissional' ? 'E-mail Profissional' : 'Seu E-mail'}</label>
                  <div className="relative">
                    <Mail size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 ${theme.muted}`} />
                    <Input
                      required
                      type="email"
                      placeholder="seu@contato.com"
                      className={`pl-12 border ${isBeauty ? 'bg-white border-pink-100 focus:border-pink-500' : 'bg-zinc-950 border-zinc-800 focus:border-zinc-100'}`}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className={`text-[10px] uppercase font-bold px-1 ${theme.muted}`}>Senha</label>
                  <div className="relative">
                    <Lock size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 ${theme.muted}`} />
                    <Input
                      required
                      type="password"
                      placeholder="••••••••"
                      className={`pl-12 border ${isBeauty ? 'bg-white border-pink-100 focus:border-pink-500' : 'bg-zinc-950 border-zinc-800 focus:border-zinc-100'}`}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>

                <Button type="submit" className={`w-full py-8 text-lg font-bold rounded-2xl ${theme.btn}`} disabled={isSubmitting}>
                  {isSubmitting ? 'Processando...' : authMode === 'login' ? 'Entrar Agora' : 'Finalizar Cadastro'}
                </Button>
              </form>

              <div className="relative my-8 text-center">
                <div className={`absolute inset-x-0 top-1/2 h-px ${isBeauty ? 'bg-pink-100' : 'bg-zinc-800'}`} />
                <span className={`relative px-4 text-[10px] uppercase font-bold ${isBeauty ? 'bg-white text-pink-300' : 'bg-zinc-900 text-zinc-600'}`}>ou continue com</span>
              </div>

              <Button 
                variant="outline" 
                className="w-full h-14 border-zinc-800 hover:bg-zinc-100 hover:text-zinc-950 transition-all font-bold gap-3"
                onClick={handleGoogleLogin}
                disabled={isSubmitting}
              >
                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5 rounded-full" />
                Google
              </Button>

              <button 
                onClick={() => setIsAuthModalOpen(false)}
                className="absolute top-6 right-6 text-zinc-500 hover:text-white"
              >
                <X size={24} />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className="relative z-10 py-12 px-6 border-t border-zinc-900 mt-20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-zinc-600 text-sm italic">© 2026 GlowPRO. Elevando o padrão da beleza.</p>
          <div className="flex gap-8">
            <a href="#" className="text-zinc-600 hover:text-white transition-colors text-xs uppercase tracking-widest font-bold">Termos</a>
            <a href="#" className="text-zinc-600 hover:text-white transition-colors text-xs uppercase tracking-widest font-bold">Privacidade</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
