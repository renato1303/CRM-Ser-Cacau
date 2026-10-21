import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, Search, Send, Paperclip, Phone, Bot, Check, CheckCheck, 
  User, Pin, Lock, Unlock, Users, Sparkles, Filter, RefreshCw, Radio 
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { formatDate } from '../../utils/cn';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { MessageComposer } from '../../components/chat/MessageComposer';
import { WhatsAppPluginModal } from './WhatsAppPluginModal';

export const ChatsPage: React.FC = () => {
  const { 
    conversations, contacts, messages, users, sendMessage, 
    simulateClientIncomingMessage, updateConversationStatus, assignConversation, markConversationUnread 
  } = useStore();

  const [activeTab, setActiveTab] = useState<'clientes' | 'equipe'>('clientes');
  const [selectedConvId, setSelectedConvId] = useState<string>(conversations[0]?.id || '');
  const [filterType, setFilterType] = useState<'todas' | 'nao_lidas' | 'minhas'>('todas');
  const [searchQuery, setSearchQuery] = useState('');

  // Client Simulator state
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
  const [simNome, setSimNome] = useState('Novo Cliente Web');
  const [simTelefone, setSimTelefone] = useState('+55 (11) 97777-8888');
  const [simCanal, setSimCanal] = useState<'whatsapp' | 'instagram' | 'messenger' | 'telegram' | 'email' | 'chat_site'>('whatsapp');
  const [simMensagem, setSimMensagem] = useState('Olá! Gostaria de conhecer os planos do CRM.');
  const [autoSimulate, setAutoSimulate] = useState(false);

  // Auto simulator interval
  useEffect(() => {
    let interval: any;
    if (autoSimulate) {
      interval = setInterval(() => {
        simulateClientIncomingMessage(
          `Cliente Auto ${Math.floor(Math.random() * 100)}`, 
          `+55 (11) 9${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`, 
          'whatsapp', 
          'Mensagem gerada automaticamente pelo simulador.'
        );
      }, 10000);
    }
    return () => clearInterval(interval);
  }, [autoSimulate]);

  const activeConv = conversations.find(c => c.id === selectedConvId) || conversations[0];
  const activeContact = contacts.find(c => c.id === activeConv?.contactId);
  const activeMessages = messages.filter(m => m.conversationId === activeConv?.id);

  const filteredConversations = conversations.filter(c => {
    const contact = contacts.find(ct => ct.id === c.contactId);
    const matchesSearch = contact?.nome.toLowerCase().includes(searchQuery.toLowerCase()) || false;
    if (filterType === 'nao_lidas') return matchesSearch && c.naoLidas > 0;
    if (filterType === 'minhas') return matchesSearch && c.responsavelId === users[0].id;
    return matchesSearch;
  });

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
                  onClick={() => setSelectedConvId(conv.id)}
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
                      <span className="text-[10px] text-slate-400">{new Date(conv.ultimaMensagemAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">Clique para abrir chat unificado...</p>
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

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setWhatsappModalOpen(true)}
                  className="gap-2 text-emerald-600 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                >
                  <Radio className="w-4 h-4 text-emerald-500" /> Plugin WhatsApp
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSimulatorOpen(!simulatorOpen)}
                  className="gap-2 text-indigo-600 border-indigo-200 dark:border-indigo-800"
                >
                  <Bot className="w-4 h-4" /> Simulador de Cliente
                </Button>
              </div>
            </div>

            {/* Developer Client Simulator Panel */}
            {simulatorOpen && (
              <div className="bg-indigo-50 dark:bg-indigo-950/50 p-4 border-b border-indigo-200 dark:border-indigo-900 text-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-900 dark:text-indigo-200">Simulador de Mensagens do Cliente (Desenvolvedor)</span>
                  <button 
                    onClick={() => setAutoSimulate(!autoSimulate)}
                    className={`px-2.5 py-1 rounded-md font-semibold text-[11px] ${autoSimulate ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}
                  >
                    {autoSimulate ? 'Parar Auto-Simulação' : 'Iniciar Auto-Simulação (10s)'}
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Nome do Cliente"
                    value={simNome}
                    onChange={(e) => setSimNome(e.target.value)}
                    className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-lg outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Telefone"
                    value={simTelefone}
                    onChange={(e) => setSimTelefone(e.target.value)}
                    className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-lg outline-none"
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      simulateClientIncomingMessage(simNome, simTelefone, simCanal, simMensagem);
                    }}
                  >
                    Enviar Mensagem como Cliente
                  </Button>
                </div>
                <input
                  type="text"
                  placeholder="Mensagem do cliente..."
                  value={simMensagem}
                  onChange={(e) => setSimMensagem(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-lg outline-none"
                />
              </div>
            )}

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

      <WhatsAppPluginModal isOpen={whatsappModalOpen} onClose={() => setWhatsappModalOpen(false)} />
    </div>
  );
};
