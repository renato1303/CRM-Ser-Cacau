import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../services/db/supabase';
import { recoveryRequested } from '../../services/apiAuth';

export const LoginPage: React.FC = () => {
  const { login, completeLogin } = useStore();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'nova-senha'>(recoveryRequested ? 'nova-senha' : 'login');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    const result = await login(email, senha);
    setLoading(false);
    if (!result.ok) setError(result.error || 'Não foi possível entrar.');
  };

  const handleForgot = async () => {
    setError(null);
    setInfo(null);
    if (!email.trim()) { setError('Digite seu e-mail acima e clique de novo em "Esqueci minha senha".'); return; }
    if (!supabase) { setError('Login indisponível: Supabase não configurado.'); return; }
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin });
    if (err) setError(err.message);
    else setInfo('Se esse e-mail tiver acesso, você vai receber um link para criar uma nova senha.');
  };

  const handleNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (senha.length < 8) { setError('A nova senha precisa ter pelo menos 8 caracteres.'); return; }
    if (!supabase) { setError('Login indisponível: Supabase não configurado.'); return; }
    setLoading(true);
    const { data, error: err } = await supabase.auth.updateUser({ password: senha });
    setLoading(false);
    if (err || !data.user) { setError(err?.message || 'O link expirou. Peça um novo em "Esqueci minha senha".'); return; }
    window.history.replaceState(null, '', window.location.pathname);
    completeLogin(data.user.email || '');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/50 dark:border-slate-800 shadow-2xl p-8 relative overflow-hidden">
        {/* Glow decoration */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center mb-8 relative z-10 flex flex-col items-center">
          <img src="/logoseranovo_dark.png" alt="Será Cacau CRM" className="h-10 w-auto object-contain brightness-0 invert" />
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {info && (
          <div className="mb-6 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> {info}
          </div>
        )}

        {mode === 'nova-senha' ? (
          <form onSubmit={handleNewPassword} className="space-y-4 relative z-10">
            <p className="text-xs text-slate-600 dark:text-slate-300">Crie uma nova senha para o seu acesso.</p>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                autoFocus
                placeholder="Nova senha (mínimo 8 caracteres)"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full py-3 text-xs font-bold gap-2 mt-2">
              <span>{loading ? 'Salvando...' : 'Salvar nova senha e entrar'}</span>
            </Button>
            <button type="button" onClick={() => { setMode('login'); setSenha(''); }} className="w-full text-[11px] text-slate-500 hover:text-indigo-600">
              Voltar para o login
            </button>
          </form>
        ) : (

        <form onSubmit={handleLogin} className="space-y-4 relative z-10">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">E-mail</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                placeholder="nome@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Senha</label>
              <button type="button" onClick={handleForgot} className="text-[11px] text-indigo-600 hover:underline">
                Esqueci minha senha
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full py-3 text-xs font-bold gap-2 shadow-lg shadow-indigo-600/20 mt-2">
            <span>{loading ? 'Entrando...' : 'Acessar CRM'}</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </form>
        )}
      </div>
    </div>
  );
};
