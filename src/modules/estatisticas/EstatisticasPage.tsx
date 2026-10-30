import React, { useMemo, useState } from 'react';
import { Download, Timer, Clock, Target, MessageSquare, AlertCircle, CalendarDays, Sun } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { useStore } from '../../store/useStore';
import { formatCurrency, cn } from '../../utils/cn';
import { Button } from '../../components/ui/Button';
import { Tabs } from '../../components/ui/Tabs';
import {
  DayFilter, PeriodId, Period, dayKey, resolvePeriod, previousPeriod, stageTypeIndex, volumeMetrics, funnel,
  responseSamples, responseMetrics, weekdayVsWeekend, firstResponseDistribution, weekdayTable, hourlyFirstResponse,
  messageVolume, salesCycleDays, lossReasonsTable, originTable, leadChannel, formatDuration, waitingNow,
  inPeriod, leadEntryDate, leadClosedDate
} from '../painel/metrics';

type SubTab = 'vendas' | 'consolidado' | 'origens' | 'metas' | 'atendimento';

const PERIODS: { id: PeriodId; label: string }[] = [
  { id: 'hoje', label: 'Hoje' },
  { id: '7d', label: 'Últimos 7 dias' },
  { id: '30d', label: 'Últimos 30 dias' },
  { id: 'mes', label: 'Este mês' },
  { id: 'mes_passado', label: 'Mês passado' },
  { id: 'personalizado', label: 'Personalizado' },
];
const GOAL_KEY = 'conversa_crm_meta_resposta_min';
const INVEST_KEY = 'conversa_crm_investimento_origens_v1';

const pct = (v?: number) => (v === undefined || Number.isNaN(v) ? '—' : `${Math.round(v * 100)}%`);
const days = (v?: number) => (v === undefined ? '—' : `${v.toFixed(1).replace('.', ',')} dias`);
const fmtDate = (k: string) => `${k.slice(8, 10)}/${k.slice(5, 7)}/${k.slice(0, 4)}`;
const tick = { fontSize: 11, fill: '#94A3B8' };

const Box: React.FC<{ title?: string; subtitle?: string; right?: React.ReactNode; children: React.ReactNode; className?: string }> = ({ title, subtitle, right, children, className }) => (
  <div className={cn('bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5', className)}>
    {(title || right) && (
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          {title && <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{title}</h3>}
          {subtitle && <p className="text-[11px] text-slate-500">{subtitle}</p>}
        </div>
        {right}
      </div>
    )}
    {children}
  </div>
);

const Kpi: React.FC<{ label: string; value: string; sub?: string; icon?: React.ReactNode; tone?: string }> = ({ label, value, sub, icon, tone }) => (
  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
    <p className="text-[11px] text-slate-500 flex items-center gap-1">{icon}{label}</p>
    <p className={cn('text-xl font-bold', tone || 'text-slate-900 dark:text-slate-100')}>{value}</p>
    {sub && <p className="text-[11px] text-slate-500">{sub}</p>}
  </div>
);

const Empty: React.FC<{ text?: string }> = ({ text }) => (
  <p className="text-xs text-slate-400 py-8 text-center">{text || 'Ainda não há dados neste período.'}</p>
);

const Table: React.FC<{ head: string[]; rows: React.ReactNode[][]; align?: ('l' | 'r')[] }> = ({ head, rows, align }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-xs">
      <thead className="text-[11px] text-slate-500">
        <tr>{head.map((h, i) => <th key={h} className={cn('font-medium pb-2 px-2', (align?.[i] || (i ? 'r' : 'l')) === 'r' ? 'text-right' : 'text-left')}>{h}</th>)}</tr>
      </thead>
      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
        {rows.map((r, ri) => (
          <tr key={ri}>{r.map((c, i) => <td key={i} className={cn('py-2 px-2 text-slate-700 dark:text-slate-300', (align?.[i] || (i ? 'r' : 'l')) === 'r' ? 'text-right' : 'text-left')}>{c}</td>)}</tr>
        ))}
      </tbody>
    </table>
  </div>
);

