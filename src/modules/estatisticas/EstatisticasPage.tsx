import React, { useState } from 'react';
import { 
  BarChart3, TrendingUp, DollarSign, Users, Download, Filter, 
  Calendar, Award, PieChart as PieIcon, Activity 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid 
} from 'recharts';
import { useStore } from '../../store/useStore';
import { formatCurrency } from '../../utils/cn';
import { Button } from '../../components/ui/Button';
import { Tabs } from '../../components/ui/Tabs';

export const EstatisticasPage: React.FC = () => {
  const { leads, users, sources, activities, tasks } = useStore();
  const [subTab, setSubTab] = useState<'vendas' | 'consolidado' | 'origens' | 'metas' | 'atendimento'>('vendas');
  const [periodo, setPeriodo] = useState('mes_atual');

  const totalValor = leads.reduce((a, b) => a + b.valor, 0);
  const leadsGanho = leads.filter(l => l.stageId.includes('ganho') || l.stageId === 'st-ganho');
  const valorGanho = leadsGanho.reduce((a, b) => a + b.valor, 0);

  const origemData = sources.map(s => {
    const sLeads = leads.filter(l => l.origemId === s.id);
    const sVendas = sLeads.filter(l => l.stageId.includes('ganho') || l.stageId === 'st-ganho');
    return {
      name: s.nome,
      leads: sLeads.length,
      vendas: sVendas.length,
      investimento: s.custoMedio ? s.custoMedio * sLeads.length : 1500,
      retorno: sVendas.reduce((a, b) => a + b.valor, 0),
    };
  });

  const COLORS = ['#4F46E5', '#0EA5E9', '#16A34A', '#F59E0B', '#8B5CF6'];

  const handleExportCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "ID,Nome,Valor,Etapa,CriadoEm\n"
      + leads.map(l => `${l.id},"${l.nome}",${l.valor},${l.stageId},${l.createdAt}`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "estatisticas_leads_conversa_crm.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-slate-50 dark:bg-slate-950 flex flex-col">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Estatísticas & Relatórios</h2>
          <p className="text-xs text-slate-500">Análise de conversão, ROI por origem, metas de equipe e desempenho de atendimento.</p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none"
          >
            <option value="hoje">Hoje</option>
            <option value="esta_semana">Esta semana</option>
            <option value="mes_atual">Este mês</option>
            <option value="mes_passado">Mês passado</option>
          </select>

          <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2">
            <Download className="w-4 h-4" /> Exportar CSV
          </Button>
        </div>
      </div>

      <Tabs
        tabs={[
          { id: 'vendas', label: 'Análise de Vendas & Funil' },
          { id: 'consolidado', label: 'Relatório Consolidado' },
          { id: 'origens', label: 'Origens & ROI' },
          { id: 'metas', label: 'Metas & Equipe' },
          { id: 'atendimento', label: 'Atendimento & Resposta' },
        ]}
        activeTab={subTab}
        onChange={(id) => setSubTab(id as any)}
        className="mb-6"
      />

      {subTab === 'vendas' && (
        <div className="space-y-6 flex-1 flex flex-col">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total em Pipeline</span>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">{formatCurrency(totalValor)}</h3>
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Vendas Fechadas</span>
              <h3 className="text-2xl font-bold text-green-600 mt-2">{formatCurrency(valorGanho)}</h3>
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Taxa de Conversão</span>
              <h3 className="text-2xl font-bold text-indigo-600 mt-2">28.4%</h3>
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ciclo Médio</span>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">12 dias</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-4">Conversão por Etapa do Funil</h3>
              <div className="flex-1 min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { name: 'Entrada', leads: 28 },
                    { name: '1º Contato', leads: 22 },
                    { name: 'Qualificado', leads: 16 },
                    { name: 'Proposta', leads: 10 },
                    { name: 'Ganho', leads: 8 },
                  ]}>
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} />
                    <YAxis stroke="#888888" fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="leads" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-4">Valor por Etapa (R$)</h3>
              <div className="flex-1 min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { name: 'Entrada', valor: 140000 },
                    { name: 'Qualificado', valor: 95000 },
                    { name: 'Negociação', valor: 78000 },
                    { name: 'Ganho', valor: 125000 },
                  ]}>
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} />
                    <YAxis stroke="#888888" fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="valor" fill="#16A34A" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {subTab === 'consolidado' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex-1">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-4">Usuário</th>
                <th className="p-4">Leads Atribuídos</th>
                <th className="p-4">Vendas Ganhas</th>
                <th className="p-4">Valor Ganho</th>
                <th className="p-4">Tarefas Concluídas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {users.map(u => {
                const uLeads = leads.filter(l => l.responsavelId === u.id);
                const uGanho = uLeads.filter(l => l.stageId.includes('ganho') || l.stageId === 'st-ganho');
                const uVal = uGanho.reduce((a, b) => a + b.valor, 0);

                return (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="p-4 font-semibold text-slate-900 dark:text-slate-100">{u.nome}</td>
                    <td className="p-4 text-slate-600 dark:text-slate-300">{uLeads.length}</td>
                    <td className="p-4 text-green-600 font-bold">{uGanho.length}</td>
                    <td className="p-4 text-slate-900 dark:text-slate-100 font-bold">{formatCurrency(uVal)}</td>
                    <td className="p-4 text-slate-600 dark:text-slate-300">14</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {subTab === 'origens' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex-1">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-4">Origem / Canal</th>
                <th className="p-4">Total Leads</th>
                <th className="p-4">Investimento Total</th>
                <th className="p-4">Custo por Lead (CPL)</th>
                <th className="p-4">Retorno (Vendas)</th>
                <th className="p-4">ROI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {origemData.map((orig, i) => {
                const cpl = orig.leads > 0 ? orig.investimento / orig.leads : 0;
                const roi = orig.investimento > 0 ? ((orig.retorno - orig.investimento) / orig.investimento) * 100 : 0;

                return (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="p-4 font-semibold text-slate-900 dark:text-slate-100">{orig.name}</td>
                    <td className="p-4 text-slate-600 dark:text-slate-300">{orig.leads}</td>
                    <td className="p-4 text-slate-600 dark:text-slate-300">{formatCurrency(orig.investimento)}</td>
                    <td className="p-4 text-slate-600 dark:text-slate-300">{formatCurrency(cpl)}</td>
                    <td className="p-4 text-green-600 font-bold">{formatCurrency(orig.retorno)}</td>
                    <td className="p-4 font-bold text-indigo-600">{roi.toFixed(1)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {subTab === 'metas' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {users.map(u => (
            <div key={u.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 dark:text-slate-100">{u.nome}</h4>
                <Award className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Progresso Mensal</span>
                  <span className="font-bold">78%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="bg-indigo-600 h-full w-[78%]" />
                </div>
              </div>
              <p className="text-xs text-slate-500">Meta: {formatCurrency(u.metaMensal)}</p>
            </div>
          ))}
        </div>
      )}

      {subTab === 'atendimento' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-2">Tempo Médio de Primeira Resposta</h3>
            <h3 className="text-3xl font-bold text-indigo-600 mt-4">04m 12s</h3>
            <p className="text-xs text-slate-500 mt-1">15% mais rápido que o mês anterior.</p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-2">Volume de Mensagens por Canal</h3>
            <p className="text-xs text-slate-500 mt-2">WhatsApp: 82% · Instagram: 12% · Chat Site: 6%</p>
          </div>
        </div>
      )}
    </div>
  );
};
