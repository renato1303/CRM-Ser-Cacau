import React, { useState } from 'react';
import { Mail, Plus, Send, Inbox, FileText, CheckCheck, Eye, Bot } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { formatDate } from '../../utils/cn';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Tabs } from '../../components/ui/Tabs';

export const EmailPage: React.FC = () => {
  const { emails, emailTemplates, sendEmail, simulateIncomingEmail, currentUser } = useStore();
  const [folder, setFolder] = useState<'entrada' | 'enviados' | 'rascunhos'>('entrada');
  const [composeOpen, setComposeOpen] = useState(false);
  const [parserOpen, setParserOpen] = useState(false);

  // Compose state
  const [destinatario, setDestinatario] = useState('');
  const [assunto, setAssunto] = useState('');
  const [corpo, setCorpo] = useState('');

  // Parser simulation state
  const [parserRemetente, setParserRemetente] = useState('cliente.novo@empresa.ex');
  const [parserAssunto, setParserAssunto] = useState('Orçamento para Nova Licença Enterprise');
  const [parserCorpo, setParserCorpo] = useState('Olá, gostaria de receber uma proposta de preços para nossa equipe de 20 pessoas.');

  const filteredEmails = emails.filter(e => e.pasta === folder);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!destinatario.trim() || !assunto.trim()) return;

    sendEmail({
      pasta: 'enviados',
      remetente: currentUser.email,
      destinatario,
      assunto,
      corpo: `${corpo}\n\n---\nAtenciosamente,\n${currentUser.nome}\nConversa CRM`,
      rastreamentoAbertura: { aberta: false }
    });

    setDestinatario('');
    setAssunto('');
    setCorpo('');
    setComposeOpen(false);
  };

  const handleParseIncoming = (e: React.FormEvent) => {
    e.preventDefault();
    simulateIncomingEmail(parserRemetente, currentUser.email, parserAssunto, parserCorpo);
    setParserOpen(false);
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-slate-50 dark:bg-slate-950 flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">E-mail Comercial</h2>
          <p className="text-xs text-slate-500">Caixa de entrada integrada, rastreio de abertura e parsing automático.</p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setParserOpen(true)}
            className="gap-2 text-indigo-600 border-indigo-200 dark:border-indigo-800"
          >
            <Bot className="w-4 h-4" /> Simular E-mail Parsing (Lead)
          </Button>

          <Button size="sm" onClick={() => setComposeOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Novo E-mail
          </Button>
        </div>
      </div>

      <Tabs
        tabs={[
          { id: 'entrada', label: 'Entrada', badge: emails.filter(e => e.pasta === 'entrada' && !e.lido).length },
          { id: 'enviados', label: 'Enviados' },
          { id: 'rascunhos', label: 'Rascunhos' },
        ]}
        activeTab={folder}
        onChange={(id) => setFolder(id as any)}
        className="mb-6"
      />

      {/* Parser Simulation Modal */}
      <Modal isOpen={parserOpen} onClose={() => setParserOpen(false)} title="Simular Recebimento de E-mail (Email Parsing)">
        <form onSubmit={handleParseIncoming} className="space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-300">
            A regra de e-mail parsing analisa o remetente. Se o contato não existir, cria automaticamente o contato e um lead na etapa <span className="font-bold">Leads de entrada</span>.
          </p>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">E-mail do Remetente *</label>
            <input
              type="email"
              required
              value={parserRemetente}
              onChange={(e) => setParserRemetente(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Assunto *</label>
            <input
              type="text"
              required
              value={parserAssunto}
              onChange={(e) => setParserAssunto(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Corpo do E-mail *</label>
            <textarea
              rows={3}
              required
              value={parserCorpo}
              onChange={(e) => setParserCorpo(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setParserOpen(false)}>Cancelar</Button>
            <Button type="submit">Processar E-mail</Button>
          </div>
        </form>
      </Modal>

      {/* Emails List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex-1">
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {filteredEmails.map(mail => (
            <div key={mail.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${mail.lido ? 'bg-slate-100 text-slate-500' : 'bg-indigo-50 text-indigo-600 font-bold'}`}>
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{mail.assunto}</p>
                  <p className="text-xs text-slate-500">{folder === 'entrada' ? `De: ${mail.remetente}` : `Para: ${mail.destinatario}`} · {formatDate(mail.enviadoAt)}</p>
                </div>
              </div>

              {mail.rastreamentoAbertura?.aberta && (
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-green-100 text-green-700 rounded-full flex items-center gap-1">
                  <Eye className="w-3 h-3" /> Aberto pelo cliente
                </span>
              )}
            </div>
          ))}

          {filteredEmails.length === 0 && (
            <div className="text-center py-12 text-slate-400 text-xs">
              Nenhum e-mail nesta pasta.
            </div>
          )}
        </div>
      </div>

      {/* Compose Modal */}
      <Modal isOpen={composeOpen} onClose={() => setComposeOpen(false)} title="Novo E-mail Comercial">
        <form onSubmit={handleSend} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Destinatário *</label>
            <input
              type="email"
              required
              placeholder="cliente@empresa.ex"
              value={destinatario}
              onChange={(e) => setDestinatario(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Assunto *</label>
            <input
              type="text"
              required
              placeholder="Proposta Comercial"
              value={assunto}
              onChange={(e) => setAssunto(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Mensagem *</label>
            <textarea
              rows={5}
              required
              placeholder="Escreva sua mensagem..."
              value={corpo}
              onChange={(e) => setCorpo(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setComposeOpen(false)}>Cancelar</Button>
            <Button type="submit">Enviar E-mail</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
