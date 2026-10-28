import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, Search, Send, Paperclip, Phone, Check, CheckCheck, 
  User, Pin, Lock, Unlock, Users, Sparkles, Filter, RefreshCw 
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { formatDate } from '../../utils/cn';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { MessageComposer } from '../../components/chat/MessageComposer';

export const ChatsPage: React.FC = () => {
  const { 
    conversations, contacts, messages, users, sendMessage, 
    updateConversationStatus, assignConversation, markConversationUnread, refreshData 
  } = useStore();

  useEffect(() => {
    refreshData();
    const interval = setInterval(() => {
      refreshData();
    }, 5000);
    return () => clearInterval(interval);
  }, [refreshData]);

  const [activeTab, setActiveTab] = useState<'clientes' | 'equipe'>('clientes');
  const [selectedConvId, setSelectedConvId] = useState<string>(conversations[0]?.id || '');
  const [filterType, setFilterType] = useState<'todas' | 'nao_lidas' | 'minhas'>('todas');
  const [searchQuery, setSearchQuery] = useState('');

  const activeConv = conversations.find(c => c.id === selectedConvId) || conversations[0];
  const activeContact = contacts.find(c => c.id === activeConv?.contactId);
  const activeMessages = messages.filter(m => m.conversationId === activeConv?.id);

  // Última mensagem de cada conversa (prévia na lista)
  const lastMessageByConv = React.useMemo(() => {
    const map = new Map<string, (typeof messages)[number]>();
    for (const m of messages) {
      const current = map.get(m.conversationId);
      if (!current || new Date(m.enviadaAt).getTime() >= new Date(current.enviadaAt).getTime()) {
        map.set(m.conversationId, m);
      }
    }
    return map;
  }, [messages]);

  const formatListTime = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const isToday = d.toDateString() === new Date().toDateString();
    return isToday
      ? d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const openConversation = (convId: string) => {
    setSelectedConvId(convId);
    const conv = conversations.find(c => c.id === convId);
    if (conv && conv.id.startsWith('wa:') && conv.naoLidas > 0) {
      fetch('/api/wa/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: convId })
      })
        .then(() => refreshData())
        .catch(() => {});
    }
  };

  const filteredConversations = conversations.filter(c => {
    const contact = contacts.find(ct => ct.id === c.contactId);
    const query = searchQuery.toLowerCase().trim();
    const queryDigits = query.replace(/\D/g, '');
    const matchesSearch = !query
      || (contact?.nome || '').toLowerCase().includes(query)
      || (queryDigits.length > 0 && (contact?.telefones || []).some(t => t.replace(/\D/g, '').includes(queryDigits)));
    if (filterType === 'nao_lidas') return matchesSearch && c.naoLidas > 0;
    if (filterType === 'minhas') return matchesSearch && c.responsavelId === users[0].id;
    return matchesSearch;
  }).sort((a, b) => new Date(b.ultimaMensagemAt).getTime() - new Date(a.ultimaMensagemAt).getTime());

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Column 1: Conversations List & Filters */}
      <div className="w-80 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Caixa de Entrada</h2>
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs">
              <button
                onClick={() => setActiveTab('clientes')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${activeTab === 'clientes' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}
              >
                Clientes
              </button>
              <button
                onClick={() => setActiveTab('equipe')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${activeTab === 'equipe' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}
              >
                Equipe
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar conversas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Filter pills */}
          <div className="flex items-center gap-1 text-[11px] font-medium">
            {(['todas', 'nao_lidas', 'minhas'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilterType(f)}
                className={`px-2.5 py-1 rounded-full capitalize transition-colors ${filterType === f ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 font-semibold' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              >
                {f.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
          {activeTab === 'clientes' ? (
            filteredConversations.map(conv => {
              const contact = contacts.find(c => c.id === conv.contactId);
              const isSelected = conv.id === selectedConvId;

              return (
                <div
                  key={conv.id}
                  onClick={() => openConversation(conv.id)}
                  className={`p-4 flex items-start gap-3 cursor-pointer transition-colors ${
                    isSelected ? 'bg-indigo-50/50 dark:bg-indigo-950/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="relative">
                    <Avatar name={contact?.nome || 'Cliente'} size="md" />
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{contact?.nome || 'Contato'}</p>
                      <span className="text-[10px] text-slate-400">{formatListTime(lastMessageByConv.get(conv.id)?.enviadaAt || conv.ultimaMensagemAt)}</span>
                    </div>
                    <p className={`text-xs truncate ${conv.naoLidas > 0 ? 'text-slate-900 dark:text-slate-100 font-semibold' : 'text-slate-500 dark:text-slate-400'}`}>
                      {(() => {
                        const last = lastMessageByConv.get(conv.id);
                        if (!last) return 'Sem mensagens';
                        return `${last.direcao === 'saida' ? 'Você: ' : ''}${last.conteudo}`;
                      })()}
                    </p>
                  </div>
                  {conv.naoLidas > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-600 text-white rounded-full">
                      {conv.naoLidas}
                    </span>
                  )}
                </div>
              );
            })
          ) : (
            <div className="p-4 text-center text-xs text-slate-500 py-12">
              <Users className="w-8 h-8 mx-auto text-indigo-500 mb-2" />
              <p className="font-semibold text-slate-800 dark:text-slate-200">Chat Interno da Equipe</p>
              <p className="mt-1">Canal de comunicação rápida entre os atendentes e gestores do CRM.</p>
            </div>
          )}
        </div>
      </div>

      {/* Column 2: Active Chat Window & Composer */}
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
        {activeConv && activeContact ? (
          <>
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar name={activeContact.nome} size="md" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{activeContact.nome}</h3>
                  <p className="text-xs text-slate-500">{activeContact.telefones[0]} · WhatsApp</p>
                </div>
              </div>
            </div>

            {/* Messages Feed */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              {activeMessages.map(msg => (
                <div key={msg.id} className={`flex gap-3 ${msg.direcao === 'saida' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                    msg.direcao === 'saida'
                      ? 'bg-indigo-600 text-white rounded-br-none'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none'
                  }`}>
                    <p>{msg.conteudo}</p>
                    <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${msg.direcao === 'saida' ? 'text-indigo-200' : 'text-slate-400'}`}>
                      <span>{formatDate(msg.enviadaAt)}</span>
                      {msg.direcao === 'saida' && (
                        <span>
                          {msg.status === 'enviada' && <Check className="w-3 h-3 inline" />}
                          {msg.status === 'entregue' && <CheckCheck className="w-3 h-3 inline text-indigo-200" />}
                          {msg.status === 'lida' && <CheckCheck className="w-3 h-3 inline text-sky-300" />}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Shared Composer */}
            <MessageComposer
              onSend={(conteudo, tipo, anexos) => {
                sendMessage(activeConv.id, conteudo, 'saida', 'usuario', tipo, anexos);
              }}
              contactContext={{ nome: activeContact.nome }}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">
            Selecione uma conversa ao lado.
          </div>
        )}
      </div>

      {/* Column 3: Contact & Lead Quick Panel */}
      <div className="w-80 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 hidden lg:flex flex-col p-6">
        {activeContact ? (
          <div className="space-y-6">
            <div className="text-center">
              <Avatar name={activeContact.nome} size="lg" className="mx-auto mb-3" />
              <h3 className="font-bold text-slate-900 dark:text-slate-100">{activeContact.nome}</h3>
              <p className="text-xs text-slate-500">{activeContact.cargo || 'Cliente'}</p>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
              <p><span className="font-semibold text-slate-500">Telefone:</span> {activeContact.telefones[0]}</p>
              <p><span className="font-semibold text-slate-500">E-mail:</span> {activeContact.emails[0] || '-'}</p>
              <p><span className="font-semibold text-slate-500">Canal:</span> WhatsApp</p>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateConversationStatus(activeConv.id, activeConv.status === 'aberta' ? 'encerrada' : 'aberta')}
                className="w-full justify-center text-xs"
              >
                {activeConv.status === 'aberta' ? 'Encerrar Conversa' : 'Reabrir Conversa'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => markConversationUnread(activeConv.id)}
                className="w-full justify-center text-xs"
              >
                Marcar como Não Lida
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-400 text-center py-8">Nenhum contato selecionado.</p>
        )}
      </div>
    </div>
  );
};
