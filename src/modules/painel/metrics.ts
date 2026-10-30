import { Conversation, Lead, Message, Pipeline, Stage } from '../../types';

// ==========================================
// Datas no fuso de São Paulo (o time e os clientes estão no Brasil,
// mesmo que o navegador esteja em outro fuso)
// ==========================================
const TZ = 'America/Sao_Paulo';
const keyFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
const weekdayFmt = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short' });

// "2026-10-29" no fuso de São Paulo
export function dayKey(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '';
  return keyFmt.format(d);
}

export function isWeekend(iso: string): boolean {
  const w = weekdayFmt.format(new Date(iso));
  return w === 'Sat' || w === 'Sun';
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export function weekdayIndex(iso: string): number {
  return WEEKDAYS.indexOf(weekdayFmt.format(new Date(iso)));
}

export function addDays(key: string, days: number): string {
  const d = new Date(`${key}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((new Date(`${to}T12:00:00Z`).getTime() - new Date(`${from}T12:00:00Z`).getTime()) / 86400000);
}

export type PeriodId = 'hoje' | '7d' | '30d' | 'mes' | 'mes_passado' | 'personalizado';
export interface Period { from: string; to: string; }

export function resolvePeriod(id: PeriodId, custom?: Period, today = dayKey(new Date())): Period {
  switch (id) {
    case 'hoje': return { from: today, to: today };
    case '7d': return { from: addDays(today, -6), to: today };
    case '30d': return { from: addDays(today, -29), to: today };
    case 'mes': return { from: `${today.slice(0, 7)}-01`, to: today };
    case 'mes_passado': {
      const firstThis = `${today.slice(0, 7)}-01`;
      const lastPrev = addDays(firstThis, -1);
      return { from: `${lastPrev.slice(0, 7)}-01`, to: lastPrev };
    }
    case 'personalizado': {
      const from = custom?.from || today;
      const to = custom?.to || today;
      return from <= to ? { from, to } : { from: to, to: from };
    }
  }
}

// Período anterior com a mesma quantidade de dias (para comparar)
export function previousPeriod(p: Period): Period {
  const len = daysBetween(p.from, p.to) + 1;
  return { from: addDays(p.from, -len), to: addDays(p.from, -1) };
}

export const inPeriod = (iso: string | undefined | null, p: Period) => {
  if (!iso) return false;
  const k = dayKey(iso);
  return !!k && k >= p.from && k <= p.to;
};

// ==========================================
// Leads e vendas
// ==========================================
export const leadEntryDate = (l: Lead) => l.rastreamento?.dataEntrada || l.createdAt;
export const leadClosedDate = (l: Lead) => l.closedAt || l.updatedAt;

export function stageTypeIndex(pipelines: Pipeline[]) {
  const m = new Map<string, Stage>();
  pipelines.forEach(p => p.stages.forEach(s => m.set(s.id, s)));
  return m;
}

export function volumeMetrics(leads: Lead[], stages: Map<string, Stage>, p: Period) {
  const novos = leads.filter(l => inPeriod(leadEntryDate(l), p));
  const isWon = (l: Lead) => stages.get(l.stageId)?.tipo === 'ganho';
  const isLost = (l: Lead) => stages.get(l.stageId)?.tipo === 'perdido';
  const abertos = novos.filter(l => !isWon(l) && !isLost(l));
  const vendas = leads.filter(l => isWon(l) && inPeriod(leadClosedDate(l), p));
  const perdas = leads.filter(l => isLost(l) && inPeriod(leadClosedDate(l), p));
  const valorVendas = vendas.reduce((a, l) => a + (l.valorFechado ?? l.valor ?? 0), 0);
  const novosGanhos = novos.filter(isWon).length;
  return {
    novos: novos.length,
    abertos: abertos.length,
    valorNegociado: abertos.reduce((a, l) => a + (l.valor || 0), 0),
    vendas: vendas.length,
    valorVendas,
    ticketMedio: vendas.length ? valorVendas / vendas.length : 0,
    perdas: perdas.length,
    // Dos leads que entraram no período, quantos já viraram venda
    conversao: novos.length ? novosGanhos / novos.length : 0,
  };
}

export function dailySeries(leads: Lead[], stages: Map<string, Stage>, p: Period) {
  const days = daysBetween(p.from, p.to) + 1;
  const map = new Map<string, { dia: string; leads: number; vendas: number }>();
  for (let i = 0; i < days; i++) {
    const k = addDays(p.from, i);
    map.set(k, { dia: `${k.slice(8, 10)}/${k.slice(5, 7)}`, leads: 0, vendas: 0 });
  }
  for (const l of leads) {
    const e = map.get(dayKey(leadEntryDate(l)));
    if (e) e.leads++;
    if (stages.get(l.stageId)?.tipo === 'ganho') {
      const c = map.get(dayKey(leadClosedDate(l)));
      if (c) c.vendas++;
    }
  }
  return [...map.values()];
}

// ==========================================
// Atendimento (tempo corrido, 24 horas por dia)
// Uma espera começa na primeira mensagem do cliente sem resposta
// e termina na próxima mensagem enviada pela equipe (CRM ou celular).
// ==========================================
export type DayFilter = 'todos' | 'semana' | 'fim_de_semana';

export interface ResponseSample {
  conversationId: string;
  waitingSince: string; // mensagem do cliente
  answeredAt: string;   // resposta da equipe
  ms: number;
  first: boolean;       // primeira resposta da conversa
}

export function responseSamples(messages: Message[]): ResponseSample[] {
  const byConv = new Map<string, Message[]>();
  for (const m of messages) {
    if (m.direcao === 'interna') continue;
    if (!byConv.has(m.conversationId)) byConv.set(m.conversationId, []);
    byConv.get(m.conversationId)!.push(m);
  }
  const out: ResponseSample[] = [];
  for (const [conversationId, list] of byConv) {
    list.sort((a, b) => new Date(a.enviadaAt).getTime() - new Date(b.enviadaAt).getTime());
    let waiting: Message | null = null;
    let answeredBefore = false;
    for (const m of list) {
      if (m.direcao === 'entrada') {
        if (!waiting) waiting = m;
      } else if (m.direcao === 'saida' && m.autor === 'usuario' && waiting) {
        const ms = new Date(m.enviadaAt).getTime() - new Date(waiting.enviadaAt).getTime();
        if (ms >= 0) {
          out.push({ conversationId, waitingSince: waiting.enviadaAt, answeredAt: m.enviadaAt, ms, first: !answeredBefore });
          answeredBefore = true;
        }
        waiting = null;
      } else if (m.direcao === 'saida' && m.autor === 'usuario') {
        answeredBefore = true; // a equipe falou primeiro
      }
    }
  }
  return out;
}

export function matchesDayFilter(iso: string, f: DayFilter) {
  if (f === 'todos') return true;
  return f === 'fim_de_semana' ? isWeekend(iso) : !isWeekend(iso);
}

const median = (v: number[]) => {
  if (!v.length) return undefined;
  const s = [...v].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};
const mean = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : undefined);

export function responseMetrics(samples: ResponseSample[], p: Period, dayFilter: DayFilter, goalMinutes: number) {
  const s = samples.filter(x => inPeriod(x.waitingSince, p) && matchesDayFilter(x.waitingSince, dayFilter));
  const firsts = s.filter(x => x.first).map(x => x.ms);
  const all = s.map(x => x.ms);
  const goalMs = goalMinutes * 60000;
  return {
    respostas: all.length,
    conversasAtendidas: firsts.length,
    primeiraMedia: mean(firsts),
    primeiraMediana: median(firsts),
    respostaMedia: mean(all),
    respostaMediana: median(all),
    dentroDaMeta: firsts.length ? firsts.filter(ms => ms <= goalMs).length / firsts.length : undefined,
  };
}

// Média da primeira resposta por dia da semana (Dom..Sáb)
export function responseByWeekday(samples: ResponseSample[], p: Period) {
  const buckets = WEEKDAY_LABELS.map(() => [] as number[]);
  for (const x of samples) {
    if (!x.first || !inPeriod(x.waitingSince, p)) continue;
    buckets[weekdayIndex(x.waitingSince)]?.push(x.ms);
  }
  return WEEKDAY_LABELS.map((dia, i) => ({
    dia,
    minutos: buckets[i].length ? Math.round(mean(buckets[i])! / 60000) : 0,
    conversas: buckets[i].length,
  }));
}

// Conversas em que a última mensagem é do cliente (aguardando resposta agora)
export function waitingNow(conversations: Conversation[], messages: Message[]) {
  const last = new Map<string, Message>();
  for (const m of messages) {
    if (m.direcao === 'interna') continue;
    if (m.direcao === 'saida' && m.autor !== 'usuario') continue; // resposta automática não conta como atendimento
    const cur = last.get(m.conversationId);
    if (!cur || new Date(m.enviadaAt).getTime() >= new Date(cur.enviadaAt).getTime()) last.set(m.conversationId, m);
  }
  const now = Date.now();
  return conversations
    .map(c => ({ conv: c, msg: last.get(c.id) }))
    .filter(x => x.msg && x.msg.direcao === 'entrada' && x.conv.status !== 'encerrada')
    .map(x => ({ conversation: x.conv, since: x.msg!.enviadaAt, ms: now - new Date(x.msg!.enviadaAt).getTime() }))
    .sort((a, b) => b.ms - a.ms);
}

export function formatDuration(ms?: number): string {
  if (ms === undefined || Number.isNaN(ms)) return '—';
  const min = Math.round(ms / 60000);
  if (min < 1) return 'menos de 1 min';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h ${min % 60 ? `${min % 60} min` : ''}`.trim();
  const d = Math.floor(h / 24);
  return `${d} d ${h % 24 ? `${h % 24} h` : ''}`.trim();
}

// ==========================================
// Origem: canal, campanha e anúncio
// ==========================================
export function leadChannel(l: Lead): string {
  if (l.planilhaId) return 'Planilha (formulário)';
  if (l.id.startsWith('wa-')) return 'WhatsApp';
  return 'Cadastro manual';
}

export function originTable(leads: Lead[], stages: Map<string, Stage>, p: Period, pick: (l: Lead) => string | null | undefined) {
  const rows = new Map<string, { nome: string; leads: number; vendas: number; valor: number }>();
  for (const l of leads) {
    if (!inPeriod(leadEntryDate(l), p)) continue;
    const nome = pick(l) || 'Sem informação';
    if (!rows.has(nome)) rows.set(nome, { nome, leads: 0, vendas: 0, valor: 0 });
    const r = rows.get(nome)!;
    r.leads++;
    if (stages.get(l.stageId)?.tipo === 'ganho') { r.vendas++; r.valor += l.valorFechado ?? l.valor ?? 0; }
  }
  return [...rows.values()].sort((a, b) => b.leads - a.leads);
}

// Funil: leads do período em cada etapa e quantos chegaram até ela ou além
export function funnel(leads: Lead[], pipeline: Pipeline | undefined, p: Period) {
  if (!pipeline) return [];
  const ordered = [...pipeline.stages].sort((a, b) => a.ordem - b.ordem);
  const normal = ordered.filter(s => s.tipo !== 'perdido');
  const pos = new Map(normal.map((s, i) => [s.id, i]));
  const periodLeads = leads.filter(l => l.pipelineId === pipeline.id && inPeriod(leadEntryDate(l), p));
  const total = periodLeads.length;
  return normal.map((s, i) => {
    const naEtapa = periodLeads.filter(l => l.stageId === s.id).length;
    const chegaram = periodLeads.filter(l => (pos.get(l.stageId) ?? -1) >= i).length;
    return { id: s.id, nome: s.nome, cor: s.cor, naEtapa, chegaram, pct: total ? chegaram / total : 0 };
  });
}

// ==========================================
// Estatísticas detalhadas
// ==========================================
const hourFmt = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: '2-digit', hourCycle: 'h23' });
export function hourOfDay(iso: string): number {
  return Number(hourFmt.format(new Date(iso))) % 24;
}

