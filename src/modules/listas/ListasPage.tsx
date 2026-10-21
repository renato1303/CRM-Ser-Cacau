import React, { useState } from 'react';
import { Users, Building, Package, Plus, Search } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { formatCurrency } from '../../utils/cn';
import { Button } from '../../components/ui/Button';
import { Tabs } from '../../components/ui/Tabs';

export const ListasPage: React.FC = () => {
  const { contacts, companies, products, activeModule, setActiveModule } = useStore();
  const [tab, setTab] = useState<'contatos' | 'empresas' | 'produtos'>('contatos');
  const [search, setSearch] = useState('');

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-slate-50 dark:bg-slate-950 flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Listas & Cadastros</h2>
          <p className="text-xs text-slate-500">Gerenciamento centralizado de contatos, empresas e catálogo de produtos.</p>
        </div>
        <Button size="sm" className="gap-2">
          <Plus className="w-4 h-4" /> Novo Registro
        </Button>
      </div>

      <Tabs
        tabs={[
          { id: 'contatos', label: 'Contatos', badge: contacts.length },
          { id: 'empresas', label: 'Empresas', badge: companies.length },
          { id: 'produtos', label: 'Produtos', badge: products.length },
        ]}
        activeTab={tab}
        onChange={(id) => setTab(id as any)}
        className="mb-6"
      />

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex-1">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar registros..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-xs bg-transparent outline-none w-64 text-slate-900 dark:text-slate-100"
          />
        </div>

        {tab === 'contatos' && (
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-4">Nome</th>
                <th className="p-4">Telefone</th>
                <th className="p-4">E-mail</th>
                <th className="p-4">Cargo</th>
                <th className="p-4">Consentimento LGPD</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {contacts.map(c => (
                <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="p-4 font-semibold text-slate-900 dark:text-slate-100">{c.nome}</td>
                  <td className="p-4 text-slate-600 dark:text-slate-300">{c.telefones[0]}</td>
                  <td className="p-4 text-slate-600 dark:text-slate-300">{c.emails[0] || '-'}</td>
                  <td className="p-4 text-slate-600 dark:text-slate-300">{c.cargo || '-'}</td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${c.consentimentoMarketing ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {c.consentimentoMarketing ? 'Opt-in' : 'Opt-out'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'empresas' && (
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-4">Nome da Empresa</th>
                <th className="p-4">CNPJ</th>
                <th className="p-4">Segmento</th>
                <th className="p-4">Site</th>
                <th className="p-4">Telefone</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {companies.map(comp => (
                <tr key={comp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="p-4 font-semibold text-slate-900 dark:text-slate-100">{comp.nome}</td>
                  <td className="p-4 text-slate-600 dark:text-slate-300">{comp.cnpj || '-'}</td>
                  <td className="p-4 text-slate-600 dark:text-slate-300">{comp.segmento || '-'}</td>
                  <td className="p-4 text-indigo-600">{comp.site || '-'}</td>
                  <td className="p-4 text-slate-600 dark:text-slate-300">{comp.telefone || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'produtos' && (
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-4">Produto</th>
                <th className="p-4">SKU</th>
                <th className="p-4">Preço</th>
                <th className="p-4">Descrição</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {products.map(prod => (
                <tr key={prod.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="p-4 font-semibold text-slate-900 dark:text-slate-100">{prod.nome}</td>
                  <td className="p-4 font-mono text-slate-500">{prod.sku}</td>
                  <td className="p-4 font-bold text-emerald-600">{formatCurrency(prod.preco)}</td>
                  <td className="p-4 text-slate-600 dark:text-slate-300">{prod.descricao}</td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">Ativo</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
