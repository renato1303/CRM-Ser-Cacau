import React, { useMemo, useState } from 'react';
import { Plus, Trash2, Tag as TagIcon } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Button } from '../../components/ui/Button';
import { confirmDialog } from '../../components/ui/ConfirmDialog';
import { TAG_COLORS, TagChip } from '../leads/TagPicker';

// Configurações > Etiquetas: criar, renomear, trocar a cor e excluir
export const TagsSettings: React.FC = () => {
  const { tags, leads, addTag, updateTag, deleteTag, addToast } = useStore();
  const [novoNome, setNovoNome] = useState('');
  const [novaCor, setNovaCor] = useState(TAG_COLORS[0]);
  const [editId, setEditId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState('');
  const [colorFor, setColorFor] = useState<string | null>(null);

  // Quantos leads usam cada etiqueta (pelo id ou, nos leads antigos, pelo nome)
  const usage = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of tags) {
      const nome = t.nome.toLowerCase();
      m.set(t.id, leads.filter(l => l.tags.some(v => v === t.id || v.toLowerCase() === nome)).length);
    }
    return m;
  }, [tags, leads]);

  const nomeExiste = (nome: string, ignoreId?: string) =>
    tags.some(t => t.id !== ignoreId && t.nome.trim().toLowerCase() === nome.trim().toLowerCase());

  const criar = (e: React.FormEvent) => {
    e.preventDefault();
    const nome = novoNome.trim();
    if (!nome) return;
    if (nomeExiste(nome)) { addToast('Etiqueta já existe', nome, 'error'); return; }
    addTag(nome, novaCor);
    setNovoNome('');
    addToast('Etiqueta criada', nome, 'success');
  };

  const salvarNome = (id: string) => {
    const nome = editNome.trim();
    if (nome && !nomeExiste(nome, id)) updateTag(id, { nome });
    else if (nome) addToast('Etiqueta já existe', nome, 'error');
    setEditId(null);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 flex flex-col flex-1">
      <div className="mb-6">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Etiquetas</h3>
        <p className="text-xs text-slate-500">
          Use etiquetas para marcar leads (ex.: "Cliente quente", "Pediu catálogo"). Elas aparecem nos cards e nos filtros do funil.
        </p>
      </div>

      <form onSubmit={criar} className="flex flex-wrap items-center gap-2 mb-6 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
        <input
          value={novoNome}
          onChange={(e) => setNovoNome(e.target.value)}
          placeholder="Nome da nova etiqueta"
          className="flex-1 min-w-[180px] px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
        />
        <div className="flex items-center gap-1">
          {TAG_COLORS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setNovaCor(c)}
              aria-label={`Cor ${c}`}
              className={`w-5 h-5 rounded-full border-2 ${novaCor === c ? 'border-slate-900 dark:border-white' : 'border-transparent'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <Button type="submit" size="sm" className="gap-1.5" disabled={!novoNome.trim()}>
          <Plus className="w-4 h-4" /> Criar
        </Button>
      </form>

      {tags.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-12 text-slate-400">
          <TagIcon className="w-8 h-8 mb-2" />
          <p className="text-sm">Nenhuma etiqueta ainda.</p>
          <p className="text-xs">Crie a primeira acima.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {[...tags].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')).map(t => {
            const total = usage.get(t.id) || 0;
            return (
              <div key={t.id} className="py-3 flex items-center gap-3">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setColorFor(colorFor === t.id ? null : t.id)}
                    aria-label="Trocar cor"
                    className="w-6 h-6 rounded-full border border-slate-200 dark:border-slate-700"
                    style={{ backgroundColor: t.cor }}
                  />
                  {colorFor === t.id && (
                    <div className="absolute z-20 top-8 left-0 p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl flex gap-1">
                      {TAG_COLORS.map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => { updateTag(t.id, { cor: c }); setColorFor(null); }}
                          aria-label={`Cor ${c}`}
                          className="w-5 h-5 rounded-full"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  {editId === t.id ? (
                    <input
                      autoFocus
                      value={editNome}
                      onChange={(e) => setEditNome(e.target.value)}
                      onBlur={() => salvarNome(t.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter') salvarNome(t.id); if (e.key === 'Escape') setEditId(null); }}
                      className="w-full max-w-xs px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-indigo-400 rounded-md text-slate-900 dark:text-slate-100 outline-none"
                    />
                  ) : (
                    <button type="button" onClick={() => { setEditId(t.id); setEditNome(t.nome); }} title="Clique para renomear">
                      <TagChip nome={t.nome} cor={t.cor} />
                    </button>
                  )}
                </div>

                <span className="text-xs text-slate-500 w-24 text-right">{total} {total === 1 ? 'lead' : 'leads'}</span>

                <button
                  type="button"
                  onClick={async () => {
                    const ok = await confirmDialog({
                      title: `Excluir a etiqueta "${t.nome}"?`,
                      message: total > 0 ? `Ela será removida de ${total} ${total === 1 ? 'lead' : 'leads'}.` : undefined,
                    });
                    if (ok) {
                      deleteTag(t.id);
                      addToast('Etiqueta excluída', t.nome, 'success');
                    }
                  }}
                  aria-label={`Excluir etiqueta ${t.nome}`}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
