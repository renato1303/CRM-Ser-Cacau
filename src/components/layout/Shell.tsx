import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { GlobalSearch } from './GlobalSearch';
import { AICopilotDrawer } from './AICopilotDrawer';
import { ToastContainer } from './ToastContainer';
import { useStore } from '../../store/useStore';
import { LoginModal } from '../../modules/login/LoginModal';
import { LoginPage } from '../../modules/login/LoginPage';

import { PainelPage } from '../../modules/painel/PainelPage';
import { LeadsPage } from '../../modules/leads/LeadsPage';
import { LeadDetailPage } from '../../modules/leads/LeadDetailPage';
import { ChatsPage } from '../../modules/chats/ChatsPage';
import { AgendaPage } from '../../modules/agenda/AgendaPage';
import { PublicSchedulingPage } from '../../modules/agenda/PublicSchedulingPage';
import { ListasPage } from '../../modules/listas/ListasPage';
import { EmailPage } from '../../modules/email/EmailPage';
import { EstatisticasPage } from '../../modules/estatisticas/EstatisticasPage';
import { AutomacoesPage } from '../../modules/automacoes/AutomacoesPage';
import { TransmissoesPage } from '../../modules/transmissoes/TransmissoesPage';
import { CapturaPage } from '../../modules/captura/CapturaPage';
import { PublicFormPage } from '../../modules/captura/PublicFormPage';
import { ConfiguracoesPage } from '../../modules/configuracoes/ConfiguracoesPage';
import { PluginsPage } from '../../modules/plugins/PluginsPage';

export const Shell: React.FC = () => {
  const { activeModule, theme, setActiveModule, isAuthenticated } = useStore();
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#/', '');
      if (hash) {
        setActiveModule(hash);
      }
    };
    if (window.location.hash) {
      handleHashChange();
    }
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [setActiveModule]);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  if (activeModule.startsWith('agendar/')) {
    const usuarioId = activeModule.replace('agendar/', '');
    return <PublicSchedulingPage usuarioId={usuarioId} />;
  }

  if (activeModule.startsWith('f/')) {
    const formId = activeModule.replace('f/', '');
    return <PublicFormPage formId={formId} />;
  }

  // Render module
  const renderModule = () => {
    if (activeModule.startsWith('leads/')) {
      const leadId = activeModule.replace('leads/', '');
      return <LeadDetailPage leadId={leadId} />;
    }

    switch (activeModule) {
      case 'painel': return <PainelPage />;
      case 'leads': return <LeadsPage />;
      case 'chats': return <ChatsPage />;
      case 'agenda': return <AgendaPage />;
      case 'listas/contatos':
      case 'listas/empresas':
      case 'listas/produtos':
        return <ListasPage />;
      case 'email': return <EmailPage />;
      case 'estatisticas': return <EstatisticasPage />;
      case 'automacoes': return <AutomacoesPage />;
      case 'transmissoes': return <TransmissoesPage />;
      case 'captura': return <CapturaPage />;
      case 'plugins': return <PluginsPage />;
      case 'configuracoes': return <ConfiguracoesPage />;
      default: return <PainelPage />;
    }
  };

  const getModuleTitle = () => {
    if (activeModule.startsWith('leads/')) return 'Detalhes do Lead';
    switch (activeModule) {
      case 'painel': return 'Painel Geral';
      case 'leads': return 'Funil de Vendas & Leads';
      case 'chats': return 'Caixa de Entrada Unificada';
      case 'agenda': return 'Central de Tarefas';
      case 'listas/contatos': return 'Listas & Cadastros';
      case 'email': return 'E-mail Comercial';
      case 'estatisticas': return 'Estatísticas & Relatórios';
      case 'automacoes': return 'Automações & Salesbot';
      case 'transmissoes': return 'Transmissoes em Massa';
      case 'captura': return 'Captura de Leads';
      case 'plugins': return 'Plugins & Gateway WhatsApp';
      case 'configuracoes': return 'Configurações';
      default: return 'Será Cacau CRM';
    }
  };

  return (
    <div className={`flex h-screen w-screen overflow-hidden ${theme === 'dark' ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <Sidebar onOpenLoginModal={() => setLoginModalOpen(true)} />
      
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Topbar title={getModuleTitle()} />
        <main className="flex-1 flex flex-col overflow-hidden relative">
          {renderModule()}
        </main>
      </div>

      <GlobalSearch />
      <AICopilotDrawer />
      <ToastContainer />
      <LoginModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} />
    </div>
  );
};
