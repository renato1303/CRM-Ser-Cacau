import React, { useState } from 'react';
import { 
  Plus, Search, Filter, LayoutGrid, List as ListIcon, Settings, 
  ChevronRight, Phone, MessageSquare, DollarSign, User, AlertCircle, CheckCircle2, Trash2, ArrowRight, Upload
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { formatCurrency, cn } from '../../utils/cn';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { Lead } from '../../types';
import { ImportLeadsModal } from './ImportLeadsModal';

export const LeadsPage: React.FC = () => {
  const { 
    leads, pipelines, tags, sources, users, contacts, 
    moveLeadStage, addLead, deleteLead, setActiveModule, lossReasons, addToast 
  } = useStore();
  
  const [activePipelineId, setActivePipelineId] = useState(pipelines[0]?.id || 'pipe-vendas');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
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

  const filteredLeads = leads.filter(l => {
    const matchesPipeline = l.pipelineId === activePipelineId;
    const matchesSearch = l.nome.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = selectedTag === 'all' || l.tags.includes(selectedTag);
    return matchesPipeline && matchesSearch && matchesTag;
  });

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
      tags: ['quente'],
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
          <div className="text-xs text-slate-500 font-medium hidden sm:block">
            {filteredLeads.length} leads · <span className="font-bold text-slate-700 dark:text-slate-300">{formatCurrency(filteredLeads.reduce((a, b) => a + b.valor, 0))}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 outline-none w-48 focus:w-64 transition-all"
            />
          </div>

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
              const stageTotal = stageLeads.reduce((acc, l) => acc + l.valor, 0);

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
                    if (draggedLeadId) {
                      moveLeadStage(draggedLeadId, stage.id);
                      addToast('Lead Movido', `Lead transferido para ${stage.nome}`);
                    }
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
                    <span className="text-xs font-bold text-slate-500">{formatCurrency(stageTotal)}</span>
                  </div>

                  {/* Cards Container */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    {stage.tipo === 'entrada' && (
                      <div className="bg-indigo-50 dark:bg-indigo-950/40 p-3 rounded-xl border border-indigo-200 dark:border-indigo-900 text-xs text-indigo-700 dark:text-indigo-300 mb-2">
                        <p className="font-semibold">Leads de Entrada</p>
                        <p className="text-[11px] opacity-80">Novos contatos aguardando triagem e qualificação.</p>
                      </div>
                    )}

                    {stageLeads.map(lead => {
                      const contact = contacts.find(c => lead.contactIds.includes(c.id));
                      const responsable = users.find(u => u.id === lead.responsavelId);

                      return (
                        <div
                          key={lead.id}
                          draggable
                          onDragStart={(e) => {
                            e.stopPropagation();
                            setDraggedLeadId(lead.id);
                          }}
                          onDragEnd={() => {
                            setDraggedLeadId(null);
                            setDragOverStageId(null);
                          }}
                          onClick={() => {
                            window.location.hash = `#/leads/${lead.id}`;
                            setActiveModule(`leads/${lead.id}`);
                          }}
                          className={cn(
                            "bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-indigo-500/50 cursor-grab active:cursor-grabbing transition-all group relative",
                            draggedLeadId === lead.id && "opacity-50 border-dashed border-indigo-500"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                              {lead.nome}
                            </h4>
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                              {formatCurrency(lead.valor)}
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
                              {lead.tags.map(t => (
                                <Badge key={t} size="sm" variant="primary">{t}</Badge>
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

                            {/* Stage quick advance */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <span className="text-[10px] text-indigo-600 font-medium">Abrir</span>
                              <ArrowRight className="w-3.5 h-3.5 text-indigo-600" />
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {stageLeads.length === 0 && (
                      <div className="text-center py-8 text-slate-400 text-xs">
                        Nenhum lead nesta etapa.
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
                  <th className="p-4">Etapa</th>
                  <th className="p-4">Contato Principal</th>
                  <th className="p-4">Responsável</th>
                  <th className="p-4">Última Interação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredLeads.map(lead => {
                  const contact = contacts.find(c => lead.contactIds.includes(c.id));
                  const stage = stages.find(s => s.id === lead.stageId);
                  const responsable = users.find(u => u.id === lead.responsavelId);

                  return (
                    <tr 
                      key={lead.id}
                      onClick={() => {
                        window.location.hash = `#/leads/${lead.id}`;
                        setActiveModule(`leads/${lead.id}`);
                      }}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/55 cursor-pointer transition-colors"
                    >
                      <td className="p-4 font-semibold text-slate-900 dark:text-slate-100">{lead.nome}</td>
                      <td className="p-4 font-bold text-emerald-600">{formatCurrency(lead.valor)}</td>
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

      <ImportLeadsModal 
        isOpen={importModalOpen} 
        onClose={() => setImportModalOpen(false)} 
        pipelineId={activePipelineId} 
        stageId={stages.find(s => s.tipo === 'entrada')?.id || stages[0]?.id || ''} 
      />
    </div>
  );
};
