// Sincronização dos dados do CRM com o servidor (Supabase).
// O navegador continua guardando tudo no localStorage para a tela ser rápida,
// mas cada mudança é enviada ao servidor e as mudanças dos outros usuários são puxadas.

export type SyncEntity =
  | 'users' | 'pipelines' | 'tags' | 'companies' | 'products' | 'contacts' | 'leads'
  | 'tasks' | 'notes' | 'activities' | 'messageTemplates' | 'emailTemplates'
  | 'automationRules' | 'salesBots' | 'savedFilters' | 'settings';

const KEYS: Record<SyncEntity, string> = {
  users: 'conversa_crm_users_v1',
  pipelines: 'conversa_crm_pipelines_v1',
  tags: 'conversa_crm_tags_v1',
  companies: 'conversa_crm_companies_v1',
  products: 'conversa_crm_products_v1',
  contacts: 'conversa_crm_contacts_v1',
  leads: 'conversa_crm_leads_v1',
  tasks: 'conversa_crm_tasks_v1',
  notes: 'conversa_crm_notes_v1',
  activities: 'conversa_crm_activities_v1',
  messageTemplates: 'conversa_crm_templates_v1',
  emailTemplates: 'conversa_crm_email_templates_v1',
  automationRules: 'conversa_crm_auto_rules_v1',
  salesBots: 'conversa_crm_sales_bots_v1',
  savedFilters: 'conversa_crm_saved_lead_filters_v1',
  settings: 'conversa_crm_settings_v1',
};
const ENTITIES = Object.keys(KEYS) as SyncEntity[];

// v3: força baixar tudo de novo uma vez (corrige registros que ficaram de fora)
const SINCE_KEY = 'conversa_crm_sync_since_v3';
const EPOCH = '1970-01-01T00:00:00.000Z';

type Change = { entity: SyncEntity; id: string; data: any; deleted: boolean };

