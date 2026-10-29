import React, { useEffect, useRef, useState } from 'react';
import { Check, Plus, Tag as TagIcon, X } from 'lucide-react';
import { Tag } from '../../types';

export const TAG_COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#DC2626', '#EA580C', '#F59E0B', '#16A34A', '#0EA5E9', '#2563EB', '#64748B'];

export const TagChip: React.FC<{ nome: string; cor?: string; onRemove?: () => void; small?: boolean }> = ({ nome, cor, onRemove, small }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full font-medium border ${small ? 'px-1.5 py-0 text-[10px]' : 'px-2 py-0.5 text-[11px]'}`}
    style={cor
      ? { backgroundColor: `${cor}1A`, color: cor, borderColor: `${cor}55` }
      : { backgroundColor: 'rgba(100,116,139,0.1)', color: '#64748B', borderColor: 'rgba(100,116,139,0.3)' }}
  >
    {nome}
    {onRemove && (
      <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(); }} aria-label={`Remover etiqueta ${nome}`} className="hover:opacity-70">
        <X className="w-3 h-3" />
      </button>
    )}
  </span>
);

interface TagMenuProps {
  tags: Tag[];
  selected: string[];
  onToggle: (tagId: string) => void;
  onCreate?: (nome: string) => Tag;
  onClose: () => void;
  title?: string;
}

// Lista de etiquetas com busca; dá para criar uma nova digitando o nome
export const TagMenu: React.FC<TagMenuProps> = ({ tags, selected, onToggle, onCreate, onClose, title }) => {
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [onClose]);

  const q = query.trim().toLowerCase();
  const visible = tags.filter(t => !q || t.nome.toLowerCase().includes(q));
  const exact = tags.some(t => t.nome.toLowerCase() === q);

  const create = () => {
    if (!onCreate || !query.trim() || exact) return;
    const tag = onCreate(query.trim());
    onToggle(tag.id);
    setQuery('');
  };

  return (
    <div ref={ref} onClick={(e) => e.stopPropagation()} className="absolute z-50 mt-1 w-64 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-2">
      {title && <p className="px-2 pt-1 pb-2 text-[11px] font-semibold text-slate-500">{title}</p>}
      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); create(); } }}
        placeholder={onCreate ? 'Buscar ou criar etiqueta…' : 'Buscar etiqueta…'}
        className="w-full mb-2 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
      />
      <div className="max-h-56 overflow-y-auto space-y-0.5">
        {visible.map(t => {
          const on = selected.includes(t.id);
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onToggle(t.id)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-left hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: t.cor }} />
              <span className="flex-1 truncate text-slate-800 dark:text-slate-200">{t.nome}</span>
              {on && <Check className="w-3.5 h-3.5 text-indigo-600" />}
            </button>
          );
        })}
        {visible.length === 0 && !onCreate && <p className="px-2 py-2 text-[11px] text-slate-400">Nenhuma etiqueta encontrada.</p>}
        {onCreate && query.trim() && !exact && (
          <button type="button" onClick={create} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40">
            <Plus className="w-3.5 h-3.5" /> Criar “{query.trim()}”
          </button>
        )}
      </div>
    </div>
  );
};

interface TagPickerProps {
  tags: Tag[];
  value: string[];
  onChange: (ids: string[]) => void;
  onCreate: (nome: string) => Tag;
}

// Etiquetas do lead: mostra as aplicadas e um botão para adicionar
export const TagPicker: React.FC<TagPickerProps> = ({ tags, value, onChange, onCreate }) => {
  const [open, setOpen] = useState(false);
  const resolved = value.map(v => tags.find(t => t.id === v) || tags.find(t => t.nome.toLowerCase() === v.toLowerCase()) || { id: v, nome: v, cor: '' });
  const selectedIds = resolved.map(t => t.id);

  const toggle = (tagId: string) => {
    if (selectedIds.includes(tagId)) {
      onChange(value.filter((v, i) => resolved[i].id !== tagId));
    } else {
      onChange([...value, tagId]);
    }
  };

  return (
    <div className="relative flex flex-wrap items-center gap-1.5">
      {resolved.map((t, i) => (
        <TagChip key={`${t.id}-${i}`} nome={t.nome} cor={t.cor || undefined} onRemove={() => onChange(value.filter((_, j) => j !== i))} />
      ))}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-dashed border-slate-300 dark:border-slate-600 text-[11px] text-slate-500 hover:border-indigo-500 hover:text-indigo-600"
      >
        <TagIcon className="w-3 h-3" /> Etiqueta
      </button>
      {open && (
        <div className="absolute left-0 top-full">
          <TagMenu tags={tags} selected={selectedIds} onToggle={toggle} onCreate={onCreate} onClose={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
};
