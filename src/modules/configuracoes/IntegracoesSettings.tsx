import React, { useEffect, useState } from 'react';
import { CalendarDays, CheckCircle2, AlertCircle, Link2, Unlink, Loader2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Button } from '../../components/ui/Button';
import { confirmDialog } from '../../components/ui/ConfirmDialog';
import { GoogleStatus, googleConnect, googleDisconnect, googleStatus } from '../../services/googleCalendar';

// Configurações > Integrações: conectar o Google Agenda de quem está logado
export const IntegracoesSettings: React.FC = () => {
  const { addToast } = useStore();
  const [status, setStatus] = useState<GoogleStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    googleStatus()
      .then(setStatus)
      .catch(err => addToast('Google Agenda', err.message, 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // Volta do login do Google: ?google=conectado ou ?google=erro&motivo=...
    const params = new URLSearchParams(window.location.search);
    const result = params.get('google');
    if (result) {
      if (result === 'conectado') addToast('Google Agenda conectado', 'As tarefas do CRM vão aparecer na sua agenda.', 'success');
      else addToast('Não foi possível conectar', params.get('motivo') || 'Tente de novo.', 'error');
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.hash}`);
    }
  }, []);

  const connect = async () => {
    setBusy(true);
    try { await googleConnect(); } catch (err: any) { addToast('Google Agenda', err.message, 'error'); setBusy(false); }
  };

  const disconnect = async () => {
    const ok = await confirmDialog({
      title: 'Desconectar o Google Agenda?',
      message: 'As tarefas novas deixam de ir para a agenda. Os eventos que já estão lá continuam.',
      confirmLabel: 'Desconectar',
    });
    if (!ok) return;
    setBusy(true);
    try { await googleDisconnect(); addToast('Google Agenda desconectado', '', 'success'); load(); }
    catch (err: any) { addToast('Google Agenda', err.message, 'error'); }
    finally { setBusy(false); }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 flex flex-col gap-6">
      <div>
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Integrações</h3>
        <p className="text-xs text-slate-500">Conecte serviços externos ao CRM.</p>
      </div>

      <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center shrink-0">
          <CalendarDays className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Google Agenda</h4>
          <p className="text-xs text-slate-500">
            As tarefas do CRM (reuniões, ligações, follow-ups) viram eventos na sua agenda, com lembrete e link do lead.
            Os compromissos do Google aparecem na visão Calendário da tela Tarefas.
          </p>
          {!loading && status && (
            <div className="mt-2 text-xs">
              {!status.configurado ? (
                <p className="text-amber-600 flex items-start gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>
                    O servidor ainda não tem as chaves do Google. Cadastre GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET na Vercel.
                    {status.redirectUri && <> URL de retorno para o Google Cloud: <code className="px-1 rounded bg-slate-100 dark:bg-slate-800">{status.redirectUri}</code></>}
                  </span>
                </p>
              ) : status.conectado ? (
                <p className="text-emerald-600 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Conectado{status.googleEmail ? ` como ${status.googleEmail}` : ''}
                  {status.erro && <span className="text-amber-600 ml-2">· a conexão precisa ser refeita ({status.erro})</span>}
                </p>
              ) : (
                <p className="text-slate-500">Não conectado.</p>
              )}
            </div>
          )}
        </div>
        <div className="shrink-0">
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          ) : status?.conectado ? (
            <div className="flex gap-2">
              {status.erro && <Button size="sm" onClick={connect} disabled={busy} className="gap-1.5"><Link2 className="w-4 h-4" /> Reconectar</Button>}
              <Button size="sm" variant="outline" onClick={disconnect} disabled={busy} className="gap-1.5"><Unlink className="w-4 h-4" /> Desconectar</Button>
            </div>
          ) : (
            <Button size="sm" onClick={connect} disabled={busy || !status?.configurado} className="gap-1.5">
              <Link2 className="w-4 h-4" /> Conectar Google Agenda
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
