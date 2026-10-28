// Envia o login (token do Supabase Auth) em todas as chamadas para /api do próprio site.
import { supabase } from './db/supabase';

export const LOGIN_REQUIRED_EVENT = 'crm-login-required';

// Link de "redefinir senha" enviado por e-mail (lido antes de o Supabase limpar a URL)
export const recoveryRequested =
  typeof window !== 'undefined' && /type=recovery/.test(`${window.location.hash}${window.location.search}`);

const originalFetch = window.fetch ? window.fetch.bind(window) : fetch.bind(window);

const customFetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const isApi = url.startsWith('/api/') || url.startsWith(`${window.location.origin}/api/`);
  if (!isApi) return originalFetch(input, init);

  const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await originalFetch(input, { ...init, headers });
  if (res.status === 401 || res.status === 403) {
    res.clone().json().then(body => {
      if (body?.code === 'LOGIN_REQUIRED' || body?.code === 'EMAIL_NOT_ALLOWED') {
        window.dispatchEvent(new CustomEvent(LOGIN_REQUIRED_EVENT, { detail: body }));
      }
    }).catch(() => {});
  }
  return res;
};

try {
  Object.defineProperty(window, 'fetch', {
    value: customFetch,
    writable: true,
    configurable: true
  });
} catch {
  try {
    (window as any).fetch = customFetch;
  } catch (e) {
    console.warn('Failed to override fetch', e);
  }
}
