import React, { useState } from 'react';
import { Globe, Plus, Code, QrCode, MessageSquare, Copy, Check } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Tabs } from '../../components/ui/Tabs';
import { Modal } from '../../components/ui/Modal';

export const CapturaPage: React.FC = () => {
  const [tab, setTab] = useState<'forms' | 'whatsapp' | 'widget'>('forms');
  const [modalOpen, setModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form builder state
  const [formName, setFormName] = useState('Formulário de Contato Principal');
  const [forms, setForms] = useState([
    { id: 'form-1', nome: 'Formulário de Contato Principal', visualizacoes: 1420, conversoes: 184 }
  ]);

  // WhatsApp generator state
  const [waPhone, setWaPhone] = useState('+5511999998888');
  const [waText, setWaText] = useState('Olá! Gostaria de mais informações sobre os produtos da Conversa CRM.');

  const embedCode = `<iframe src="${window.location.origin}/#/f/form-1" width="100%" height="500px" style="border:none;"></iframe>`;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;
    setForms(prev => [...prev, { id: `form-${Date.now()}`, nome: formName, visualizacoes: 0, conversoes: 0 }]);
    setFormName('');
    setModalOpen(false);
  };

  const waLink = `https://wa.me/${waPhone.replace(/\D/g, '')}?text=${encodeURIComponent(waText)}`;

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-slate-50 dark:bg-slate-950 flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Captura de Leads</h2>
          <p className="text-xs text-slate-500">Construtor de formulários web incorporáveis, gerador de link WhatsApp e chat widget.</p>
        </div>

        {tab === 'forms' && (
          <Button size="sm" onClick={() => setModalOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Novo Formulário Web
          </Button>
        )}
      </div>

      <Tabs
        tabs={[
          { id: 'forms', label: 'Formulários Web', badge: forms.length },
          { id: 'whatsapp', label: 'Gerador WhatsApp & QR Code' },
          { id: 'widget', label: 'Chat Widget para Site' },
        ]}
        activeTab={tab}
        onChange={(id) => setTab(id as any)}
        className="mb-6"
      />

      {tab === 'forms' && (
        <div className="space-y-6">
          {forms.map(f => (
            <div key={f.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">{f.nome}</h3>
                  <p className="text-xs text-slate-500">Link público: <a href={`#/f/${f.id}`} target="_blank" rel="noreferrer" className="text-indigo-600 underline">#/f/{f.id}</a></p>
                </div>
                <div className="flex gap-4 text-xs">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-slate-100">{f.visualizacoes}</p>
                    <p className="text-[11px] text-slate-400">Visualizações</p>
                  </div>
                  <div>
                    <p className="font-bold text-green-600">{f.conversoes}</p>
                    <p className="text-[11px] text-slate-400">Conversões</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Código de Incorporação (Embed Iframe)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={embedCode}
                    className="flex-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none font-mono"
                  />
                  <Button size="sm" variant="outline" onClick={() => handleCopy(embedCode)} className="gap-2">
                    {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />} Copiar
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'whatsapp' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Gerador de Link & QR Code WhatsApp</h3>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Número do WhatsApp *</label>
              <input
                type="text"
                value={waPhone}
                onChange={(e) => setWaPhone(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Mensagem Pré-preenchida</label>
              <textarea
                rows={3}
                value={waText}
                onChange={(e) => setWaText(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Link Gerado</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={waLink}
                  className="flex-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
                />
                <Button size="sm" variant="outline" onClick={() => handleCopy(waLink)}>Copiar</Button>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
            <QrCode className="w-32 h-32 text-slate-800 dark:text-white mb-4" />
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">QR Code de Atendimento WhatsApp</p>
            <p className="text-[11px] text-slate-400 mt-1">Escaneie para iniciar conversa instantânea</p>
          </div>
        </div>
      )}

      {tab === 'widget' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Snippet do Chat Widget para o seu Site</h3>
          <p className="text-xs text-slate-500">Cole este script antes do fechamento da tag <code className="text-indigo-600">&lt;/body&gt;</code> no seu site.</p>
          <textarea
            rows={4}
            readOnly
            value={`<script src="${window.location.origin}/widget.js" data-crm-id="conversa-crm-01" async></script>`}
            className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none font-mono resize-none"
          />
        </div>
      )}

      {/* New Form Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Criar Novo Formulário Web">
        <form onSubmit={handleCreateForm} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Nome do Formulário *</label>
            <input
              type="text"
              required
              placeholder="Ex: Landing Page de Lançamento"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit">Criar Formulário</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
