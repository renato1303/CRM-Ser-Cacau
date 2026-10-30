// Integração com o Google Agenda (as chamadas passam pelo servidor do CRM)
export interface GoogleEvent {
  id: string;
  titulo: string;
  inicio: string;
  fim: string;
  diaInteiro: boolean;
  local?: string | null;
  link?: string | null;
}

export interface GoogleStatus {
  configurado: boolean;
  conectado: boolean;
  googleEmail?: string | null;
  erro?: string | null;
  redirectUri?: string | null;
}

export async function googleStatus(): Promise<GoogleStatus> {
  const res = await fetch('/api/google/status');
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
  return data;
}

// Leva o navegador para o login do Google
export async function googleConnect() {
  const res = await fetch('/api/google/auth-url', { method: 'POST' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.url) throw new Error(data.error || 'Não foi possível iniciar a conexão com o Google.');
  window.location.href = data.url;
}

export async function googleDisconnect() {
  const res = await fetch('/api/google/disconnect', { method: 'POST' });
  if (!res.ok) throw new Error('Não foi possível desconectar.');
}

export async function googleEvents(from: Date, to: Date): Promise<{ conectado: boolean; eventos: GoogleEvent[] }> {
  const res = await fetch(`/api/google/events?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
  return { conectado: Boolean(data.conectado), eventos: Array.isArray(data.eventos) ? data.eventos : [] };
}

// "2026-11-03T14:00" no horário do navegador (para campos datetime-local)
export function toLocalInput(iso?: string | Date) {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
