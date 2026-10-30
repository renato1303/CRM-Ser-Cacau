import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, CheckCircle2, Clock, Plus, AlertCircle, 
  Share2, User, Filter, Check, ExternalLink, LayoutList, Kanban as KanbanIcon, 
  Search, Trash2, Edit3, MoreHorizontal, ArrowRight, Play, CheckSquare, Square, 
  X, RefreshCw, CalendarDays, Flag, Sparkles, Settings as SettingsIcon, MessageSquare
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { formatDate, cn } from '../../utils/cn';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Tabs } from '../../components/ui/Tabs';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { Task, TaskChecklistItem } from '../../types';
import { CalendarView } from './CalendarView';
import { googleConnect, toLocalInput } from '../../services/googleCalendar';

export const AgendaPage: React.FC = () => {
  const { 
    tasks, users, leads, contacts, currentUser, 
    addTask, updateTask, deleteTask, completeTask, addToast,
    taskTypes, taskOutcomes 
  } = useStore();

  const [view, setView] = useState<'lista' | 'quadro' | 'calendario'>('lista');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterResp, setFilterResp] = useState<string>('all');
  const [filterTipo, setFilterTipo] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [quickFilter, setQuickFilter] = useState<'todas' | 'minhas' | 'atrasadas' | 'hoje'>('todas');
  
  // Kanban Group By
  const [kanbanGroupBy, setKanbanGroupBy] = useState<'prazo' | 'status'>('prazo');

  // Modals
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  // Completion Modal with Outcomes
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [targetTaskForCompletion, setTargetTaskForCompletion] = useState<Task | null>(null);
  const [resultadoTexto, setResultadoTexto] = useState('');
  const [selectedDesfecho, setSelectedDesfecho] = useState(taskOutcomes[0]?.nome || 'Atendeu');
  const [criarProxima, setCriarProxima] = useState(false);

  // Detail Side Panel
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState<Task | null>(null);

  // Settings / Types Modal
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  // Multi-select
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

  // Quick inline creation per group
  const [quickInputTexts, setQuickInputTexts] = useState<Record<string, string>>({});

  // Form task state
  const [formTexto, setFormTexto] = useState('');
  const [formTipo, setFormTipo] = useState(taskTypes[0]?.id || 'ligar');
  const [formPrazo, setFormPrazo] = useState(toLocalInput());
  const [formResponsavelId, setFormResponsavelId] = useState(currentUser.id);
  const [formPrioridade, setFormPrioridade] = useState<'baixa' | 'normal' | 'alta' | 'urgente'>('normal');
  const [formEntidadeTipo, setFormEntidadeTipo] = useState<'lead' | 'contact' | 'company'>('lead');
  const [formEntidadeId, setFormEntidadeId] = useState(leads[0]?.id || '');
  const [formChecklist, setFormChecklist] = useState<TaskChecklistItem[]>([]);
  const [formObservacoes, setFormObservacoes] = useState('');
  const [formDuracao, setFormDuracao] = useState(30);
  const [formLembrete, setFormLembrete] = useState<string>('15_min');
  const [leadQuery, setLeadQuery] = useState('');

  // Counters
  const now = Date.now();
  const atrasadasCount = tasks.filter(t => (t.status === 'pendente' || t.status === 'em_andamento') && new Date(t.prazo).getTime() < now).length;
  const hojeCount = tasks.filter(t => (t.status === 'pendente' || t.status === 'em_andamento') && new Date(t.prazo).toDateString() === new Date().toDateString()).length;
  const amanhaCount = tasks.filter(t => (t.status === 'pendente' || t.status === 'em_andamento') && new Date(t.prazo).toDateString() === new Date(Date.now() + 86400000).toDateString()).length;
  const estaSemanaCount = tasks.filter(t => {
    if (t.status !== 'pendente' && t.status !== 'em_andamento') return false;
    const d = new Date(t.prazo).getTime();
    return d >= now && d <= now + 7 * 86400000;
  }).length;
  const concluidasCount = tasks.filter(t => t.status === 'concluida').length;

  // Filtered tasks
  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.texto.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesResp = filterResp === 'all' || t.responsavelId === filterResp;
    const matchesTipo = filterTipo === 'all' || t.tipo === filterTipo;
    const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || t.prioridade === filterPriority;

    let matchesQuick = true;
    const taskDate = new Date(t.prazo).getTime();
    if (quickFilter === 'minhas') matchesQuick = t.responsavelId === currentUser.id;
    if (quickFilter === 'atrasadas') matchesQuick = (t.status === 'pendente' || t.status === 'em_andamento') && taskDate < now;
    if (quickFilter === 'hoje') matchesQuick = new Date(t.prazo).toDateString() === new Date().toDateString();

    return matchesSearch && matchesResp && matchesTipo && matchesStatus && matchesPriority && matchesQuick;
  });

  const handleOpenCreateModal = (defaultDate?: string) => {
    setEditingTask(null);
    setFormTexto('');
    setFormTipo(taskTypes[0]?.id || 'ligar');
    setFormPrazo(defaultDate || toLocalInput());
    setFormResponsavelId(currentUser.id);
    setFormPrioridade('normal');
    setFormEntidadeTipo('lead');
    setFormEntidadeId('');
    setFormChecklist([]);
    setFormObservacoes('');
    setFormDuracao(30);
    setFormLembrete('15_min');
    setLeadQuery('');
    setTaskModalOpen(true);
  };

  const handleOpenEditModal = (task: Task) => {
    setEditingTask(task);
    setFormTexto(task.texto);
    setFormTipo(task.tipo);
    setFormPrazo(task.prazo ? toLocalInput(task.prazo) : toLocalInput());
    setFormResponsavelId(task.responsavelId);
    setFormPrioridade(task.prioridade || 'normal');
    setFormEntidadeTipo(task.entidadeTipo || 'lead');
    setFormEntidadeId(task.entidadeId || '');
    setFormChecklist(task.checklist || []);
    setFormObservacoes(task.observacoes || '');
    setFormDuracao(task.duracao || 30);
    setFormLembrete(task.lembrete || 'nenhum');
    setLeadQuery('');
    setTaskModalOpen(true);
  };

  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTexto.trim()) return;

    if (editingTask) {
      updateTask(editingTask.id, {
        texto: formTexto,
        tipo: formTipo,
        prazo: new Date(formPrazo).toISOString(),
        responsavelId: formResponsavelId,
        prioridade: formPrioridade,
        entidadeTipo: formEntidadeId ? formEntidadeTipo : undefined,
        entidadeId: formEntidadeId || undefined,
        checklist: formChecklist,
        observacoes: formObservacoes,
        duracao: formDuracao,
        lembrete: formLembrete as Task['lembrete'],
      });
      addToast('Tarefa Atualizada', 'As alterações foram salvas com sucesso.', 'success');
    } else {
      addTask({
        tipo: formTipo,
        texto: formTexto,
        prazo: new Date(formPrazo).toISOString(),
        responsavelId: formResponsavelId,
        prioridade: formPrioridade,
        entidadeTipo: formEntidadeId ? formEntidadeTipo : undefined,
        entidadeId: formEntidadeId || undefined,
        status: 'pendente',
        checklist: formChecklist,
        observacoes: formObservacoes,
        duracao: formDuracao,
        lembrete: formLembrete as Task['lembrete'],
      });
      addToast('Tarefa Criada', 'Nova tarefa adicionada com sucesso.', 'success');
    }
    setTaskModalOpen(false);
  };

  const handleQuickCreate = (groupKey: string) => {
    const text = quickInputTexts[groupKey];
    if (!text || !text.trim()) return;

    let prazoDate = new Date();
    if (groupKey === 'hoje') {
      prazoDate.setHours(18, 0, 0, 0);
    } else if (groupKey === 'amanha') {
      prazoDate.setDate(prazoDate.getDate() + 1);
      prazoDate.setHours(12, 0, 0, 0);
    } else if (groupKey === 'atrasadas') {
      prazoDate.setDate(prazoDate.getDate() - 1);
    }

    addTask({
      tipo: taskTypes[0]?.id || 'ligar',
      texto: text.trim(),
      prazo: prazoDate.toISOString(),
      responsavelId: currentUser.id,
      prioridade: 'normal',
      status: 'pendente',
      entidadeTipo: 'lead',
      entidadeId: leads[0]?.id || '',
    });

    setQuickInputTexts({ ...quickInputTexts, [groupKey]: '' });
    addToast('Tarefa Criada', 'Adicionada rapidamente.', 'success');
  };

  const handleOpenCompletionModal = (task: Task) => {
    setTargetTaskForCompletion(task);
    setResultadoTexto('');
    setSelectedDesfecho(taskOutcomes[0]?.nome || 'Atendeu');
    setCriarProxima(false);
    setCompleteModalOpen(true);
  };

  const handleConfirmCompletion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetTaskForCompletion) return;
    if (!resultadoTexto.trim()) {
      addToast('Resultado Obrigatório', 'Por favor, informe o resultado da tarefa.', 'error');
      return;
    }

    completeTask(targetTaskForCompletion.id, resultadoTexto, selectedDesfecho);
    addToast('Tarefa Concluída', `Registrado com desfecho: ${selectedDesfecho}`, 'success');

    if (criarProxima) {
      addTask({
        tipo: targetTaskForCompletion.tipo,
        texto: `Follow-up: ${targetTaskForCompletion.texto}`,
        prazo: new Date(Date.now() + 86400000 * 2).toISOString(),
        responsavelId: targetTaskForCompletion.responsavelId,
        prioridade: targetTaskForCompletion.prioridade,
        status: 'pendente',
        entidadeTipo: targetTaskForCompletion.entidadeTipo,
        entidadeId: targetTaskForCompletion.entidadeId,
      });
      addToast('Próxima Tarefa Criada', 'Novo follow-up agendado automaticamente.', 'info');
    }

    setCompleteModalOpen(false);
    setTargetTaskForCompletion(null);
  };

  // Grouping for List View
  const groups = [
    { key: 'atrasadas', label: 'Atrasadas', color: 'text-red-500 bg-red-500/10 border-red-500/30' },
    { key: 'hoje', label: 'Hoje', color: 'text-amber-500 bg-amber-500/10 border-amber-500/30' },
    { key: 'amanha', label: 'Amanhã', color: 'text-blue-500 bg-blue-500/10 border-blue-500/30' },
    { key: 'esta_semana', label: 'Esta Semana', color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/30' },
    { key: 'mais_tarde', label: 'Mais Tarde', color: 'text-slate-400 bg-slate-800/50 border-slate-700' },
    { key: 'sem_prazo', label: 'Sem Prazo', color: 'text-slate-400 bg-slate-800/50 border-slate-700' },
    { key: 'concluidas', label: 'Concluídas', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30' },
  ];

  const getTaskGroupKey = (t: Task) => {
    if (t.status === 'concluida') return 'concluidas';
    if (t.status === 'cancelada') return 'concluidas';
    if (!t.prazo) return 'sem_prazo';

    const tDate = new Date(t.prazo);
    const todayStr = new Date().toDateString();
    const tomorrowStr = new Date(Date.now() + 86400000).toDateString();

    if (tDate.getTime() < now && tDate.toDateString() !== todayStr) return 'atrasadas';
    if (tDate.toDateString() === todayStr) return 'hoje';
    if (tDate.toDateString() === tomorrowStr) return 'amanha';
    if (tDate.getTime() >= now && tDate.getTime() <= now + 7 * 86400000) return 'esta_semana';
    return 'mais_tarde';
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-slate-950 flex flex-col text-slate-100">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-indigo-500" /> Central de Tarefas
          </h2>
          <p className="text-xs text-slate-400">Gerenciamento completo de atividades, follow-ups e compromissos da equipe.</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSettingsModalOpen(true)}
            className="gap-2 text-slate-300 border-slate-700 hover:bg-slate-900"
          >
            <SettingsIcon className="w-4 h-4" /> Tipos & Desfechos
          </Button>

          <Button size="sm" onClick={() => handleOpenCreateModal()} className="gap-2">
            <Plus className="w-4 h-4" /> Nova Tarefa
          </Button>
        </div>
      </div>

      {/* Counters Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Atrasadas</span>
          <h3 className="text-2xl font-bold text-white mt-1">{atrasadasCount}</h3>
        </div>
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Hoje</span>
          <h3 className="text-2xl font-bold text-white mt-1">{hojeCount}</h3>
        </div>
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Amanhã</span>
          <h3 className="text-2xl font-bold text-white mt-1">{amanhaCount}</h3>
        </div>
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Esta Semana</span>
          <h3 className="text-2xl font-bold text-white mt-1">{estaSemanaCount}</h3>
        </div>
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Concluídas</span>
          <h3 className="text-2xl font-bold text-white mt-1">{concluidasCount}</h3>
        </div>
      </div>

      {/* Toolbar: Views, Search & Quick Filters */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-6 bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-sm">
        <div className="flex items-center gap-3 flex-wrap">
          <Tabs
            tabs={[
              { id: 'lista', label: 'Lista' },
              { id: 'quadro', label: 'Quadro (Kanban)' },
              { id: 'calendario', label: 'Calendário' },
            ]}
            activeTab={view}
            onChange={(id) => setView(id as any)}
          />

          <div className="flex items-center bg-slate-800 p-1 rounded-xl text-xs">
            {(['todas', 'minhas', 'atrasadas', 'hoje'] as const).map(q => (
              <button
                key={q}
                onClick={() => setQuickFilter(q)}
                className={`px-3 py-1 rounded-lg font-medium capitalize transition-colors ${quickFilter === q ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
              >
                {q === 'minhas' ? 'Minhas Tarefas' : q}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar tarefas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-slate-100 outline-none w-48 focus:w-64 transition-all"
            />
          </div>

          <select
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-slate-200 outline-none"
          >
            <option value="all">Todos os Tipos</option>
            {taskTypes.map(t => (
              <option key={t.id} value={t.id}>{t.nome}</option>
            ))}
          </select>

          <select
            value={filterResp}
            onChange={(e) => setFilterResp(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-slate-200 outline-none"
          >
            <option value="all">Todos Responsáveis</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.nome}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Bulk actions bar if selected */}
      {selectedTaskIds.length > 0 && (
        <div className="mb-4 p-3 bg-indigo-950/80 border border-indigo-800 rounded-xl flex items-center justify-between text-xs animate-in fade-in">
          <span className="font-semibold text-indigo-200">{selectedTaskIds.length} tarefas selecionadas</span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => {
              selectedTaskIds.forEach(id => updateTask(id, { status: 'concluida' }));
              setSelectedTaskIds([]);
              addToast('Concluídas em Massa', 'Tarefas selecionadas foram concluídas.', 'success');
            }}>
              Concluir Selecionadas
            </Button>
            <Button size="sm" variant="danger" onClick={() => {
              selectedTaskIds.forEach(id => deleteTask(id));
              setSelectedTaskIds([]);
              addToast('Excluídas em Massa', 'Tarefas selecionadas foram excluídas.', 'success');
            }}>
              Excluir
            </Button>
          </div>
        </div>
      )}

      {/* ================= VIEW: LISTA ================= */}
      {view === 'lista' && (
        <div className="space-y-6 flex-1">
          {groups.map(group => {
            const groupTasks = filteredTasks.filter(t => getTaskGroupKey(t) === group.key);
            if (groupTasks.length === 0 && group.key === 'concluidas') return null;

            const tConfig = taskTypes.find(tp => tp.id === group.key);

            return (
              <div key={group.key} className="bg-slate-900 rounded-2xl border border-slate-800 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 bg-slate-800/40 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${group.color}`}>
                      {group.label} ({groupTasks.length})
                    </span>
                  </div>
                </div>

                {/* Quick Inline Creation per Group */}
                {group.key !== 'concluidas' && (
                  <div className="px-5 py-2 border-b border-slate-800/60 bg-slate-950/40 flex items-center gap-2">
                    <Plus className="w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder={`+ Adicionar tarefa em ${group.label} (pressione Enter)...`}
                      value={quickInputTexts[group.key] || ''}
                      onChange={(e) => setQuickInputTexts({ ...quickInputTexts, [group.key]: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleQuickCreate(group.key);
                      }}
                      className="w-full bg-transparent text-xs text-slate-200 outline-none placeholder:text-slate-500"
                    />
                  </div>
                )}

                <div className="divide-y divide-slate-800/60">
                  {groupTasks.map(task => {
                    const resp = users.find(u => u.id === task.responsavelId);
                    const isOverdue = (task.status === 'pendente' || task.status === 'em_andamento') && new Date(task.prazo).getTime() < now;
                    const isSelected = selectedTaskIds.includes(task.id);
                    const leadLinked = leads.find(l => l.id === task.entidadeId);

                    return (
                      <div 
                        key={task.id} 
                        className={cn(
                          "p-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors group",
                          task.status === 'concluida' && "opacity-60"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedTaskIds([...selectedTaskIds, task.id]);
                              else setSelectedTaskIds(selectedTaskIds.filter(id => id !== task.id));
                            }}
                            className="w-4 h-4 text-indigo-600 rounded bg-slate-800 border-slate-700"
                          />

                          <button
                            onClick={() => {
                              if (task.status === 'pendente' || task.status === 'em_andamento') {
                                handleOpenCompletionModal(task);
                              } else {
                                updateTask(task.id, { status: 'pendente' });
                              }
                            }}
                            className={cn(
                              "w-5 h-5 rounded-full border flex items-center justify-center transition-colors",
                              task.status === 'concluida' ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-600 hover:border-indigo-500'
                            )}
                          >
                            {task.status === 'concluida' && <Check className="w-3.5 h-3.5" />}
                          </button>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                {task.tipo}
                              </span>
                              <p 
                                onClick={() => setSelectedTaskForDetail(task)}
                                className={cn(
                                  "text-xs font-semibold text-slate-100 cursor-pointer hover:underline",
                                  task.status === 'concluida' && "line-through text-slate-500"
                                )}
                              >
                                {task.texto}
                              </p>
                            </div>

                            <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400">
                              <span>Prazo: <strong className={isOverdue ? 'text-red-400 font-bold' : 'text-slate-300'}>{formatDate(task.prazo)}</strong></span>
                              {leadLinked && (
                                <span className="flex items-center gap-1 text-indigo-400 cursor-pointer hover:underline" onClick={() => {
                                  window.location.hash = `#/leads/${leadLinked.id}`;
                                }}>
                                  <ExternalLink className="w-3 h-3" /> {leadLinked.nome}
                                </span>
                              )}
                              {task.prioridade && (
                                <span className={cn(
                                  "capitalize px-1.5 py-0.5 rounded text-[10px] font-bold",
                                  task.prioridade === 'urgente' ? 'bg-red-950 text-red-400' : task.prioridade === 'alta' ? 'bg-amber-950 text-amber-400' : 'bg-slate-800 text-slate-300'
                                )}>
                                  {task.prioridade}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {resp && <div title={resp.nome}><Avatar src={resp.avatar} name={resp.nome} size="sm" /></div>}

                          {/* Status Badge clickable */}
                          <select
                            value={task.status}
                            onChange={(e) => updateTask(task.id, { status: e.target.value as any })}
                            className={cn(
                              "text-[10px] uppercase font-bold px-2 py-1 rounded-lg outline-none cursor-pointer border",
                              task.status === 'concluida' ? 'bg-emerald-950 text-emerald-400 border-emerald-800' :
                              task.status === 'em_andamento' ? 'bg-amber-950 text-amber-400 border-amber-800' :
                              task.status === 'cancelada' ? 'bg-red-950 text-red-400 border-red-800' :
                              'bg-slate-800 text-slate-300 border-slate-700'
                            )}
                          >
                            <option value="pendente">Pendente</option>
                            <option value="em_andamento">Em Andamento</option>
                            <option value="concluida">Concluída</option>
                            <option value="cancelada">Cancelada</option>
                          </select>

                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleOpenEditModal(task)} className="p-1 text-slate-400 hover:text-slate-200" title="Editar">
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button onClick={() => deleteTask(task.id)} className="p-1 text-red-400 hover:text-red-300" title="Excluir">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {groupTasks.length === 0 && (
                    <div className="p-6 text-center text-xs text-slate-500">
                      Nenhuma tarefa neste grupo.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= VIEW: QUADRO (KANBAN) ================= */}
      {view === 'quadro' && (
        <div className="flex-1 flex flex-col space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-400">Agrupar Kanban por:</span>
            <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setKanbanGroupBy('prazo')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${kanbanGroupBy === 'prazo' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Prazo
              </button>
              <button
                onClick={() => setKanbanGroupBy('status')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${kanbanGroupBy === 'status' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Status
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-x-auto flex items-start gap-6 pb-4">
            {(kanbanGroupBy === 'prazo' ? ['atrasadas', 'hoje', 'amanha', 'esta_semana', 'mais_tarde'] : ['pendente', 'em_andamento', 'concluida', 'cancelada']).map(colKey => {
              const colTasks = filteredTasks.filter(t => {
                if (kanbanGroupBy === 'prazo') return getTaskGroupKey(t) === colKey;
                return t.status === colKey;
              });

              return (
                <div
                  key={colKey}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const taskId = e.dataTransfer.getData('text/plain');
                    if (taskId) {
                      if (kanbanGroupBy === 'status') {
                        if (colKey === 'concluida') {
                          const taskObj = tasks.find(t => t.id === taskId);
                          if (taskObj) handleOpenCompletionModal(taskObj);
                        } else {
                          updateTask(taskId, { status: colKey as any });
                        }
                      } else {
                        // Prazo drop
                        let newPrazo = new Date();
                        if (colKey === 'hoje') newPrazo.setHours(18, 0, 0, 0);
                        else if (colKey === 'amanha') newPrazo.setDate(newPrazo.getDate() + 1);
                        else if (colKey === 'atrasadas') newPrazo.setDate(newPrazo.getDate() - 1);
                        else newPrazo.setDate(newPrazo.getDate() + 5);
                        updateTask(taskId, { prazo: newPrazo.toISOString() });
                      }
                      addToast('Tarefa Atualizada', 'Movida com sucesso.', 'success');
                    }
                  }}
                  className="w-80 bg-slate-900 rounded-2xl border border-slate-800 flex flex-col max-h-full shadow-sm shrink-0"
                >
                  <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                    <h4 className="font-bold text-xs text-slate-200 uppercase tracking-wider">{colKey.replace('_', ' ')}</h4>
                    <span className="px-2 py-0.5 text-xs bg-slate-800 rounded-full font-semibold text-slate-400">
                      {colTasks.length}
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[300px]">
                    {colTasks.map(task => {
                      const resp = users.find(u => u.id === task.responsavelId);

                      return (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(e) => e.dataTransfer.setData('text/plain', task.id)}
                          onClick={() => setSelectedTaskForDetail(task)}
                          className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60 shadow-sm hover:border-indigo-500 cursor-grab active:cursor-grabbing transition-all space-y-2 group"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                              {task.tipo}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-400">{formatDate(task.prazo)}</span>
                          </div>

                          <p className="text-xs font-semibold text-slate-100">{task.texto}</p>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-700/50 text-xs">
                            {resp ? <Avatar src={resp.avatar} name={resp.nome} size="sm" /> : <span />}
                            <span className="text-[10px] uppercase font-bold text-slate-400">{task.status}</span>
                          </div>
                        </div>
                      );
                    })}

                    {colTasks.length === 0 && (
                      <div className="text-center py-12 text-slate-500 text-xs">
                        Nenhuma tarefa nesta coluna.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= VIEW: CALENDÁRIO ================= */}
      {view === 'calendario' && (
        <CalendarView
          tasks={filteredTasks}
          onOpenTask={(task) => setSelectedTaskForDetail(task)}
          onNewTask={(localDateTime) => handleOpenCreateModal(localDateTime)}
          onConnectGoogle={() => { googleConnect().catch(err => addToast('Google Agenda', err.message, 'error')); }}
        />
      )}

      {/* ================= MODAL: CRIAR / EDITAR TAREFA ================= */}
      <Modal 
        isOpen={taskModalOpen} 
        onClose={() => setTaskModalOpen(false)} 
        title={editingTask ? "Editar Tarefa" : "Nova Tarefa"}
        maxWidth="lg"
      >
        <form onSubmit={handleSaveTask} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Descrição / Título da Tarefa *</label>
            <input
              type="text"
              required
              placeholder="Ex: Ligar para confirmar proposta..."
              value={formTexto}
              onChange={(e) => setFormTexto(e.target.value)}
              className="w-full px-4 py-2.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-slate-100 outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Tipo de Tarefa</label>
              <select
                value={formTipo}
                onChange={(e) => setFormTipo(e.target.value)}
                className="w-full px-3 py-2.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-slate-100 outline-none"
              >
                {taskTypes.map(t => (
                  <option key={t.id} value={t.id}>{t.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Prioridade</label>
              <select
                value={formPrioridade}
                onChange={(e) => setFormPrioridade(e.target.value as any)}
                className="w-full px-3 py-2.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-slate-100 outline-none"
              >
                <option value="baixa">Baixa</option>
                <option value="normal">Normal</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Prazo / Data e Hora *</label>
              <input
                type="datetime-local"
                required
                value={formPrazo}
                onChange={(e) => setFormPrazo(e.target.value)}
                className="w-full px-3 py-2.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-slate-100 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Responsável</label>
              <select
                value={formResponsavelId}
                onChange={(e) => setFormResponsavelId(e.target.value)}
                className="w-full px-3 py-2.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-slate-100 outline-none"
              >
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.nome}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Duração</label>
              <select
                value={formDuracao}
                onChange={(e) => setFormDuracao(Number(e.target.value))}
                className="w-full px-3 py-2.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-slate-100 outline-none"
              >
                {[15, 30, 45, 60, 90, 120].map(m => (
                  <option key={m} value={m}>{m < 60 ? `${m} minutos` : m === 60 ? '1 hora' : m === 90 ? '1 hora e meia' : '2 horas'}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Lembrete</label>
              <select
                value={formLembrete}
                onChange={(e) => setFormLembrete(e.target.value)}
                className="w-full px-3 py-2.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-slate-100 outline-none"
              >
                <option value="nenhum">Sem lembrete</option>
                <option value="no_horario">No horário</option>
                <option value="15_min">15 minutos antes</option>
                <option value="1_hora">1 hora antes</option>
                <option value="1_dia">1 dia antes</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Vincular com Lead (opcional)</label>
            {formEntidadeId ? (
              <div className="flex items-center justify-between gap-2 px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl">
                <span className="text-xs text-slate-100 truncate">{leads.find(l => l.id === formEntidadeId)?.nome || 'Lead removido'}</span>
                <button type="button" onClick={() => setFormEntidadeId('')} className="text-[11px] text-slate-400 hover:text-red-400 flex items-center gap-1">
                  <X className="w-3.5 h-3.5" /> Remover
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={leadQuery}
                  onChange={(e) => setLeadQuery(e.target.value)}
                  placeholder="Buscar lead por nome, empresa ou telefone..."
                  className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-slate-100 outline-none focus:border-indigo-500"
                />
                {leadQuery.trim().length >= 2 && (() => {
                  const q = leadQuery.trim().toLowerCase();
                  const digits = q.replace(/\D/g, '');
                  const results = leads.filter(l => {
                    if (l.nome.toLowerCase().includes(q)) return true;
                    return l.contactIds.some(cid => {
                      const c = contacts.find(ct => ct.id === cid);
                      if (!c) return false;
                      if (c.nome.toLowerCase().includes(q)) return true;
                      return digits.length >= 4 && (c.telefones || []).some(t => t.replace(/\D/g, '').includes(digits));
                    });
                  }).slice(0, 8);
                  return (
                    <div className="absolute z-30 mt-1 w-full max-h-56 overflow-y-auto rounded-xl bg-slate-800 border border-slate-700 shadow-xl">
                      {results.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-slate-400">Nenhum lead encontrado.</p>
                      ) : results.map(l => (
                        <button
                          key={l.id}
                          type="button"
                          onClick={() => { setFormEntidadeTipo('lead'); setFormEntidadeId(l.id); setLeadQuery(''); }}
                          className="w-full text-left px-3 py-2 text-xs text-slate-100 hover:bg-slate-700"
                        >
                          {l.nome}
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Observações (opcional)</label>
            <textarea
              value={formObservacoes}
              onChange={(e) => setFormObservacoes(e.target.value)}
              rows={3}
              placeholder="Detalhes da reunião, pauta, endereço ou link da chamada..."
              className="w-full px-3 py-2.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-slate-100 outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
            <Button type="button" variant="outline" size="sm" onClick={() => setTaskModalOpen(false)}>Cancelar</Button>
            <Button type="submit" size="sm">Salvar Tarefa</Button>
          </div>
        </form>
      </Modal>

      {/* ================= MODAL: CONCLUSÃO COM DESFECHO ================= */}
      <Modal isOpen={completeModalOpen} onClose={() => setCompleteModalOpen(false)} title="Concluir Tarefa & Registrar Resultado">
        <form onSubmit={handleConfirmCompletion} className="space-y-4">
          <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700 text-xs">
            <p className="font-bold text-slate-200 mb-1">{targetTaskForCompletion?.texto}</p>
            <p className="text-slate-400">Prazo: {targetTaskForCompletion ? formatDate(targetTaskForCompletion.prazo) : ''}</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Desfecho Rápido</label>
            <div className="grid grid-cols-2 gap-2">
              {taskOutcomes.map(out => (
                <button
                  key={out.id}
                  type="button"
                  onClick={() => setSelectedDesfecho(out.nome)}
                  className={cn(
                    "p-2 rounded-xl text-xs font-semibold border text-left transition-colors",
                    selectedDesfecho === out.nome ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                  )}
                >
                  {out.nome}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Resultado / Anotação (Obrigatório) *</label>
            <textarea
              rows={3}
              required
              placeholder="Descreva o resultado da conversa ou reunião..."
              value={resultadoTexto}
              onChange={(e) => setResultadoTexto(e.target.value)}
              className="w-full px-3 py-2.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-slate-100 outline-none resize-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="criarProxima"
              checked={criarProxima}
              onChange={(e) => setCriarProxima(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded bg-slate-800 border-slate-700"
            />
            <label htmlFor="criarProxima" className="text-xs text-slate-300 cursor-pointer">
              Criar próxima tarefa de follow-up automaticamente
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
            <Button type="button" variant="outline" size="sm" onClick={() => setCompleteModalOpen(false)}>Cancelar</Button>
            <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white">Concluir Tarefa</Button>
          </div>
        </form>
      </Modal>

      {/* ================= PANEL: DETALHE DA TAREFA ================= */}
      {selectedTaskForDetail && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl p-6 flex flex-col animate-in slide-in-from-right duration-200">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
            <h3 className="font-bold text-sm text-white">Detalhes da Tarefa</h3>
            <button onClick={() => setSelectedTaskForDetail(null)} className="p-1 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 text-xs">
            <div>
              <span className="text-slate-500 uppercase text-[10px] font-bold">Título</span>
              <p className="font-bold text-slate-100 text-sm mt-0.5">{selectedTaskForDetail.texto}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-slate-500 uppercase text-[10px] font-bold">Tipo</span>
                <p className="text-slate-200 capitalize mt-0.5">{selectedTaskForDetail.tipo}</p>
              </div>
              <div>
                <span className="text-slate-500 uppercase text-[10px] font-bold">Status</span>
                <p className="text-indigo-400 font-semibold capitalize mt-0.5">{selectedTaskForDetail.status}</p>
              </div>
            </div>

            <div>
              <span className="text-slate-500 uppercase text-[10px] font-bold">Prazo</span>
              <p className="text-slate-200 mt-0.5">{formatDate(selectedTaskForDetail.prazo)}</p>
            </div>

            {selectedTaskForDetail.resultado && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-800 rounded-xl">
                <span className="text-emerald-400 uppercase text-[10px] font-bold">Resultado Registrado</span>
                <p className="text-slate-200 mt-1">{selectedTaskForDetail.resultado}</p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => { handleOpenEditModal(selectedTaskForDetail); setSelectedTaskForDetail(null); }}>
              Editar
            </Button>
            <Button size="sm" onClick={() => setSelectedTaskForDetail(null)}>Fechar</Button>
          </div>
        </div>
      )}

      {/* ================= MODAL: CONFIGURAÇÃO DE TIPOS & DESFECHOS ================= */}
      <Modal isOpen={settingsModalOpen} onClose={() => setSettingsModalOpen(false)} title="Configurar Tipos & Desfechos de Tarefas">
        <div className="space-y-4 text-xs">
          <div>
            <h4 className="font-bold text-slate-200 mb-2">Tipos de Tarefa Disponíveis</h4>
            <div className="flex flex-wrap gap-2">
              {taskTypes.map(t => (
                <span key={t.id} className="px-3 py-1 bg-slate-800 border border-slate-700 rounded-xl font-semibold text-slate-300">
                  {t.nome}
                </span>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800">
            <h4 className="font-bold text-slate-200 mb-2">Desfechos de Conclusão</h4>
            <div className="flex flex-wrap gap-2">
              {taskOutcomes.map(o => (
                <span key={o.id} className="px-3 py-1 bg-indigo-950 border border-indigo-800 rounded-xl font-semibold text-indigo-300">
                  {o.nome}
                </span>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button size="sm" onClick={() => setSettingsModalOpen(false)}>Concluído</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
