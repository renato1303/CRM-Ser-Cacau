import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Instagram, Facebook, MessageCircle, MessagesSquare, Send, EyeOff, Eye, UserPlus, ExternalLink, RefreshCw, Megaphone, Link2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { cn } from '../../utils/cn';
import { metaApi, SocialComment, SocialMessage, SocialThread } from '../../services/meta';

type Aba = 'instagram' | 'messenger' | 'comentarios';
const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '');
const nomeThread = (t: SocialThread) => t.participant_name || (t.participant_username ? `@${t.participant_username}` : 'Contato');

// Social: Direct do Instagram, Messenger e comentários (posts e anúncios) num só lugar
export const SocialPage: React.FC = () => {
  const { addToast, setActiveModule, refreshData } = useStore();
  const [aba, setAba] = useState<Aba>('instagram');
  const [threads, setThreads] = useState<SocialThread[]>([]);
  const [selected, setSelected] = useState<SocialThread | null>(null);
  const [messages, setMessages] = useState<SocialMessage[]>([]);
  const [comments, setComments] = useState<SocialComment[]>([]);
  const [filtroComent, setFiltroComent] = useState<'pendentes' | 'todos'>('pendentes');
  const [canalComent, setCanalComent] = useState<'' | 'instagram' | 'facebook'>('');
  const [texto, setTexto] = useState('');
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [conectado, setConectado] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);

  const carregar = useCallback(async () => {
    try {
      if (aba === 'comentarios') {
        setComments(await metaApi.comments(canalComent || undefined, filtroComent));
      } else {
        const list = await metaApi.threads(aba);
        setThreads(list);
        setSelected(sel => (sel ? list.find(t => t.id === sel.id) || sel : sel));
      }
    } catch (err: any) {
      addToast('Social', err.message, 'error');
    }
  }, [aba, filtroComent, canalComent]);

  useEffect(() => {
    metaApi.status().then(s => setConectado(s.paginas.length > 0)).catch(() => setConectado(false));
  }, []);

  useEffect(() => {
    setLoading(true);
    carregar().finally(() => setLoading(false));
    const timer = setInterval(carregar, 10000); // atualiza a cada 10 segundos
    return () => clearInterval(timer);
  }, [carregar]);

  useEffect(() => { setSelected(null); setMessages([]); }, [aba]);

  // Mensagens da conversa aberta
  useEffect(() => {
    if (!selected) return;
    let active = true;
    const load = () => metaApi.messages(selected.id).then(m => { if (active) setMessages(m); }).catch(() => null);
    load();
    if (selected.nao_lidas > 0) metaApi.read(selected.id).catch(() => null);
    const timer = setInterval(load, 8000);
    return () => { active = false; clearInterval(timer); };
  }, [selected?.id]);

  useEffect(() => {
    const el = feedRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, selected?.id]);

  const janelaAberta = useMemo(() => {
    if (!selected?.ultima_do_cliente_at) return false;
    return Date.now() - new Date(selected.ultima_do_cliente_at).getTime() < 24 * 3600 * 1000;
  }, [selected]);

  const enviar = async () => {
    if (!selected || !texto.trim()) return;
    try {
      await metaApi.send(selected.id, texto.trim());
      setTexto('');
      setMessages(await metaApi.messages(selected.id));
      carregar();
    } catch (err: any) {
      addToast('Não foi possível enviar', err.message, 'error');
    }
  };

  const criarLead = async (body: { threadId?: string; commentId?: string }) => {
    try {
      const r = await metaApi.criarLead(body);
      await refreshData();
      addToast(r.existente ? 'Já está no funil' : 'Lead criado', r.existente ? 'Esta pessoa já tinha um lead.' : 'Ele entrou em Leads de Entrada.', 'success');
      carregar();
    } catch (err: any) {
      addToast('Não foi possível criar o lead', err.message, 'error');
    }
  };

  const abrirLead = (leadId: string) => {
    window.location.hash = `#/leads/${leadId}`;
    setActiveModule(`leads/${leadId}`);
  };

  const responderComentario = async (c: SocialComment) => {
    const t = (respostas[c.id] || '').trim();
    if (!t) return;
    try {
      await metaApi.replyComment(c.id, t);
      setRespostas(r => ({ ...r, [c.id]: '' }));
      addToast('Resposta publicada', '', 'success');
      carregar();
    } catch (err: any) {
      addToast('Não foi possível responder', err.message, 'error');
    }
  };

  const ocultar = async (c: SocialComment) => {
    try {
      await metaApi.hideComment(c.id, !c.oculto);
      carregar();
    } catch (err: any) {
      addToast('Não foi possível alterar', err.message, 'error');
    }
  };

  const naoLidas = (canal: string) => threads.filter(t => t.canal === canal).reduce((a, t) => a + (t.nao_lidas || 0), 0);
  const abas: { id: Aba; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'instagram', label: 'Direct (Instagram)', icon: <Instagram className="w-4 h-4" />, badge: aba === 'instagram' ? naoLidas('instagram') : undefined },
    { id: 'messenger', label: 'Messenger (Facebook)', icon: <MessageCircle className="w-4 h-4" />, badge: aba === 'messenger' ? naoLidas('messenger') : undefined },
    { id: 'comentarios', label: 'Comentários', icon: <MessagesSquare className="w-4 h-4" /> },
  ];

  if (conectado === false) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-md text-center space-y-3">
          <Link2 className="w-10 h-10 mx-auto text-slate-400" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Conecte o Facebook e o Instagram</h2>
          <p className="text-sm text-slate-500">Vá em Configurações &gt; Integrações e clique em "Conectar Facebook e Instagram". Depois disso, o Direct, o Messenger e os comentários aparecem aqui.</p>
          <button type="button" onClick={() => setActiveModule('configuracoes')} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm">Ir para Configurações</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50 dark:bg-slate-950">
      <div className="px-6 pt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-xl">
          {abas.map(a => (
            <button key={a.id} type="button" onClick={() => setAba(a.id)}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium', aba === a.id ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800')}>
              {a.icon} {a.label}
              {!!a.badge && <span className="ml-1 px-1.5 rounded-full bg-red-500 text-white text-[10px]">{a.badge}</span>}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => carregar()} className="text-xs text-slate-500 hover:text-indigo-600 flex items-center gap-1">
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} /> Atualizar
        </button>
      </div>

      {aba !== 'comentarios' ? (
        <div className="flex-1 min-h-0 m-6 mt-4 grid grid-cols-1 md:grid-cols-[320px_1fr] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
          {/* Lista de conversas */}
          <div className="border-r border-slate-200 dark:border-slate-800 overflow-y-auto">
            {threads.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-10 px-4">Nenhuma conversa ainda. As mensagens novas aparecem aqui assim que chegarem.</p>
            ) : threads.map(t => (
              <button key={t.id} type="button" onClick={() => setSelected(t)}
                className={cn('w-full flex items-center gap-3 px-4 py-3 text-left border-b border-slate-100 dark:border-slate-800', selected?.id === t.id ? 'bg-indigo-50 dark:bg-indigo-950/40' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50')}>
                {t.participant_pic
                  ? <img src={t.participant_pic} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                  : <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0" />}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">{nomeThread(t)}</span>
                    <span className="text-[10px] text-slate-400 shrink-0">{fmt(t.ultima_mensagem_at)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-500 truncate">{t.ultima_mensagem}</span>
                    {t.nao_lidas > 0 && <span className="px-1.5 rounded-full bg-indigo-600 text-white text-[10px] shrink-0">{t.nao_lidas}</span>}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Conversa aberta */}
          {selected ? (
            <div className="flex flex-col min-h-0">
              <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{nomeThread(selected)}</p>
                  {selected.participant_username && <p className="text-[11px] text-slate-500">@{selected.participant_username}</p>}
                </div>
                {selected.lead_id ? (
                  <button type="button" onClick={() => abrirLead(selected.lead_id!)} className="px-3 py-1.5 rounded-lg text-xs border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1">
                    <ExternalLink className="w-3.5 h-3.5" /> Abrir lead
                  </button>
                ) : (
                  <button type="button" onClick={() => criarLead({ threadId: selected.id })} className="px-3 py-1.5 rounded-lg text-xs bg-indigo-600 text-white flex items-center gap-1">
                    <UserPlus className="w-3.5 h-3.5" /> Enviar para o funil
                  </button>
                )}
              </div>
              <div ref={feedRef} className="flex-1 overflow-y-auto p-5 space-y-3">
                {messages.map(m => (
                  <div key={m.id} className={cn('flex', m.from_me ? 'justify-end' : 'justify-start')}>
                    <div className={cn('max-w-[70%] px-3.5 py-2.5 rounded-2xl text-xs', m.from_me ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none')}>
                      <p className="whitespace-pre-line">{m.texto}</p>
                      <span className={cn('block text-[10px] mt-1 text-right', m.from_me ? 'text-indigo-200' : 'text-slate-400')}>{fmt(m.enviada_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-slate-200 dark:border-slate-800">
                {!janelaAberta && (
                  <p className="text-[11px] text-amber-600 mb-2">Mais de 24 horas desde a última mensagem do cliente: pela regra da Meta, só dá para responder quando ele escrever de novo.</p>
                )}
                <div className="flex gap-2">
                  <textarea rows={2} value={texto} onChange={(e) => setTexto(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } }}
                    disabled={!janelaAberta} placeholder={janelaAberta ? 'Escreva a resposta… (Enter envia)' : 'Aguardando o cliente escrever'}
                    className="flex-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 outline-none resize-none disabled:opacity-60" />
                  <button type="button" onClick={enviar} disabled={!janelaAberta || !texto.trim()} aria-label="Enviar"
                    className="px-3 rounded-xl bg-indigo-600 text-white disabled:opacity-40"><Send className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center text-xs text-slate-400 p-8">Escolha uma conversa à esquerda.</div>
          )}
        </div>
      ) : (
        <div className="flex-1 min-h-0 m-6 mt-4 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {([['pendentes', 'Sem resposta'], ['todos', 'Todos']] as const).map(([id, label]) => (
              <button key={id} type="button" onClick={() => setFiltroComent(id)}
                className={cn('px-3 py-1.5 rounded-lg border', filtroComent === id ? 'border-indigo-500 bg-indigo-600 text-white' : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300')}>{label}</button>
            ))}
            <select value={canalComent} onChange={(e) => setCanalComent(e.target.value as any)}
              className="px-2 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200">
              <option value="">Instagram e Facebook</option>
              <option value="instagram">Só Instagram</option>
              <option value="facebook">Só Facebook</option>
            </select>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {comments.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-10">{filtroComent === 'pendentes' ? 'Nenhum comentário esperando resposta.' : 'Nenhum comentário ainda.'}</p>
            ) : comments.map(c => (
              <div key={c.id} className={cn('p-4 rounded-2xl border bg-white dark:bg-slate-900', c.oculto ? 'border-dashed border-slate-300 dark:border-slate-700 opacity-70' : 'border-slate-200 dark:border-slate-800')}>
                <div className="flex gap-3">
                  {c.media_thumb
                    ? <img src={c.media_thumb} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
                    : <div className="w-14 h-14 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0" />}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                      {c.canal === 'instagram' ? <Instagram className="w-3.5 h-3.5" /> : <Facebook className="w-3.5 h-3.5" />}
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{c.author_username ? `@${c.author_username}` : c.author_name || 'Alguém'}</span>
                      <span>· {fmt(c.criado_at)}</span>
                      {c.ad_title && <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"><Megaphone className="w-3 h-3" /> Anúncio: {c.ad_title}</span>}
                      {c.parent_id && <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">resposta a outro comentário</span>}
                      {c.oculto && <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700">oculto</span>}
                      {c.permalink && <a href={c.permalink} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline flex items-center gap-0.5">ver publicação <ExternalLink className="w-3 h-3" /></a>}
                    </div>
                    <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-line">{c.texto}</p>
                    {c.post_texto && <p className="text-[11px] text-slate-400 truncate">Na publicação: {c.post_texto}</p>}
                    {c.respondido && c.resposta_texto && <p className="text-[11px] text-emerald-600">Respondido: {c.resposta_texto}</p>}
                    {!c.oculto && (
                      <div className="flex gap-2 pt-1">
                        <input value={respostas[c.id] || ''} onChange={(e) => setRespostas(r => ({ ...r, [c.id]: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === 'Enter') responderComentario(c); }}
                          placeholder="Responder publicamente…"
                          className="flex-1 px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 outline-none" />
                        <button type="button" onClick={() => responderComentario(c)} disabled={!(respostas[c.id] || '').trim()}
                          className="px-3 rounded-lg bg-indigo-600 text-white text-xs disabled:opacity-40">Responder</button>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-3 pt-1 text-[11px]">
                      <button type="button" onClick={() => ocultar(c)} className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1">
                        {c.oculto ? <><Eye className="w-3.5 h-3.5" /> Mostrar de novo</> : <><EyeOff className="w-3.5 h-3.5" /> Ocultar</>}
                      </button>
                      {c.lead_id ? (
                        <button type="button" onClick={() => abrirLead(c.lead_id!)} className="text-indigo-600 hover:underline flex items-center gap-1"><ExternalLink className="w-3.5 h-3.5" /> Abrir lead</button>
                      ) : (
                        <button type="button" onClick={() => criarLead({ commentId: c.id })} className="text-indigo-600 hover:underline flex items-center gap-1"><UserPlus className="w-3.5 h-3.5" /> Enviar para o funil</button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
