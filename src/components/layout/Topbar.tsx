import React, { useState } from 'react';
import { Search, Bell, Sparkles, Command } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Button } from '../ui/Button';

interface TopbarProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export const Topbar: React.FC<TopbarProps> = ({ title, subtitle, actions }) => {
  const { setGlobalSearchOpen, setAiCopilotOpen, notifications } = useStore();
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const unreadCount = notifications.filter(n => !n.lida).length;

  return (
    <header className="h-16 bg-[#090d16]/90 backdrop-blur-md border-b border-slate-800/60 px-6 flex items-center justify-between z-20 shrink-0">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            {title}
          </h1>
          {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Global Search Trigger (Ctrl+K) */}
        <button
          onClick={() => setGlobalSearchOpen(true)}
          className="hidden md:flex items-center gap-3 px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-lg hover:border-indigo-500 border border-transparent transition-all w-64 justify-between"
        >
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400" />
            <span>Buscar leads, contatos...</span>
          </div>
          <kbd className="px-1.5 py-0.5 text-[10px] font-semibold bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-600 shadow-sm flex items-center gap-0.5">
            <Command className="w-3 h-3" /> K
          </kbd>
        </button>

        {/* AI Copilot trigger */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAiCopilotOpen(true)}
          className="gap-2 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
        >
          <Sparkles className="w-4 h-4" />
          <span className="hidden sm:inline">Copiloto IA</span>
        </Button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 relative transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-600 rounded-full animate-pulse" />
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-4 z-50">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100">Notificações</h4>
                <span className="text-xs text-indigo-600 dark:text-indigo-400 cursor-pointer hover:underline">Marcar lidas</span>
              </div>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4">Nenhuma notificação nova.</p>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-xs">
                      <p className="font-semibold text-slate-800 dark:text-slate-200 mb-0.5">{n.titulo}</p>
                      <p className="text-slate-500 dark:text-slate-400">{n.mensagem}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {actions && <div className="flex items-center gap-2 ml-2">{actions}</div>}
      </div>
    </header>
  );
};
