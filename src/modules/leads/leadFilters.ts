import { Contact, Lead, LeadFilterState, Tag, Task } from '../../types';

export const EMPTY_LEAD_FILTER: LeadFilterState = {
  etapas: [],
  responsaveis: [],
  etiquetas: [],
  segmentos: [],
  faturamentos: [],
  cacau: [],
  campanhas: [],
  anuncios: [],
  entradaDe: '',
  entradaAte: '',
  tarefas: '',
};

export const SEM_RESPONSAVEL = '__sem_responsavel__';

export function countActiveFilters(f: LeadFilterState): number {
  return [
    f.etapas, f.responsaveis, f.etiquetas, f.segmentos, f.faturamentos, f.cacau, f.campanhas, f.anuncios,
  ].filter(list => list.length > 0).length
    + (f.entradaDe || f.entradaAte ? 1 : 0)
    + (f.tarefas ? 1 : 0);
}

// Data de entrada do lead: a da planilha, ou a de criação no CRM
export function leadEntryDate(lead: Lead): string {
  return lead.rastreamento?.dataEntrada || lead.createdAt;
}

// Etiqueta aplicada no lead (aceita o id da etiqueta ou o nome, para leads antigos)
export function leadHasTag(lead: Lead, tag: Tag | undefined, tagId: string): boolean {
  return lead.tags.some(v => v === tagId || (!!tag && v.toLowerCase() === tag.nome.toLowerCase()));
}

export function resolveLeadTags(lead: Lead, tags: Tag[]): Array<{ key: string; nome: string; cor?: string }> {
  return lead.tags.map(v => {
    const tag = tags.find(t => t.id === v) || tags.find(t => t.nome.toLowerCase() === v.toLowerCase());
    return tag ? { key: tag.id, nome: tag.nome, cor: tag.cor } : { key: v, nome: v };
  });
}

function taskLeadId(t: Task): string | undefined {
  const anyTask = t as any;
  if (anyTask.leadId) return anyTask.leadId;
  return t.entidadeTipo === 'lead' ? t.entidadeId : undefined;
}

function taskIsOpen(t: Task): boolean {
  if (t.status) return t.status === 'pendente' || t.status === 'em_andamento';
  return !(t as any).concluida;
}

// Leads com tarefa aberta e leads com tarefa atrasada
export function buildTaskIndex(tasks: Task[]) {
  const open = new Set<string>();
  const overdue = new Set<string>();
  const now = Date.now();
  for (const t of tasks) {
    const leadId = taskLeadId(t);
    if (!leadId || !taskIsOpen(t)) continue;
    open.add(leadId);
    const prazo = new Date(t.prazo).getTime();
    if (!Number.isNaN(prazo) && prazo < now) overdue.add(leadId);
  }
  return { open, overdue };
}

const onlyDigits = (v: string) => v.replace(/\D/g, '');

// Busca por nome do lead, nome do contato, telefone ou e-mail
export function matchesLeadSearch(lead: Lead, contactsById: Map<string, Contact>, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (lead.nome.toLowerCase().includes(q)) return true;
  const qDigits = onlyDigits(q);
  for (const id of lead.contactIds) {
    const c = contactsById.get(id);
    if (!c) continue;
    if (c.nome?.toLowerCase().includes(q)) return true;
    if ((c.emails || []).some(e => e.toLowerCase().includes(q))) return true;
    if (qDigits.length >= 4 && (c.telefones || []).some(t => onlyDigits(t).includes(qDigits))) return true;
  }
  return false;
}

export function applyLeadFilters(
  leads: Lead[],
  f: LeadFilterState,
  ctx: { tags: Tag[]; taskIndex: ReturnType<typeof buildTaskIndex> }
): Lead[] {
  const de = f.entradaDe ? new Date(`${f.entradaDe}T00:00:00`).getTime() : null;
  const ate = f.entradaAte ? new Date(`${f.entradaAte}T23:59:59.999`).getTime() : null;
  const tagById = new Map(ctx.tags.map(t => [t.id, t]));

  return leads.filter(l => {
    if (f.etapas.length && !f.etapas.includes(l.stageId)) return false;
    if (f.responsaveis.length) {
      const resp = l.responsavelId || SEM_RESPONSAVEL;
      if (!f.responsaveis.includes(resp)) return false;
    }
    if (f.etiquetas.length && !f.etiquetas.some(id => leadHasTag(l, tagById.get(id), id))) return false;
    const q = l.qualificacao || {};
    const r = l.rastreamento || {};
    if (f.segmentos.length && !f.segmentos.includes(q.segmento || '')) return false;
    if (f.faturamentos.length && !f.faturamentos.includes(q.faturamento || '')) return false;
    if (f.cacau.length && !f.cacau.includes(q.jaTrabalhouCacau || '')) return false;
    if (f.campanhas.length && !f.campanhas.includes(r.campanha || '')) return false;
    if (f.anuncios.length && !f.anuncios.includes(r.anuncio || '')) return false;
    if (de !== null || ate !== null) {
      const t = new Date(leadEntryDate(l)).getTime();
      if (Number.isNaN(t)) return false;
      if (de !== null && t < de) return false;
      if (ate !== null && t > ate) return false;
    }
    if (f.tarefas === 'sem_tarefa' && ctx.taskIndex.open.has(l.id)) return false;
    if (f.tarefas === 'atrasada' && !ctx.taskIndex.overdue.has(l.id)) return false;
    return true;
  });
}

// Valores existentes nos leads, com a quantidade de cada um (para montar as opções do filtro)
export function filterOptions(leads: Lead[]) {
  const count = (pick: (l: Lead) => string | null | undefined) => {
    const m = new Map<string, number>();
    for (const l of leads) {
      const v = pick(l);
      if (v) m.set(v, (m.get(v) || 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([value, total]) => ({ value, total }));
  };
  return {
    segmentos: count(l => l.qualificacao?.segmento),
    faturamentos: count(l => l.qualificacao?.faturamento),
    cacau: count(l => l.qualificacao?.jaTrabalhouCacau),
    campanhas: count(l => l.rastreamento?.campanha),
    anuncios: count(l => l.rastreamento?.anuncio),
  };
}

// Soma dos produtos do lead (desconto em %)
export function leadProductsTotal(lead: Lead): number {
  return (lead.produtos || []).reduce((acc, p) => acc + p.quantidade * p.precoUnitario * (1 - (p.desconto || 0) / 100), 0);
}

export function toDateInput(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
