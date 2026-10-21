import React, { useState } from 'react';
import { 
  LayoutDashboard, Users, MessageSquare, Calendar, ListTree, 
  Mail, BarChart3, Workflow, Send, Bot, Globe, Settings, LogOut, ChevronUp, User as UserIcon, Plug 
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { cn } from '../../utils/cn';
import { ProfileModal } from '../../modules/login/ProfileModal';

interface SidebarProps {
  onOpenLoginModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenLoginModal }) => {
  const { activeModule, setActiveModule, currentUser, conversations, tasks, theme, setTheme } = useStore();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const unreadChatsCount = conversations.reduce((acc, c) => acc + c.naoLidas, 0);
  const overdueTasksCount = tasks.filter(t => (t.status === 'pendente' || t.status === 'em_andamento') && new Date(t.prazo).getTime() < Date.now()).length;

  const navItems = [
    { id: 'painel', label: 'Painel', icon: LayoutDashboard },
    { id: 'leads', label: 'Leads', icon: Users },
    { id: 'chats', label: 'Chats', icon: MessageSquare, badge: unreadChatsCount > 0 ? unreadChatsCount : undefined },
    { id: 'agenda', label: 'Tarefas', icon: Calendar, badge: overdueTasksCount > 0 ? overdueTasksCount : undefined, badgeVariant: 'danger' },
    { id: 'listas/contatos', label: 'Listas', icon: ListTree },
    { id: 'email', label: 'E-mail', icon: Mail },
    { id: 'estatisticas', label: 'Estatísticas', icon: BarChart3 },
    { id: 'automacoes', label: 'Automações', icon: Workflow },
    { id: 'transmissoes', label: 'Transmissões', icon: Send },
    { id: 'captura', label: 'Captura', icon: Globe },
    { id: 'plugins', label: 'Plugins', icon: Plug },
    { id: 'configuracoes', label: 'Config.', icon: Settings },
  ];

  return (
    <aside className="w-[76px] bg-[#090d16] border-r border-slate-800/60 text-slate-300 flex flex-col items-center py-4 select-none shrink-0 z-30">
      {/* Brand Logo */}
      <div className="mb-6 flex flex-col items-center px-2">
        <img src="/logoseranovo_dark.png" alt="Será Cacau CRM" className="w-10 h-10 object-contain brightness-0 invert" />
      </div>

      {/* Navigation Icons */}
      <nav className="flex-1 w-full flex flex-col items-center gap-1 overflow-y-auto px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeModule === item.id || (item.id === 'listas/contatos' && activeModule.startsWith('listas/'));
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveModule(item.id)}
              className={cn(
                'relative w-full py-2.5 rounded-xl flex flex-col items-center justify-center gap-1 transition-all group',
                isActive 
                  ? 'bg-indigo-600/20 text-indigo-400 font-semibold' 
                  : 'hover:bg-slate-800/80 text-slate-400 hover:text-slate-200'
              )}
              title={item.label}
            >
              {isActive && (
                <div className="absolute left-0 top-2 bottom-2 w-1 bg-indigo-500 rounded-r" />
              )}
              <div className="relative">
                <Icon className={cn('w-5 h-5 transition-transform group-hover:scale-110', isActive && 'text-indigo-400')} />
                {item.badge !== undefined && (
                  <span className={cn(
                    'absolute -top-1.5 -right-2 px-1.5 py-0.2 text-[10px] font-bold rounded-full text-white',
                    item.badgeVariant === 'danger' ? 'bg-red-600' : 'bg-indigo-600'
                  )}>
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] tracking-tight leading-none">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="relative mt-auto pt-4 border-t border-slate-800 w-full flex flex-col items-center">
        <button
          onClick={() => setUserMenuOpen(!userMenuOpen)}
          className="relative group p-1 rounded-full hover:bg-slate-800 transition-colors"
        >
          <img
            src={currentUser.avatar}
            alt={currentUser.nome}
            className="w-10 h-10 rounded-full object-cover border-2 border-indigo-500/50"
          />
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#111827] rounded-full" />
        </button>

        {userMenuOpen && (
          <div className="absolute bottom-16 left-4 w-60 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-2 z-50 text-slate-200">
            <div className="p-3 border-b border-slate-800 mb-2">
              <p className="text-sm font-semibold text-white truncate">{currentUser.nome}</p>
              <p className="text-xs text-slate-400 truncate">{currentUser.email}</p>
            </div>

            <button
              onClick={() => {
                setUserMenuOpen(false);
                setProfileModalOpen(true);
              }}
              className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-slate-800 flex items-center justify-between text-slate-300 hover:text-white"
            >
              <span className="flex items-center gap-2">
                <UserIcon className="w-3.5 h-3.5 text-indigo-400" />
                <span>Meu Perfil & Informações</span>
              </span>
            </button>

            <button
              onClick={() => {
                setUserMenuOpen(false);
                onOpenLoginModal();
              }}
              className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-slate-800 flex items-center justify-between text-indigo-400 font-medium"
            >
              <span>Trocar de Usuário / Login</span>
            </button>
            <div className="my-1 border-t border-slate-800" />
            <button
              onClick={() => {
                setUserMenuOpen(false);
                onOpenLoginModal();
              }}
              className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-red-500/10 text-red-400 flex items-center gap-2"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair da conta</span>
            </button>
          </div>
        )}
      </div>

      <ProfileModal isOpen={profileModalOpen} onClose={() => setProfileModalOpen(false)} />
    </aside>
  );
};
