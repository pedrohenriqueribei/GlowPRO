'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { db, auth, signOut } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Button, Card, Input } from '@/components/ui';
import { Settings as SettingsIcon, LogOut, Store, User, ExternalLink, Calendar as CalendarIcon, Scissors, Sparkles, Lock, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { getTheme } from '@/lib/theme';
import { sendPasswordResetEmail } from 'firebase/auth';

export default function SettingsPage() {
  const { user, profile } = useAuth();
  const theme = getTheme(profile?.businessType, profile?.role);
  const isClient = profile?.role === 'client';

  const [salonName, setSalonName] = useState('');
  const [userName, setUserName] = useState('');
  const [phone, setPhone] = useState('');
  const [profession, setProfession] = useState('');
  const [businessType, setBusinessType] = useState<'barber' | 'beauty'>('barber');
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);

  const bookingUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/book/${user?.uid}`
    : '';

  useEffect(() => {
    if (!user) return;
    const fetchUserData = async () => {
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) {
        const data = snap.data();
        setSalonName(data.salonName || '');
        setUserName(data.name || '');
        setPhone(data.phone || '');
        setProfession(data.profession || '');
        setBusinessType(data.businessType || 'barber');
      }
    };
    fetchUserData();
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), { 
        name: userName,
        salonName,
        phone,
        profession,
        businessType 
      });
      alert('Sua configuração foi salva com sucesso!');
    } catch (error) {
      console.error('Error updating settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendReset = async () => {
    if (!user?.email) return;
    setIsSendingReset(true);
    try {
      await sendPasswordResetEmail(auth, user.email);
      alert('Link de redefinição de senha enviado para o seu e-mail.');
    } catch (error) {
      console.error('Error sending reset:', error);
      alert('Erro ao enviar link: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    } finally {
      setIsSendingReset(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(bookingUrl);
    alert('Link copiado!');
  };

  return (
    <div className={`max-w-2xl mx-auto space-y-8 pt-8 pb-12 ${theme.text}`}>
      <header className="flex flex-col gap-2">
        <div className={`w-fit px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-[0.2em] ${theme.roleBadge}`}>
          {isClient ? '✨ CONFIGURAÇÕES DO CLIENTE' : '👑 CONFIGURAÇÕES PROFISSIONAIS'}
        </div>
        <h1 className={`text-3xl font-display font-bold ${theme.text}`}>Configurações</h1>
        <p className={theme.muted}>Personalize sua conta e preferências.</p>
      </header>

      <div className="space-y-6">
        {!isClient && (
          <>
            <Card className={`p-8 ${theme.card}`}>
              <div className="flex items-center gap-4 mb-8">
                <div className={`p-3 rounded-2xl ${theme.accentGhost}`}>
                  <CalendarIcon size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-display font-bold">Portal de Agendamento</h2>
                  <p className="text-sm text-zinc-500">Este é o link que você deve compartilhar com seus clientes.</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 p-4 rounded-xl bg-zinc-950 border border-zinc-900 group">
                <code className="text-xs text-zinc-400 flex-1 truncate">{bookingUrl}</code>
                <Button variant="ghost" size="sm" onClick={copyLink} className="text-indigo-400 hover:bg-indigo-400/10 h-8 px-3">
                  Copiar
                </Button>
                <a href={bookingUrl} target="_blank" rel="noopener noreferrer" className="p-2 text-zinc-500 hover:text-zinc-100 transition-colors">
                  <ExternalLink size={14} />
                </a>
              </div>
            </Card>

            <Card className={`p-8 ${theme.card}`}>
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 rounded-2xl bg-zinc-800 text-zinc-100">
                  <Store size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-display font-bold">Meu Estabelecimento</h2>
                  <p className="text-sm text-zinc-500">Informações visíveis para a plataforma.</p>
                </div>
              </div>

              <form onSubmit={handleSave} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Seu Nome</label>
                  <Input 
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Seu nome completo"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Seu Telefone / WhatsApp</label>
                    <Input 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Sua Profissão</label>
                    <Input 
                      value={profession}
                      onChange={(e) => setProfession(e.target.value)}
                      placeholder="Ex: Barbeiro"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Nome do Estabelecimento</label>
                  <Input 
                    value={salonName}
                    onChange={(e) => setSalonName(e.target.value)}
                    placeholder="Ex: Barber Shop Vintage"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Tipo de Negócio & Tema</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setBusinessType('barber')}
                      className={`p-4 rounded-xl border-2 transition-all text-left flex flex-col gap-2 ${
                        businessType === 'barber' 
                          ? 'border-indigo-500 bg-indigo-500/5' 
                          : 'border-zinc-900 bg-zinc-950 hover:border-zinc-700'
                      }`}
                    >
                      <Scissors className={businessType === 'barber' ? 'text-indigo-500' : 'text-zinc-500'} size={20} />
                      <div>
                        <p className="text-sm font-bold text-zinc-100">Barbearia</p>
                        <p className="text-xs text-zinc-500">Tema rústico e clássico</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setBusinessType('beauty')}
                      className={`p-4 rounded-xl border-2 transition-all text-left flex flex-col gap-2 ${
                        businessType === 'beauty' 
                          ? 'border-pink-500 bg-pink-500/5' 
                          : 'border-zinc-900 bg-zinc-950 hover:border-zinc-700'
                      }`}
                    >
                      <Sparkles className={businessType === 'beauty' ? 'text-pink-500' : 'text-zinc-500'} size={20} />
                      <div>
                        <p className="text-sm font-bold text-zinc-100">Salão de Beleza</p>
                        <p className="text-xs text-zinc-500">Tema suave e elegante</p>
                      </div>
                    </button>
                  </div>
                </div>

                <Button disabled={isSaving} type="submit" className={`w-full ${theme.btn}`}>
                  {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </form>
            </Card>
          </>
        )}

        <Card className={`p-8 ${theme.card}`}>
          <div className="flex items-center gap-4 mb-8">
            <div className={`p-3 rounded-2xl ${theme.isBeauty ? 'bg-pink-100 text-pink-600' : 'bg-zinc-800 text-zinc-100'}`}>
              <User size={24} />
            </div>
            <div>
              <h2 className="text-xl font-display font-bold">Minha Conta</h2>
              <p className="text-sm text-zinc-500">Gerencie seu perfil de acesso.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className={`flex items-center justify-between p-4 rounded-xl border ${theme.isBeauty ? 'bg-pink-50 border-pink-100' : 'bg-black border-zinc-900'}`}>
              <div>
                <p className="text-sm font-medium">{userName || user?.displayName}</p>
                <p className="text-xs text-zinc-500">{user?.email}</p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleSendReset} 
                  disabled={isSendingReset}
                  className="text-indigo-400 hover:bg-indigo-400/10 gap-2"
                >
                  {isSendingReset ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
                  Redefinir Senha
                </Button>
                <Button variant="ghost" size="sm" onClick={() => signOut(auth)} className="text-red-500 hover:bg-red-500/10 gap-2">
                  <LogOut size={14} />
                  Sair
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <p className={`text-center text-xs italic ${theme.muted}`}>
          Versão 1.0.0 GlowPRO • Made for {isClient ? 'Clients' : 'Specialists'}
        </p>
      </div>
    </div>
  );
}
