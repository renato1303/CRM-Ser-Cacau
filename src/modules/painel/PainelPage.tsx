import React, { useState } from 'react';
import { 
  Users, DollarSign, CheckCircle2, AlertCircle, MessageSquare, 
  TrendingUp, Clock, Filter, SlidersHorizontal, Image as ImageIcon, Plus 
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { formatCurrency } from '../../utils/cn';
import { Button } from '../../components/ui/Button';

export const PainelPage: React.FC = () => {
  const { leads, tasks, conversations, currentUser, users, pipelines, setActiveModule } = useStore();
  const [periodo, setPeriodo] = useState('mes_atual');
  const [editMode, setEditMode] = useState(false);

  // Compute metrics
  const totalLeads = leads.length;
  const valorTotalLeads = leads.reduce((acc, l) => acc + l.valor, 0);
  
  // Identify won stage IDs or stages containing 'ganho'
  const leadsGanho = leads.filter(l => l.stageId.toLowerCase().includes('ganho') || l.stageId === 'st-ganho');
  const valorGanho = leadsGanho.reduce((acc, l) => acc + l.valor, 0);

  const tarefasAtrasadas = tasks.filter(t => t.status === 'pendente' && new Date(t.prazo).getTime() < Date.now()).length;
  const tarefasHoje = tasks.filter(t => t.status === 'pendente' && new Date(t.prazo).toDateString() === new Date().toDateString()).length;
  const chatsAbertos = conversations.filter(c => c.status === 'aberta').length;
  const mensagensNaoLidas = conversations.reduce((acc, c) => acc + c.naoLidas, 0);

  // Dynamic Funnel Stages from default pipeline or active pipeline
  const activePipeline = pipelines[0];
  const stages = activePipeline ? activePipeline.stages : [];
  
  const stageCounts = stages.map(stage => {
    const count = leads.filter(l => l.stageId === stage.id || l.stageId.toLowerCase().includes(stage.nome.toLowerCase())).length;
    const valor = leads.filter(l => l.stageId === stage.id || l.stageId.toLowerCase().includes(stage.nome.toLowerCase())).reduce((acc, l) => acc + l.valor, 0);
    return { ...stage, count, valor };
  });

  const maxStageCount = Math.max(1, ...stageCounts.map(s => s.count));

  // Team Goals computed from actual won leads per user
  const teamMembers = users.slice(0, 4);
  const teamGoals = teamMembers.map(user => {
    const userWonLeads = leadsGanho.filter(l => l.responsavelId === user.id);
    const atual = userWonLeads.reduce((acc, l) => acc + l.valor, 0);
    const meta = user.metaMensal || 50000;
    const pct = Math.min(100, Math.round((atual / meta) * 100));
    return {
      id: user.id,
      nome: user.nome,
      atual,
      meta,
      pct,
    };
  });

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-slate-950 min-h-full transition-colors">
      {/* Top Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8 bg-slate-900/80 backdrop-blur-md p-4 rounded-2xl border border-slate-800/50 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Olá, {currentUser.nome}! 👋</h2>
          <p className="text-xs text-slate-400">Aqui está o panorama geral das vendas e atendimento de hoje.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-200 outline-none"
          >
            <option value="hoje">Hoje</option>
            <option value="esta_semana">Esta semana</option>
            <option value="mes_atual">Este mês</option>
            <option value="mes_passado">Mês passado</option>
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditMode(!editMode)}
            className="gap-2"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>{editMode ? 'Concluir Edição' : 'Personalizar Painel'}</span>
          </Button>
        </div>
      </div>

      {/* Widgets Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Widget 1: Leads Ativos */}
        <div 
          onClick={() => setActiveModule('leads')}
          className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm hover:border-indigo-500/50 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Leads Ativos</span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totalLeads}</h3>
            <span className="text-xs font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> {totalLeads > 0 ? '+12%' : '0%'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Valor em aberto: {formatCurrency(valorTotalLeads)}</p>
        </div>

        {/* Widget 2: Vendas Ganhas */}
        <div 
          onClick={() => setActiveModule('leads')}
          className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm hover:border-indigo-500/50 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Vendas Ganhas</span>
            <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{leadsGanho.length}</h3>
            <span className="text-xs font-bold text-green-600 dark:text-green-400">{formatCurrency(valorGanho)}</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Meta mensal: {formatCurrency(currentUser.metaMensal || 50000)}</p>
        </div>

        {/* Widget 3: Conversas */}
        <div 
          onClick={() => setActiveModule('chats')}
          className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm hover:border-indigo-500/50 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Chats Abertos</span>
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <MessageSquare className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{chatsAbertos}</h3>
            {mensagensNaoLidas > 0 && (
              <span className="px-2 py-0.5 text-xs font-bold bg-red-100 text-red-600 rounded-full">
                {mensagensNaoLidas} não lidas
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">Tempo médio 1ª resposta: --</p>
        </div>

        {/* Widget 4: Tarefas */}
        <div 
          onClick={() => setActiveModule('agenda')}
          className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm hover:border-indigo-500/50 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tarefas Pendentes</span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{tarefasHoje}</h3>
            {tarefasAtrasadas > 0 && (
              <span className="px-2 py-0.5 text-xs font-bold bg-red-100 text-red-600 rounded-full flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {tarefasAtrasadas} atrasadas
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">Para hoje e próximos dias</p>
        </div>
      </div>

      {/* Secondary Dashboard Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4">Funil de Conversão Recente</h3>
          {stageCounts.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">Nenhum estágio de funil cadastrado.</div>
          ) : (
            <div className="space-y-4">
              {stageCounts.map(stage => {
                const widthPct = maxStageCount > 0 ? Math.round((stage.count / maxStageCount) * 100) : 0;
                return (
                  <div key={stage.id}>
                    <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                      <span>{stage.nome}</span>
                      <span>{stage.count} {stage.count === 1 ? 'lead' : 'leads'} ({formatCurrency(stage.valor)})</span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full transition-all duration-500" 
                        style={{ width: `${Math.max(widthPct, stage.count > 0 ? 8 : 0)}%`, backgroundColor: stage.cor || '#6366f1' }} 
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm flex flex-col">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4">Metas da Equipe</h3>
          {teamGoals.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">Nenhum membro na equipe.</div>
          ) : (
            <div className="space-y-4 flex-1">
              {teamGoals.map(member => (
                <div key={member.id}>
                  <div className="flex justify-between text-xs font-medium mb-1 text-slate-700 dark:text-slate-200">
                    <span>{member.nome}</span>
                    <span className="font-bold">{formatCurrency(member.atual)} / {formatCurrency(member.meta)}</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="bg-indigo-600 h-full transition-all duration-500" style={{ width: `${member.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
