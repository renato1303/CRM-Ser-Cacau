// Facebook e Instagram (as chamadas passam pelo servidor do CRM)
export interface MetaStatus {
  configurado: boolean;
  webhookUrl: string | null;
  redirectUri: string | null;
  privacidadeUrl: string | null;
  verifyTokenDefinido: boolean;
  paginas: { pageId: string; pageName: string; igUserId: string | null; igUsername: string | null; conectadoEm: string; erro?: string | null }[];
}

export interface SocialThread {
  id: string;
  canal: 'instagram' | 'messenger';
  participant_id: string;
  participant_name: string | null;
  participant_username: string | null;
  participant_pic: string | null;
  ultima_mensagem: string | null;
  ultima_mensagem_at: string | null;
  ultima_do_cliente_at: string | null;
  nao_lidas: number;
  lead_id: string | null;
}

export interface SocialMessage { id: string; thread_id: string; from_me: boolean; texto: string; enviada_at: string; }

export interface SocialComment {
  id: string;
  canal: 'instagram' | 'facebook';
  ad_id: string | null;
  ad_title: string | null;
  parent_id: string | null;
  author_name: string | null;
  author_username: string | null;
  texto: string;
  criado_at: string;
  permalink: string | null;
  media_thumb: string | null;
  post_texto: string | null;
  respondido: boolean;
  resposta_texto: string | null;
  oculto: boolean;
  lead_id: string | null;
}

async function call<T = any>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
  return data as T;
}
const postJson = (url: string, body: any) => call(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

export const metaApi = {
  status: () => call<MetaStatus>('/api/meta/status'),
  connect: async () => {
    const { url } = await call<{ url: string }>('/api/meta/auth-url', { method: 'POST' });
    window.location.href = url;
  },
  disconnect: (pageId: string) => postJson('/api/meta/disconnect', { pageId }),
  threads: (canal?: string) => call<{ threads: SocialThread[] }>(`/api/social/threads${canal ? `?canal=${canal}` : ''}`).then(r => r.threads),
  messages: (threadId: string) => call<{ messages: SocialMessage[] }>(`/api/social/messages?threadId=${encodeURIComponent(threadId)}`).then(r => r.messages),
  read: (threadId: string) => postJson('/api/social/read', { threadId }),
  send: (threadId: string, texto: string) => postJson('/api/social/send', { threadId, texto }),
  comments: (canal?: string, status?: string) => {
    const q = new URLSearchParams();
    if (canal) q.set('canal', canal);
    if (status) q.set('status', status);
    return call<{ comments: SocialComment[] }>(`/api/social/comments?${q.toString()}`).then(r => r.comments);
  },
  replyComment: (commentId: string, texto: string) => postJson('/api/social/comment-reply', { commentId, texto }),
  hideComment: (commentId: string, ocultar: boolean) => postJson('/api/social/comment-hide', { commentId, ocultar }),
  criarLead: (body: { threadId?: string; commentId?: string }) => postJson('/api/social/criar-lead', body) as Promise<{ ok: boolean; leadId: string; existente?: boolean }>,
};