const clientId = (() => {
  try {
    let id = localStorage.getItem('conversa_crm_client_id');
    if (!id) {
      id = (crypto as any).randomUUID ? crypto.randomUUID() : `c-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem('conversa_crm_client_id', id);
    }
    return id;
  } catch {
    return 'navegador';
  }
})();

function readLocal(entity: SyncEntity): any[] {
  try {
    const raw = localStorage.getItem(KEYS[entity]);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Última versão conhecida de cada registro (para enviar só o que mudou)
const snapshots = new Map<SyncEntity, Map<string, string>>();
for (const entity of ENTITIES) {
  const map = new Map<string, string>();
  for (const r of readLocal(entity)) if (r && r.id) map.set(r.id, JSON.stringify(r));
  snapshots.set(entity, map);
}

const pending = new Map<string, Change>();
const inflight = new Set<string>();
const ackTimes = new Map<string, number>();
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let syncAvailable = true;

const keyOf = (entity: string, id: string) => `${entity}:${id}`;

function schedulePush(delay = 800) {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => { void pushNow(); }, delay);
}

// Chamado pelo storage.ts sempre que uma lista é salva
export function queueSync(entity: SyncEntity, items: any[]) {
  const snap = snapshots.get(entity);
  if (!snap || !Array.isArray(items)) return;
  const seen = new Set<string>();
  for (const r of items) {
    if (!r || !r.id) continue;
    seen.add(r.id);
    const json = JSON.stringify(r);
    if (snap.get(r.id) !== json) {
      snap.set(r.id, json);
      pending.set(keyOf(entity, r.id), { entity, id: r.id, data: r, deleted: false });
    }
  }
  for (const id of [...snap.keys()]) {
    if (!seen.has(id)) {
      snap.delete(id);
      pending.set(keyOf(entity, id), { entity, id, data: null, deleted: true });
    }
  }
  if (pending.size > 0) schedulePush();
}

async function pushNow() {
  if (pending.size === 0 || !syncAvailable) return;
  const batch = [...pending.values()].slice(0, 300);
  batch.forEach(c => { const k = keyOf(c.entity, c.id); pending.delete(k); inflight.add(k); });
  try {
    const res = await fetch('/api/crm/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, changes: batch })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
    const t = new Date(data.serverTime).getTime();
    batch.forEach(c => ackTimes.set(keyOf(c.entity, c.id), t));
  } catch (err) {
    console.warn('[Sincronização] falha ao enviar, tentando de novo em 5 s:', err);
    batch.forEach(c => { const k = keyOf(c.entity, c.id); if (!pending.has(k)) pending.set(k, c); });
    schedulePush(5000);
  } finally {
    batch.forEach(c => inflight.delete(keyOf(c.entity, c.id)));
  }
  if (pending.size > 0) schedulePush(200);
}

function applyRecords(records: any[]): boolean {
  if (!records.length) return false;
  const byEntity = new Map<SyncEntity, any[]>();
  for (const r of records) {
    if (!ENTITIES.includes(r.entity)) continue;
    const k = keyOf(r.entity, r.id);
    if (pending.has(k) || inflight.has(k)) continue; // mudança local ainda não enviada vence
    const ack = ackTimes.get(k);
    if (ack && new Date(r.updated_at).getTime() < ack) continue; // versão antiga
    if (!byEntity.has(r.entity)) byEntity.set(r.entity, []);
    byEntity.get(r.entity)!.push(r);
  }
  let changed = false;
  for (const [entity, recs] of byEntity) {
    const list = readLocal(entity);
    const index = new Map(list.map((item, i) => [item.id, i]));
    const snap = snapshots.get(entity)!;
    let removed = false;
    for (const r of recs) {
      if (r.deleted) {
        if (index.has(r.id)) { list[index.get(r.id)!] = null; removed = true; changed = true; }
        snap.delete(r.id);
      } else {
        const json = JSON.stringify(r.data);
        if (index.has(r.id)) {
          if (JSON.stringify(list[index.get(r.id)!]) !== json) { list[index.get(r.id)!] = r.data; changed = true; }
        } else {
          list.push(r.data);
          index.set(r.id, list.length - 1);
          changed = true;
        }
        snap.set(r.id, json);
      }
    }
    const finalList = removed ? list.filter(Boolean) : list;
    try {
      localStorage.setItem(KEYS[entity], JSON.stringify(finalList));
    } catch (err) {
      console.warn('[Sincronização] não foi possível gravar no navegador:', err);
    }
  }
  return changed;
}

// Na primeira sincronização deste navegador, envia o que só existe aqui
function pushLocalOnly(serverKeys: Set<string>) {
  for (const entity of ENTITIES) {
    for (const r of readLocal(entity)) {
      if (!r || !r.id) continue;
      const k = keyOf(entity, r.id);
      if (!serverKeys.has(k)) pending.set(k, { entity, id: r.id, data: r, deleted: false });
    }
  }
  if (pending.size > 0) schedulePush(300);
}

let pulling = false;
let lastPullOk = false;

// true quando a última busca no servidor terminou sem erro
export function lastPullSucceeded() {
  return lastPullOk;
}

// Puxa as mudanças do servidor. Retorna true se algo mudou no navegador.
export async function pullCrmChanges(): Promise<boolean> {
  if (pulling) return false;
  pulling = true;
  let changed = false;
  let ok = false;
  try {
    const firstSync = !localStorage.getItem(SINCE_KEY);
    let since = localStorage.getItem(SINCE_KEY) || EPOCH;
    const serverKeys = new Set<string>();
    for (let round = 0; round < 20; round++) {
      const res = await fetch(`/api/crm/feed?since=${encodeURIComponent(since)}`);
      if (!res.ok) { syncAvailable = res.status !== 404; break; }
      const feed = await res.json();
      if (feed.error) { syncAvailable = false; console.warn('[Sincronização]', feed.error); break; }
      syncAvailable = true;
      const records: any[] = Array.isArray(feed.records) ? feed.records : [];
      if (firstSync) records.forEach(r => serverKeys.add(keyOf(r.entity, r.id)));
      if (applyRecords(records)) changed = true;
      if (feed.nextSince) { since = feed.nextSince; localStorage.setItem(SINCE_KEY, since); }
      if (!feed.hasMore) {
        ok = true;
        if (firstSync && syncAvailable) {
          if (!localStorage.getItem(SINCE_KEY)) localStorage.setItem(SINCE_KEY, EPOCH);
          pushLocalOnly(serverKeys);
        }
        break;
      }
    }
  } catch (err) {
    console.warn('[Sincronização] falha ao buscar mudanças:', err);
  } finally {
    pulling = false;
    lastPullOk = ok;
  }
  return changed;
}

// Para recomeçar do zero (ex.: depois de "Apagar tudo")
export function resetSyncCursor() {
  localStorage.removeItem(SINCE_KEY);
}

// Depois de "Restaurar exemplos" ou "Apagar tudo" no navegador: não apaga nada no servidor.
// Só limpa o cache local e baixa tudo de novo na próxima atualização.
export function rebaseAfterLocalReset() {
  pending.clear();
  for (const entity of ENTITIES) {
    const map = new Map<string, string>();
    for (const r of readLocal(entity)) if (r && r.id) map.set(r.id, JSON.stringify(r));
    snapshots.set(entity, map);
  }
  localStorage.removeItem(SINCE_KEY);
}

// Depois de importar um backup: envia tudo o que está no navegador para o servidor
export function pushAllLocal() {
  for (const entity of ENTITIES) {
    const snap = snapshots.get(entity)!;
    for (const r of readLocal(entity)) {
      if (!r || !r.id) continue;
      snap.set(r.id, JSON.stringify(r));
      pending.set(keyOf(entity, r.id), { entity, id: r.id, data: r, deleted: false });
    }
  }
  if (pending.size > 0) schedulePush(300);
}
