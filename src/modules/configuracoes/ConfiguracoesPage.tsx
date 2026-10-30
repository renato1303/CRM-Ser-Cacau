import React, { useState } from 'react';
import { Settings, RefreshCw, Download, Upload, Trash2, CheckCircle2, Plus, Mail } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Button } from '../../components/ui/Button';
import { Tabs } from '../../components/ui/Tabs';
import { Modal } from '../../components/ui/Modal';
import { db } from '../../services/db/storage';
import { TagsSettings } from './TagsSettings';
import { IntegracoesSettings } from './IntegracoesSettings';

export const ConfiguracoesPage: React.FC = () => {
  const { 
    messageTemplates, addMessageTemplate, deleteMessageTemplate, 
    emailTemplates, addEmailTemplate, deleteEmailTemplate, 
    restoreSeed, clearAllData, clearAllDataCompletely, tags 
  } = useStore();
  const [tab, setTab] = useState<'etiquetas' | 'integracoes' | 'templates' | 'email_templates'>(
    () => (new URLSearchParams(window.location.search).get('google') ? 'integracoes' : 'etiquetas')
  );
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  
  // New template modal
  const [modalOpen, setModalOpen] = useState(false);
  const [tplNome, setTplNome] = useState('');
  const [tplCanal, setTplCanal] = useState('whatsapp');
  const [tplCorpo, setTplCorpo] = useState('');

  // New email template modal
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [etplNome, setEtplNome] = useState('');
  const [etplAssunto, setEtplAssunto] = useState('');
  const [etplCorpo, setEtplCorpo] = useState('');

  const handleCreateTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tplNome.trim() || !tplCorpo.trim()) return;
    addMessageTemplate({
      nome: tplNome,
      canal: tplCanal,
      corpo: tplCorpo,
      variaveis: ['contato.nome', 'usuario.nome', 'lead.nome']
    });
    setTplNome('');
    setTplCorpo('');
    setModalOpen(false);
  };

  const handleCreateEmailTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!etplNome.trim() || !etplAssunto.trim() || !etplCorpo.trim()) return;
    addEmailTemplate({
      nome: etplNome,
      assunto: etplAssunto,
      corpo: etplCorpo,
    });
    setEtplNome('');
    setEtplAssunto('');
    setEtplCorpo('');
    setEmailModalOpen(false);
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-slate-50 dark:bg-slate-950 flex flex-col">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Configurações do Sistema</h2>
        <p className="text-xs text-slate-500">Gerenciamento de dados, backups, modelos de mensagem e modelos de e-mail.</p>
      </div>

      {toastMsg && (
        <div className="mb-6 p-4 rounded-xl bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 text-xs text-green-700 dark:text-green-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {toastMsg}
        </div>
      )}

      <Tabs
        tabs={[
          { id: 'etiquetas', label: 'Etiquetas', badge: tags.length },
          { id: 'integracoes', label: 'Integrações' },
          { id: 'templates', label: 'Modelos de Mensagem', badge: messageTemplates.length },
          { id: 'email_templates', label: 'Modelos de E-mail', badge: emailTemplates.length },
        ]}
        activeTab={tab}
        onChange={(id) => setTab(id as any)}
        className="mb-6"
      />

      {tab === 'etiquetas' && <TagsSettings />}

      {tab === 'integracoes' && <IntegracoesSettings />}

      {tab === 'templates' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 flex flex-col flex-1">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Modelos para o Compositor (Atalho "/")</h3>
              <p className="text-xs text-slate-500">Crie modelos com variáveis preenchidas automaticamente (ex: <code className="text-indigo-600">{'{{contato.nome}}'}</code>).</p>
            </div>
            <Button size="sm" onClick={() => setModalOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Novo Modelo
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {messageTemplates.map(tpl => (
              <div key={tpl.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">{tpl.nome}</h4>
                    <span className="px-2 py-0.5 rounded text-[10px] uppercase font-semibold bg-indigo-100 text-indigo-700">{tpl.canal}</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">{tpl.corpo}</p>
                </div>
                <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-700">
                  <button 
                    onClick={() => deleteMessageTemplate(tpl.id)}
                    className="text-xs text-red-500 hover:underline flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'email_templates' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 flex flex-col flex-1">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Modelos de E-mail Comercial</h3>
              <p className="text-xs text-slate-500">Crie e gerencie templates de e-mail para campanhas e disparos rápidos.</p>
            </div>
            <Button size="sm" onClick={() => setEmailModalOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Novo Modelo de E-mail
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {emailTemplates.map(etpl => (
              <div key={etpl.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-1">{etpl.nome}</h4>
                  <p className="text-xs font-semibold text-indigo-600 mb-2">Assunto: {etpl.assunto}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">{etpl.corpo}</p>
                </div>
                <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-700">
                  <button 
                    onClick={() => deleteEmailTemplate(etpl.id)}
                    className="text-xs text-red-500 hover:underline flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Template Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Criar Novo Modelo de Mensagem">
        <form onSubmit={handleCreateTemplate} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Nome do Modelo *</label>
            <input
              type="text"
              required
              placeholder="Ex: Proposta Comercial"
              value={tplNome}
              onChange={(e) => setTplNome(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Canal</label>
            <select
              value={tplCanal}
              onChange={(e) => setTplCanal(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
            >
              <option value="whatsapp">WhatsApp</option>
              <option value="instagram">Instagram</option>
              <option value="email">E-mail</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Corpo da Mensagem (com variáveis <code className="text-indigo-600">{'{{contato.nome}}'}</code>) *</label>
            <textarea
              rows={4}
              required
              placeholder="Olá {{contato.nome}}, ..."
              value={tplCorpo}
              onChange={(e) => setTplCorpo(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit">Salvar Modelo</Button>
          </div>
        </form>
      </Modal>

      {/* New Email Template Modal */}
      <Modal isOpen={emailModalOpen} onClose={() => setEmailModalOpen(false)} title="Criar Novo Modelo de E-mail">
        <form onSubmit={handleCreateEmailTemplate} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Nome do Modelo *</label>
            <input
              type="text"
              required
              placeholder="Ex: Apresentação"
              value={etplNome}
              onChange={(e) => setEtplNome(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Assunto do E-mail *</label>
            <input
              type="text"
              required
              placeholder="Assunto..."
              value={etplAssunto}
              onChange={(e) => setEtplAssunto(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Corpo do E-mail *</label>
            <textarea
              rows={4}
              required
              placeholder="Olá {{contato.nome}}..."
              value={etplCorpo}
              onChange={(e) => setEtplCorpo(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setEmailModalOpen(false)}>Cancelar</Button>
            <Button type="submit">Salvar Modelo de E-mail</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
