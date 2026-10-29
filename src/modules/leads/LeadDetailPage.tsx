import React, { useState } from 'react';
import { 
  ArrowLeft, Building, Phone, Mail, DollarSign, Calendar, 
  MessageSquare, FileText, CheckCircle2, Sparkles, Send, Paperclip, Plus, User, Tag as TagIcon 
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { TagPicker } from './TagPicker';
import { WonValueModal } from './WonValueModal';
import { leadProductsTotal } from './leadFilters';
import { formatCurrency, formatDate } from '../../utils/cn';
import { Button } from '../../components/ui/Button';
import { Tabs } from '../../components/ui/Tabs';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { generateAiSummary, rewriteMessage } from '../../services/ai';

interface LeadDetailPageProps {
  leadId: string;
}

export const LeadDetailPage: React.FC<LeadDetailPageProps> = ({ leadId }) => {
  const { 
    leads, contacts, companies, users, pipelines, notes, tasks, 
    messages, conversations, setActiveModule, updateLead, addNote, addTask, sendMessage, addContact,
    tags, addTag, setLeadTags, moveLeadStage, winLead, addToast
  } = useStore();
  const [wonStageId, setWonStageId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<'negociado' | 'fechado' | null>(null);
  const [valueInput, setValueInput] = useState('');

  const lead = leads.find(l => l.id === leadId);
  const contact = contacts.find(c => lead?.contactIds.includes(c.id));
  const company = companies.find(c => c.id === lead?.companyId);
  const pipeline = pipelines.find(p => p.id === lead?.pipelineId);
  const stages = pipeline?.stages || [];
  const responsable = users.find(u => u.id === lead?.responsavelId);

  const [activeTab, setActiveTab] = useState<'principal' | 'estatisticas' | 'produtos'>('principal');
  const [feedFilter, setFeedFilter] = useState<'tudo' | 'chats' | 'notas' | 'tarefas'>('tudo');
  
  // Composer state
  const [composerMode, setComposerMode] = useState<'chat' | 'nota' | 'tarefa'>('chat');
  const [composerText, setComposerText] = useState('');
  const [taskPrazo, setTaskPrazo] = useState('hoje');
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  if (!lead) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-950">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">Lead não encontrado</h2>
        <Button onClick={() => setActiveModule('leads')} variant="outline">Voltar para Leads</Button>
      </div>
    );
  }

  const handleSendMessage = () => {
    if (!composerText.trim()) return;
    const conv = conversations.find(c => c.contactId === contact?.id) || conversations[0];
    if (conv) {
      sendMessage(conv.id, composerText, 'saida', 'usuario');
    }
    setComposerText('');
  };

  const handleAddNote = () => {
    if (!composerText.trim()) return;
    addNote({
      texto: composerText,
      entidadeTipo: 'lead',
      entidadeId: lead.id,
      autorId: responsable?.id || users[0].id,
      fixada: false,
    });
    setComposerText('');
  };

  const handleAddTask = () => {
    if (!composerText.trim()) return;
    addTask({
      tipo: 'follow-up',
      texto: composerText,
      prazo: new Date(Date.now() + 86400000).toISOString(),
      responsavelId: responsable?.id || users[0].id,
      entidadeTipo: 'lead',
      entidadeId: lead.id,
    });
    setComposerText('');
  };

  const handleAiSummarize = async () => {
    setAiLoading(true);
    const summary = await generateAiSummary(`Lead: ${lead.nome}, Valor: R$ ${lead.valor}, Contato: ${contact?.nome}`);
    setAiSummary(summary);
    setAiLoading(false);
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Left Column (~380px) */}
      <div className="w-full md:w-[380px] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col overflow-y-auto shrink-0 p-6">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveModule('leads')}
            className="gap-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white -ml-2"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
          <span className="text-xs font-mono text-slate-400">ID: {lead.id}</span>
        </div>

        {/* Lead Title, valores, etiquetas e etapa */}
        {(() => {
          const currentStage = stages.find(s => s.id === lead.stageId);
          const isWon = currentStage?.tipo === 'ganho';
          const productsTotal = leadProductsTotal(lead);
          const parseValue = (v: string) => Number(v.replace(/\./g, '').replace(',', '.'));
          const startEdit = (which: 'negociado' | 'fechado') => {
            const current = which === 'negociado' ? lead.valor : (lead.valorFechado ?? lead.valor);
            setValueInput(String(current ?? 0).replace('.', ','));
            setEditingValue(which);
          };
          const saveEdit = () => {
            const n = parseValue(valueInput);
            if (!Number.isNaN(n) && n >= 0) {
              updateLead(lead.id, editingValue === 'negociado' ? { valor: n } : { valorFechado: n });
            }
            setEditingValue(null);
          };
          // Função de renderização (não componente), para o campo não perder o foco ao digitar
          const ValueBox = ({ which, label, value, color }: { which: 'negociado' | 'fechado'; label: string; value: number; color: string }) => (
            <div key={which} className="flex-1 min-w-[130px] p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
              {editingValue === which ? (
                <input
                  autoFocus
                  inputMode="decimal"
                  value={valueInput}
                  onChange={(e) => setValueInput(e.target.value)}
                  onBlur={saveEdit}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingValue(null); }}
                  className="mt-1 w-full px-2 py-1 text-sm rounded-md border border-indigo-400 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none"
                />
              ) : (
                <button type="button" onClick={() => startEdit(which)} title="Clique para editar" className={`mt-1 text-lg font-bold ${color} hover:underline`}>
                  {formatCurrency(value)}
                </button>
              )}
            </div>
          );
          return (
            <div className="mb-6 space-y-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{lead.nome}</h2>

              <TagPicker
                tags={tags}
                value={lead.tags}
                onChange={(ids) => setLeadTags(lead.id, ids)}
                onCreate={(nome) => addTag(nome, '#6366F1')}
              />

              <div className="flex flex-wrap gap-2">
                {ValueBox({ which: 'negociado', label: 'Valor negociado', value: lead.valor || 0, color: 'text-slate-900 dark:text-slate-100' })}
                {isWon && (
                  ValueBox({ which: 'fechado', label: 'Valor fechado', value: lead.valorFechado ?? lead.valor ?? 0, color: 'text-emerald-600 dark:text-emerald-400' })
                )}
              </div>
              {productsTotal > 0 && Math.abs(productsTotal - (lead.valor || 0)) > 0.009 && (
                <button
                  type="button"
                  onClick={() => updateLead(lead.id, { valor: Math.round(productsTotal * 100) / 100 })}
                  className="text-[11px] text-indigo-600 hover:underline"
                >
                  Usar a soma dos produtos como valor negociado ({formatCurrency(productsTotal)})
                </button>
              )}

              {/* Etapa: escolher "Venda ganha" pede o valor fechado */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
                  <span>Etapa atual</span>
                  <select
                    value={lead.stageId}
                    onChange={(e) => {
                      const target = stages.find(s => s.id === e.target.value);
                      if (!target || target.id === lead.stageId) return;
                      if (target.tipo === 'ganho') { setWonStageId(target.id); return; }
                      moveLeadStage(lead.id, target.id);
                      addToast('Etapa alterada', `${lead.nome} → ${target.nome}`);
                    }}
                    className="px-2 py-1 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 outline-none"
                  >
                    {stages.map(st => <option key={st.id} value={st.id}>{st.nome}</option>)}
                  </select>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full flex gap-1 overflow-hidden">
                  {stages.map(st => (
                    <div
                      key={st.id}
                      className={`flex-1 h-full rounded-sm ${st.id === lead.stageId ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                    />
                  ))}
                </div>
              </div>

              <WonValueModal
                lead={wonStageId ? lead : null}
                stageName={stages.find(s => s.id === wonStageId)?.nome || ''}
                onCancel={() => setWonStageId(null)}
                onConfirm={(valorFechado) => {
                  if (!wonStageId) return;
                  winLead(lead.id, wonStageId, valorFechado);
                  addToast('Venda ganha', `${lead.nome}: ${formatCurrency(valorFechado)}`, 'success');
                  setWonStageId(null);
                }}
              />
            </div>
          );
        })()}

        {/* Tabs */}
        <Tabs
          tabs={[
            { id: 'principal', label: 'Principal' },
            { id: 'estatisticas', label: 'Rastreamento' },
            { id: 'produtos', label: 'Produtos' },
          ]}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as any)}
          className="mb-6"
        />

        {activeTab === 'principal' && (
          <div className="space-y-6">
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Responsável & Origem</h4>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                {responsable && <Avatar src={responsable.avatar} name={responsable.nome} size="md" />}
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{responsable?.nome}</p>
                  <p className="text-xs text-slate-500">{responsable?.email}</p>
                </div>
              </div>
            </div>

            {/* Contato Principal */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Contato Principal</h4>
              {contact ? (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2">
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{contact.nome}</p>
                  <p className="text-xs text-slate-500 flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-indigo-500" /> {contact.telefones[0]}
                  </p>
                  <p className="text-xs text-slate-500 flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-indigo-500" /> {contact.emails[0] || 'Sem e-mail'}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-400">Nenhum contato vinculado.</p>
              )}
            </div>

            {/* Empresa */}
            {company && (
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Empresa</h4>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1">
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{company.nome}</p>
                  <p className="text-xs text-slate-500">{company.segmento} · {company.site}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'estatisticas' && (() => {
          const r = lead.rastreamento || {};
          const q = lead.qualificacao || {};
          // Tempo de resposta real, calculado pelas mensagens das conversas deste lead
          const convIds = new Set(conversations.filter(c => c.leadId === lead.id || lead.contactIds.includes(c.contactId)).map(c => c.id));
          const msgs = messages
            .filter(m => convIds.has(m.conversationId))
            .sort((a, b) => new Date(a.enviadaAt).getTime() - new Date(b.enviadaAt).getTime());
          const waits: number[] = [];
          let waitingSince: number | null = null;
          for (const m of msgs) {
            const t = new Date(m.enviadaAt).getTime();
            if (m.direcao === 'entrada') { if (waitingSince === null) waitingSince = t; }
            else if (m.direcao === 'saida' && waitingSince !== null) { waits.push(t - waitingSince); waitingSince = null; }
          }
          const fmt = (ms?: number) => {
            if (ms === undefined) return '—';
            const min = Math.round(ms / 60000);
            if (min < 60) return `${min} min`;
            const h = Math.floor(min / 60);
            return h < 24 ? `${h} h ${min % 60} min` : `${Math.floor(h / 24)} d ${h % 24} h`;
          };
          const avg = waits.length ? waits.reduce((a, b) => a + b, 0) / waits.length : undefined;
          const Row = ({ label, value }: { label: string; value?: React.ReactNode }) => (
            <div className="flex justify-between gap-3 py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
              <span className="text-slate-500 shrink-0">{label}</span>
              <span className="font-medium text-slate-900 dark:text-slate-100 text-right break-words">{value || '—'}</span>
            </div>
          );
          return (
            <div className="space-y-5 text-xs">
              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Rastreamento</h4>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <Row label="Entrada" value={r.dataEntrada ? formatDate(r.dataEntrada) : formatDate(lead.createdAt)} />
                  <Row label="Fonte" value={r.fonte} />
                  <Row label="Plataforma" value={r.plataforma} />
                  <Row label="Posicionamento" value={r.posicionamento} />
                  <Row label="Campanha" value={r.campanha} />
                  <Row label="Conjunto" value={r.conjunto} />
                  <Row label="Anúncio" value={r.anuncio} />
                  <Row label="ID do anúncio" value={r.anuncioId} />
                  <Row label="ID na planilha" value={lead.planilhaId} />
                </div>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Qualificação</h4>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <Row label="Segmento" value={q.segmento} />
                  <Row label="Faturamento" value={q.faturamento} />
                  <Row label="Já trabalhou com cacau?" value={q.jaTrabalhouCacau} />
                  <Row label="Score" value={q.score !== null && q.score !== undefined ? `${q.score}%` : undefined} />
                  <Row label="UF / DDD" value={[q.uf, q.ddd].filter(Boolean).join(' · ')} />
                  <Row label="Região" value={q.regiao} />
                </div>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Atendimento</h4>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <Row label="Última interação" value={formatDate(lead.ultimaInteracaoAt)} />
                  <Row label="Mensagens" value={String(msgs.length)} />
                  <Row label="1ª resposta" value={fmt(waits[0])} />
                  <Row label="Tempo médio de resposta" value={fmt(avg)} />
                </div>
              </div>
            </div>
          );
        })()}

        {activeTab === 'produtos' && (
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Produtos Vinculados</h4>
            {lead.produtos.length === 0 ? (
              <p className="text-xs text-slate-400">Nenhum produto adicionado ao lead.</p>
            ) : (
              lead.produtos.map((p, i) => (
                <div key={i} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 flex justify-between items-center text-xs">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">Produto ID {p.productId}</p>
                    <p className="text-slate-500">Qtd: {p.quantidade} x {formatCurrency(p.precoUnitario)}</p>
                  </div>
                  <span className="font-bold text-indigo-600">{formatCurrency(p.quantidade * p.precoUnitario)}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Right Column: Feed & Composer */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-slate-900">
        {/* Feed Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {(['tudo', 'chats', 'notas', 'tarefas'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setFeedFilter(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${feedFilter === tab ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 font-semibold' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleAiSummarize}
            disabled={aiLoading}
            className="gap-2 text-indigo-600 border-indigo-200 dark:border-indigo-800"
          >
            <Sparkles className="w-4 h-4" />
            <span>Resumir com IA</span>
          </Button>
        </div>

        {/* AI Summary Banner */}
        {aiSummary && (
          <div className="m-4 p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-900 text-xs text-indigo-900 dark:text-indigo-200 relative">
            <h4 className="font-bold mb-1 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-600" /> Resumo Inteligente (Gemini AI)
            </h4>
            <p className="leading-relaxed">{aiSummary}</p>
          </div>
        )}

        {/* Timeline / Messages Feed */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {messages.map(msg => (
            <div key={msg.id} className={`flex gap-3 ${msg.direcao === 'saida' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                msg.direcao === 'saida'
                  ? 'bg-indigo-600 text-white rounded-br-none'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none'
              }`}>
                <p>{msg.conteudo}</p>
                <span className={`text-[10px] block mt-1 text-right ${msg.direcao === 'saida' ? 'text-indigo-200' : 'text-slate-400'}`}>
                  {formatDate(msg.enviadaAt)} · WhatsApp
                </span>
              </div>
            </div>
          ))}

          {notes.filter(n => n.entidadeId === lead.id).map(note => (
            <div key={note.id} className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-200">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold">Nota Interna</span>
                <span>{formatDate(note.createdAt)}</span>
              </div>
              <p>{note.texto}</p>
            </div>
          ))}

          {tasks.filter(t => t.entidadeId === lead.id).map(task => (
            <div key={task.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900 dark:text-slate-100 mb-0.5">Tarefa: {task.texto}</p>
                <p className="text-slate-500">Prazo: {formatDate(task.prazo)} · Status: {task.status}</p>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${task.status === 'concluida' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                {task.status}
              </span>
            </div>
          ))}
        </div>

        {/* Composer Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2 mb-2">
            {(['chat', 'nota', 'tarefa'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setComposerMode(mode)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-colors ${composerMode === mode ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
              >
                {mode === 'chat' ? 'Enviar Chat' : mode === 'nota' ? 'Nova Nota' : 'Criar Tarefa'}
              </button>
            ))}
          </div>

          <div className="flex items-end gap-2">
            <textarea
              rows={2}
              placeholder={composerMode === 'chat' ? 'Digite sua mensagem para o cliente...' : composerMode === 'nota' ? 'Escreva uma nota interna...' : 'Descreva a tarefa pendente...'}
              value={composerText}
              onChange={(e) => setComposerText(e.target.value)}
              className="flex-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500 resize-none"
            />
            <Button
              onClick={() => {
                if (composerMode === 'chat') handleSendMessage();
                else if (composerMode === 'nota') handleAddNote();
                else handleAddTask();
              }}
              size="sm"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
