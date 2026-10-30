import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { GlobalSearch } from './GlobalSearch';
import { AICopilotDrawer } from './AICopilotDrawer';
import { ToastContainer } from './ToastContainer';
import { useStore } from '../../store/useStore';
import { LOGIN_REQUIRED_EVENT, recoveryRequested } from '../../services/apiAuth';
import { supabase } from '../../services/db/supabase';
import { ConfirmDialogHost } from '../ui/ConfirmDialog';
import { LoginModal } from '../../modules/login/LoginModal';
import { LoginPage } from '../../modules/login/LoginPage';

import { PainelPage } from '../../modules/painel/PainelPage';
import { AgendaPage } from '../../modules/agenda/AgendaPage';
import { LeadsPage } from '../../modules/leads/LeadsPage';
import { LeadDetailPage } from '../../modules/leads/LeadDetailPage';
import { ChatsPage } from '../../modules/chats/ChatsPage';
import { ListasPage } from '../../modules/listas/ListasPage';
import { EmailPage } from '../../modules/email/EmailPage';
import { EstatisticasPage } from '../../modules/estatisticas/EstatisticasPage';
import { AutomacoesPage } from '../../modules/automacoes/AutomacoesPage';
import { TransmissoesPage } from '../../modules/transmissoes/TransmissoesPage';
import { ConfiguracoesPage } from '../../modules/configuracoes/ConfiguracoesPage';
import { PluginsPage } from '../../modules/plugins/PluginsPage';

export const Shell: React.FC = () => {
  const { activeModule, theme, setActiveModule, isAuthenticated, refreshData, completeLogin } = useStore();
  const [checkingSession, setCheckingSession] = useState(true);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#/', '');
      if (hash && !hash.includes('=')) {
        setActiveModule(hash);
      }
    };
    if (window.location.hash) {
      handleHashChange();
    }
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [setActiveModule]);

  // Login: recupera a sessão salva neste navegador e reage quando ela expira
  useEffect(() => {
    let active = true;
    if (!supabase) { setCheckingSession(false); return; }
    if (recoveryRequested) {
      setCheckingSession(false);
    } else {
      supabase.auth.getSession().then(({ data }) => {
        if (!active) return;
        const email = data.session?.user?.email;
        if (email && !useStore.getState().isAuthenticated) completeLogin(email);
        setCheckingSession(false);
      });
    }
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') useStore.setState({ isAuthenticated: false });
    });
    const onLoginRequired = () => {
      supabase?.auth.signOut();
      useStore.setState({ isAuthenticated: false });
    };
    window.addEventListener(LOGIN_REQUIRED_EVENT, onLoginRequired);
    return () => {
      active = false;
      sub.subscription.unsubscribe();
      window.removeEventListener(LOGIN_REQUIRED_EVENT, onLoginRequired);
    };
  }, [completeLogin]);

  // Mantém o CRM atualizado com o servidor (leads da planilha, mudanças da equipe, WhatsApp)
  useEffect(() => {
    if (!isAuthenticated) return;
    refreshData();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') refreshData();
    }, 15000);
    return () => clearInterval(interval);
  }, [isAuthenticated, refreshData]);

  if (!isAuthenticated) {
    if (checkingSession) {
      return <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-xs text-slate-400">Carregando…</div>;
    }
    return <LoginPage />;
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
      case 'plugins':
      case 'canais': return <PluginsPage />;
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
      case 'agenda': return 'Tarefas & Agenda';
      case 'listas/contatos': return 'Listas & Cadastros';
      case 'email': return 'E-mail Comercial';
      case 'estatisticas': return 'Estatísticas & Relatórios';
      case 'automacoes': return 'Automações & Salesbot';
      case 'transmissoes': return 'Transmissoes em Massa';
      case 'plugins':
      case 'canais': return 'Canais e integrações';
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
      <ConfirmDialogHost />
    </div>
  );
};
