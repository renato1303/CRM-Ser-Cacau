import React, { useState } from 'react';
import { CheckCircle2, Globe, Send } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Button } from '../../components/ui/Button';

interface PublicFormPageProps {
  formId: string;
}

export const PublicFormPage: React.FC<PublicFormPageProps> = ({ formId }) => {
  const { addLead, addContact, pipelines, users, sources } = useStore();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !email.trim()) return;

    const contact = addContact({
      nome,
      telefones: [telefone || '+55 (11) 90000-0000'],
      emails: [email],
      tags: ['formulario_web'],
      customFields: { empresa },
      canais: { email },
      consentimentoMarketing: true,
    });

    const pipeline = pipelines[0];
    const stage = pipeline.stages[0];
    addLead({
      nome: `Lead Web: ${nome}`,
      valor: 7500,
      pipelineId: pipeline.id,
      stageId: stage.id,
      responsavelId: users[0].id,
      contactIds: [contact.id],
      tags: ['formulario_web'],
      origemId: sources[2]?.id || sources[0].id,
      customFields: {},
      produtos: [],
      utm: { source: 'web_form', medium: 'embed' }
    });

    setSuccess(true);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-50 dark:bg-green-950 text-green-600 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Mensagem Enviada!</h2>
          <p className="text-xs text-slate-500 mb-6">Recebemos seus dados com sucesso. Entraremos em contato em breve.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-8">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Fale com Nossos Especialistas</h2>
            <p className="text-xs text-slate-500">Preencha o formulário para receber nossa proposta</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Nome Completo *</label>
            <input
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Carlos Silva"
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">E-mail Profissional *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="carlos@empresa.ex"
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">WhatsApp / Telefone</label>
            <input
              type="text"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="+55 (11) 91234-5678"
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Nome da Empresa</label>
            <input
              type="text"
              value={empresa}
              onChange={(e) => setEmpresa(e.target.value)}
              placeholder="Empresa S.A."
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
            />
          </div>

          <Button type="submit" className="w-full py-2.5">
            Enviar Solicitação
          </Button>
        </form>
      </div>
    </div>
  );
};
