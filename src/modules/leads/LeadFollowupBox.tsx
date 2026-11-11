import React, { useState } from 'react';
import { Repeat, Pause, Play, Square, Send, Zap } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Lead } from '../../types';
import { confirmDialog } from '../../components/ui/ConfirmDialog';

const fmt = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

const STATUS: Record<string, { label: string; cls: string }> = {
  ativo: { label: 'Em andamento', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' },
  pausado: { label: 'Pausado', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300' },
  concluido: { label: 'Concluído', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
  encerrado: { label: 'Encerrado', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
};

// Card do lead: situação do follow-up automático e botões de controle
export const LeadFollowupBox: React.FC<{ lead: Lead }> = ({ lead }) => {
  const { followupSequences, startFollowup, pauseFollowup, resumeFollowup, stopFollowup, addToast, refreshData } = useStore();
  const [enviando, setEnviando] = useState(false);
  const ativas = followupSequences.filter(s => s.ativo && s.passos.length > 0);
  const [escolhida, setEscolhida] = useState(ativas[0]?.id || '');
  const f = lead.followup;
  const st = f ? STATUS[f.status] : null;
  const btn = 'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border';

  // Teste rápido: manda agora a próxima mensagem (de verdade) e avança a sequência
  const enviarAgora = async () => {
    if (!f) return;
    const ok = await confirmDialog({
      title: `Enviar agora a mensagem ${(f.historico?.length || 0) + 1} de ${f.totalPassos}?`,
      message: 'A mensagem sai de verdade pelo WhatsApp para este lead, sem esperar a data programada. Use para testar com um número seu.',
      confirmLabel: 'Enviar agora',
      danger: false,
    });
    if (!ok) return;
    setEnviando(true);
    try {
      const res = await fetch('/api/followup/enviar-agora', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
      addToast(`Mensagem ${data.passo} de ${data.total} enviada`, `Para ${data.para}`, 'success');
      await refreshData();
    } catch (err: any) {
      addToast('Não foi possível enviar', err.message || 'Tente de novo.', 'error');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
        <Repeat className="w-3.5 h-3.5" /> Follow-up automático
      </h4>
      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
        {f && st ? (
          <>
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">{f.sequenceNome || 'Sequência'}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${st.cls}`}>{st.label}</span>
            </div>
            <div className="text-slate-600 dark:text-slate-300 space-y-0.5">
              <p>Mensagens enviadas: <strong>{f.historico?.length || 0} de {f.totalPassos}</strong></p>
              {f.status === 'ativo' && <p>Próximo envio: <strong>{fmt(f.proximoEnvioEm)}</strong></p>}
              {f.motivo && f.status !== 'ativo' && <p className="text-slate-500">{f.motivo}{f.pausadoEm && f.status === 'pausado' ? ` · ${fmt(f.pausadoEm)}` : ''}</p>}
              <p className="text-slate-400">Início: {fmt(f.iniciadoEm)}{f.origem ? ` · ${f.origem}` : ''}</p>
            </div>
            {f.historico?.length > 0 && (
              <ul className="space-y-0.5 text-[11px] text-slate-500">
                {f.historico.map(h => (
                  <li key={`${h.passo}-${h.enviadoEm}`} className="flex items-center gap-1"><Send className="w-3 h-3" /> Mensagem {h.passo} enviada em {fmt(h.enviadoEm)}</li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              {f.status === 'ativo' && (
                <button type="button" onClick={() => pauseFollowup(lead.id)} className={`${btn} border-amber-300 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40`}>
                  <Pause className="w-3.5 h-3.5" /> Pausar
                </button>
              )}
              {f.status === 'pausado' && (
                <button type="button" onClick={() => resumeFollowup(lead.id)} className={`${btn} border-emerald-300 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40`}>
                  <Play className="w-3.5 h-3.5" /> Retomar
                </button>
              )}
              {(f.status === 'ativo' || f.status === 'pausado') && (
                <button type="button" onClick={enviarAgora} disabled={enviando}
                  title="Teste rápido: envia agora a próxima mensagem, sem esperar a data"
                  className={`${btn} border-indigo-300 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 disabled:opacity-50`}>
                  <Zap className="w-3.5 h-3.5" /> {enviando ? 'Enviando…' : 'Enviar próxima agora'}
                </button>
              )}
              {(f.status === 'ativo' || f.status === 'pausado') && (
                <button
                  type="button"
                  onClick={async () => { if (await confirmDialog({ title: 'Encerrar o follow-up deste lead?', message: 'Nenhuma outra mensagem da sequência será enviada.', confirmLabel: 'Encerrar' })) stopFollowup(lead.id); }}
                  className={`${btn} border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800`}
                >
                  <Square className="w-3.5 h-3.5" /> Encerrar
                </button>
              )}
              {(f.status === 'concluido' || f.status === 'encerrado') && ativas.length > 0 && (
                <button type="button" onClick={() => startFollowup(lead.id, f.sequenceId)} className={`${btn} border-indigo-300 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40`}>
                  <Play className="w-3.5 h-3.5" /> Recomeçar
                </button>
              )}
            </div>
          </>
        ) : ativas.length === 0 ? (
          <p className="text-slate-400">Nenhuma sequência ativa. Crie em Configurações &gt; Follow-up.</p>
        ) : (
          <div className="space-y-2">
            <p className="text-slate-500">Este lead não está em nenhuma sequência. Ele entra sozinho quando o catálogo é enviado, ou você pode iniciar agora:</p>
            <div className="flex gap-2">
              <select value={escolhida} onChange={(e) => setEscolhida(e.target.value)}
                className="flex-1 px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 outline-none">
                {ativas.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
              <button type="button" disabled={!escolhida} onClick={() => startFollowup(lead.id, escolhida)}
                className={`${btn} border-indigo-500 bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50`}>
                <Play className="w-3.5 h-3.5" /> Iniciar follow-up
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