function downloadCsv(name: string, head: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [head, ...rows].map(r => r.map(esc).join(';')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const EstatisticasPage: React.FC = () => {
  const { leads, users, tasks, messages, conversations, pipelines, lossReasons, currentUser, updateCurrentUser } = useStore();
  const [subTab, setSubTab] = useState<SubTab>('vendas');
  const [periodId, setPeriodId] = useState<PeriodId>('30d');
  const [custom, setCustom] = useState<Period>({ from: dayKey(new Date()), to: dayKey(new Date()) });
  const [dayFilter, setDayFilter] = useState<DayFilter>('todos');
  const [goal, setGoal] = useState<number>(() => Number(localStorage.getItem(GOAL_KEY)) || 15);
  const [originTab, setOriginTab] = useState<'canal' | 'campanha' | 'anuncio'>('campanha');
  const [invest, setInvest] = useState<Record<string, number>>(() => {
    try { return JSON.parse(localStorage.getItem(INVEST_KEY) || '{}'); } catch { return {}; }
  });

  const period = resolvePeriod(periodId, custom);
  const prev = previousPeriod(period);
  const stages = useMemo(() => stageTypeIndex(pipelines), [pipelines]);
  const vol = useMemo(() => volumeMetrics(leads, stages, period), [leads, stages, period.from, period.to]);
  const cycle = useMemo(() => salesCycleDays(leads, stages, period), [leads, stages, period.from, period.to]);
  const pipeline = pipelines[0];
  const funnelRows = useMemo(() => funnel(leads, pipeline, period), [leads, pipeline, period.from, period.to]);
  const lossNames = useMemo(() => new Map(lossReasons.map(r => [r.id, r.nome])), [lossReasons]);
  const losses = useMemo(() => lossReasonsTable(leads, stages, period, lossNames), [leads, stages, period.from, period.to, lossNames]);

  const samples = useMemo(() => responseSamples(messages), [messages]);
  const resp = responseMetrics(samples, period, dayFilter, goal);
  const respPrev = responseMetrics(samples, prev, dayFilter, goal);
  const split = weekdayVsWeekend(samples, period, goal);
  const dist = firstResponseDistribution(samples, period, dayFilter);
  const byWeekday = weekdayTable(samples, period, goal);
  const byHour = hourlyFirstResponse(samples, period, dayFilter);
  const msgVol = useMemo(() => messageVolume(messages, period), [messages, period.from, period.to]);
  const waiting = useMemo(() => waitingNow(conversations, messages), [conversations, messages]);

  const pickOrigin = originTab === 'canal' ? leadChannel
    : originTab === 'campanha' ? (l: any) => l.rastreamento?.campanha
    : (l: any) => l.rastreamento?.anuncio;
  const origins = useMemo(() => originTable(leads, stages, period, pickOrigin), [leads, stages, period.from, period.to, originTab]);

  const setInvestment = (key: string, value: number) => {
    const next = { ...invest, [key]: value };
    setInvest(next);
    localStorage.setItem(INVEST_KEY, JSON.stringify(next));
  };

  // Relatório por responsável (inclui "Sem responsável" quando houver)
  const consolidated = useMemo(() => {
    const isWon = (stageId: string) => stages.get(stageId)?.tipo === 'ganho';
    const isLost = (stageId: string) => stages.get(stageId)?.tipo === 'perdido';
    const people = [...users.map(u => ({ id: u.id, nome: u.nome })), { id: '', nome: 'Sem responsável' }];
    return people.map(p => {
      const mine = leads.filter(l => (l.responsavelId || '') === p.id);
      const novos = mine.filter(l => inPeriod(leadEntryDate(l), period));
      const vendas = mine.filter(l => isWon(l.stageId) && inPeriod(leadClosedDate(l), period));
      const valor = vendas.reduce((a, l) => a + (l.valorFechado ?? l.valor ?? 0), 0);
      const abertos = mine.filter(l => !isWon(l.stageId) && !isLost(l.stageId)).length;
      const myTasks = tasks.filter(t => (t.responsavelId || '') === p.id);
      const concluidas = myTasks.filter(t => t.status === 'concluida' && inPeriod(t.concluidaAt || t.updatedAt, period)).length;
      const pendentes = myTasks.filter(t => t.status === 'pendente' || t.status === 'em_andamento').length;
      return { ...p, novos: novos.length, abertos, vendas: vendas.length, valor, ticket: vendas.length ? valor / vendas.length : 0, concluidas, pendentes };
    }).filter(r => r.id || r.novos || r.abertos || r.vendas || r.pendentes);
  }, [users, leads, tasks, stages, period.from, period.to]);

  // Metas: sempre o mês atual
  const today = dayKey(new Date());
  const month = resolvePeriod('mes');
  const daysInMonth = new Date(Number(today.slice(0, 4)), Number(today.slice(5, 7)), 0).getDate();
  const dayOfMonth = Number(today.slice(8, 10));

  const exportCurrent = () => {
    const stamp = `${period.from}_a_${period.to}`;
    if (subTab === 'vendas') {
      downloadCsv(`funil_${stamp}.csv`, ['Etapa', 'Na etapa', 'Chegaram', '% do total'],
        funnelRows.map(r => [r.nome, r.naEtapa, r.chegaram, Math.round(r.pct * 100)]));
    } else if (subTab === 'consolidado') {
      downloadCsv(`consolidado_${stamp}.csv`, ['Responsável', 'Leads novos', 'Em aberto', 'Vendas', 'Valor fechado', 'Ticket médio', 'Tarefas concluídas', 'Tarefas abertas'],
        consolidated.map(r => [r.nome, r.novos, r.abertos, r.vendas, r.valor.toFixed(2), r.ticket.toFixed(2), r.concluidas, r.pendentes]));
    } else if (subTab === 'origens') {
      downloadCsv(`origens_${originTab}_${stamp}.csv`, ['Origem', 'Leads', 'Vendas', 'Valor fechado', 'Investimento'],
        origins.map(r => [r.nome, r.leads, r.vendas, r.valor.toFixed(2), (invest[`${originTab}:${r.nome}`] || 0).toFixed(2)]));
    } else if (subTab === 'atendimento') {
      downloadCsv(`atendimento_${stamp}.csv`, ['Dia da semana', 'Conversas', '1ª resposta média (min)', 'Mediana (min)', '% na meta'],
        byWeekday.map(r => [r.dia, r.total, r.media === undefined ? '' : Math.round(r.media / 60000), r.mediana === undefined ? '' : Math.round(r.mediana / 60000), r.dentroDaMeta === undefined ? '' : Math.round(r.dentroDaMeta * 100)]));
    } else {
      downloadCsv(`metas_${month.from}.csv`, ['Responsável', 'Meta do mês', 'Fechado no mês'],
        users.map(u => [u.nome, u.metaMensal || 0, leads.filter(l => l.responsavelId === u.id && stages.get(l.stageId)?.tipo === 'ganho' && inPeriod(leadClosedDate(l), month)).reduce((a, l) => a + (l.valorFechado ?? l.valor ?? 0), 0).toFixed(2)]));
    }
  };

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto bg-slate-50 dark:bg-slate-950 flex flex-col">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Estatísticas & Relatórios</h2>
          <p className="text-xs text-slate-500">
            {subTab === 'metas' ? `Mês atual: ${fmtDate(month.from)} a ${fmtDate(month.to)}` : `Período: ${fmtDate(period.from)} a ${fmtDate(period.to)}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={periodId} onChange={(e) => setPeriodId(e.target.value as PeriodId)}
            className="px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 outline-none">
            {PERIODS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          {periodId === 'personalizado' && (
            <>
              <input type="date" value={custom.from} onChange={(e) => setCustom(c => ({ ...c, from: e.target.value }))}
                className="px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200" />
              <span className="text-xs text-slate-400">até</span>
              <input type="date" value={custom.to} onChange={(e) => setCustom(c => ({ ...c, to: e.target.value }))}
                className="px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200" />
            </>
          )}
          <Button variant="outline" size="sm" onClick={exportCurrent} className="gap-2">
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
        onChange={(id) => setSubTab(id as SubTab)}
        className="mb-6"
      />

      {/* ---------------- Vendas e funil ---------------- */}
      {subTab === 'vendas' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 xl:grid-cols-6 gap-4">
            <Kpi label="Leads novos" value={String(vol.novos)} />
            <Kpi label="Vendas" value={String(vol.vendas)} />
            <Kpi label="Valor fechado" value={formatCurrency(vol.valorVendas)} tone="text-emerald-600 dark:text-emerald-400" />
            <Kpi label="Ticket médio" value={vol.vendas ? formatCurrency(vol.ticketMedio) : '—'} />
            <Kpi label="Conversão" value={vol.novos ? pct(vol.conversao) : '—'} sub="dos leads do período" />
            <Kpi label="Ciclo de venda" value={days(cycle.media)} sub={cycle.vendas ? `mediana ${days(cycle.mediana)}` : 'entrada até o fechamento'} />
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <Box title="Funil do período" subtitle={`${pipeline?.nome || ''} · leads que entraram no período`} className="xl:col-span-2">
              {vol.novos === 0 ? <Empty /> : (
                <Table
                  head={['Etapa', 'Na etapa', 'Chegaram até aqui', '% do total', 'Passagem da etapa anterior']}
                  rows={funnelRows.map((r, i) => [
                    <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: r.cor }} />{r.nome}</span>,
                    r.naEtapa, r.chegaram, pct(r.pct),
                    i === 0 ? '—' : pct(funnelRows[i - 1].chegaram ? r.chegaram / funnelRows[i - 1].chegaram : undefined),
                  ])}
                />
              )}
            </Box>
            <Box title="Motivos de perda" subtitle="Leads perdidos no período">
              {losses.length === 0 ? <Empty text="Nenhuma perda no período." /> : (
                <Table head={['Motivo', 'Leads']} rows={losses.map(l => [l.motivo, l.total])} />
              )}
            </Box>
          </div>
        </div>
      )}

      {/* ---------------- Consolidado ---------------- */}
      {subTab === 'consolidado' && (
        <Box title="Desempenho por responsável" subtitle="Leads e vendas do período; tarefas abertas contam o momento atual">
          {consolidated.length === 0 ? <Empty /> : (
            <Table
              head={['Responsável', 'Leads novos', 'Em aberto', 'Vendas', 'Valor fechado', 'Ticket médio', 'Tarefas concluídas', 'Tarefas abertas']}
              rows={consolidated.map(r => [
                <span className="font-semibold text-slate-900 dark:text-slate-100">{r.nome}</span>,
                r.novos, r.abertos, r.vendas,
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(r.valor)}</span>,
                r.vendas ? formatCurrency(r.ticket) : '—', r.concluidas, r.pendentes,
              ])}
            />
          )}
        </Box>
      )}

      {/* ---------------- Origens e ROI ---------------- */}
      {subTab === 'origens' && (
        <Box
          title="Origens & ROI"
          subtitle="Digite quanto foi investido em cada origem no período para calcular custo por lead, custo por venda e ROI"
          right={
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
              {([['canal', 'Canal'], ['campanha', 'Campanha'], ['anuncio', 'Anúncio']] as const).map(([id, label]) => (
                <button key={id} type="button" onClick={() => setOriginTab(id)}
                  className={cn('px-2.5 py-1 rounded-md text-[11px] font-medium', originTab === id ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500')}>
                  {label}
                </button>
              ))}
            </div>
          }
        >
          {origins.length === 0 ? <Empty /> : (
            <Table
              head={['Origem', 'Leads', 'Vendas', 'Conversão', 'Valor fechado', 'Investimento (R$)', 'Custo por lead', 'Custo por venda', 'ROI']}
              rows={origins.map(r => {
                const key = `${originTab}:${r.nome}`;
                const inv = invest[key] || 0;
                return [
                  <span className="block max-w-[260px] truncate text-slate-900 dark:text-slate-100" title={r.nome}>{r.nome}</span>,
                  r.leads, r.vendas, pct(r.leads ? r.vendas / r.leads : undefined),
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{formatCurrency(r.valor)}</span>,
                  <input
                    type="number" min={0} step="0.01" value={inv || ''} placeholder="0,00"
                    onChange={(e) => setInvestment(key, Math.max(0, Number(e.target.value) || 0))}
                    className="w-24 px-2 py-1 text-xs text-right bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200"
                  />,
                  inv && r.leads ? formatCurrency(inv / r.leads) : '—',
                  inv && r.vendas ? formatCurrency(inv / r.vendas) : '—',
                  inv ? <span className={r.valor >= inv ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}>{pct((r.valor - inv) / inv)}</span> : '—',
                ];
              })}
            />
          )}
        </Box>
      )}

      {/* ---------------- Metas ---------------- */}
      {subTab === 'metas' && (
        <Box title="Metas do mês" subtitle="Valor fechado no mês atual contra a meta mensal. A projeção segue o ritmo dos dias já passados.">
          <div className="space-y-5">
            {users.map(u => {
              const fechado = leads
                .filter(l => l.responsavelId === u.id && stages.get(l.stageId)?.tipo === 'ganho' && inPeriod(leadClosedDate(l), month))
                .reduce((a, l) => a + (l.valorFechado ?? l.valor ?? 0), 0);
              const meta = u.metaMensal || 0;
              const projecao = dayOfMonth ? (fechado / dayOfMonth) * daysInMonth : 0;
              const isMe = u.id === currentUser.id;
              return (
                <div key={u.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5 text-xs">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{u.nome}</span>
                    <span className="flex items-center gap-2 text-slate-500">
                      {formatCurrency(fechado)} de
                      {isMe ? (
                        <input type="number" min={0} defaultValue={meta || ''} placeholder="definir meta" key={meta}
                          onBlur={(e) => {
                            const v = Math.max(0, Number(e.target.value) || 0);
                            if (v !== meta) updateCurrentUser({ metaMensal: v });
                          }}
                          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                          className="w-28 px-2 py-1 text-xs text-right bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200" />
                      ) : <span>{formatCurrency(meta)}</span>}
                      · projeção {formatCurrency(projecao)}
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${meta ? Math.min(100, Math.round((fechado / meta) * 100)) : 0}%` }} />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">{meta ? `${pct(fechado / meta)} da meta` : 'Sem meta definida'}</p>
                </div>
              );
            })}
          </div>
        </Box>
      )}

      {/* ---------------- Atendimento ---------------- */}
      {subTab === 'atendimento' && (
        <div className="space-y-6">
          <Box
            title="Tempo de resposta no WhatsApp"
            subtitle="Tempo corrido (24 h). A espera começa na primeira mensagem do cliente sem resposta e termina na resposta da equipe (CRM ou celular). Vale o dia em que o cliente escreveu."
            right={
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                  {([['todos', 'Todos os dias'], ['semana', 'Seg a sex'], ['fim_de_semana', 'Fim de semana']] as const).map(([id, label]) => (
                    <button key={id} type="button" onClick={() => setDayFilter(id)}
                      className={cn('px-2.5 py-1 rounded-md text-[11px] font-medium', dayFilter === id ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500')}>
                      {label}
                    </button>
                  ))}
                </div>
                <label className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  Meta
                  <input type="number" min={1} value={goal}
                    onChange={(e) => { const v = Math.max(1, Number(e.target.value) || 1); setGoal(v); localStorage.setItem(GOAL_KEY, String(v)); }}
                    className="w-14 px-2 py-1 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200" />
                  min
                </label>
              </div>
            }
          >
            <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
              <Kpi icon={<Timer className="w-3.5 h-3.5" />} label="1ª resposta (média)" value={formatDuration(resp.primeiraMedia)} sub={`mediana ${formatDuration(resp.primeiraMediana)} · antes ${formatDuration(respPrev.primeiraMedia)}`} />
              <Kpi icon={<Clock className="w-3.5 h-3.5" />} label="Tempo de resposta (média)" value={formatDuration(resp.respostaMedia)} sub={`mediana ${formatDuration(resp.respostaMediana)} · ${resp.respostas} respostas`} />
              <Kpi icon={<Target className="w-3.5 h-3.5" />} label={`Na meta (até ${goal} min)`} value={pct(resp.dentroDaMeta)}
                tone={resp.dentroDaMeta === undefined ? undefined : resp.dentroDaMeta >= 0.8 ? 'text-emerald-600 dark:text-emerald-400' : resp.dentroDaMeta >= 0.5 ? 'text-amber-500' : 'text-red-500'}
                sub={`antes ${pct(respPrev.dentroDaMeta)}`} />
              <Kpi icon={<MessageSquare className="w-3.5 h-3.5" />} label="Conversas atendidas" value={String(resp.conversasAtendidas)} sub="com 1ª resposta no período" />
              <Kpi icon={<AlertCircle className="w-3.5 h-3.5" />} label="Aguardando agora" value={String(waiting.length)}
                tone={waiting.length ? 'text-amber-500' : undefined} sub={waiting[0] ? `mais antiga há ${formatDuration(waiting[0].ms)}` : 'ninguém esperando'} />
            </div>
          </Box>

          <Box title="Segunda a sexta x fim de semana" subtitle="Mesmo período, separado pelo dia em que o cliente escreveu">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {([['Segunda a sexta', split.semana, <CalendarDays key="s" className="w-4 h-4" />], ['Fim de semana', split.fimDeSemana, <Sun key="f" className="w-4 h-4" />]] as const).map(([label, d, icon]) => (
                <div key={label} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-3">{icon}{label}</p>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div><p className="text-[11px] text-slate-500">1ª resposta média</p><p className="text-lg font-bold text-slate-900 dark:text-slate-100">{formatDuration(d.primeira.media)}</p></div>
                    <div><p className="text-[11px] text-slate-500">Mediana</p><p className="text-lg font-bold text-slate-900 dark:text-slate-100">{formatDuration(d.primeira.mediana)}</p></div>
                    <div><p className="text-[11px] text-slate-500">Resposta média (todas)</p><p className="font-semibold text-slate-800 dark:text-slate-200">{formatDuration(d.resposta.media)}</p></div>
                    <div><p className="text-[11px] text-slate-500">Na meta · conversas</p><p className="font-semibold text-slate-800 dark:text-slate-200">{pct(d.primeira.dentroDaMeta)} · {d.primeira.total}</p></div>
                  </div>
                </div>
              ))}
            </div>
          </Box>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Box title="Faixas de tempo da 1ª resposta" subtitle="Quantas conversas foram respondidas em cada faixa">
              {resp.conversasAtendidas === 0 ? <Empty /> : (
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dist}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#94A3B833" vertical={false} />
                      <XAxis dataKey="faixa" tick={tick} />
                      <YAxis allowDecimals={false} tick={tick} width={32} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v: any, _n: any, item: any) => [`${v} (${pct(item?.payload?.pct)})`, 'Conversas']} />
                      <Bar dataKey="conversas" fill="#6366F1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Box>
            <Box title="1ª resposta por hora do dia" subtitle="Média em minutos, pela hora em que o cliente escreveu (horário de Brasília)">
              {resp.conversasAtendidas === 0 ? <Empty /> : (
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={byHour}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#94A3B833" vertical={false} />
                      <XAxis dataKey="hora" tick={tick} interval={2} />
                      <YAxis tick={tick} width={40} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v: any, _n: any, item: any) => [`${formatDuration(Number(v) * 60000)} (${item?.payload?.conversas || 0} conversas)`, '1ª resposta']} />
                      <Bar dataKey="minutos" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Box>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Box title="Por dia da semana" subtitle="1ª resposta, pelo dia em que o cliente escreveu">
              <Table
                head={['Dia', 'Conversas', 'Média', 'Mediana', `Na meta (${goal} min)`]}
                rows={byWeekday.map(r => [r.dia, r.total, formatDuration(r.media), formatDuration(r.mediana), pct(r.dentroDaMeta)])}
              />
            </Box>
            <Box title="Mensagens por dia" subtitle="Recebidas e enviadas no WhatsApp">
              {msgVol.every(d => !d.recebidas && !d.enviadas) ? <Empty /> : (
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={msgVol}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#94A3B833" vertical={false} />
                      <XAxis dataKey="dia" tick={tick} interval="preserveStartEnd" />
                      <YAxis allowDecimals={false} tick={tick} width={36} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="recebidas" name="Recebidas" fill="#94A3B8" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="enviadas" name="Enviadas" fill="#16A34A" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Box>
          </div>
        </div>
      )}
    </div>
  );
};
