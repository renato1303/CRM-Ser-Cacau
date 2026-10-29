import React, { useMemo, useState } from 'react';
import { Bookmark, Trash2, X } from 'lucide-react';
import { Lead, LeadFilterState, SavedLeadFilter, Stage, Tag, User } from '../../types';
import { Button } from '../../components/ui/Button';
import { EMPTY_LEAD_FILTER, SEM_RESPONSAVEL, countActiveFilters, filterOptions, toDateInput } from './leadFilters';

interface Props {
  open: boolean;
  onClose: () => void;
  filter: LeadFilterState;
  onChange: (f: LeadFilterState) => void;
  leads: Lead[]; // leads do funil (antes dos filtros), para montar as opções
  stages: Stage[];
  users: User[];
  tags: Tag[];
  resultCount: number;
  savedFilters: SavedLeadFilter[];
  onSave: (nome: string) => void;
  onDeleteSaved: (id: string) => void;
}

type ListKey = 'etapas' | 'responsaveis' | 'etiquetas' | 'segmentos' | 'faturamentos' | 'cacau' | 'campanhas' | 'anuncios';

const Chip: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode; color?: string }> = ({ active, onClick, children, color }) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] border transition-colors ${
      active
        ? 'bg-indigo-600 border-indigo-600 text-white'
        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-400'
    }`}
  >
    {color && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />}
    {children}
  </button>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="space-y-2">
    <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{title}</h4>
    <div className="flex flex-wrap gap-1.5">{children}</div>
  </div>
);

export const LeadFiltersPanel: React.FC<Props> = ({
  open, onClose, filter, onChange, leads, stages, users, tags, resultCount, savedFilters, onSave, onDeleteSaved,
}) => {
  const [saveName, setSaveName] = useState('');
  const options = useMemo(() => filterOptions(leads), [leads]);
  if (!open) return null;

  const toggle = (key: ListKey, value: string) => {
    const list = filter[key];
    onChange({ ...filter, [key]: list.includes(value) ? list.filter(v => v !== value) : [...list, value] });
  };

  const setPeriod = (days: number | 'mes') => {
    const now = new Date();
    const start = days === 'mes' ? new Date(now.getFullYear(), now.getMonth(), 1) : new Date(now.getTime() - days * 86400000);
    onChange({ ...filter, entradaDe: toDateInput(start), entradaAte: toDateInput(now) });
  };

  const active = countActiveFilters(filter);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-950/40" onClick={onClose} />
      <aside className="relative w-full max-w-md h-full bg-slate-50 dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Filtros</h3>
            <p className="text-[11px] text-slate-500">{active} {active === 1 ? 'filtro ativo' : 'filtros ativos'} · {resultCount} leads</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar filtros" className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {savedFilters.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Filtros salvos</h4>
              <div className="space-y-1.5">
                {savedFilters.map(sf => (
                  <div key={sf.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <button type="button" onClick={() => onChange({ ...EMPTY_LEAD_FILTER, ...sf.filtro })} className="flex-1 flex items-center gap-2 text-left text-xs text-slate-800 dark:text-slate-200 hover:text-indigo-600">
                      <Bookmark className="w-3.5 h-3.5 text-indigo-500" /> {sf.nome}
                    </button>
                    <button
                      type="button"
                      onClick={() => { if (window.confirm(`Excluir o filtro salvo "${sf.nome}"?`)) onDeleteSaved(sf.id); }}
                      aria-label={`Excluir filtro ${sf.nome}`}
                      className="p-1 rounded text-slate-400 hover:text-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Section title="Etapa">
            {stages.map(st => (
              <Chip key={st.id} active={filter.etapas.includes(st.id)} onClick={() => toggle('etapas', st.id)} color={st.cor}>{st.nome}</Chip>
            ))}
          </Section>

          <Section title="Responsável">
            {users.map(u => (
              <Chip key={u.id} active={filter.responsaveis.includes(u.id)} onClick={() => toggle('responsaveis', u.id)}>{u.nome}</Chip>
            ))}
            <Chip active={filter.responsaveis.includes(SEM_RESPONSAVEL)} onClick={() => toggle('responsaveis', SEM_RESPONSAVEL)}>Sem responsável</Chip>
          </Section>

          <Section title="Etiquetas">
            {tags.length === 0 && <p className="text-[11px] text-slate-400">Nenhuma etiqueta criada ainda (Configurações &gt; Etiquetas).</p>}
            {tags.map(t => (
              <Chip key={t.id} active={filter.etiquetas.includes(t.id)} onClick={() => toggle('etiquetas', t.id)} color={t.cor}>{t.nome}</Chip>
            ))}
          </Section>

          <Section title="Tarefas">
            <Chip active={filter.tarefas === ''} onClick={() => onChange({ ...filter, tarefas: '' })}>Todas</Chip>
            <Chip active={filter.tarefas === 'sem_tarefa'} onClick={() => onChange({ ...filter, tarefas: 'sem_tarefa' })}>Sem tarefa aberta</Chip>
            <Chip active={filter.tarefas === 'atrasada'} onClick={() => onChange({ ...filter, tarefas: 'atrasada' })}>Com tarefa atrasada</Chip>
          </Section>

          <div className="space-y-2">
            <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Período de entrada</h4>
            <div className="flex flex-wrap gap-1.5">
              <Chip active={false} onClick={() => setPeriod(7)}>Últimos 7 dias</Chip>
              <Chip active={false} onClick={() => setPeriod(30)}>Últimos 30 dias</Chip>
              <Chip active={false} onClick={() => setPeriod('mes')}>Este mês</Chip>
              {(filter.entradaDe || filter.entradaAte) && (
                <Chip active={false} onClick={() => onChange({ ...filter, entradaDe: '', entradaAte: '' })}>Limpar período</Chip>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[11px] text-slate-500 space-y-1">
                <span>De</span>
                <input type="date" value={filter.entradaDe} onChange={(e) => onChange({ ...filter, entradaDe: e.target.value })}
                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" />
              </label>
              <label className="text-[11px] text-slate-500 space-y-1">
                <span>Até</span>
                <input type="date" value={filter.entradaAte} onChange={(e) => onChange({ ...filter, entradaAte: e.target.value })}
                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" />
              </label>
            </div>
          </div>

          {options.segmentos.length > 0 && (
            <Section title="Segmento">
              {options.segmentos.map(o => (
                <Chip key={o.value} active={filter.segmentos.includes(o.value)} onClick={() => toggle('segmentos', o.value)}>{o.value} <span className="opacity-60">{o.total}</span></Chip>
              ))}
            </Section>
          )}

          {options.faturamentos.length > 0 && (
            <Section title="Faturamento">
              {options.faturamentos.map(o => (
                <Chip key={o.value} active={filter.faturamentos.includes(o.value)} onClick={() => toggle('faturamentos', o.value)}>{o.value} <span className="opacity-60">{o.total}</span></Chip>
              ))}
            </Section>
          )}

          {options.cacau.length > 0 && (
            <Section title="Já trabalhou com cacau?">
              {options.cacau.map(o => (
                <Chip key={o.value} active={filter.cacau.includes(o.value)} onClick={() => toggle('cacau', o.value)}>{o.value} <span className="opacity-60">{o.total}</span></Chip>
              ))}
            </Section>
          )}

          {options.campanhas.length > 0 && (
            <Section title="Campanha">
              {options.campanhas.map(o => (
                <Chip key={o.value} active={filter.campanhas.includes(o.value)} onClick={() => toggle('campanhas', o.value)}>{o.value} <span className="opacity-60">{o.total}</span></Chip>
              ))}
            </Section>
          )}

          {options.anuncios.length > 0 && (
            <Section title="Anúncio">
              {options.anuncios.map(o => (
                <Chip key={o.value} active={filter.anuncios.includes(o.value)} onClick={() => toggle('anuncios', o.value)}>{o.value} <span className="opacity-60">{o.total}</span></Chip>
              ))}
            </Section>
          )}
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
          {active > 0 && (
            <form
              onSubmit={(e) => { e.preventDefault(); if (saveName.trim()) { onSave(saveName.trim()); setSaveName(''); } }}
              className="flex gap-2"
            >
              <input
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="Nome para salvar este filtro"
                className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
              />
              <Button type="submit" size="sm" variant="outline" disabled={!saveName.trim()}>Salvar</Button>
            </form>
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onChange(EMPTY_LEAD_FILTER)} disabled={active === 0}>Limpar filtros</Button>
            <Button type="button" className="flex-1" onClick={onClose}>Ver {resultCount} leads</Button>
          </div>
        </div>
      </aside>
    </div>
  );
};
