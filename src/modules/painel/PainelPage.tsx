import React, { useEffect, useMemo, useState } from 'react';
import {
  Users, DollarSign, CheckCircle2, Clock, TrendingUp, TrendingDown, MessageSquare, Target, Timer, AlertCircle, Megaphone
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';
import { useStore } from '../../store/useStore';
import { formatCurrency, cn } from '../../utils/cn';
import {
  DayFilter, PeriodId, Period, dailySeries, formatDuration, funnel, leadChannel, originTable, previousPeriod,
  resolvePeriod, responseByWeekday, responseMetrics, responseSamples, stageTypeIndex, volumeMetrics, waitingNow, dayKey
} from './metrics';

const GOAL_KEY = 'conversa_crm_meta_resposta_min';

const PERIODS: { id: PeriodId; label: string }[] = [
  { id: 'hoje', label: 'Hoje' },
  { id: '7d', label: 'Últimos 7 dias' },
  { id: '30d', label: 'Últimos 30 dias' },
  { id: 'mes', label: 'Este mês' },
  { id: 'mes_passado', label: 'Mês passado' },
  { id: 'personalizado', label: 'Personalizado' },
];

const pct = (v?: number) => (v === undefined ? '—' : `${Math.round(v * 100)}%`);
const fmtDate = (k: string) => `${k.slice(8, 10)}/${k.slice(5, 7)}/${k.slice(0, 4)}`;

// Variação em relação ao período anterior
const Delta: React.FC<{ now: number; before: number }> = ({ now, before }) => {
  if (!before && !now) return <span className="text-[11px] text-slate-400">sem dados no período anterior</span>;
  if (!before) return <span className="text-[11px] text-emerald-600 dark:text-emerald-400">novo no período</span>;
  const change = (now - before) / before;
  const up = change >= 0;
  return (
    <span className={cn('text-[11px] font-medium flex items-center gap-1', up ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500')}>
      {up ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
      {up ? '+' : ''}{Math.round(change * 100)}% vs. período anterior
    </span>
  );
};

const Card: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; onClick?: () => void; hint?: string }> = ({ title, icon, children, onClick, hint }) => (
  <div
    onClick={onClick}
    title={hint}
    className={cn(
      'bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm',
      onClick && 'cursor-pointer hover:border-indigo-500/50 transition-colors'
    )}
  >
    <div className="flex items-center justify-between mb-3">
      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title}</span>
      <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">{icon}</div>
    </div>
    {children}
  </div>
);

const Section: React.FC<{ title: string; subtitle?: string; right?: React.ReactNode; children: React.ReactNode }> = ({ title, subtitle, right, children }) => (
  <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
    <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
      <div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{title}</h3>
        {subtitle && <p className="text-[11px] text-slate-500">{subtitle}</p>}
      </div>
      {right}
    </div>
    {children}
  </section>
);

export const PainelPage: React.FC = () => {
  const { leads, tasks, conversations, messages, contacts, currentUser, pipelines, setActiveModule } = useStore();

  const [periodId, setPeriodId] = useState<PeriodId>('30d');
  const [custom, setCustom] = useState<Period>({ from: dayKey(new Date()), to: dayKey(new Date()) });
  const [dayFilter, setDayFilter] = useState<DayFilter>('todos');
  const [goal, setGoal] = useState<number>(() => Number(localStorage.getItem(GOAL_KEY)) || 15);
  const [originTab, setOriginTab] = useState<'canal' | 'campanha' | 'anuncio'>('canal');
  const [pipelineId, setPipelineId] = useState(pipelines[0]?.id || '');

  useEffect(() => { localStorage.setItem(GOAL_KEY, String(goal)); }, [goal]);

  const period = resolvePeriod(periodId, custom);
  const prev = previousPeriod(period);
  const stages = useMemo(() => stageTypeIndex(pipelines), [pipelines]);

  const vol = useMemo(() => volumeMetrics(leads, stages, period), [leads, stages, period.from, period.to]);
  const volPrev = useMemo(() => volumeMetrics(leads, stages, prev), [leads, stages, prev.from, prev.to]);
  const series = useMemo(() => dailySeries(leads, stages, period), [leads, stages, period.from, period.to]);

  const samples = useMemo(() => responseSamples(messages), [messages]);
  const resp = responseMetrics(samples, period, dayFilter, goal);
  const respPrev = responseMetrics(samples, prev, dayFilter, goal);
  const byWeekday = useMemo(() => responseByWeekday(samples, period), [samples, period.from, period.to]);
  const waiting = useMemo(() => waitingNow(conversations, messages), [conversations, messages]);
  const contactsById = useMemo(() => new Map(contacts.map(c => [c.id, c])), [contacts]);

  const origin = useMemo(() => {
    const pick = originTab === 'canal' ? leadChannel
      : originTab === 'campanha' ? (l: any) => l.rastreamento?.campanha
      : (l: any) => l.rastreamento?.anuncio;
    return originTable(leads, stages, period, pick).slice(0, 10);
  }, [leads, stages, period.from, period.to, originTab]);

  const pipeline = pipelines.find(p => p.id === pipelineId) || pipelines[0];
  const funnelRows = useMemo(() => funnel(leads, pipeline, period), [leads, pipeline, period.from, period.to]);

  const tarefasAtrasadas = tasks.filter(t => t.status === 'pendente' && new Date(t.prazo).getTime() < Date.now()).length;
  const tarefasHoje = tasks.filter(t => t.status === 'pendente' && dayKey(t.prazo) === dayKey(new Date())).length;

  const dayFilterLabel = dayFilter === 'semana' ? 'de segunda a sexta' : dayFilter === 'fim_de_semana' ? 'nos fins de semana' : 'em todos os dias';
  const tick = { fontSize: 11, fill: '#94A3B8' };

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto bg-slate-50 dark:bg-slate-950 min-h-full space-y-6">
      {/* Topo: saudação e período */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Olá, {currentUser.nome}!</h2>
          <p className="text-xs text-slate-500">
            Período: {fmtDate(period.from)} a {fmtDate(period.to)} · comparado com {fmtDate(prev.from)} a {fmtDate(prev.to)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={periodId}
            onChange={(e) => setPeriodId(e.target.value as PeriodId)}
            className="px-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 outline-none"
          >
            {PERIODS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          {periodId === 'personalizado' && (
            <>
              <input type="date" value={custom.from} onChange={(e) => setCustom(c => ({ ...c, from: e.target.value }))}
                className="px-2 py-1 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200" />
              <span className="text-xs text-slate-400">até</span>
              <input type="date" value={custom.to} onChange={(e) => setCustom(c => ({ ...c, to: e.target.value }))}
                className="px-2 py-1 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200" />
            </>
          )}
        </div>
      </div>

      {/* Volume */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card title="Leads novos" icon={<Users className="w-4 h-4" />} onClick={() => setActiveModule('leads')} hint="Pela data de entrada do lead (planilha ou criação no CRM)">
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{vol.novos}</p>
          <Delta now={vol.novos} before={volPrev.novos} />
        </Card>
        <Card title="Em negociação" icon={<DollarSign className="w-4 h-4" />} onClick={() => setActiveModule('leads')} hint="Leads que entraram no período e ainda não foram ganhos nem perdidos">
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{vol.abertos}</p>
          <p className="text-[11px] text-slate-500">Valor negociado {formatCurrency(vol.valorNegociado)}</p>
        </Card>
        <Card title="Vendas fechadas" icon={<CheckCircle2 className="w-4 h-4" />} hint="Pela data em que o lead foi marcado como venda ganha">
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(vol.valorVendas)}</p>
          <p className="text-[11px] text-slate-500">{vol.vendas} {vol.vendas === 1 ? 'venda' : 'vendas'} · ticket médio {formatCurrency(vol.ticketMedio)}</p>
          <Delta now={vol.valorVendas} before={volPrev.valorVendas} />
        </Card>
        <Card title="Conversão" icon={<Target className="w-4 h-4" />} hint="Dos leads que entraram no período, quantos já viraram venda">
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{pct(vol.novos ? vol.conversao : undefined)}</p>
          <p className="text-[11px] text-slate-500">{vol.perdas} {vol.perdas === 1 ? 'perda' : 'perdas'} no período</p>
        </Card>
      </div>

      <Section title="Leads e vendas por dia" subtitle="Entrada de leads e vendas fechadas em cada dia do período">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="#94A3B833" vertical={false} />
              <XAxis dataKey="dia" tick={tick} interval="preserveStartEnd" />
              <YAxis allowDecimals={false} tick={tick} width={32} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="leads" name="Leads novos" fill="#6366F1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="vendas" name="Vendas" fill="#16A34A" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Section>

      {/* Atendimento */}
      <Section
        title="Atendimento no WhatsApp"
        subtitle={`Tempo corrido (24 horas), contado pelo dia em que o cliente escreveu · ${dayFilterLabel}`}
        right={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
              {([['todos', 'Todos os dias'], ['semana', 'Seg a sex'], ['fim_de_semana', 'Fim de semana']] as const).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setDayFilter(id)}
                  className={cn('px-2.5 py-1 rounded-md text-[11px] font-medium', dayFilter === id ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500')}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-1.5 text-[11px] text-slate-500">
              Meta da 1ª resposta
              <input
                type="number"
                min={1}
                value={goal}
                onChange={(e) => setGoal(Math.max(1, Number(e.target.value) || 1))}
                className="w-14 px-2 py-1 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
              />
              min
            </label>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
            <p className="text-[11px] text-slate-500 flex items-center gap-1"><Timer className="w-3.5 h-3.5" /> 1ª resposta (média)</p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{formatDuration(resp.primeiraMedia)}</p>
            <p className="text-[11px] text-slate-500">Mediana {formatDuration(resp.primeiraMediana)} · antes {formatDuration(respPrev.primeiraMedia)}</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
            <p className="text-[11px] text-slate-500 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Tempo de resposta (média)</p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{formatDuration(resp.respostaMedia)}</p>
            <p className="text-[11px] text-slate-500">Mediana {formatDuration(resp.respostaMediana)} · {resp.respostas} respostas</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
            <p className="text-[11px] text-slate-500 flex items-center gap-1"><Target className="w-3.5 h-3.5" /> Atendidas dentro da meta</p>
            <p className={cn('text-xl font-bold', resp.dentroDaMeta === undefined ? 'text-slate-900 dark:text-slate-100' : resp.dentroDaMeta >= 0.8 ? 'text-emerald-600 dark:text-emerald-400' : resp.dentroDaMeta >= 0.5 ? 'text-amber-500' : 'text-red-500')}>
              {pct(resp.dentroDaMeta)}
            </p>
            <p className="text-[11px] text-slate-500">1ª resposta em até {goal} min · antes {pct(respPrev.dentroDaMeta)}</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
            <p className="text-[11px] text-slate-500 flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" /> Conversas atendidas</p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{resp.conversasAtendidas}</p>
            <p className="text-[11px] text-slate-500">com primeira resposta no período</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <div>
            <h4 className="text-xs font-semibold text-slate-500 mb-2">1ª resposta média por dia da semana (minutos)</h4>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byWeekday}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94A3B833" vertical={false} />
                  <XAxis dataKey="dia" tick={tick} />
                  <YAxis tick={tick} width={40} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    formatter={(v: any, _n: any, item: any) => [`${formatDuration(Number(v) * 60000)} (${item?.payload?.conversas || 0} conversas)`, '1ª resposta']}
                  />
                  <Bar dataKey="minutos" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500" /> Aguardando resposta agora ({waiting.length})
            </h4>
            {waiting.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">Nenhum cliente aguardando resposta.</p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {waiting.slice(0, 7).map(w => (
                  <li key={w.conversation.id}>
                    <button
                      type="button"
                      onClick={() => setActiveModule('chats')}
                      className="w-full flex items-center justify-between gap-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg px-2"
                    >
                      <span className="text-xs text-slate-800 dark:text-slate-200 truncate">
                        {contactsById.get(w.conversation.contactId)?.nome || 'Contato'}
                      </span>
                      <span className={cn('text-[11px] font-semibold whitespace-nowrap', w.ms > goal * 60000 ? 'text-red-500' : 'text-amber-500')}>
                        há {formatDuration(w.ms)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Origem */}
        <Section
          title="De onde vêm os leads"
          subtitle="Leads que entraram no período e quantos viraram venda"
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
          {origin.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">Nenhum lead no período.</p>
          ) : (
            <table className="w-full text-xs">
              <thead className="text-[11px] text-slate-500">
                <tr><th className="text-left font-medium pb-2">{originTab === 'canal' ? 'Canal' : originTab === 'campanha' ? 'Campanha' : 'Anúncio'}</th><th className="text-right font-medium pb-2">Leads</th><th className="text-right font-medium pb-2">Vendas</th><th className="text-right font-medium pb-2">Conversão</th><th className="text-right font-medium pb-2">Valor</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {origin.map(r => (
                  <tr key={r.nome}>
                    <td className="py-2 pr-2 text-slate-800 dark:text-slate-200 max-w-[220px] truncate" title={r.nome}>
                      {originTab !== 'canal' && <Megaphone className="w-3 h-3 inline mr-1 text-slate-400" />}{r.nome}
                    </td>
                    <td className="py-2 text-right text-slate-700 dark:text-slate-300">{r.leads}</td>
                    <td className="py-2 text-right text-slate-700 dark:text-slate-300">{r.vendas}</td>
                    <td className="py-2 text-right text-slate-700 dark:text-slate-300">{pct(r.leads ? r.vendas / r.leads : undefined)}</td>
                    <td className="py-2 text-right font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(r.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        {/* Funil */}
        <Section
          title="Funil"
          subtitle="Leads do período: quantos estão em cada etapa e quantos chegaram até ela"
          right={pipelines.length > 1 ? (
            <select value={pipeline?.id} onChange={(e) => setPipelineId(e.target.value)}
              className="px-2 py-1 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200">
              {pipelines.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          ) : undefined}
        >
          {funnelRows.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">Nenhum funil configurado.</p>
          ) : (
            <div className="space-y-3">
              {funnelRows.map(s => (
                <div key={s.id}>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="font-medium text-slate-700 dark:text-slate-300">{s.nome}</span>
                    <span className="text-slate-500">{s.naEtapa} na etapa · {s.chegaram} chegaram ({pct(s.pct)})</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.max(2, Math.round(s.pct * 100))}%`, backgroundColor: s.cor }} />
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-6 text-xs">
            <button type="button" onClick={() => setActiveModule('agenda')} className="text-left">
              <span className="block text-[11px] text-slate-500">Tarefas atrasadas</span>
              <span className={cn('text-lg font-bold', tarefasAtrasadas ? 'text-red-500' : 'text-slate-900 dark:text-slate-100')}>{tarefasAtrasadas}</span>
            </button>
            <button type="button" onClick={() => setActiveModule('agenda')} className="text-left">
              <span className="block text-[11px] text-slate-500">Tarefas para hoje</span>
              <span className="text-lg font-bold text-slate-900 dark:text-slate-100">{tarefasHoje}</span>
            </button>
          </div>
        </Section>
      </div>
    </div>
  );
};