function stats(values: number[], goalMs: number) {
  return {
    total: values.length,
    media: mean(values),
    mediana: median(values),
    dentroDaMeta: values.length ? values.filter(v => v <= goalMs).length / values.length : undefined,
  };
}

const firstsIn = (samples: ResponseSample[], p: Period, f: DayFilter) =>
  samples.filter(x => x.first && inPeriod(x.waitingSince, p) && matchesDayFilter(x.waitingSince, f));

// Seg a sex x fim de semana, lado a lado
export function weekdayVsWeekend(samples: ResponseSample[], p: Period, goalMinutes: number) {
  const goal = goalMinutes * 60000;
  const all = (f: DayFilter) => samples.filter(x => inPeriod(x.waitingSince, p) && matchesDayFilter(x.waitingSince, f)).map(x => x.ms);
  return {
    semana: { primeira: stats(firstsIn(samples, p, 'semana').map(x => x.ms), goal), resposta: stats(all('semana'), goal) },
    fimDeSemana: { primeira: stats(firstsIn(samples, p, 'fim_de_semana').map(x => x.ms), goal), resposta: stats(all('fim_de_semana'), goal) },
  };
}

// Faixas de tempo da 1ª resposta
export const RESPONSE_BUCKETS = [
  { label: 'Até 5 min', max: 5 },
  { label: '5 a 15 min', max: 15 },
  { label: '15 a 60 min', max: 60 },
  { label: '1 a 4 h', max: 240 },
  { label: '4 a 24 h', max: 1440 },
  { label: 'Mais de 24 h', max: Infinity },
];
export function firstResponseDistribution(samples: ResponseSample[], p: Period, f: DayFilter) {
  const firsts = firstsIn(samples, p, f);
  return RESPONSE_BUCKETS.map((b, i) => {
    const min = i === 0 ? -1 : RESPONSE_BUCKETS[i - 1].max;
    const count = firsts.filter(x => x.ms / 60000 > min && x.ms / 60000 <= b.max).length;
    return { faixa: b.label, conversas: count, pct: firsts.length ? count / firsts.length : 0 };
  });
}

