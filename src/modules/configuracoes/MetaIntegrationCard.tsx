import React, { useEffect, useState } from 'react';
import { Instagram, Facebook, CheckCircle2, AlertCircle, Link2, Unlink, Loader2, Copy } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Button } from '../../components/ui/Button';
import { confirmDialog } from '../../components/ui/ConfirmDialog';
import { MetaStatus, metaApi } from '../../services/meta';

// Configurações > Integrações: Facebook (Messenger e comentários) e Instagram (Direct e comentários)
export const MetaIntegrationCard: React.FC = () => {
  const { addToast } = useStore();
  const [status, setStatus] = useState<MetaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    metaApi.status().then(setStatus).catch(err => addToast('Facebook e Instagram', err.message, 'error')).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // Volta do login do Facebook: ?meta=conectado ou ?meta=erro&motivo=...
    const params = new URLSearchParams(window.location.search);
    const result = params.get('meta');
    if (result) {
      if (result === 'conectado') addToast('Facebook e Instagram conectados', 'As mensagens e os comentários novos vão aparecer na tela Social.', 'success');
      else addToast('Não foi possível conectar', params.get('motivo') || 'Tente de novo.', 'error');
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.hash}`);
    }
  }, []);

  const copiar = (t?: string | null) => {
    if (!t) return;
    navigator.clipboard?.writeText(t).then(() => addToast('Copiado', t, 'success')).catch(() => null);
  };

  const conectar = async () => {
    setBusy(true);
    try { await metaApi.connect(); } catch (err: any) { addToast('Facebook e Instagram', err.message, 'error'); setBusy(false); }
  };

  const desconectar = async (pageId: string, nome: string) => {
    const ok = await confirmDialog({ title: `Desconectar "${nome}"?`, message: 'Mensagens e comentários novos deixam de chegar ao CRM. O que já chegou continua salvo.', confirmLabel: 'Desconectar' });
    if (!ok) return;
    setBusy(true);
    try { await metaApi.disconnect(pageId); load(); } catch (err: any) { addToast('Erro', err.message, 'error'); } finally { setBusy(false); }
  };

  const Linha: React.FC<{ rotulo: string; valor?: string | null; copiavel?: boolean }> = ({ rotulo, valor, copiavel = true }) => (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="text-slate-500 w-40 shrink-0">{rotulo}</span>
      <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 truncate">{valor || '—'}</code>
      {valor && copiavel && <button type="button" onClick={() => copiar(valor)} aria-label="Copiar" className="text-slate-400 hover:text-indigo-600"><Copy className="w-3.5 h-3.5" /></button>}
    </div>
  );

  return (
    <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-4">
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-pink-50 dark:bg-pink-950/40 text-pink-600 flex items-center justify-center shrink-0 gap-0.5">
          <Instagram className="w-4 h-4" /><Facebook className="w-4 h-4 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Facebook e Instagram</h4>
          <p className="text-xs text-slate-500">Direct do Instagram, Messenger e comentários em posts e anúncios, na tela Social. Conexão oficial pela Meta.</p>
        </div>
        <div className="shrink-0">
          {loading ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> : (
            <Button size="sm" onClick={conectar} disabled={busy || !status?.configurado} className="gap-1.5">
              <Link2 className="w-4 h-4" /> {status?.paginas.length ? 'Conectar outra Página' : 'Conectar Facebook e Instagram'}
            </Button>
          )}
        </div>
      </div>

      {!loading && status && (
        <>
          {!status.configurado && (
            <p className="text-xs text-amber-600 flex items-start gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              O servidor ainda não tem as chaves do app da Meta. Cadastre META_APP_ID, META_APP_SECRET e META_VERIFY_TOKEN na Vercel e faça o Redeploy.
            </p>
          )}
          {status.paginas.map(p => (
            <div key={p.pageId} className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-xs">
              <span className="flex items-center gap-1.5 text-emerald-600"><CheckCircle2 className="w-4 h-4" /> {p.pageName}{p.igUsername ? ` · Instagram @${p.igUsername}` : ' · sem Instagram ligado'}</span>
              <button type="button" onClick={() => desconectar(p.pageId, p.pageName)} disabled={busy} className="text-slate-500 hover:text-red-500 flex items-center gap-1"><Unlink className="w-3.5 h-3.5" /> Desconectar</button>
            </div>
          ))}
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold text-slate-500">Dados para configurar o app no painel da Meta (developers.facebook.com):</p>
            <Linha rotulo="URL de retorno do login" valor={status.redirectUri} />
            <Linha rotulo="URL de callback (Webhooks)" valor={status.webhookUrl} />
            <Linha rotulo="Política de privacidade" valor={status.privacidadeUrl} />
            <Linha rotulo="Token de verificação" valor={status.verifyTokenDefinido ? 'o valor de META_VERIFY_TOKEN da Vercel' : 'defina META_VERIFY_TOKEN na Vercel'} copiavel={false} />
          </div>
        </>
      )}
    </div>
  );
};
