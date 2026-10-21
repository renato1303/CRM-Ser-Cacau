import React, { useState, useEffect } from 'react';
import { Search, Users, Building, MessageSquare, ArrowRight, X } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { formatCurrency } from '../../utils/cn';

export const GlobalSearch: React.FC = () => {
  const { globalSearchOpen, setGlobalSearchOpen, leads, contacts, companies, setActiveModule } = useStore();
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setGlobalSearchOpen(!globalSearchOpen);
      }
      if (e.key === 'Escape' && globalSearchOpen) {
        setGlobalSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [globalSearchOpen, setGlobalSearchOpen]);

  if (!globalSearchOpen) return null;

  const filteredLeads = query.trim() ? leads.filter(l => l.nome.toLowerCase().includes(query.toLowerCase())).slice(0, 5) : [];
  const filteredContacts = query.trim() ? contacts.filter(c => c.nome.toLowerCase().includes(query.toLowerCase()) || c.telefones.some(t => t.includes(query))).slice(0, 5) : [];
  const filteredCompanies = query.trim() ? companies.filter(c => c.nome.toLowerCase().includes(query.toLowerCase())).slice(0, 5) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="flex items-center px-4 py-3 border-b border-slate-200 dark:border-slate-800 gap-3">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Digite para buscar leads, contatos, empresas..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="flex-1 bg-transparent border-none outline-none text-slate-900 dark:text-slate-100 text-sm placeholder:text-slate-400"
          />
          <button
            onClick={() => setGlobalSearchOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 max-h-96 overflow-y-auto space-y-4">
          {!query.trim() ? (
            <p className="text-center text-xs text-slate-400 py-8">Digite ao menos 1 caractere para buscar em todo o CRM.</p>
          ) : (
            <>
              {filteredLeads.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Leads</h4>
                  <div className="space-y-1">
                    {filteredLeads.map(lead => (
                      <div
                        key={lead.id}
                        onClick={() => {
                          setGlobalSearchOpen(false);
                          window.location.hash = `#/leads/${lead.id}`;
                          setActiveModule(`leads/${lead.id}`);
                        }}
                        className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Users className="w-4 h-4 text-indigo-500" />
                          <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{lead.nome}</p>
                            <p className="text-xs text-slate-500">{formatCurrency(lead.valor)}</p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {filteredContacts.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Contatos</h4>
                  <div className="space-y-1">
                    {filteredContacts.map(contact => (
                      <div
                        key={contact.id}
                        onClick={() => {
                          setGlobalSearchOpen(false);
                          setActiveModule('listas/contatos');
                        }}
                        className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <MessageSquare className="w-4 h-4 text-green-500" />
                          <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{contact.nome}</p>
                            <p className="text-xs text-slate-500">{contact.telefones[0]}</p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {filteredLeads.length === 0 && filteredContacts.length === 0 && filteredCompanies.length === 0 && (
                <p className="text-center text-xs text-slate-400 py-8">Nenhum resultado encontrado para "{query}".</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
