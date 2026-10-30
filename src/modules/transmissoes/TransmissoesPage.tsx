import React, { useState } from 'react';
import { Send, Plus, Users, CheckCircle2, Clock, Play, AlertCircle } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';

export const TransmissoesPage: React.FC = () => {
  const { contacts, messageTemplates, sendMessage, createConversation } = useStore();
  const [modalOpen, setModalOpen] = useState(false);

  // Campaign form state
  const [campNome, setCampNome] = useState('Campanha Promocional Q1');
  const [campCanal, setCampCanal] = useState('whatsapp');
  const [campTemplateId, setCampTemplateId] = useState(messageTemplates[0]?.id || '');
  const [limiteMinuto, setLimiteMinuto] = useState(30);

  const eligibleContacts = contacts.filter(c => c.consentimentoMarketing);

  // Sem campanhas de exemplo: os disparos reais de follow-up ainda serão construídos
  const [campaigns, setCampaigns] = useState<any[]>([]);

  const handleCreateCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!campNome.trim()) return;

    const newCamp = {
      id: `camp-${Date.now()}`,
      nome: campNome,
      canal: campCanal,
      total: eligibleContacts.length,
      enviadas: eligibleContacts.length,
      lidas: 0,
      status: 'concluida',
    };

    setCampaigns(prev => [newCamp, ...prev]);

    setCampNome('');
    setModalOpen(false);
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-slate-50 dark:bg-slate-950 flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Transmissões em Massa</h2>
          <p className="text-xs text-slate-500">Campanhas segmentadas respeitando o opt-in de consentimento de marketing.</p>
        </div>
        <Button size="sm" disabled title="Os disparos reais de follow-up pelo WhatsApp ainda serão construídos" className="gap-2">
          <Plus className="w-4 h-4" /> Nova Campanha
        </Button>
      </div>

      <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-200">
        Os envios em massa ainda não estão ativos. Eles entram na etapa dos disparos de follow-up, com envio real pelo WhatsApp e métricas de entrega e leitura.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Contatos com Opt-in</span>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">{eligibleContacts.length}</h3>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Campanhas Realizadas</span>
          <h3 className="text-2xl font-bold text-indigo-600 mt-2">{campaigns.length}</h3>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Taxa Média de Leitura</span>
          <h3 className="text-2xl font-bold text-slate-400 mt-2">—</h3>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex-1">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 font-bold text-sm text-slate-900 dark:text-slate-100">
          Campanhas Recentes
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {campaigns.map(c => (
            <div key={c.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center font-bold">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{c.nome}</p>
                  <p className="text-xs text-slate-500">Canal: <span className="capitalize">{c.canal}</span> · Total: {c.total} destinatários</p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right text-xs">
                  <p className="font-bold text-slate-900 dark:text-slate-100">{c.enviadas} enviadas · {c.lidas} lidas</p>
                  <p className="text-slate-400">Respostas caem nos Chats</p>
                </div>
                <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">
                  {c.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* New Campaign Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Criar Nova Campanha de Transmissão">
        <form onSubmit={handleCreateCampaign} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Nome da Campanha *</label>
            <input
              type="text"
              required
              placeholder="Ex: Oferta Especial de Março"
              value={campNome}
              onChange={(e) => setCampNome(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Canal</label>
              <select
                value={campCanal}
                onChange={(e) => setCampCanal(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
              >
                <option value="whatsapp">WhatsApp</option>
                <option value="instagram">Instagram Direct</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Limite por Minuto</label>
              <input
                type="number"
                value={limiteMinuto}
                onChange={(e) => setLimiteMinuto(parseInt(e.target.value) || 30)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Modelo de Mensagem</label>
            <select
              value={campTemplateId}
              onChange={(e) => setCampTemplateId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
            >
              {messageTemplates.map(t => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </select>
          </div>

          <div className="bg-indigo-50 dark:bg-indigo-950 p-3 rounded-xl border border-indigo-200 dark:border-indigo-900 text-xs text-indigo-700 dark:text-indigo-300">
            <p className="font-semibold">Público-alvo:</p>
            <p>{eligibleContacts.length} contatos elegíveis com consentimento (Opt-in) ativo.</p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit">Iniciar Disparo</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
