import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Save, Repeat, ArrowDown } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Button } from '../../components/ui/Button';
import { confirmDialog } from '../../components/ui/ConfirmDialog';
import { FollowupSequence } from '../../types';

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const EXEMPLO: Record<string, string> = {
  primeiro_nome: 'Mário', nome: 'Mário Souza', empresa: 'UP Cafeteria', segmento: 'Cafeteria',
  'contato.nome': 'Mário Souza', 'contato.primeiro_nome': 'Mário', 'lead.nome': 'UP Cafeteria', 'empresa.nome': 'UP Cafeteria',
};
const preview = (corpo: string) => corpo.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, k) => EXEMPLO[String(k).toLowerCase()] ?? '');

const novaSequencia = (): FollowupSequence => ({
  id: `seq-${Date.now()}`,
  nome: 'Nova sequência',
  ativo: true,
  gatilho: { tipo: 'manual' },
  pausarQuandoResponder: true,
  janela: { dias: [1, 2, 3, 4, 5, 6], inicio: '09:00', fim: '19:00' },
  passos: [],
});

// Configurações > Follow-up: sequências de mensagens automáticas
export const FollowupSettings: React.FC<{ onEditTemplates?: () => void }> = ({ onEditTemplates }) => {
  const { followupSequences, saveFollowupSequence, deleteFollowupSequence, messageTemplates, leads, addToast } = useStore();
  const [selectedId, setSelectedId] = useState<string | null>(followupSequences[0]?.id || null);
  const [draft, setDraft] = useState<FollowupSequence | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!selectedId && followupSequences[0]) setSelectedId(followupSequences[0].id);
  }, [followupSequences, selectedId]);

  // Troca de sequência: carrega a escolhida
  useEffect(() => {
    const seq = followupSequences.find(s => s.id === selectedId);
    setDraft(seq ? JSON.parse(JSON.stringify(seq)) : null);
    setDirty(false);
  }, [selectedId]);

  // Atualização automática (a cada 15 s): só recarrega se não houver edição em andamento
  useEffect(() => {
    if (dirty) return;
    const seq = followupSequences.find(s => s.id === selectedId);
    setDraft(seq ? JSON.parse(JSON.stringify(seq)) : null);
  }, [followupSequences]);

  const ativosPorSequencia = useMemo(() => {
    const m = new Map<string, number>();
    leads.forEach(l => { if (l.followup?.status === 'ativo') m.set(l.followup.sequenceId, (m.get(l.followup.sequenceId) || 0) + 1); });
    return m;
  }, [leads]);

  const update = (patch: Partial<FollowupSequence>) => { setDirty(true); setDraft(d => (d ? { ...d, ...patch } : d)); };
  const updateStep = (i: number, patch: Partial<FollowupSequence['passos'][number]>) => {
    setDirty(true);
    setDraft(d => (d ? { ...d, passos: d.passos.map((p, idx) => (idx === i ? { ...p, ...patch } : p)) } : d));
  };

  const salvar = () => {
    if (!draft) return;
    if (!draft.nome.trim()) { addToast('Dê um nome à sequência', '', 'error'); return; }
    if (draft.passos.some(p => !p.templateId)) { addToast('Escolha o modelo de cada passo', '', 'error'); return; }
    if (draft.gatilho.tipo === 'documento' && !draft.gatilho.palavraChave?.trim()) { addToast('Informe a palavra do nome do documento', '', 'error'); return; }
    const passos = [...draft.passos].sort((a, b) => a.diasApos - b.diasApos);
    saveFollowupSequence({ ...draft, nome: draft.nome.trim(), passos });
    setDirty(false);
    addToast('Sequência salva', draft.nome, 'success');
  };

  const excluir = async () => {
    if (!draft) return;
    const emAndamento = ativosPorSequencia.get(draft.id) || 0;
    const ok = await confirmDialog({
      title: `Excluir a sequência "${draft.nome}"?`,
      message: emAndamento ? `${emAndamento} lead(s) estão nela agora e vão parar de receber as mensagens.` : undefined,
    });
    if (!ok) return;
    deleteFollowupSequence(draft.id);
    setSelectedId(null);
  };

  const criar = () => {
    const seq = novaSequencia();
    saveFollowupSequence(seq);
    setSelectedId(seq.id);
  };

  const inputCls = 'px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500';

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Sequências de follow-up</h3>
          <p className="text-xs text-slate-500 max-w-2xl">
            Mensagens automáticas enviadas pelo WhatsApp em dias definidos. O texto de cada passo vem de um modelo em
            "Modelos de Mensagem": editou o modelo, as próximas mensagens já saem com o texto novo. A sequência para sozinha
            quando o lead vira venda ganha ou perdida, ou recebe a etiqueta "Não enviar disparo".
          </p>
        </div>
        <Button size="sm" onClick={criar} className="gap-1.5"><Plus className="w-4 h-4" /> Nova sequência</Button>
      </div>

      {followupSequences.length === 0 ? (
        <p className="text-xs text-slate-400 py-8 text-center">Nenhuma sequência ainda.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {followupSequences.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={async () => {
                if (dirty && s.id !== selectedId && !(await confirmDialog({ title: 'Descartar as alterações não salvas?', confirmLabel: 'Descartar' }))) return;
                setSelectedId(s.id);
              }}
              className={`px-3 py-2 rounded-xl border text-xs text-left ${selectedId === s.id ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40' : 'border-slate-200 dark:border-slate-800'}`}
            >
              <span className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100">
                <Repeat className="w-3.5 h-3.5" /> {s.nome}
                {!s.ativo && <span className="text-[10px] text-slate-400 font-normal">(desativada)</span>}
              </span>
              <span className="text-[11px] text-slate-500">{s.passos.length} mensagens · {ativosPorSequencia.get(s.id) || 0} lead(s) em andamento</span>
            </button>
          ))}
        </div>
      )}

      {draft && (
        <div className="space-y-5 border-t border-slate-100 dark:border-slate-800 pt-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
              <span className="font-semibold">Nome</span>
              <input value={draft.nome} onChange={(e) => update({ nome: e.target.value })} className={`w-full ${inputCls}`} />
            </label>
            <div className="flex flex-col gap-2 text-xs text-slate-600 dark:text-slate-300">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={draft.ativo} onChange={(e) => update({ ativo: e.target.checked })} />
                Sequência ativa (desativada, nenhuma mensagem sai)
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={draft.pausarQuandoResponder} onChange={(e) => update({ pausarQuandoResponder: e.target.checked })} />
                Pausar quando o cliente responder (a equipe assume a conversa)
              </label>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-3 text-xs text-slate-600 dark:text-slate-300">
            <p className="font-semibold">Como o lead entra na sequência</p>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={draft.gatilho.tipo === 'documento'}
                onChange={(e) => update({ gatilho: e.target.checked ? { tipo: 'documento', palavraChave: draft.gatilho.palavraChave || 'catálogo' } : { tipo: 'manual' } })}
              />
              Automaticamente, quando a equipe enviar um documento cujo nome contém:
              <input
                value={draft.gatilho.palavraChave || ''}
                disabled={draft.gatilho.tipo !== 'documento'}
                onChange={(e) => update({ gatilho: { tipo: 'documento', palavraChave: e.target.value } })}
                className={`w-40 ${inputCls}`}
                placeholder="catálogo"
              />
            </label>
            <p className="text-[11px] text-slate-500">Também dá para iniciar à mão no card do lead, com o botão "Iniciar follow-up".</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-3 text-xs text-slate-600 dark:text-slate-300">
            <p className="font-semibold">Quando as mensagens podem sair (horário de Brasília)</p>
            <div className="flex flex-wrap items-center gap-2">
              {DIAS.map((d, i) => {
                const on = draft.janela.dias.includes(i);
                return (
                  <button key={d} type="button"
                    onClick={() => update({ janela: { ...draft.janela, dias: on ? draft.janela.dias.filter(x => x !== i) : [...draft.janela.dias, i].sort() } })}
                    className={`px-2.5 py-1 rounded-lg border ${on ? 'border-indigo-500 bg-indigo-600 text-white' : 'border-slate-300 dark:border-slate-700'}`}>
                    {d}
                  </button>
                );
              })}
              <span className="ml-2">das</span>
              <input type="time" value={draft.janela.inicio} onChange={(e) => update({ janela: { ...draft.janela, inicio: e.target.value } })} className={inputCls} />
              <span>às</span>
              <input type="time" value={draft.janela.fim} onChange={(e) => update({ janela: { ...draft.janela, fim: e.target.value } })} className={inputCls} />
            </div>
            <p className="text-[11px] text-slate-500">Se a mensagem vencer fora desse horário, ela sai no próximo horário permitido.</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Mensagens da sequência</p>
              {onEditTemplates && (
                <button type="button" onClick={onEditTemplates} className="text-[11px] text-indigo-600 hover:underline">Editar textos em Modelos de Mensagem</button>
              )}
            </div>
            {draft.passos.length === 0 && <p className="text-xs text-slate-400">Nenhuma mensagem. Adicione o primeiro passo.</p>}
            {draft.passos.map((p, i) => {
              const tpl = messageTemplates.find(t => t.id === p.templateId);
              return (
                <div key={p.id}>
                  {i > 0 && <ArrowDown className="w-3.5 h-3.5 text-slate-400 mx-auto mb-2" />}
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">Mensagem {i + 1}:</span>
                      <input type="number" min={0} value={p.diasApos} onChange={(e) => updateStep(i, { diasApos: Math.max(0, Number(e.target.value) || 0) })} className={`w-16 ${inputCls}`} />
                      <span>dias depois do início, usando o modelo</span>
                      <select value={p.templateId} onChange={(e) => updateStep(i, { templateId: e.target.value })} className={`flex-1 min-w-[180px] ${inputCls}`}>
                        <option value="">Escolha um modelo…</option>
                        {messageTemplates.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                      </select>
                      <button type="button" aria-label="Remover passo" onClick={() => update({ passos: draft.passos.filter((_, idx) => idx !== i) })} className="p-1.5 text-slate-400 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    {tpl && <p className="text-[11px] text-slate-500 whitespace-pre-line bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2">Exemplo: {preview(tpl.corpo)}</p>}
                  </div>
                </div>
              );
            })}
            <Button size="sm" variant="outline" className="gap-1.5"
              onClick={() => update({ passos: [...draft.passos, { id: `p-${Date.now()}`, diasApos: (draft.passos[draft.passos.length - 1]?.diasApos || 0) + 3, templateId: '' }] })}>
              <Plus className="w-4 h-4" /> Adicionar mensagem
            </Button>
          </div>

          {dirty && <p className="text-[11px] text-amber-600">Há alterações não salvas.</p>}
          <div className="flex justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={excluir} className="text-xs text-red-500 hover:underline flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" /> Excluir sequência</button>
            <Button size="sm" onClick={salvar} className="gap-1.5"><Save className="w-4 h-4" /> Salvar sequência</Button>
          </div>
        </div>
      )}
    </div>
  );
};
