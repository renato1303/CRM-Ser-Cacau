import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, ExternalLink, RefreshCw } from 'lucide-react';
import { Task } from '../../types';
import { cn } from '../../utils/cn';
import { GoogleEvent, googleEvents, toLocalInput } from '../../services/googleCalendar';

interface Props {
  tasks: Task[];
  onOpenTask: (task: Task) => void;
  onNewTask: (localDateTime: string) => void;
  onConnectGoogle?: () => void;
}

type Item =
  | { kind: 'task'; id: string; start: Date; titulo: string; task: Task }
  | { kind: 'google'; id: string; start: Date; titulo: string; diaInteiro: boolean; link?: string | null };

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const hhmm = (d: Date) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

function parseGoogleStart(e: GoogleEvent) {
  // Evento de dia inteiro vem só com a data ("2026-11-02"): usa meia-noite local
  if (e.diaInteiro && /^\d{4}-\d{2}-\d{2}$/.test(e.inicio)) {
    const [y, m, d] = e.inicio.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(e.inicio);
}

export const CalendarView: React.FC<Props> = ({ tasks, onOpenTask, onNewTask, onConnectGoogle }) => {
  const [mode, setMode] = useState<'mes' | 'semana'>('mes');
  const [cursor, setCursor] = useState(startOfDay(new Date()));
  const [google, setGoogle] = useState<GoogleEvent[]>([]);
  const [googleState, setGoogleState] = useState<'carregando' | 'ok' | 'desconectado' | 'erro'>('carregando');
  const [reload, setReload] = useState(0);

  // Dias visíveis: mês em 6 semanas (domingo a sábado) ou a semana do cursor
  const days = useMemo(() => {
    if (mode === 'semana') {
      const first = addDays(cursor, -cursor.getDay());
      return Array.from({ length: 7 }, (_, i) => addDays(first, i));
    }
    const firstOfMonth = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const first = addDays(firstOfMonth, -firstOfMonth.getDay());
    return Array.from({ length: 42 }, (_, i) => addDays(first, i));
  }, [mode, cursor]);
  const rangeStart = days[0];
  const rangeEnd = addDays(days[days.length - 1], 1);

  useEffect(() => {
    let active = true;
    setGoogleState('carregando');
    googleEvents(rangeStart, rangeEnd)
      .then(r => { if (!active) return; setGoogle(r.eventos); setGoogleState(r.conectado ? 'ok' : 'desconectado'); })
      .catch(() => { if (active) { setGoogle([]); setGoogleState('erro'); } });
    return () => { active = false; };
  }, [rangeStart.getTime(), rangeEnd.getTime(), reload]);

  const itemsByDay = useMemo(() => {
    const items: Item[] = [
      ...tasks.filter(t => t.prazo && t.status !== 'cancelada').map(t => ({ kind: 'task' as const, id: t.id, start: new Date(t.prazo), titulo: t.texto, task: t })),
      ...google.map(e => ({ kind: 'google' as const, id: e.id, start: parseGoogleStart(e), titulo: e.titulo, diaInteiro: e.diaInteiro, link: e.link })),
    ].filter(i => !Number.isNaN(i.start.getTime()));
    const map = new Map<string, Item[]>();
    for (const it of items) {
      const k = startOfDay(it.start).toDateString();
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(it);
    }
    for (const list of map.values()) {
      list.sort((a, b) => {
        const ad = a.kind === 'google' && a.diaInteiro ? -1 : 0;
        const bd = b.kind === 'google' && b.diaInteiro ? -1 : 0;
        return ad - bd || a.start.getTime() - b.start.getTime();
      });
    }
    return map;
  }, [tasks, google]);

  const title = mode === 'mes'
    ? cursor.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    : `${days[0].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} a ${days[6].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}`;
  const move = (dir: number) => setCursor(c => (mode === 'mes' ? new Date(c.getFullYear(), c.getMonth() + dir, 1) : addDays(c, dir * 7)));
  const now = new Date();

  const renderItem = (it: Item, compact: boolean) => {
    if (it.kind === 'google') {
      return (
        <button
          key={`g-${it.id}`}
          type="button"
          onClick={(e) => { e.stopPropagation(); if (it.link) window.open(it.link, '_blank', 'noopener'); }}
          title={`Google Agenda: ${it.titulo}`}
          className="w-full text-left px-1.5 py-0.5 rounded-md text-[10px] leading-tight truncate bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 flex items-center gap-1"
        >
          {!it.diaInteiro && <span className="font-semibold shrink-0">{hhmm(it.start)}</span>}
          <span className="truncate">{it.titulo}</span>
          {!compact && <ExternalLink className="w-3 h-3 shrink-0 ml-auto opacity-60" />}
        </button>
      );
    }
    const t = it.task;
    const done = t.status === 'concluida';
    const late = !done && it.start.getTime() < now.getTime();
    return (
      <button
        key={`t-${it.id}`}
        type="button"
        onClick={(e) => { e.stopPropagation(); onOpenTask(t); }}
        title={it.titulo}
        className={cn(
          'w-full text-left px-1.5 py-0.5 rounded-md text-[10px] leading-tight truncate border flex items-center gap-1',
          done ? 'bg-slate-100 text-slate-400 line-through border-slate-200 dark:bg-slate-800 dark:border-slate-700'
            : late ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900'
            : 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-900'
        )}
      >
        <span className="font-semibold shrink-0">{hhmm(it.start)}</span>
        <span className="truncate">{it.titulo}</span>
      </button>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex-1 shadow-sm flex flex-col min-h-0">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => move(-1)} aria-label="Anterior" className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"><ChevronLeft className="w-4 h-4" /></button>
          <button type="button" onClick={() => setCursor(startOfDay(new Date()))} className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800">Hoje</button>
          <button type="button" onClick={() => move(1)} aria-label="Próximo" className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"><ChevronRight className="w-4 h-4" /></button>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 capitalize ml-1">{title}</h3>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3 text-[11px] text-slate-500">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-indigo-400" /> Tarefas do CRM</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" /> Google Agenda</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-400" /> Atrasadas</span>
          </div>
          {googleState === 'desconectado' && onConnectGoogle && (
            <button type="button" onClick={onConnectGoogle} className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 hover:underline">Conectar Google Agenda</button>
          )}
          {googleState === 'erro' && (
            <button type="button" onClick={() => setReload(r => r + 1)} className="text-[11px] text-amber-600 flex items-center gap-1 hover:underline"><RefreshCw className="w-3 h-3" /> Google indisponível, tentar de novo</button>
          )}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            {(['mes', 'semana'] as const).map(m => (
              <button key={m} type="button" onClick={() => setMode(m)}
                className={cn('px-2.5 py-1 rounded-md text-[11px] font-medium', mode === m ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500')}>
                {m === 'mes' ? 'Mês' : 'Semana'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grade */}
      <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
        {WEEKDAYS.map(d => (
          <div key={d} className="bg-slate-50 dark:bg-slate-900 text-[11px] font-semibold text-slate-500 text-center py-1.5">{d}</div>
        ))}
        {days.map(day => {
          const list = itemsByDay.get(day.toDateString()) || [];
          const outside = mode === 'mes' && day.getMonth() !== cursor.getMonth();
          const isToday = sameDay(day, now);
          const max = mode === 'mes' ? 3 : 50;
          return (
            <div
              key={day.toISOString()}
              onDoubleClick={() => {
                const at = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 9, 0);
                onNewTask(toLocalInput(at));
              }}
              className={cn(
                'group bg-white dark:bg-slate-900 p-1.5 flex flex-col gap-1',
                mode === 'mes' ? 'min-h-[104px]' : 'min-h-[420px]',
                outside && 'bg-slate-50/60 dark:bg-slate-900/60'
              )}
            >
              <div className="flex items-center justify-between">
                <span className={cn(
                  'text-[11px] w-6 h-6 flex items-center justify-center rounded-full',
                  isToday ? 'bg-indigo-600 text-white font-bold' : outside ? 'text-slate-400' : 'text-slate-700 dark:text-slate-300'
                )}>
                  {day.getDate()}
                </span>
                <button
                  type="button"
                  title="Nova tarefa neste dia"
                  onClick={() => onNewTask(toLocalInput(new Date(day.getFullYear(), day.getMonth(), day.getDate(), 9, 0)))}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-400 hover:text-indigo-600"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              {list.slice(0, max).map(it => renderItem(it, mode === 'mes'))}
              {list.length > max && (
                <button type="button" onClick={() => { setCursor(day); setMode('semana'); }} className="text-[10px] text-slate-500 hover:text-indigo-600 text-left px-1">
                  + {list.length - max} mais
                </button>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-slate-400 mt-2">
        Clique numa tarefa para abrir os detalhes, num evento do Google para abri-lo no Google Agenda, ou duas vezes num dia para criar uma tarefa.
      </p>
    </div>
  );
};
