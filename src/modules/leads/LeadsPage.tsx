import React, { useMemo, useState } from 'react';
import { 
  Plus, Search, Filter, LayoutGrid, List as ListIcon, Settings, 
  ChevronRight, Phone, MessageSquare, DollarSign, User, AlertCircle, CheckCircle2, Trash2, ArrowRight, Upload,
  Tag as TagIcon, CheckSquare, Square, X, Bookmark
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { formatCurrency, cn } from '../../utils/cn';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { Lead, LeadFilterState, Stage } from '../../types';
import { ImportLeadsModal } from './ImportLeadsModal';
import { LeadFiltersPanel } from './LeadFiltersPanel';
import { WonValueModal } from './WonValueModal';
import { TagChip, TagMenu } from './TagPicker';
import {
  EMPTY_LEAD_FILTER, applyLeadFilters, buildTaskIndex, countActiveFilters, matchesLeadSearch, resolveLeadTags
} from './leadFilters';

const COLUMN_PAGE = 100;

// Valor que conta para a coluna: fechado nas vendas ganhas, negociado nas demais
const leadValue = (lead: Lead, stage?: Stage) =>
  stage?.tipo === 'ganho' ? (lead.valorFechado ?? lead.valor ?? 0) : (lead.valor ?? 0);

export const LeadsPage: React.FC = () => {
  const { 
    leads, pipelines, tags, sources, users, contacts, tasks,
    moveLeadStage, addLead, deleteLead, setActiveModule, lossReasons, addToast,
    winLead, addTag, bulkAddTag, bulkRemoveTag, bulkDeleteLeads,
    savedFilters, saveLeadFilter, deleteLeadFilter
  } = useStore();
  
  const [activePipelineId, setActivePipelineId] = useState(pipelines[0]?.id || 'pipe-vendas');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<LeadFilterState>(EMPTY_LEAD_FILTER);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkTagMenu, setBulkTagMenu] = useState<'add' | 'remove' | null>(null);
  const [wonTarget, setWonTarget] = useState<{ lead: Lead; stage: Stage } | null>(null);
  const [columnLimit, setColumnLimit] = useState<Record<string, number>>({});
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);
  const [newLeadModalOpen, setNewLeadModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [lossModalOpen, setLossModalOpen] = useState(false);
  const [targetLeadForLoss, setTargetLeadForLoss] = useState<Lead | null>(null);
  const [selectedLossReason, setSelectedLossReason] = useState(lossReasons[0]?.id || '');
  const [lossComment, setLossComment] = useState('');

  // Form new lead state
  const [newLeadName, setNewLeadName] = useState('');
  const [newLeadValue, setNewLeadValue] = useState('5000');
  const [newLeadContactId, setNewLeadContactId] = useState(contacts[0]?.id || '');
  const [newLeadSourceId, setNewLeadSourceId] = useState(sources[0]?.id || '');

  const pipeline = pipelines.find(p => p.id === activePipelineId) || pipelines[0];
  const stages = pipeline ? pipeline.stages : [];

  const contactsById = useMemo(() => new Map(contacts.map(c => [c.id, c])), [contacts]);
  const usersById = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);
  const taskIndex = useMemo(() => buildTaskIndex(tasks), [tasks]);
  const pipelineLeads = useMemo(() => leads.filter(l => l.pipelineId === activePipelineId), [leads, activePipelineId]);
  const filteredLeads = useMemo(() => {
    const searched = pipelineLeads.filter(l => matchesLeadSearch(l, contactsById, searchQuery));
    return applyLeadFilters(searched, filter, { tags, taskIndex });
  }, [pipelineLeads, contactsById, searchQuery, filter, tags, taskIndex]);
  const activeFilters = countActiveFilters(filter);

  const stageById = new Map(stages.map(st => [st.id, st]));
  const totalNegociado = filteredLeads
    .filter(l => { const t = stageById.get(l.stageId)?.tipo; return t !== 'ganho' && t !== 'perdido'; })
    .reduce((acc, l) => acc + (l.valor || 0), 0);
  const totalFechado = filteredLeads
    .filter(l => stageById.get(l.stageId)?.tipo === 'ganho')
    .reduce((acc, l) => acc + (l.valorFechado ?? l.valor ?? 0), 0);

  const openLead = (lead: Lead) => {
    window.location.hash = `#/leads/${lead.id}`;
    setActiveModule(`leads/${lead.id}`);
  };

  const toggleSelected = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
    setBulkTagMenu(null);
  };

  // Soltar um lead numa etapa: venda ganha pede o valor fechado
  const dropLeadOnStage = (leadId: string, stage: Stage) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead || lead.stageId === stage.id) return;
    if (stage.tipo === 'ganho') {
      setWonTarget({ lead, stage });
      return;
    }
    moveLeadStage(leadId, stage.id);
    addToast('Lead Movido', `Lead transferido para ${stage.nome}`);
  };

  const handleCreateLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadName.trim()) return;

    addLead({
      nome: newLeadName,
      valor: parseFloat(newLeadValue) || 0,
      pipelineId: activePipelineId,
      stageId: stages[0]?.id || '',
      responsavelId: users[0].id,
      contactIds: [newLeadContactId],
      tags: [],
      origemId: newLeadSourceId,
      customFields: {},
      produtos: [],
    });

    setNewLeadName('');
    setNewLeadModalOpen(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Top Bar */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <select
            value={activePipelineId}
            onChange={(e) => setActivePipelineId(e.target.value)}
            className="px-3 py-2 text-sm font-semibold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 outline-none"
          >
            {pipelines.map(p => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
          <div className="text-xs text-slate-500 font-medium hidden sm:flex items-center gap-3">
            <span>{filteredLeads.length} leads</span>
            <span>Negociado <span className="font-bold text-slate-700 dark:text-slate-300">{formatCurrency(totalNegociado)}</span></span>
            <span>Fechado <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(totalFechado)}</span></span>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar nome, telefone, e-mail..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 outline-none w-48 focus:w-64 transition-all"
            />
          </div>

          <Button
            onClick={() => setFiltersOpen(true)}
            variant={activeFilters > 0 ? 'primary' : 'outline'}
            size="sm"
            className="gap-2"
          >
            <Filter className="w-4 h-4" /> Filtros{activeFilters > 0 ? ` (${activeFilters})` : ''}
          </Button>
          {savedFilters.length > 0 && (
            <select
              value=""
              onChange={(e) => {
                const sf = savedFilters.find(f => f.id === e.target.value);
                if (sf) { setFilter({ ...EMPTY_LEAD_FILTER, ...sf.filtro }); addToast('Filtro aplicado', sf.nome); }
              }}
              className="px-2 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 outline-none max-w-[160px]"
              aria-label="Aplicar filtro salvo"
            >
              <option value="">Filtros salvos…</option>
              {savedFilters.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          )}
          {activeFilters > 0 && (
            <button type="button" onClick={() => setFilter(EMPTY_LEAD_FILTER)} className="text-xs text-slate-500 hover:text-red-500 flex items-center gap-1">
              <X className="w-3.5 h-3.5" /> Limpar
            </button>
          )}
          <Button
            onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
            variant={selectMode ? 'primary' : 'outline'}
            size="sm"
            className="gap-2"
          >
            <CheckSquare className="w-4 h-4" /> {selectMode ? 'Cancelar seleção' : 'Selecionar'}
          </Button>

          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition-colors ${viewMode === 'kanban' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}
            >
              <LayoutGrid className="w-4 h-4" /> Kanban
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}
            >
              <ListIcon className="w-4 h-4" /> Lista
            </button>
          </div>

          <Button onClick={() => setImportModalOpen(true)} variant="outline" size="sm" className="gap-2">
            <Upload className="w-4 h-4" /> Importar XLSX
          </Button>
          <Button onClick={() => setNewLeadModalOpen(true)} size="sm" className="gap-2">
            <Plus className="w-4 h-4" /> Novo Lead
          </Button>
        </div>
      </div>

      {/* Main Kanban Board / List */}
      <div className="flex-1 overflow-x-auto p-6">
        {viewMode === 'kanban' ? (
          <div className="flex items-start gap-6 h-full min-w-max pb-4">
            {stages.map(stage => {
              const stageLeads = filteredLeads.filter(l => l.stageId === stage.id);
              const stageTotal = stageLeads.reduce((acc, l) => acc + leadValue(l, stage), 0);
              const limit = columnLimit[stage.id] || COLUMN_PAGE;
              const visibleLeads = stageLeads.slice(0, limit);

              return (
                <div
                  key={stage.id}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverStageId(stage.id);
                  }}
                  onDragLeave={() => {
                    if (dragOverStageId === stage.id) setDragOverStageId(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggedLeadId) dropLeadOnStage(draggedLeadId, stage);
                    setDraggedLeadId(null);
                    setDragOverStageId(null);
                  }}
                  className={cn(
                    "w-80 rounded-2xl border flex flex-col max-h-full shadow-sm transition-all",
                    dragOverStageId === stage.id
                      ? "bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/30"
                      : "bg-slate-100 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800"
                  )}
                >
                  {/* Column Header */}
                  <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.cor }} />
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">{stage.nome}</h3>
                      <span className="px-2 py-0.5 text-xs bg-slate-200 dark:bg-slate-800 rounded-full font-semibold text-slate-600 dark:text-slate-400">
                        {stageLeads.length}
                      </span>
                    </div>
                    <div className="text-right leading-tight">
                      <span className={cn('block text-xs font-bold', stage.tipo === 'ganho' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500')}>
                        {formatCurrency(stageTotal)}
                      </span>
                      <span className="block text-[10px] text-slate-400">{stage.tipo === 'ganho' ? 'fechado' : 'negociado'}</span>
                    </div>
                  </div>

                  {/* Cards Container */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    {stage.tipo === 'entrada' && (
                      <div className="bg-indigo-50 dark:bg-indigo-950/40 p-3 rounded-xl border border-indigo-200 dark:border-indigo-900 text-xs text-indigo-700 dark:text-indigo-300 mb-2">
                        <p className="font-semibold">Leads de Entrada</p>
                        <p className="text-[11px] opacity-80">Novos contatos aguardando triagem e qualificação.</p>
                      </div>
                    )}

                    {visibleLeads.map(lead => {
                      const contact = lead.contactIds.map(id => contactsById.get(id)).find(Boolean);
                      const responsable = usersById.get(lead.responsavelId);
                      const selected = selectedIds.has(lead.id);

                      return (
                        <div
                          key={lead.id}
                          draggable={!selectMode}
                          onDragStart={(e) => {
                            e.stopPropagation();
                            setDraggedLeadId(lead.id);
                          }}
                          onDragEnd={() => {
                            setDraggedLeadId(null);
                            setDragOverStageId(null);
                          }}
                          onClick={() => (selectMode ? toggleSelected(lead.id) : openLead(lead))}
                          className={cn(
                            "bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-indigo-500/50 transition-all group relative",
                            selectMode ? "cursor-pointer" : "cursor-grab active:cursor-grabbing",
                            selected && "border-indigo-500 ring-2 ring-indigo-500/30",
                            draggedLeadId === lead.id && "opacity-50 border-dashed border-indigo-500"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-start gap-2 min-w-0">
                              {selectMode && (
                                selected
                                  ? <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                                  : <Square className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                              )}
                              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                                {lead.nome}
                              </h4>
                            </div>
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                              {formatCurrency(leadValue(lead, stage))}
                            </span>
                          </div>

                          {contact && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              <span className="truncate">{contact.nome}</span>
                            </p>
                          )}

                          {lead.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-3">
                              {resolveLeadTags(lead, tags).map(t => (
                                <TagChip key={t.key} nome={t.nome} cor={t.cor} small />
                              ))}
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400">
                            <div className="flex items-center gap-2">
                              {responsable && (
                                <Avatar src={responsable.avatar} name={responsable.nome} size="sm" />
                              )}
                              <span>{new Date(lead.ultimaInteracaoAt).toLocaleDateString('pt-BR')}</span>
                            </div>

                            {/* Excluir e abrir */}
                            <div className="flex items-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                title="Excluir lead"
                                aria-label={`Excluir o lead ${lead.nome}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (window.confirm(`Excluir o lead "${lead.nome}"?\n\nO lead sai do funil. O contato e as conversas continuam salvos.`)) {
                                    deleteLead(lead.id);
                                    addToast('Lead excluído', `"${lead.nome}" foi removido do funil.`, 'success');
                                  }
                                }}
                                className="p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              <span className="text-[10px] text-indigo-600 font-medium">Abrir</span>
                              <ArrowRight className="w-3.5 h-3.5 text-indigo-600" />
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {stageLeads.length > visibleLeads.length && (
                      <button
                        type="button"
                        onClick={() => setColumnLimit(prev => ({ ...prev, [stage.id]: limit + COLUMN_PAGE }))}
                        className="w-full py-2 text-xs font-medium text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg"
                      >
                        Mostrar mais {Math.min(COLUMN_PAGE, stageLeads.length - visibleLeads.length)} de {stageLeads.length - visibleLeads.length}
                      </button>
                    )}

                    {stageLeads.length === 0 && (
                      <div className="text-center py-8 text-slate-400 text-xs">
                        {activeFilters > 0 || searchQuery ? 'Nenhum lead com esses filtros.' : 'Nenhum lead nesta etapa.'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* List View */
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase">
                <tr>
                  <th className="p-4">Nome do Lead</th>
                  <th className="p-4">Valor</th>
                  <th className="p-4">Etiquetas</th>
                  <th className="p-4">Etapa</th>
                  <th className="p-4">Contato Principal</th>
                  <th className="p-4">Responsável</th>
                  <th className="p-4">Última Interação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredLeads.map(lead => {
                  const contact = lead.contactIds.map(id => contactsById.get(id)).find(Boolean);
                  const stage = stageById.get(lead.stageId);
                  const responsable = usersById.get(lead.responsavelId);

                  return (
                    <tr 
                      key={lead.id}
                      onClick={() => (selectMode ? toggleSelected(lead.id) : openLead(lead))}
                      className={cn('hover:bg-slate-50 dark:hover:bg-slate-800/55 cursor-pointer transition-colors', selectedIds.has(lead.id) && 'bg-indigo-50 dark:bg-indigo-950/40')}
                    >
                      <td className="p-4 font-semibold text-slate-900 dark:text-slate-100">
                        <span className="flex items-center gap-2">
                          {selectMode && (selectedIds.has(lead.id)
                            ? <CheckSquare className="w-4 h-4 text-indigo-600" />
                            : <Square className="w-4 h-4 text-slate-400" />)}
                          {lead.nome}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-emerald-600">{formatCurrency(leadValue(lead, stage))}</td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {resolveLeadTags(lead, tags).map(t => <TagChip key={t.key} nome={t.nome} cor={t.cor} small />)}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: `${stage?.cor}20`, color: stage?.cor }}>
                          {stage?.nome}
                        </span>
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-300">{contact?.nome || '-'}</td>
                      <td className="p-4 text-slate-600 dark:text-slate-300 flex items-center gap-2">
                        {responsable && <Avatar src={responsable.avatar} name={responsable.nome} size="sm" />}
                        <span>{responsable?.nome}</span>
                      </td>
                      <td className="p-4 text-slate-400">{new Date(lead.ultimaInteracaoAt).toLocaleDateString('pt-BR')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Lead Modal */}
      <Modal isOpen={newLeadModalOpen} onClose={() => setNewLeadModalOpen(false)} title="Criar Novo Lead">
        <form onSubmit={handleCreateLead} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Nome do Lead / Projeto *</label>
            <input
              type="text"
              required
              placeholder="Ex: Contrato de Implantação SaaS"
              value={newLeadName}
              onChange={(e) => setNewLeadName(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Valor Estimado (R$)</label>
            <input
              type="number"
              value={newLeadValue}
              onChange={(e) => setNewLeadValue(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Contato Principal</label>
            <select
              value={newLeadContactId}
              onChange={(e) => setNewLeadContactId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 outline-none"
            >
              {contacts.map(c => (
                <option key={c.id} value={c.id}>{c.nome} ({c.telefones[0]})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Origem do Lead</label>
            <select
              value={newLeadSourceId}
              onChange={(e) => setNewLeadSourceId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 outline-none"
            >
              {sources.map(s => (
                <option key={s.id} value={s.id}>{s.nome}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setNewLeadModalOpen(false)}>Cancelar</Button>
            <Button type="submit">Salvar Lead</Button>
          </div>
        </form>
      </Modal>

      {/* Barra de ações em massa */}
      {selectMode && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-2xl px-4 py-3 flex items-center gap-3 flex-wrap">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
            {selectedIds.size} {selectedIds.size === 1 ? 'selecionado' : 'selecionados'}
          </span>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set(filteredLeads.map(l => l.id)))}
            className="text-xs text-indigo-600 hover:underline"
          >
            Selecionar os {filteredLeads.length} filtrados
          </button>
          <div className="relative">
            <Button size="sm" variant="outline" className="gap-1.5" disabled={selectedIds.size === 0} onClick={() => setBulkTagMenu(m => (m === 'add' ? null : 'add'))}>
              <TagIcon className="w-3.5 h-3.5" /> Aplicar etiqueta
            </Button>
            {bulkTagMenu === 'add' && (
              <div className="absolute bottom-full mb-2 left-0">
                <TagMenu
                  title="Aplicar aos selecionados"
                  tags={tags}
                  selected={[]}
                  onCreate={(nome) => addTag(nome, '#6366F1')}
                  onToggle={(tagId) => {
                    bulkAddTag([...selectedIds], tagId);
                    addToast('Etiqueta aplicada', `${selectedIds.size} leads atualizados.`, 'success');
                    setBulkTagMenu(null);
                  }}
                  onClose={() => setBulkTagMenu(null)}
                />
              </div>
            )}
          </div>
          <div className="relative">
            <Button size="sm" variant="outline" className="gap-1.5" disabled={selectedIds.size === 0} onClick={() => setBulkTagMenu(m => (m === 'remove' ? null : 'remove'))}>
              <TagIcon className="w-3.5 h-3.5" /> Remover etiqueta
            </Button>
            {bulkTagMenu === 'remove' && (
              <div className="absolute bottom-full mb-2 left-0">
                <TagMenu
                  title="Remover dos selecionados"
                  tags={tags}
                  selected={[]}
                  onToggle={(tagId) => {
                    bulkRemoveTag([...selectedIds], tagId);
                    addToast('Etiqueta removida', `${selectedIds.size} leads atualizados.`, 'success');
                    setBulkTagMenu(null);
                  }}
                  onClose={() => setBulkTagMenu(null)}
                />
              </div>
            )}
          </div>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-red-600 hover:text-red-700"
            disabled={selectedIds.size === 0}
            onClick={() => {
              if (window.confirm(`Excluir ${selectedIds.size} leads?\n\nOs leads saem do funil. Contatos e conversas continuam salvos.`)) {
                bulkDeleteLeads([...selectedIds]);
                addToast('Leads excluídos', `${selectedIds.size} leads removidos do funil.`, 'success');
                exitSelectMode();
              }
            }}
          >
            <Trash2 className="w-3.5 h-3.5" /> Excluir
          </Button>
          <button type="button" onClick={exitSelectMode} aria-label="Fechar seleção" className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <LeadFiltersPanel
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        filter={filter}
        onChange={setFilter}
        leads={pipelineLeads}
        stages={stages}
        users={users}
        tags={tags}
        resultCount={filteredLeads.length}
        savedFilters={savedFilters}
        onSave={(nome) => { saveLeadFilter(nome, filter); addToast('Filtro salvo', nome, 'success'); }}
        onDeleteSaved={(id) => deleteLeadFilter(id)}
      />

      <WonValueModal
        lead={wonTarget?.lead || null}
        stageName={wonTarget?.stage.nome || ''}
        onCancel={() => setWonTarget(null)}
        onConfirm={(valorFechado) => {
          if (!wonTarget) return;
          winLead(wonTarget.lead.id, wonTarget.stage.id, valorFechado);
          addToast('Venda ganha', `${wonTarget.lead.nome}: ${formatCurrency(valorFechado)}`, 'success');
          setWonTarget(null);
        }}
      />

      <ImportLeadsModal 
        isOpen={importModalOpen} 
        onClose={() => setImportModalOpen(false)} 
        pipelineId={activePipelineId} 
        stageId={stages.find(s => s.tipo === 'entrada')?.id || stages[0]?.id || ''} 
      />
    </div>
  );
};