// Por dia da semana, com mediana e % na meta
export function weekdayTable(samples: ResponseSample[], p: Period, goalMinutes: number) {
  const goal = goalMinutes * 60000;
  return WEEKDAY_LABELS.map((dia, i) => {
    const v = samples.filter(x => x.first && inPeriod(x.waitingSince, p) && weekdayIndex(x.waitingSince) === i).map(x => x.ms);
    return { dia, ...stats(v, goal) };
  });
}

// 1ª resposta média por hora do dia em que o cliente escreveu
export function hourlyFirstResponse(samples: ResponseSample[], p: Period, f: DayFilter) {
  const buckets = Array.from({ length: 24 }, () => [] as number[]);
  for (const x of firstsIn(samples, p, f)) buckets[hourOfDay(x.waitingSince)].push(x.ms);
  return buckets.map((v, h) => ({ hora: `${String(h).padStart(2, '0')}h`, minutos: v.length ? Math.round(mean(v)! / 60000) : 0, conversas: v.length }));
}

// Mensagens recebidas e enviadas por dia
export function messageVolume(messages: Message[], p: Period) {
  const days = daysBetween(p.from, p.to) + 1;
  const map = new Map<string, { dia: string; recebidas: number; enviadas: number }>();
  for (let i = 0; i < days; i++) {
    const k = addDays(p.from, i);
    map.set(k, { dia: `${k.slice(8, 10)}/${k.slice(5, 7)}`, recebidas: 0, enviadas: 0 });
  }
  for (const m of messages) {
    const e = map.get(dayKey(m.enviadaAt));
    if (!e) continue;
    if (m.direcao === 'entrada') e.recebidas++;
    else if (m.direcao === 'saida') e.enviadas++;
  }
  return [...map.values()];
}

// Ciclo de venda: dias entre a entrada do lead e o fechamento (vendas do período)
export function salesCycleDays(leads: Lead[], stages: Map<string, Stage>, p: Period) {
  const v = leads
    .filter(l => stages.get(l.stageId)?.tipo === 'ganho' && inPeriod(leadClosedDate(l), p))
    .map(l => (new Date(leadClosedDate(l)).getTime() - new Date(leadEntryDate(l)).getTime()) / 86400000)
    .filter(d => d >= 0);
  return { media: mean(v), mediana: median(v), vendas: v.length };
}

// Motivos de perda no período
export function lossReasonsTable(leads: Lead[], stages: Map<string, Stage>, p: Period, names: Map<string, string>) {
  const m = new Map<string, number>();
  for (const l of leads) {
    if (stages.get(l.stageId)?.tipo !== 'perdido' || !inPeriod(leadClosedDate(l), p)) continue;
    const nome = (l.motivoPerdaId && names.get(l.motivoPerdaId)) || 'Sem motivo informado';
    m.set(nome, (m.get(nome) || 0) + 1);
  }
  return [...m.entries()].map(([motivo, total]) => ({ motivo, total })).sort((a, b) => b.total - a.total);
}
