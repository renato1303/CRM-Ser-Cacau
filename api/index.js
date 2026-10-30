// API do CRM (Express). Na Vercel roda como função serverless; no AI Studio é carregada pelo server.ts.
// Não coloque dados simulados aqui.
import express from "express";
import crypto from "crypto";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
dotenv.config();
const app = express();
app.use(express.json({ limit: "10mb", verify: (req, _res, buf) => {
  req.rawBody = buf;
} }));
const PORT = process.env.PORT || 3e3;
const GRAPH_API_VERSION = process.env.GRAPH_API_VERSION || "v19.0";
const META_APP_ID = process.env.META_APP_ID || process.env.VITE_META_APP_ID || "";
const META_APP_SECRET = process.env.META_APP_SECRET || "";
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "";
const EVOLUTION_API_URL = (process.env.EVOLUTION_API_URL || "").trim().replace(/\/+$/, "");
const EVOLUTION_API_KEY = (process.env.EVOLUTION_API_KEY || "").trim();
const EVOLUTION_WEBHOOK_SECRET = (process.env.EVOLUTION_WEBHOOK_SECRET || "").trim();
const VERCEL_PRODUCTION_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "";
const PUBLIC_BASE_URL = (process.env.PUBLIC_WEBHOOK_BASE_URL || VERCEL_PRODUCTION_URL || process.env.APP_URL || "").trim().replace(/\/+$/, "");
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } }) : null;
const WEBHOOK_EVENTS = [
  "QRCODE_UPDATED",
  "CONNECTION_UPDATE",
  "MESSAGES_UPSERT",
  "MESSAGES_UPDATE",
  "SEND_MESSAGE",
  "CONTACTS_UPSERT",
  "CONTACTS_UPDATE"
];
class EvolutionError extends Error {
  status;
  body;
  constructor(status, message, body) {
    super(message);
    this.status = status;
    this.body = body;
  }
}
const enc = (s) => encodeURIComponent(s);
async function evo(endpoint, options = {}) {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    throw new EvolutionError(0, "EVOLUTION_API_URL ou EVOLUTION_API_KEY não estão configurados (variáveis de ambiente da Vercel ou Secrets do AI Studio).");
  }
  const method = options.method || "GET";
  const start = Date.now();
  let res;
  try {
    res = await fetch(`${EVOLUTION_API_URL}${endpoint}`, {
      method,
      headers: { apikey: EVOLUTION_API_KEY, "Content-Type": "application/json" },
      body: options.body !== void 0 ? JSON.stringify(options.body) : void 0
    });
  } catch (err) {
    const cause = err?.cause?.code || err?.cause?.message || err?.message || "erro de rede";
    console.error(`[Evolution] ${method} ${endpoint} -> sem resposta (${cause})`);
    throw new EvolutionError(0, `O servidor da Evolution não respondeu em ${EVOLUTION_API_URL} (${cause}).`);
  }
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  console.log(`[Evolution] ${method} ${endpoint} -> ${res.status} (${Date.now() - start}ms)`);
  if (!res.ok) {
    throw new EvolutionError(res.status, `Evolution respondeu ${res.status} em ${method} ${endpoint}: ${text.slice(0, 400)}`, data);
  }
  return data;
}
function db() {
  if (!supabaseAdmin) {
    throw new Error("Supabase não configurado no servidor: defina SUPABASE_URL (ou VITE_SUPABASE_URL) e SUPABASE_SERVICE_ROLE_KEY nas variáveis de ambiente (Vercel) ou Secrets (AI Studio).");
  }
  return supabaseAdmin;
}
function check(result, context) {
  if (result.error) {
    throw new Error(`Supabase (${context}): ${result.error.message}${result.error.hint ? " — " + result.error.hint : ""}`);
  }
  return result.data;
}
function errorMessage(err) {
  return err?.message || String(err);
}
function isIgnoredJid(jid) {
  return !jid || jid.endsWith("@g.us") || jid.endsWith("@broadcast") || jid.endsWith("@newsletter");
}
function resolveJid(key) {
  const raw = key?.remoteJid || "";
  const alt = [key?.remoteJidAlt, key?.senderPn, key?.participantAlt].find((j) => typeof j === "string" && j.endsWith("@s.whatsapp.net"));
  const jid = raw.endsWith("@s.whatsapp.net") ? raw : alt || raw;
  const phone = jid.endsWith("@s.whatsapp.net") ? jid.split("@")[0].split(":")[0] : "";
  return { remoteJid: jid, phone };
}
function conversationIdFor(instance, remoteJid) {
  return `wa:${instance}:${remoteJid.split("@")[0]}`;
}
function waKey(remoteJid) {
  return remoteJid.split("@")[0];
}
function unwrapMessage(message) {
  let m = message || {};
  for (let i = 0; i < 4; i++) {
    const inner = m.ephemeralMessage?.message || m.viewOnceMessage?.message || m.viewOnceMessageV2?.message || m.viewOnceMessageV2Extension?.message || m.documentWithCaptionMessage?.message || m.editedMessage?.message;
    if (!inner) break;
    m = inner;
  }
  return m;
}
function extractContent(message) {
  const m = unwrapMessage(message);
  if (!m || typeof m !== "object") return null;
  if (m.protocolMessage || m.reactionMessage) return null;
  if (m.conversation) return { tipo: "texto", conteudo: m.conversation };
  if (m.extendedTextMessage?.text) return { tipo: "texto", conteudo: m.extendedTextMessage.text };
  if (m.imageMessage) return { tipo: "imagem", conteudo: m.imageMessage.caption || "[Imagem]" };
  if (m.videoMessage) return { tipo: "arquivo", conteudo: m.videoMessage.caption || "[Vídeo]" };
  if (m.audioMessage) return { tipo: "audio", conteudo: "[Áudio]" };
  if (m.documentMessage) return { tipo: "arquivo", conteudo: `[Documento] ${m.documentMessage.fileName || ""}`.trim() };
  if (m.stickerMessage) return { tipo: "imagem", conteudo: "[Figurinha]" };
  if (m.locationMessage || m.liveLocationMessage) return { tipo: "texto", conteudo: "[Localização]" };
  if (m.contactMessage || m.contactsArrayMessage) return { tipo: "texto", conteudo: "[Contato]" };
  if (m.buttonsResponseMessage) return { tipo: "texto", conteudo: m.buttonsResponseMessage.selectedDisplayText || "[Resposta de botão]" };
  if (m.listResponseMessage) return { tipo: "texto", conteudo: m.listResponseMessage.title || "[Resposta de lista]" };
  if (m.templateButtonReplyMessage) return { tipo: "texto", conteudo: m.templateButtonReplyMessage.selectedDisplayText || "[Resposta]" };
  if (m.pollCreationMessage || m.pollCreationMessageV3) return { tipo: "texto", conteudo: `[Enquete] ${(m.pollCreationMessage || m.pollCreationMessageV3).name || ""}`.trim() };
  if (m.senderKeyDistributionMessage && Object.keys(m).length <= 2) return null;
  return { tipo: "texto", conteudo: "[Mensagem não suportada]" };
}
function toIsoTimestamp(ts) {
  let seconds = ts;
  if (ts && typeof ts === "object") seconds = ts.low ?? ts.seconds ?? ts.toString?.();
  const n = Number(seconds);
  if (!n || Number.isNaN(n)) return (/* @__PURE__ */ new Date()).toISOString();
  return new Date(n > 1e12 ? n : n * 1e3).toISOString();
}
const STATUS_RANK = { enviada: 1, entregue: 2, lida: 3 };
function mapStatus(s) {
  if (s === void 0 || s === null || s === "") return null;
  if (typeof s === "number") {
    if (s === 0) return "falhou";
    if (s <= 2) return "enviada";
    if (s === 3) return "entregue";
    return "lida";
  }
  const v = String(s).toUpperCase();
  if (v.includes("READ") || v.includes("PLAYED")) return "lida";
  if (v.includes("DELIVERY")) return "entregue";
  if (v.includes("ERROR") || v.includes("FAIL")) return "falhou";
  if (v.includes("SERVER") || v.includes("PENDING") || v.includes("SENT")) return "enviada";
  return null;
}
function formatPhone(raw) {
  const clean = (raw || "").split("@")[0].split(":")[0].replace(/\D/g, "");
  if (clean.length === 13 && clean.startsWith("55")) return `+55 (${clean.slice(2, 4)}) ${clean.slice(4, 9)}-${clean.slice(9)}`;
  if (clean.length === 12 && clean.startsWith("55")) return `+55 (${clean.slice(2, 4)}) ${clean.slice(4, 8)}-${clean.slice(8)}`;
  return clean ? `+${clean}` : "";
}
function pickArray(data) {
  if (Array.isArray(data)) return data;
  const candidates = [data?.messages?.records, data?.records, data?.messages, data?.chats, data?.data, data?.instances];
  return candidates.find(Array.isArray) || [];
}
async function saveIncomingMessage(instance, msg, live) {
  const key = msg?.key || {};
  const { remoteJid, phone } = resolveJid(key);
  if (isIgnoredJid(remoteJid) || !key.id) return "ignorada";
  const content = extractContent(msg.message);
  if (!content) return "ignorada";
  const sb = db();
  const fromMe = !!key.fromMe;
  const sentAt = toIsoTimestamp(msg.messageTimestamp);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const convId = conversationIdFor(instance, remoteJid);
  const existingConv = check(await sb.from("wa_conversations").select("id, nao_lidas, ultima_mensagem_at, contact_name, criar_lead").eq("id", convId).maybeSingle(), "ler conversa");
  const existingMsg = check(await sb.from("wa_messages").select("id, status").eq("id", key.id).maybeSingle(), "ler mensagem");
  const isNew = !existingMsg;
  const isLatest = !existingConv?.ultima_mensagem_at || new Date(sentAt).getTime() >= new Date(existingConv.ultima_mensagem_at).getTime();
  const contactName = !fromMe && msg.pushName ? msg.pushName : existingConv?.contact_name || formatPhone(phone) || waKey(remoteJid);
  let naoLidas = existingConv?.nao_lidas || 0;
  if (live && isNew) naoLidas = fromMe ? 0 : naoLidas + 1;
  const convRow = {
    id: convId,
    instance_name: instance,
    remote_jid: remoteJid,
    phone: phone || null,
    contact_name: contactName,
    nao_lidas: naoLidas,
    criar_lead: Boolean(existingConv?.criar_lead) || live && !fromMe,
    updated_at: now
  };
  if (isLatest) {
    convRow.ultima_mensagem = content.conteudo;
    convRow.ultima_mensagem_at = sentAt;
  }
  check(await sb.from("wa_conversations").upsert(convRow, { onConflict: "id" }), "gravar conversa");
  const payloadStatus = mapStatus(msg.status);
  if (isNew) {
    check(await sb.from("wa_messages").upsert({
      id: key.id,
      conversation_id: convId,
      from_me: fromMe,
      tipo: content.tipo,
      conteudo: content.conteudo,
      status: payloadStatus || (fromMe ? "enviada" : "entregue"),
      enviada_at: sentAt,
      updated_at: now
    }, { onConflict: "id" }), "gravar mensagem");
  } else {
    const update = { conteudo: content.conteudo, tipo: content.tipo, updated_at: now };
    if (payloadStatus && (payloadStatus === "falhou" || (STATUS_RANK[payloadStatus] || 0) > (STATUS_RANK[existingMsg.status] || 0))) {
      update.status = payloadStatus;
    }
    check(await sb.from("wa_messages").update(update).eq("id", key.id), "atualizar mensagem");
  }
  return isNew ? "nova" : "atualizada";
}
async function updateMessageStatus(item) {
  const id = item?.keyId || item?.key?.id || item?.messageId || item?.id;
  const status = mapStatus(item?.status ?? item?.update?.status);
  if (!id || !status) return;
  const sb = db();
  const current = check(await sb.from("wa_messages").select("status").eq("id", id).maybeSingle(), "ler status");
  if (!current) return;
  if (status !== "falhou" && (STATUS_RANK[status] || 0) <= (STATUS_RANK[current.status] || 0)) return;
  check(await sb.from("wa_messages").update({ status, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", id), "atualizar status");
}
async function updateContactNames(instance, items) {
  const sb = db();
  for (const c of items) {
    const jid = c?.remoteJid || c?.id || "";
    const name = c?.pushName || c?.name || c?.notify || "";
    if (!jid || !name || isIgnoredJid(jid)) continue;
    check(await sb.from("wa_conversations").update({ contact_name: name, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", conversationIdFor(instance, jid)), "atualizar nome do contato");
  }
}
let webhookLogCount = 0;
async function logWebhook(instance, event, ok, detail) {
  if (!supabaseAdmin) return;
  try {
    await supabaseAdmin.from("wa_webhook_log").insert({ instance, event, ok, detail: detail?.slice(0, 1e3) || null });
    await supabaseAdmin.from("wa_instances").upsert({
      instance_name: instance || "desconhecida",
      last_event_at: (/* @__PURE__ */ new Date()).toISOString(),
      last_event_type: event,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }, { onConflict: "instance_name" });
    webhookLogCount++;
    if (webhookLogCount % 200 === 0) {
      const cutoff = new Date(Date.now() - 3 * 24 * 3600 * 1e3).toISOString();
      await supabaseAdmin.from("wa_webhook_log").delete().lt("received_at", cutoff);
    }
  } catch (err) {
    console.warn("[Webhook QR] falha ao registrar log:", errorMessage(err));
  }
}
const ALLOWED_EMAILS = (process.env.CRM_ALLOWED_EMAILS || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
const PUBLIC_API = [
  /^\/api\/webhook\//,
  /^\/api\/wa\/diagnostics/,
  /^\/api\/leads\/ingest/,
  /^\/api\/disparos\//,
  /^\/api\/google\/callback/
];
const tokenCache = /* @__PURE__ */ new Map();
app.use("/api", async (req, res, next) => {
  const url = req.originalUrl || req.url || "";
  if (PUBLIC_API.some((r) => r.test(url))) return next();
  if (!supabaseAdmin) {
    return res.status(503).json({ error: "Servidor sem Supabase configurado (SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY).", code: "NO_SUPABASE" });
  }
  const token = (req.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return res.status(401).json({ error: "Faça login para continuar.", code: "LOGIN_REQUIRED" });
  let email = "";
  const cached = tokenCache.get(token);
  if (cached && cached.expires > Date.now()) {
    email = cached.email;
  } else {
    try {
      const { data, error } = await supabaseAdmin.auth.getUser(token);
      if (error || !data?.user?.email) return res.status(401).json({ error: "Sessão expirada. Faça login novamente.", code: "LOGIN_REQUIRED" });
      email = data.user.email.toLowerCase();
      if (tokenCache.size > 500) tokenCache.clear();
      tokenCache.set(token, { email, expires: Date.now() + 6e4 });
    } catch (err) {
      return res.status(503).json({ error: `Falha ao validar o login: ${errorMessage(err)}` });
    }
  }
  if (ALLOWED_EMAILS.length > 0 && !ALLOWED_EMAILS.includes(email)) {
    return res.status(403).json({ error: `O e-mail ${email} não tem acesso a este CRM.`, code: "EMAIL_NOT_ALLOWED" });
  }
  req.authEmail = email;
  return next();
});
function webhookUrlFor() {
  if (!PUBLIC_BASE_URL) {
    throw new Error("A URL pública do CRM não está definida. Defina PUBLIC_WEBHOOK_BASE_URL com a URL publicada do CRM (ex.: https://seu-projeto.vercel.app).");
  }
  const token = EVOLUTION_WEBHOOK_SECRET ? `?token=${enc(EVOLUTION_WEBHOOK_SECRET)}` : "";
  return `${PUBLIC_BASE_URL}/api/webhook/whatsapp-qr${token}`;
}
function publicUrlWarning() {
  if (!PUBLIC_BASE_URL) return "URL pública do CRM não definida (PUBLIC_WEBHOOK_BASE_URL).";
  if (PUBLIC_BASE_URL.includes("ais-dev")) {
    return "O webhook está apontando para a URL de desenvolvimento do AI Studio (ais-dev), que não recebe chamadas externas. Use a URL publicada (Vercel) e, se precisar, defina PUBLIC_WEBHOOK_BASE_URL com ela.";
  }
  return null;
}
async function configureWebhook(instanceName) {
  const url = webhookUrlFor();
  const headers = EVOLUTION_WEBHOOK_SECRET ? { "x-webhook-secret": EVOLUTION_WEBHOOK_SECRET } : {};
  try {
    await evo(`/webhook/set/${enc(instanceName)}`, {
      method: "POST",
      body: { webhook: { enabled: true, url, headers, byEvents: false, base64: false, events: WEBHOOK_EVENTS } }
    });
  } catch (err) {
    if (err instanceof EvolutionError && err.status === 400) {
      await evo(`/webhook/set/${enc(instanceName)}`, {
        method: "POST",
        body: { enabled: true, url, webhookByEvents: false, webhookBase64: false, events: WEBHOOK_EVENTS }
      });
    } else {
      throw err;
    }
  }
  return url.replace(/token=[^&]+/, "token=***");
}
async function getInstanceInfo(instanceName) {
  let state = "close";
  try {
    const st = await evo(`/instance/connectionState/${enc(instanceName)}`);
    state = st?.instance?.state || st?.state || "close";
  } catch (err) {
    if (!(err instanceof EvolutionError) || err.status === 0) throw err;
  }
  let found = null;
  try {
    const list = pickArray(await evo(`/instance/fetchInstances?instanceName=${enc(instanceName)}`));
    found = list.map((i) => i?.instance || i).find((i) => (i?.name || i?.instanceName) === instanceName) || null;
  } catch {
  }
  const owner = found?.ownerJid || found?.owner || found?.number || "";
  return {
    state,
    numero: formatPhone(owner),
    profileName: found?.profileName || ""
  };
}
async function linkInstance(instanceName, nomeConexao) {
  const info = await getInstanceInfo(instanceName);
  const webhookUrl = await configureWebhook(instanceName);
  check(await db().from("wa_instances").upsert({
    instance_name: instanceName,
    nome_conexao: nomeConexao || info.profileName || instanceName,
    status: info.state,
    numero: info.numero,
    perfil_nome: info.profileName,
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  }, { onConflict: "instance_name" }), "gravar instância");
  return { ...info, webhookUrl, warning: publicUrlWarning() };
}
app.get("/api/webhook/whatsapp", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode && token) {
    if (mode === "subscribe" && WHATSAPP_VERIFY_TOKEN && token === WHATSAPP_VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.sendStatus(403);
  }
  return res.sendStatus(400);
});
app.post("/api/whatsapp/onboarding", async (req, res) => {
  const { code, waba_id, phone_number_id, type } = req.body;
  if (!waba_id || !phone_number_id) {
    return res.status(400).json({ error: "WABA ID and Phone Number ID are required" });
  }
  try {
    let accessToken = process.env.WHATSAPP_TOKEN || "";
    if (code && META_APP_ID && META_APP_SECRET) {
      const tokenUrl = `https://graph.facebook.com/${GRAPH_API_VERSION}/oauth/access_token?client_id=${META_APP_ID}&client_secret=${META_APP_SECRET}&code=${code}`;
      const tokenRes = await fetch(tokenUrl);
      const tokenData = await tokenRes.json();
      if (tokenRes.ok && tokenData.access_token) accessToken = tokenData.access_token;
    }
    const accountRecord = {
      id: phone_number_id,
      waba_id,
      phone_number_id,
      coexistence: type === "app",
      access_token: accessToken,
      status: "conectado",
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (supabaseAdmin) {
      const { error } = await supabaseAdmin.from("whatsapp_accounts").upsert(accountRecord);
      if (error) console.warn("Supabase whatsapp_accounts:", error.message);
    }
    return res.json({ success: true, account: { ...accountRecord, access_token: void 0 } });
  } catch (err) {
    return res.status(500).json({ error: errorMessage(err) });
  }
});
app.post("/api/evolution/test", async (_req, res) => {
  const result = {
    success: false,
    url: EVOLUTION_API_URL || "(não configurada)",
    responded: false,
    apiKeyAccepted: false,
    version: null,
    webhookBaseUrl: PUBLIC_BASE_URL || "(não configurada)",
    supabaseConfigurado: Boolean(supabaseAdmin),
    warning: publicUrlWarning()
  };
  try {
    const root = await evo("/");
    result.responded = true;
    result.version = root?.version || "v2";
  } catch (err) {
    result.error = errorMessage(err);
    return res.json(result);
  }
  try {
    await evo("/instance/fetchInstances");
    result.apiKeyAccepted = true;
    result.success = true;
  } catch (err) {
    result.error = `O servidor respondeu, mas a chave foi recusada: ${errorMessage(err)}`;
  }
  return res.json(result);
});
app.get("/api/evolution/instances", async (_req, res) => {
  try {
    const list = pickArray(await evo("/instance/fetchInstances")).map((i) => i?.instance || i);
    const instances = list.map((i) => {
      const name = i?.name || i?.instanceName;
      const owner = i?.ownerJid || i?.owner || i?.number || "";
      return {
        name,
        instanceName: name,
        connectionStatus: i?.connectionStatus || i?.state || i?.status || "close",
        owner: formatPhone(owner),
        number: formatPhone(owner),
        profileName: i?.profileName || name
      };
    }).filter((i) => i.name);
    return res.json({ success: true, instances });
  } catch (err) {
    return res.status(502).json({ error: errorMessage(err) });
  }
});
app.post("/api/evolution/link", async (req, res) => {
  const { instanceName, nomeConexao } = req.body || {};
  if (!instanceName) return res.status(400).json({ error: "instanceName é obrigatório" });
  try {
    const info = await linkInstance(instanceName, nomeConexao);
    return res.json({ success: true, ...info });
  } catch (err) {
    console.error("[Evolution link]", errorMessage(err));
    return res.status(502).json({ error: errorMessage(err) });
  }
});
app.post("/api/evolution/create", async (req, res) => {
  const { instanceName, options } = req.body || {};
  if (!instanceName) return res.status(400).json({ error: "instanceName é obrigatório" });
  try {
    try {
      await evo("/instance/create", {
        method: "POST",
        body: {
          instanceName,
          integration: "WHATSAPP-BAILEYS",
          qrcode: true,
          groupsIgnore: options?.ignoreGroups ?? true,
          rejectCall: options?.rejectCall ?? false,
          alwaysOnline: false,
          readMessages: false,
          readStatus: false,
          syncFullHistory: false
        }
      });
    } catch (err) {
      const already = err instanceof EvolutionError && [400, 403, 409].includes(err.status) && /already|exist|in use|em uso/i.test(err.message);
      if (!already) throw err;
    }
    let webhookWarning = publicUrlWarning();
    try {
      await configureWebhook(instanceName);
    } catch (err) {
      webhookWarning = `Webhook não configurado: ${errorMessage(err)}`;
      console.error("[Evolution create]", webhookWarning);
    }
    if (supabaseAdmin) {
      const { error } = await supabaseAdmin.from("wa_instances").upsert({
        instance_name: instanceName,
        nome_conexao: options?.nomeConexao || instanceName,
        status: "connecting",
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      }, { onConflict: "instance_name" });
      if (error) console.warn("[Evolution create] Supabase:", error.message);
    }
    const connect = await evo(`/instance/connect/${enc(instanceName)}`);
    if (connect?.instance?.state === "open") {
      return res.json({ success: true, alreadyConnected: true, instanceName, warning: webhookWarning });
    }
    const qrBase64 = connect?.base64 || connect?.qrcode?.base64 || null;
    if (!qrBase64) {
      return res.status(502).json({ error: 'A Evolution não devolveu o QR Code. Clique em "Gerar Novo QR" em alguns segundos.' });
    }
    return res.json({ success: true, qrBase64, pairingCode: connect?.pairingCode || null, instanceName, warning: webhookWarning });
  } catch (err) {
    console.error("[Evolution create]", errorMessage(err));
    return res.status(502).json({ error: errorMessage(err) });
  }
});
app.post("/api/evolution/connect-qr", async (req, res) => {
  const { instanceName } = req.body || {};
  if (!instanceName) return res.status(400).json({ error: "instanceName é obrigatório" });
  try {
    const connect = await evo(`/instance/connect/${enc(instanceName)}`);
    if (connect?.instance?.state === "open") return res.json({ success: true, alreadyConnected: true });
    return res.json({ success: true, qrBase64: connect?.base64 || null, pairingCode: connect?.pairingCode || null });
  } catch (err) {
    return res.status(502).json({ error: errorMessage(err) });
  }
});
app.post("/api/evolution/state", async (req, res) => {
  const { instanceName, nomeConexao } = req.body || {};
  if (!instanceName) return res.status(400).json({ error: "instanceName é obrigatório" });
  try {
    const info = await getInstanceInfo(instanceName);
    if (info.state === "open") {
      const linked = await linkInstance(instanceName, nomeConexao);
      return res.json({ success: true, ...linked });
    }
    return res.json({ success: true, state: info.state });
  } catch (err) {
    return res.status(502).json({ error: errorMessage(err) });
  }
});
app.post("/api/evolution/logout", async (req, res) => {
  const { instanceName } = req.body || {};
  try {
    await evo(`/instance/logout/${enc(instanceName)}`, { method: "DELETE" });
    if (supabaseAdmin) await supabaseAdmin.from("wa_instances").update({ status: "close" }).eq("instance_name", instanceName);
    return res.json({ success: true });
  } catch (err) {
    return res.status(502).json({ error: errorMessage(err) });
  }
});
app.post("/api/evolution/delete", async (req, res) => {
  const { instanceName } = req.body || {};
  try {
    await evo(`/instance/delete/${enc(instanceName)}`, { method: "DELETE" });
  } catch (err) {
    if (!(err instanceof EvolutionError) || err.status !== 404) {
      return res.status(502).json({ error: errorMessage(err) });
    }
  }
  if (supabaseAdmin) await supabaseAdmin.from("wa_instances").delete().eq("instance_name", instanceName);
  return res.json({ success: true });
});
app.get("/api/webhook/whatsapp-qr", (_req, res) => {
  res.json({ ok: true, message: "Webhook do CRM acessível. A Evolution deve enviar POST para este endereço." });
});
app.post("/api/webhook/whatsapp-qr", async (req, res) => {
  const body = req.body || {};
  const event = String(body.event || "").toLowerCase().replace(/_/g, ".");
  const instance = body.instance || body.instanceName || "";
  const secret = req.get("x-webhook-secret") || (typeof req.query.token === "string" ? req.query.token : "");
  if (EVOLUTION_WEBHOOK_SECRET && secret !== EVOLUTION_WEBHOOK_SECRET) {
    console.warn(`[Webhook QR] segredo inválido (instância ${instance}, evento ${event})`);
    await logWebhook(instance, event, false, "Segredo do webhook inválido");
    return res.sendStatus(401);
  }
  try {
    const data = body.data;
    const items = Array.isArray(data) ? data : Array.isArray(data?.messages) ? data.messages : data ? [data] : [];
    if (event === "messages.upsert" || event === "send.message") {
      for (const msg of items) await saveIncomingMessage(instance, msg, true);
    } else if (event === "messages.update") {
      for (const item of items) await updateMessageStatus(item);
    } else if (event === "connection.update") {
      const state = data?.state;
      if (state && supabaseAdmin) {
        const update = { instance_name: instance, status: state, updated_at: (/* @__PURE__ */ new Date()).toISOString() };
        if (data?.wuid) update.numero = formatPhone(data.wuid);
        if (data?.profileName) update.perfil_nome = data.profileName;
        await supabaseAdmin.from("wa_instances").upsert(update, { onConflict: "instance_name" });
      }
    } else if (event === "contacts.upsert" || event === "contacts.update") {
      await updateContactNames(instance, items);
    }
    await logWebhook(instance, event, true);
  } catch (err) {
    console.error(`[Webhook QR] erro ao processar ${event}:`, errorMessage(err));
    await logWebhook(instance, event, false, errorMessage(err));
  }
  return res.sendStatus(200);
});
app.post("/api/wa/send", async (req, res) => {
  const { conversationId, text } = req.body || {};
  if (!conversationId || !text || !String(text).trim()) {
    return res.status(400).json({ error: "conversationId e text são obrigatórios" });
  }
  try {
    const sb = db();
    const conv = check(await sb.from("wa_conversations").select("*").eq("id", conversationId).maybeSingle(), "ler conversa");
    if (!conv) return res.status(404).json({ error: "Conversa não encontrada no servidor." });
    const number = conv.phone || conv.remote_jid;
    const sent = await evo(`/message/sendText/${enc(conv.instance_name)}`, {
      method: "POST",
      body: { number, text, delay: 1200 }
    });
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const messageId = sent?.key?.id || `crm-${Date.now()}`;
    const status = mapStatus(sent?.status) || "enviada";
    check(await sb.from("wa_messages").upsert({
      id: messageId,
      conversation_id: conversationId,
      from_me: true,
      tipo: "texto",
      conteudo: text,
      status,
      enviada_at: now,
      updated_at: now
    }, { onConflict: "id" }), "gravar mensagem enviada");
    check(await sb.from("wa_conversations").update({
      ultima_mensagem: text,
      ultima_mensagem_at: now,
      nao_lidas: 0,
      updated_at: now
    }).eq("id", conversationId), "atualizar conversa");
    return res.json({
      success: true,
      message: {
        id: messageId,
        conversationId,
        direcao: "saida",
        autor: "usuario",
        tipo: "texto",
        conteudo: text,
        status,
        enviadaAt: now
      }
    });
  } catch (err) {
    console.error("[WA send]", errorMessage(err));
    return res.status(502).json({ error: errorMessage(err) });
  }
});
app.post("/api/wa/read", async (req, res) => {
  const { conversationId } = req.body || {};
  if (!conversationId) return res.status(400).json({ error: "conversationId é obrigatório" });
  try {
    check(await db().from("wa_conversations").update({ nao_lidas: 0, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", conversationId).gt("nao_lidas", 0), "marcar como lida");
    return res.json({ success: true });
  } catch (err) {
    return res.status(502).json({ error: errorMessage(err) });
  }
});
app.get("/api/wa/feed", async (req, res) => {
  if (!supabaseAdmin) return res.json({ conversations: [], messages: [], nextSince: null, hasMore: false, error: "Supabase não configurado" });
  try {
    const since = typeof req.query.since === "string" && req.query.since ? req.query.since : "1970-01-01T00:00:00.000Z";
    const limit = PAGE_SIZE;
    const sb = db();
    let convs = check(await sb.from("wa_conversations").select("*").gt("updated_at", since).order("updated_at", { ascending: true }).limit(limit), "feed conversas") || [];
    let msgs = check(await sb.from("wa_messages").select("*").gt("updated_at", since).order("updated_at", { ascending: true }).limit(limit), "feed mensagens") || [];
    const withTies = async (table, list) => {
      if (list.length < limit) return list;
      const last = list[list.length - 1].updated_at;
      const ties = await fetchAllAtTime(table, "*", last, ["id"]);
      return list.filter((r) => r.updated_at !== last).concat(ties);
    };
    const convTruncated = convs.length >= limit;
    const msgTruncated = msgs.length >= limit;
    convs = await withTies("wa_conversations", convs);
    msgs = await withTies("wa_messages", msgs);
    const lastConv = convs.length ? convs[convs.length - 1].updated_at : since;
    const lastMsg = msgs.length ? msgs[msgs.length - 1].updated_at : since;
    const maxAll = [lastConv, lastMsg, since].sort().pop();
    let nextSince = maxAll;
    if (convTruncated) nextSince = lastConv < nextSince ? lastConv : nextSince;
    if (msgTruncated) nextSince = lastMsg < nextSince ? lastMsg : nextSince;
    return res.json({
      conversations: convs.map((c) => ({
        id: c.id,
        canal: "whatsapp",
        contactId: `wa-c-${waKey(c.remote_jid)}`,
        leadId: `wa-l-${waKey(c.remote_jid)}`,
        contactName: c.contact_name,
        waPhone: c.phone,
        waInstance: c.instance_name,
        naoLidas: c.nao_lidas || 0,
        ultimaMensagem: c.ultima_mensagem,
        ultimaMensagemAt: c.ultima_mensagem_at || c.updated_at,
        criarLead: Boolean(c.criar_lead)
      })),
      messages: msgs.map((m) => ({
        id: m.id,
        conversationId: m.conversation_id,
        direcao: m.from_me ? "saida" : "entrada",
        autor: m.from_me ? "usuario" : "contato",
        tipo: m.tipo,
        conteudo: m.conteudo,
        status: m.status,
        enviadaAt: m.enviada_at
      })),
      nextSince,
      hasMore: convTruncated || msgTruncated
    });
  } catch (err) {
    return res.status(500).json({ error: errorMessage(err) });
  }
});
app.post("/api/evolution/sync", async (req, res) => {
  const { instanceName } = req.body || {};
  const limitChats = Math.min(Number(req.body?.limitChats) || (process.env.VERCEL ? 30 : 100), 500);
  const limitMessages = Math.min(Number(req.body?.limitMessages) || 40, 200);
  if (!instanceName) return res.status(400).json({ error: "instanceName é obrigatório" });
  try {
    const sb = db();
    const chats = pickArray(await evo(`/chat/findChats/${enc(instanceName)}`, { method: "POST", body: {} })).filter((c) => !isIgnoredJid(c?.remoteJid || c?.id || "")).sort((a, b) => new Date(b?.updatedAt || 0).getTime() - new Date(a?.updatedAt || 0).getTime()).slice(0, limitChats);
    let syncedChats = 0;
    let syncedMessages = 0;
    const errors = [];
    for (const chat of chats) {
      const chatJid = chat?.remoteJid || chat?.id;
      try {
        const data = await evo(`/chat/findMessages/${enc(instanceName)}`, {
          method: "POST",
          body: { where: { key: { remoteJid: chatJid } }, page: 1, offset: limitMessages, limit: limitMessages }
        });
        const records = pickArray(data).slice(0, limitMessages);
        if (!records.length) continue;
        const firstKey = records.find((r) => r?.key)?.key || { remoteJid: chatJid };
        const { remoteJid, phone } = resolveJid({ ...firstKey, remoteJid: firstKey.remoteJid || chatJid });
        const convId = conversationIdFor(instanceName, remoteJid);
        const now = (/* @__PURE__ */ new Date()).toISOString();
        const rows = records.map((r) => {
          const content = extractContent(r?.message);
          if (!content || !r?.key?.id) return null;
          return {
            id: r.key.id,
            conversation_id: convId,
            from_me: Boolean(r.key.fromMe),
            tipo: content.tipo,
            conteudo: content.conteudo,
            status: mapStatus(r.status) || (r.key.fromMe ? "enviada" : "entregue"),
            enviada_at: toIsoTimestamp(r.messageTimestamp),
            updated_at: now
          };
        }).filter(Boolean);
        if (!rows.length) continue;
        const latest = rows.reduce((a, b) => a.enviada_at > b.enviada_at ? a : b);
        const contactName = chat?.pushName || chat?.name || records.find((r) => !r?.key?.fromMe && r?.pushName)?.pushName || formatPhone(phone) || waKey(remoteJid);
        const existing = check(await sb.from("wa_conversations").select("id, ultima_mensagem_at").eq("id", convId).maybeSingle(), "ler conversa");
        const convRow = {
          id: convId,
          instance_name: instanceName,
          remote_jid: remoteJid,
          phone: phone || null,
          contact_name: contactName,
          updated_at: now
        };
        if (!existing?.ultima_mensagem_at || latest.enviada_at >= new Date(existing.ultima_mensagem_at).toISOString()) {
          convRow.ultima_mensagem = latest.conteudo;
          convRow.ultima_mensagem_at = latest.enviada_at;
        }
        check(await sb.from("wa_conversations").upsert(convRow, { onConflict: "id" }), "gravar conversa");
        check(await sb.from("wa_messages").upsert(rows, { onConflict: "id", ignoreDuplicates: true }), "gravar mensagens");
        syncedChats++;
        syncedMessages += rows.length;
      } catch (err) {
        errors.push(`${chatJid}: ${errorMessage(err)}`);
        if (errors.length >= 5 && syncedChats === 0) break;
      }
    }
    return res.json({ success: true, syncedChats, syncedMessages, errors: errors.slice(0, 5) });
  } catch (err) {
    console.error("[Evolution sync]", errorMessage(err));
    return res.status(502).json({ error: errorMessage(err) });
  }
});
const CRM_ENTITIES = /* @__PURE__ */ new Set([
  "users",
  "pipelines",
  "tags",
  "companies",
  "products",
  "contacts",
  "leads",
  "tasks",
  "notes",
  "activities",
  "messageTemplates",
  "emailTemplates",
  "automationRules",
  "salesBots",
  "savedFilters",
  "settings"
]);
const INGEST_SECRET = (process.env.CRM_INGEST_SECRET || EVOLUTION_WEBHOOK_SECRET || "").trim();
function onlyDigits(v) {
  return String(v ?? "").replace(/\D/g, "");
}
function brPhone(raw) {
  let d = onlyDigits(raw);
  if (!d) return null;
  if (d.length === 10 || d.length === 11) d = "55" + d;
  if (!(d.startsWith("55") && (d.length === 12 || d.length === 13))) {
    return d.length >= 8 ? { e164: `+${d}`, display: `+${d}`, key: d } : null;
  }
  const ddd = d.slice(2, 4);
  const num = d.slice(4);
  const display = num.length === 9 ? `+55 (${ddd}) ${num.slice(0, 5)}-${num.slice(5)}` : `+55 (${ddd}) ${num.slice(0, 4)}-${num.slice(4)}`;
  return { e164: `+${d}`, display, key: `55${ddd}${num.slice(-8)}` };
}
function slugify(v) {
  return v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}
function matchKeyFor(entity, data) {
  if (!data) return null;
  if (entity === "contacts") {
    const phones = [...Array.isArray(data.telefones) ? data.telefones : [], data.canais?.whatsapp].filter(Boolean);
    for (const t of phones) {
      const p = brPhone(t);
      if (p) return p.key;
    }
    return null;
  }
  if (entity === "leads") return data.planilhaId ? String(data.planilhaId) : null;
  if (entity === "companies") return data.nome ? slugify(String(data.nome)) : null;
  return null;
}
const PAGE_SIZE = 1e3;
async function fetchAllAtTime(table, columns, updatedAt, orderCols) {
  const all = [];
  for (let offset = 0; offset < 5e4; offset += PAGE_SIZE) {
    let q = db().from(table).select(columns).eq("updated_at", updatedAt);
    for (const c of orderCols) q = q.order(c, { ascending: true });
    const page = check(await q.range(offset, offset + PAGE_SIZE - 1), `ler ${table}`) || [];
    all.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return all;
}
const GOOGLE_CLIENT_ID = (process.env.GOOGLE_CLIENT_ID || "").trim();
const GOOGLE_CLIENT_SECRET = (process.env.GOOGLE_CLIENT_SECRET || "").trim();
const GOOGLE_SCOPES = "openid email https://www.googleapis.com/auth/calendar.events";
const GCAL = "https://www.googleapis.com/calendar/v3/calendars";
const TASK_TYPE_LABEL = {
  ligar: "Ligar",
  reuniao: "Reunião",
  follow: "Follow-up",
  "follow-up": "Follow-up",
  follow_up: "Follow-up",
  followup: "Follow-up",
  email: "E-mail",
  visita: "Visita",
  whatsapp: "WhatsApp",
  outro: "Tarefa"
};
const REMINDER_MIN = { no_horario: 0, "15_min": 15, "1_hora": 60, "1_dia": 1440 };
const AGENDA_FIELDS = ["texto", "prazo", "duracao", "status", "tipo", "descricao", "observacoes", "lembrete", "entidadeId"];
const googleConfigured = () => Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && PUBLIC_BASE_URL);
const googleRedirectUri = () => `${PUBLIC_BASE_URL}/api/google/callback`;
function signState(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", GOOGLE_CLIENT_SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}
function readState(state) {
  const [body, sig] = String(state || "").split(".");
  if (!body || !sig) return null;
  const expected = crypto.createHmac("sha256", GOOGLE_CLIENT_SECRET).update(body).digest("base64url");
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString());
  } catch {
    return null;
  }
}
async function googleToken(params) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: GOOGLE_CLIENT_ID, client_secret: GOOGLE_CLIENT_SECRET, ...params }).toString()
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error_description || data.error || `Google respondeu ${res.status}`);
  return data;
}
async function googleAccessToken(crmEmail) {
  if (!crmEmail || !googleConfigured()) return null;
  const sb = db();
  const row = check(await sb.from("google_tokens").select("*").eq("crm_email", crmEmail.toLowerCase()).maybeSingle(), "ler conexão do Google");
  if (!row?.refresh_token) return null;
  if (row.access_token && row.expires_at && new Date(row.expires_at).getTime() > Date.now() + 6e4) {
    return { token: row.access_token, calendarId: row.calendar_id || "primary" };
  }
  try {
    const t = await googleToken({ grant_type: "refresh_token", refresh_token: row.refresh_token });
    const expires = new Date(Date.now() + (Number(t.expires_in) || 3600) * 1e3).toISOString();
    check(await sb.from("google_tokens").update({ access_token: t.access_token, expires_at: expires, last_error: null, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("crm_email", row.crm_email), "renovar token do Google");
    return { token: t.access_token, calendarId: row.calendar_id || "primary" };
  } catch (err) {
    await sb.from("google_tokens").update({ last_error: errorMessage(err), updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("crm_email", row.crm_email);
    console.warn(`[Google Agenda] não foi possível renovar o acesso de ${row.crm_email}:`, errorMessage(err));
    return null;
  }
}
async function gcal(token, method, url, body) {
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...body ? { "Content-Type": "application/json" } : {} },
    body: body ? JSON.stringify(body) : void 0
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  return { status: res.status, ok: res.ok, data };
}
function agendaChanged(prev, next) {
  return AGENDA_FIELDS.some((f) => JSON.stringify(prev?.[f] ?? null) !== JSON.stringify(next?.[f] ?? null));
}
function buildGoogleEvent(task, leadName) {
  const inicio = new Date(task.prazo);
  if (Number.isNaN(inicio.getTime())) return null;
  const fim = new Date(inicio.getTime() + (Number(task.duracao) > 0 ? Number(task.duracao) : 30) * 6e4);
  const tipo = TASK_TYPE_LABEL[String(task.tipo || "").toLowerCase().replace(/^t-/, "")] || "Tarefa";
  const done = task.status === "concluida";
  const link = task.entidadeTipo === "lead" && task.entidadeId && PUBLIC_BASE_URL ? `${PUBLIC_BASE_URL}/#/leads/${task.entidadeId}` : "";
  const minutes = task.lembrete && task.lembrete !== "nenhum" ? REMINDER_MIN[task.lembrete] : void 0;
  return {
    summary: `${done ? "✔ " : ""}[${tipo}] ${task.texto || "Tarefa"}${leadName ? ` — ${leadName}` : ""}`,
    description: [task.descricao, task.observacoes, leadName ? `Lead: ${leadName}` : "", link ? `Abrir no CRM: ${link}` : ""].filter(Boolean).join("\n\n"),
    start: { dateTime: inicio.toISOString(), timeZone: "America/Sao_Paulo" },
    end: { dateTime: fim.toISOString(), timeZone: "America/Sao_Paulo" },
    reminders: minutes === void 0 ? { useDefault: true } : { useDefault: false, overrides: [{ method: "popup", minutes }] },
    extendedProperties: { private: { crmTaskId: String(task.id) } }
  };
}
async function syncTasksToGoogle(rows, pusherEmail) {
  const taskRows = rows.filter((r) => r.entity === "tasks");
  if (taskRows.length === 0 || !googleConfigured()) return;
  const sb = db();
  const prevRows = check(await sb.from("crm_records").select("id, data, deleted").eq("entity", "tasks").in("id", taskRows.map((r) => r.id)), "ler tarefas anteriores") || [];
  const prevById = new Map(prevRows.map((r) => [r.id, r]));
  const userIds = [...new Set(taskRows.map((r) => r.data?.responsavelId).filter(Boolean))];
  const userRows = userIds.length ? check(await sb.from("crm_records").select("id, data").eq("entity", "users").in("id", userIds), "ler usuários") || [] : [];
  const emailByUser = new Map(userRows.map((r) => [r.id, String(r.data?.email || "").toLowerCase()]));
  const leadIds = [...new Set(taskRows.filter((r) => r.data?.entidadeTipo === "lead" && r.data?.entidadeId).map((r) => r.data.entidadeId))];
  const leadRows = leadIds.length ? check(await sb.from("crm_records").select("id, data").eq("entity", "leads").in("id", leadIds), "ler leads") || [] : [];
  const leadName = new Map(leadRows.map((r) => [r.id, r.data?.nome]));
  const tokens = /* @__PURE__ */ new Map();
  const tokenFor = async (email) => {
    if (!tokens.has(email)) tokens.set(email, await googleAccessToken(email));
    return tokens.get(email) || null;
  };
  for (const row of taskRows) {
    try {
      const prev = prevById.get(row.id);
      const prevData = prev && !prev.deleted ? prev.data : null;
      const eventId = row.data?.googleEventId || prevData?.googleEventId || null;
      const owner = String(row.data?.googleCalendarOwner || prevData?.googleCalendarOwner || emailByUser.get(row.data?.responsavelId) || pusherEmail || "").toLowerCase();
      if (row.deleted || row.data?.status === "cancelada") {
        if (eventId && owner) {
          const g2 = await tokenFor(owner);
          if (g2) await gcal(g2.token, "DELETE", `${GCAL}/${encodeURIComponent(g2.calendarId)}/events/${encodeURIComponent(eventId)}`);
        }
        if (!row.deleted) {
          delete row.data.googleEventId;
          delete row.data.googleCalendarOwner;
        }
        continue;
      }
      if (!row.data.googleEventId && prevData?.googleEventId) {
        row.data.googleEventId = prevData.googleEventId;
        row.data.googleCalendarOwner = prevData.googleCalendarOwner;
      }
      if (eventId && prevData && !agendaChanged(prevData, row.data)) continue;
      const g = owner ? await tokenFor(owner) : null;
      if (!g) continue;
      const evento = buildGoogleEvent(row.data, leadName.get(row.data.entidadeId));
      if (!evento) continue;
      const base = `${GCAL}/${encodeURIComponent(g.calendarId)}/events`;
      let result = eventId ? await gcal(g.token, "PATCH", `${base}/${encodeURIComponent(eventId)}`, evento) : null;
      if (!result || result.status === 404 || result.status === 410) {
        result = await gcal(g.token, "POST", base, evento);
      }
      if (result.ok && result.data?.id) {
        row.data.googleEventId = result.data.id;
        row.data.googleCalendarOwner = owner;
      } else {
        console.warn(`[Google Agenda] tarefa ${row.id}: Google respondeu ${result.status}`, JSON.stringify(result.data).slice(0, 300));
      }
    } catch (err) {
      console.warn(`[Google Agenda] tarefa ${row.id}:`, errorMessage(err));
    }
  }
}
app.get("/api/google/status", async (req, res) => {
  const base = { configurado: googleConfigured(), redirectUri: PUBLIC_BASE_URL ? googleRedirectUri() : null };
  if (!googleConfigured()) return res.json({ ...base, conectado: false });
  try {
    const row = check(await db().from("google_tokens").select("google_email, last_error, connected_at").eq("crm_email", String(req.authEmail || "").toLowerCase()).maybeSingle(), "ler conexão");
    return res.json({ ...base, conectado: Boolean(row), googleEmail: row?.google_email || null, erro: row?.last_error || null, conectadoEm: row?.connected_at || null });
  } catch (err) {
    return res.status(500).json({ ...base, error: errorMessage(err) });
  }
});
app.post("/api/google/auth-url", (req, res) => {
  if (!googleConfigured()) return res.status(400).json({ error: "Faltam GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET nas variáveis da Vercel." });
  const state = signState({ e: String(req.authEmail || "").toLowerCase(), t: Date.now() });
  const url = "https://accounts.google.com/o/oauth2/v2/auth?" + new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: googleRedirectUri(),
    response_type: "code",
    scope: GOOGLE_SCOPES,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state
  }).toString();
  return res.json({ url });
});
app.get("/api/google/callback", async (req, res) => {
  const back = (status, motivo) => res.redirect(`${PUBLIC_BASE_URL}/?google=${status}${motivo ? `&motivo=${encodeURIComponent(motivo)}` : ""}#/configuracoes`);
  if (!googleConfigured()) return res.status(400).send("Google Agenda não configurado no servidor.");
  if (req.query.error) return back("erro", String(req.query.error));
  const state = readState(String(req.query.state || ""));
  if (!state?.e || Date.now() - Number(state.t) > 15 * 6e4) return back("erro", "link expirado, tente de novo");
  try {
    const t = await googleToken({ grant_type: "authorization_code", code: String(req.query.code || ""), redirect_uri: googleRedirectUri() });
    let googleEmail = null;
    try {
      googleEmail = JSON.parse(Buffer.from(String(t.id_token || "").split(".")[1] || "", "base64url").toString()).email || null;
    } catch {
    }
    const sb = db();
    const existing = check(await sb.from("google_tokens").select("refresh_token").eq("crm_email", state.e).maybeSingle(), "ler conexão");
    const refresh = t.refresh_token || existing?.refresh_token;
    if (!refresh) return back("erro", "o Google não enviou a autorização permanente; desconecte e conecte de novo");
    check(await sb.from("google_tokens").upsert({
      crm_email: state.e,
      google_email: googleEmail,
      refresh_token: refresh,
      access_token: t.access_token,
      expires_at: new Date(Date.now() + (Number(t.expires_in) || 3600) * 1e3).toISOString(),
      calendar_id: "primary",
      last_error: null,
      connected_at: (/* @__PURE__ */ new Date()).toISOString(),
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }, { onConflict: "crm_email" }), "gravar conexão do Google");
    return back("conectado");
  } catch (err) {
    console.error("[Google Agenda] callback:", errorMessage(err));
    return back("erro", errorMessage(err));
  }
});
app.post("/api/google/disconnect", async (req, res) => {
  try {
    const email = String(req.authEmail || "").toLowerCase();
    const row = check(await db().from("google_tokens").select("refresh_token").eq("crm_email", email).maybeSingle(), "ler conexão");
    if (row?.refresh_token) {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(row.refresh_token)}`, { method: "POST" }).catch(() => null);
    }
    check(await db().from("google_tokens").delete().eq("crm_email", email), "remover conexão");
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: errorMessage(err) });
  }
});
app.get("/api/google/events", async (req, res) => {
  try {
    const g = await googleAccessToken(String(req.authEmail || ""));
    if (!g) return res.json({ conectado: false, eventos: [] });
    const from = new Date(String(req.query.from || ""));
    const to = new Date(String(req.query.to || ""));
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return res.status(400).json({ error: "Informe from e to (datas ISO)." });
    const url = `${GCAL}/${encodeURIComponent(g.calendarId)}/events?` + new URLSearchParams({
      timeMin: from.toISOString(),
      timeMax: to.toISOString(),
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "500"
    }).toString();
    const r = await gcal(g.token, "GET", url);
    if (!r.ok) return res.status(502).json({ error: `Google respondeu ${r.status}` });
    const eventos = (r.data?.items || []).filter((e) => e.status !== "cancelled" && !e.extendedProperties?.private?.crmTaskId).map((e) => ({
      id: e.id,
      titulo: e.summary || "(sem título)",
      inicio: e.start?.dateTime || e.start?.date,
      fim: e.end?.dateTime || e.end?.date,
      diaInteiro: Boolean(e.start?.date && !e.start?.dateTime),
      local: e.location || null,
      link: e.htmlLink || null
    }));
    return res.json({ conectado: true, eventos });
  } catch (err) {
    return res.status(500).json({ error: errorMessage(err) });
  }
});
app.post("/api/crm/push", async (req, res) => {
  const changes = Array.isArray(req.body?.changes) ? req.body.changes : [];
  const clientId = String(req.body?.clientId || "navegador").slice(0, 80);
  if (changes.length === 0) return res.json({ ok: true, serverTime: (/* @__PURE__ */ new Date()).toISOString(), saved: 0 });
  if (changes.length > 500) return res.status(413).json({ error: "Envie no máximo 500 mudanças por vez." });
  try {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const rows = /* @__PURE__ */ new Map();
    for (const c of changes) {
      const entity = String(c?.entity || "");
      const id = String(c?.id || "");
      if (!CRM_ENTITIES.has(entity) || !id) continue;
      const deleted = Boolean(c.deleted);
      let data = deleted ? c.data || {} : c.data;
      if (!deleted && (!data || typeof data !== "object")) continue;
      if (entity === "users" && data && "senha" in data) {
        const { senha: _senha, ...rest } = data;
        data = rest;
      }
      rows.set(`${entity}:${id}`, {
        entity,
        id,
        data,
        deleted,
        updated_at: now,
        updated_by: req.authEmail || clientId,
        match_key: deleted ? null : matchKeyFor(entity, data)
      });
    }
    try {
      await syncTasksToGoogle([...rows.values()], req.authEmail || "");
    } catch (err) {
      console.warn("[Google Agenda] falha ao sincronizar tarefas:", errorMessage(err));
    }
    if (rows.size > 0) {
      check(await db().from("crm_records").upsert([...rows.values()], { onConflict: "entity,id" }), "gravar mudanças");
    }
    return res.json({ ok: true, serverTime: now, saved: rows.size });
  } catch (err) {
    console.error("[CRM push]", errorMessage(err));
    return res.status(500).json({ error: errorMessage(err) });
  }
});
app.get("/api/crm/feed", async (req, res) => {
  if (!supabaseAdmin) return res.json({ records: [], nextSince: null, hasMore: false, error: "Supabase não configurado" });
  try {
    const since = typeof req.query.since === "string" && req.query.since ? req.query.since : "1970-01-01T00:00:00.000Z";
    let rows = check(await db().from("crm_records").select("entity, id, data, deleted, updated_at").gt("updated_at", since).order("updated_at", { ascending: true }).limit(PAGE_SIZE), "feed do CRM") || [];
    const hasMore = rows.length >= PAGE_SIZE;
    if (hasMore) {
      const last = rows[rows.length - 1].updated_at;
      const ties = await fetchAllAtTime("crm_records", "entity, id, data, deleted, updated_at", last, ["entity", "id"]);
      rows = rows.filter((r) => r.updated_at !== last).concat(ties);
    }
    const nextSince = rows.length ? rows[rows.length - 1].updated_at : since;
    return res.json({ records: rows, nextSince, hasMore });
  } catch (err) {
    return res.status(500).json({ error: errorMessage(err) });
  }
});
const EMPTY_MARKERS = /* @__PURE__ */ new Set(["", "❌", "-", "—", "null", "undefined", "#N/A", "N/A"]);
function cleanCell(v) {
  if (v === void 0 || v === null) return null;
  const s = String(v).trim();
  return EMPTY_MARKERS.has(s) ? null : s;
}
function pickCell(row, ...names) {
  const keys = Object.keys(row);
  for (const n of names) {
    const k = keys.find((key) => key.trim().toLowerCase() === n.toLowerCase());
    if (k !== void 0) {
      const v = cleanCell(row[k]);
      if (v !== null) return v;
    }
  }
  return null;
}
function splitNameId(v) {
  if (!v || v.includes("{{")) return { nome: null, id: null };
  const [nome, id] = v.split("|").map((x) => x.trim());
  return { nome: nome || null, id: id && /^\d+$/.test(id) ? id : null };
}
const DEFAULT_DATE_ORDER = (process.env.SHEET_DATE_ORDER || "").toUpperCase() === "DMY" ? "DMY" : "MDY";
function safeIso(d) {
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
const pad2 = (v) => String(v).padStart(2, "0");
function sheetDateCell(row) {
  const firstKey = Object.keys(row)[0];
  return pickCell(row, "ƒ", "Data", "Data de entrada", "Timestamp", "Carimbo de data/hora") ?? (firstKey ? cleanCell(row[firstKey]) : null);
}
function detectDateOrder(values) {
  for (const v of values) {
    const m = String(v || "").match(/^(\d{1,2})\/(\d{1,2})\/\d{4}/);
    if (!m) continue;
    if (Number(m[1]) > 12) return "DMY";
    if (Number(m[2]) > 12) return "MDY";
  }
  return DEFAULT_DATE_ORDER;
}
function parseSheetDate(v, order = DEFAULT_DATE_ORDER) {
  if (!v) return null;
  const s = String(v).trim();
  if (/^\d+(\.\d+)?$/.test(s)) {
    const n = Number(s);
    if (n > 2e4 && n < 8e4) return safeIso(new Date(Math.round((n - 25569) * 864e5) + 3 * 36e5));
  }
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(s)) return safeIso(new Date(s));
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (m) return safeIso(/* @__PURE__ */ new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6] || "00"}-03:00`));
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ ,T]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) {
    const [day, month] = order === "DMY" ? [Number(m[1]), Number(m[2])] : [Number(m[2]), Number(m[1])];
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return safeIso(/* @__PURE__ */ new Date(`${m[3]}-${pad2(month)}-${pad2(day)}T${pad2(m[4] || "0")}:${m[5] || "00"}:${m[6] || "00"}-03:00`));
  }
  return safeIso(new Date(s));
}
function normFaturamento(v) {
  if (!v) return null;
  const k = v.toLowerCase().replace(/r\$|\s|\./g, "").replace(/mil/g, "");
  let m = k.match(/^entre(\d+)(?:a|e)(\d+)$/);
  if (m) return `Entre R$ ${m[1]} mil e R$ ${m[2]} mil`;
  m = k.match(/^abaixode(\d+)$/);
  if (m) return `Abaixo de R$ ${m[1]} mil`;
  m = k.match(/^acimade(\d+)$/);
  if (m) return `Acima de R$ ${m[1]} mil`;
  if (/^\d+$/.test(k)) return `R$ ${k} mil (formulário antigo)`;
  return v;
}
function normSegmento(v) {
  if (!v) return null;
  if (/^mercados?$/i.test(v)) return "Mercados/Supermercado";
  return v;
}
function normPlataforma(v) {
  if (!v) return null;
  if (/^(fb|facebook)$/i.test(v)) return "Facebook";
  if (/^(ig|instagram)$/i.test(v)) return "Instagram";
  if (/^lp_b2b$/i.test(v)) return "LP B2B";
  return v;
}
function normPosicionamento(v) {
  if (!v) return null;
  if (v === "an") return "Audience Network";
  return v.replace(/_/g, " ");
}
function normalizeSheetRow(row, dateOrder = DEFAULT_DATE_ORDER) {
  const planilhaId = pickCell(row, "ID");
  const nome = pickCell(row, "Nome");
  const empresa = pickCell(row, "Nome da empresa", "Empresa");
  const email = pickCell(row, "E-mail", "Email");
  const phone = brPhone(pickCell(row, "Telefone", "WhatsApp", "Celular"));
  if (!phone && !email) return null;
  const colCidade = pickCell(row, "Cidade");
  const colDDD = pickCell(row, "DDD");
  const ddd = [colCidade, colDDD].find((v) => v && /^\d{2}$/.test(v)) || (phone?.key.startsWith("55") ? phone.key.slice(2, 4) : null);
  const regiao = [colCidade, colDDD].find((v) => v && !/^\d{2}$/.test(v)) || null;
  let plataforma = pickCell(row, "Plataforma");
  let posicionamento = pickCell(row, "Posicionamento", "Plataforma.1", "Plataforma_1", "Plataforma 2", "Plataforma (2)");
  if (plataforma && /_/.test(plataforma) && /instagram|facebook|whatsapp|messenger/i.test(plataforma) && !posicionamento) {
    posicionamento = plataforma;
    plataforma = "Facebook";
  }
  const campanha = splitNameId(pickCell(row, "Campanha"));
  const conjunto = splitNameId(pickCell(row, "Conjunto"));
  const origemCol = pickCell(row, "Origem");
  const anuncioIdCol = pickCell(row, "ID anuncio", "ID anúncio");
  const anuncioId = [anuncioIdCol, origemCol].find((v) => v && /^\d{12,20}$/.test(v)) || null;
  const scoreRaw = pickCell(row, "% percentual", "Score", "Percentual");
  let score = scoreRaw !== null ? Number(String(scoreRaw).replace(",", ".").replace("%", "")) : null;
  if (score !== null && Number.isNaN(score)) score = null;
  if (score !== null && score <= 1) score = Math.round(score * 100);
  const cacau = pickCell(row, "Já trabalhou com cacau?", "Ja trabalhou com cacau?");
  const dataEntrada = parseSheetDate(sheetDateCell(row), dateOrder);
  return {
    planilhaId,
    nome: nome || empresa || phone?.display || email || "Lead da planilha",
    empresa,
    email,
    phone,
    rastreamento: {
      fonte: "Planilha de integração",
      dataEntrada,
      plataforma: normPlataforma(plataforma),
      posicionamento: normPosicionamento(posicionamento),
      campanha: campanha.nome || (origemCol && !/^\d+$/.test(origemCol) ? origemCol : null),
      campanhaId: campanha.id,
      conjunto: conjunto.nome,
      conjuntoId: conjunto.id,
      anuncio: pickCell(row, "Anuncio", "Anúncio"),
      anuncioId
    },
    qualificacao: {
      segmento: normSegmento(pickCell(row, "Segmento")),
      faturamento: normFaturamento(pickCell(row, "Faturamento")),
      jaTrabalhouCacau: cacau && /^(sim|não|nao)$/i.test(cacau) ? /^sim$/i.test(cacau) ? "Sim" : "Não" : null,
      score,
      uf: pickCell(row, "Sigla", "UF"),
      estado: pickCell(row, "Estado"),
      ddd,
      regiao
    }
  };
}
function ensureStage(pipeline, nome, cor) {
  const norm = (v) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const existing = (pipeline.stages || []).find((st) => norm(st.nome) === norm(nome));
  if (existing) return existing.id;
  const stages = [...pipeline.stages || []].sort((a, b) => a.ordem - b.ordem);
  const finalIndex = stages.findIndex((st) => st.tipo === "ganho" || st.tipo === "perdido");
  const stage = { id: `st-${slugify(nome)}`, pipelineId: pipeline.id, nome, cor, ordem: 0, tipo: "normal" };
  stages.splice(finalIndex === -1 ? stages.length : finalIndex, 0, stage);
  stages.forEach((st, i) => {
    st.ordem = i + 1;
  });
  pipeline.stages = stages;
  pipeline.__changed = true;
  return stage.id;
}
app.post("/api/leads/ingest", async (req, res) => {
  const token = req.get("x-ingest-secret") || (typeof req.query.token === "string" ? req.query.token : "");
  if (!INGEST_SECRET || token !== INGEST_SECRET) {
    return res.status(401).json({ error: "Segredo inválido. Envie o cabeçalho x-ingest-secret (CRM_INGEST_SECRET ou EVOLUTION_WEBHOOK_SECRET)." });
  }
  const body = req.body || {};
  const rawRows = Array.isArray(body) ? body : Array.isArray(body.rows) ? body.rows : [body.row || body];
  const aba = String(body.aba || req.query.aba || "INTEGRAÇÃO").toUpperCase();
  const isAgendamento = aba.includes("AGENDAMENTO");
  const etapaNome = isAgendamento ? "Reunião agendada" : body.etapa || req.query.etapa || null;
  if (rawRows.length > 300) return res.status(413).json({ error: "Envie no máximo 300 linhas por vez." });
  try {
    const sb = db();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const result = { criados: 0, atualizados: 0, ignorados: 0, erros: [] };
    const validRows = rawRows.filter((r) => r && typeof r === "object");
    const dateOrder = detectDateOrder(validRows.map((r) => sheetDateCell(r)));
    const normalized = rawRows.map((r, index) => {
      if (!r || typeof r !== "object") return null;
      try {
        return normalizeSheetRow(r, dateOrder);
      } catch (err) {
        result.erros.push(`linha ${index + 1} (${cleanCell(r.ID) || "sem ID"}): ${errorMessage(err)}`);
        return null;
      }
    });
    const pipeRows = check(await sb.from("crm_records").select("id, data").eq("entity", "pipelines").eq("deleted", false), "ler funis") || [];
    const pipeline = (pipeRows.find((p) => p.id === "pipe-vendas") || pipeRows[0])?.data || null;
    const entryStageId = pipeline?.stages?.find((st) => st.tipo === "entrada")?.id || "st-entrada";
    const targetStageId = pipeline && etapaNome ? ensureStage(pipeline, etapaNome, isAgendamento ? "#0EA5E9" : "#94A3B8") : entryStageId;
    const ids = [...new Set(normalized.map((n) => n?.planilhaId).filter(Boolean))];
    const phoneKeys = [...new Set(normalized.map((n) => n?.phone?.key).filter(Boolean))];
    const companyKeys = [...new Set(normalized.map((n) => n?.empresa ? slugify(n.empresa) : null).filter(Boolean))];
    const fetchByKeys = async (entity, keys) => {
      if (keys.length === 0) return [];
      return check(await sb.from("crm_records").select("id, data, match_key").eq("entity", entity).eq("deleted", false).in("match_key", keys), `ler ${entity}`) || [];
    };
    const leadByPlanilha = new Map((await fetchByKeys("leads", ids)).map((r) => [r.match_key, r.data]));
    const contactByPhone = new Map((await fetchByKeys("contacts", phoneKeys)).map((r) => [r.match_key, r.data]));
    const companyByKey = new Map((await fetchByKeys("companies", companyKeys)).map((r) => [r.match_key, r.data]));
    const leadByContact = /* @__PURE__ */ new Map();
    for (const contact of contactByPhone.values()) {
      const found = check(await sb.from("crm_records").select("data").eq("entity", "leads").eq("deleted", false).contains("data", { contactIds: [contact.id] }).limit(1), "ler lead do contato") || [];
      if (found[0]) leadByContact.set(contact.id, found[0].data);
    }
    const writes = /* @__PURE__ */ new Map();
    const put = (entity, data) => {
      writes.set(`${entity}:${data.id}`, {
        entity,
        id: data.id,
        data,
        deleted: false,
        updated_at: now,
        updated_by: "planilha",
        match_key: matchKeyFor(entity, data)
      });
    };
    normalized.forEach((n, index) => {
      if (!n) {
        result.ignorados++;
        return;
      }
      try {
        let companyId;
        if (n.empresa) {
          const key = slugify(n.empresa);
          let company = companyByKey.get(key);
          if (!company) {
            company = { id: `co-${key}`, nome: n.empresa, segmento: n.qualificacao.segmento || void 0, customFields: {}, createdAt: now };
            companyByKey.set(key, company);
            put("companies", company);
          }
          companyId = company.id;
        }
        let contact = n.phone ? contactByPhone.get(n.phone.key) : void 0;
        if (!contact) {
          contact = {
            id: n.phone ? `ct-${n.phone.key}` : `ct-${slugify(n.email || n.nome)}`,
            nome: n.nome,
            telefones: n.phone ? [n.phone.display] : [],
            emails: n.email ? [n.email] : [],
            companyId,
            tags: [],
            customFields: {},
            canais: { whatsapp: n.phone?.e164 },
            consentimentoMarketing: false,
            createdAt: n.rastreamento.dataEntrada || now,
            updatedAt: now
          };
          if (n.phone) contactByPhone.set(n.phone.key, contact);
          put("contacts", contact);
        } else {
          const updated = { ...contact };
          let changed = false;
          if (n.email && !(updated.emails || []).includes(n.email)) {
            updated.emails = [...updated.emails || [], n.email];
            changed = true;
          }
          if (companyId && !updated.companyId) {
            updated.companyId = companyId;
            changed = true;
          }
          if ((!updated.nome || /^[+\d\s()-]+$/.test(updated.nome)) && n.nome) {
            updated.nome = n.nome;
            changed = true;
          }
          if (changed) {
            updated.updatedAt = now;
            contact = updated;
            if (n.phone) contactByPhone.set(n.phone.key, contact);
            put("contacts", contact);
          }
        }
        let lead = n.planilhaId && leadByPlanilha.get(n.planilhaId) || leadByContact.get(contact.id);
        if (lead) {
          const updated = { ...lead };
          let changed = false;
          if (!updated.planilhaId && n.planilhaId) {
            updated.planilhaId = n.planilhaId;
            changed = true;
          }
          if (!updated.rastreamento) {
            updated.rastreamento = n.rastreamento;
            changed = true;
          }
          if (!updated.qualificacao) {
            updated.qualificacao = n.qualificacao;
            changed = true;
          }
          if (!updated.companyId && companyId) {
            updated.companyId = companyId;
            changed = true;
          }
          if (isAgendamento && updated.stageId !== targetStageId) {
            const currentStage = pipeline?.stages?.find((st) => st.id === updated.stageId);
            if (!currentStage || currentStage.tipo !== "ganho" && currentStage.tipo !== "perdido") {
              updated.stageId = targetStageId;
              changed = true;
            }
          }
          if (changed) {
            updated.updatedAt = now;
            put("leads", updated);
            result.atualizados++;
          } else {
            result.ignorados++;
          }
          lead = updated;
        } else {
          lead = {
            id: n.planilhaId ? `pl-${n.planilhaId}` : `pl-${n.phone?.key || slugify(n.email || n.nome)}`,
            nome: n.empresa || n.nome,
            valor: 0,
            pipelineId: pipeline?.id || "pipe-vendas",
            stageId: targetStageId,
            responsavelId: "",
            contactIds: [contact.id],
            companyId,
            tags: [],
            origemId: "",
            customFields: {},
            produtos: [],
            createdAt: n.rastreamento.dataEntrada || now,
            updatedAt: now,
            ultimaInteracaoAt: n.rastreamento.dataEntrada || now,
            naoLidas: 0,
            planilhaId: n.planilhaId || void 0,
            rastreamento: n.rastreamento,
            qualificacao: n.qualificacao
          };
          put("leads", lead);
          result.criados++;
        }
        if (n.planilhaId) leadByPlanilha.set(n.planilhaId, lead);
        leadByContact.set(contact.id, lead);
      } catch (err) {
        result.erros.push(`linha ${index + 1}: ${errorMessage(err)}`);
      }
    });
    if (pipeline?.__changed) {
      delete pipeline.__changed;
      put("pipelines", pipeline);
    }
    const all = [...writes.values()];
    for (let i = 0; i < all.length; i += 500) {
      check(await sb.from("crm_records").upsert(all.slice(i, i + 500), { onConflict: "entity,id" }), "gravar leads da planilha");
    }
    return res.json({ ok: true, ...result, erros: result.erros.slice(0, 20) });
  } catch (err) {
    console.error("[Planilha ingest]", errorMessage(err));
    return res.status(500).json({ error: errorMessage(err) });
  }
});
const normTxt = (v) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const BLOCK_TAGS = ["nao enviar disparo", "nao enviar follow-up", "nao enviar follow up", "nao enviar mensagem"];
function ingestAuthorized(req) {
  const token = req.get("x-ingest-secret") || (typeof req.query.token === "string" ? req.query.token : "");
  return Boolean(INGEST_SECRET) && token === INGEST_SECRET;
}
async function findByPhone(phoneRaw) {
  const phone = brPhone(phoneRaw);
  if (!phone) return null;
  const sb = db();
  const contacts = check(await sb.from("crm_records").select("id, data").eq("entity", "contacts").eq("deleted", false).eq("match_key", phone.key).limit(5), "buscar contato") || [];
  const leads = [];
  for (const c of contacts) {
    const found = check(await sb.from("crm_records").select("id, data").eq("entity", "leads").eq("deleted", false).contains("data", { contactIds: [c.id] }).limit(5), "buscar lead") || [];
    leads.push(...found.map((f) => f.data));
  }
  return { phone, contacts: contacts.map((c) => c.data), leads };
}
async function whatsappHistory(phone) {
  const sb = db();
  const ddd = phone.key.slice(2, 4);
  const last8 = phone.key.slice(-8);
  const convs = check(await sb.from("wa_conversations").select("id, phone").like("phone", `55${ddd}%${last8}`).limit(10), "buscar conversas") || [];
  if (!convs.length) return { ultimaDoCliente: null, ultimaDaEquipe: null };
  const ids = convs.map((c) => c.id);
  const lastOf = async (fromMe) => {
    const rows = check(await sb.from("wa_messages").select("enviada_at").in("conversation_id", ids).eq("from_me", fromMe).order("enviada_at", { ascending: false }).limit(1), "buscar mensagens") || [];
    return rows[0]?.enviada_at || null;
  };
  return { ultimaDoCliente: await lastOf(false), ultimaDaEquipe: await lastOf(true) };
}
async function tagNamesById() {
  const rows = check(await db().from("crm_records").select("id, data").eq("entity", "tags").eq("deleted", false), "ler etiquetas") || [];
  return new Map(rows.map((r) => [r.id, String(r.data?.nome || "")]));
}
async function stagesById() {
  const rows = check(await db().from("crm_records").select("data").eq("entity", "pipelines").eq("deleted", false), "ler funis") || [];
  const m = /* @__PURE__ */ new Map();
  rows.forEach((r) => (r.data?.stages || []).forEach((st) => m.set(st.id, st)));
  return { map: m, first: rows.find((r) => r.data?.id === "pipe-vendas")?.data || rows[0]?.data || null };
}
const fmtBR = (iso) => new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
app.post("/api/disparos/verificar", async (req, res) => {
  if (!ingestAuthorized(req)) return res.status(401).json({ error: "Segredo inválido (x-ingest-secret)." });
  const { telefone, etapa = "primeira_mensagem" } = req.body || {};
  const diasSemContato = Number(req.body?.diasSemContato ?? 3);
  try {
    const found = await findByPhone(telefone);
    if (!found) return res.json({ enviar: false, motivo: "telefone inválido" });
    const { map: stages } = await stagesById();
    const tagNames = await tagNamesById();
    for (const lead of found.leads) {
      const tipo = stages.get(lead.stageId)?.tipo;
      if (tipo === "ganho") return res.json({ enviar: false, motivo: "lead já é venda ganha", leadId: lead.id });
      if (tipo === "perdido") return res.json({ enviar: false, motivo: "lead marcado como perdido", leadId: lead.id });
      const nomes = (lead.tags || []).map((t) => normTxt(tagNames.get(t) || t));
      if (nomes.some((n) => BLOCK_TAGS.includes(n))) return res.json({ enviar: false, motivo: "lead com etiqueta de não enviar", leadId: lead.id });
      const ja = (lead.disparos || []).find((d) => d.etapa === etapa && d.status !== "erro");
      if (ja) return res.json({ enviar: false, motivo: `já recebeu esta mensagem em ${fmtBR(ja.em)}`, leadId: lead.id });
    }
    const hist = await whatsappHistory(found.phone);
    if (hist.ultimaDoCliente) {
      return res.json({ enviar: false, motivo: `cliente já conversou pelo WhatsApp (última mensagem em ${fmtBR(hist.ultimaDoCliente)})`, leadId: found.leads[0]?.id || null });
    }
    if (hist.ultimaDaEquipe && Date.now() - new Date(hist.ultimaDaEquipe).getTime() < diasSemContato * 864e5) {
      return res.json({ enviar: false, motivo: `a equipe falou com ele em ${fmtBR(hist.ultimaDaEquipe)}`, leadId: found.leads[0]?.id || null });
    }
    return res.json({ enviar: true, motivo: "ok", leadId: found.leads[0]?.id || null });
  } catch (err) {
    console.error("[Disparos verificar]", errorMessage(err));
    return res.status(500).json({ enviar: false, motivo: "erro no CRM", error: errorMessage(err) });
  }
});
app.post("/api/disparos/registrar", async (req, res) => {
  if (!ingestAuthorized(req)) return res.status(401).json({ error: "Segredo inválido (x-ingest-secret)." });
  const { telefone, nome, etapa = "primeira_mensagem", instancia, status = "enviado", erro } = req.body || {};
  try {
    const found = await findByPhone(telefone);
    if (!found) return res.status(400).json({ error: "telefone inválido" });
    const sb = db();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const writes = [];
    const put = (entity, data) => writes.push({ entity, id: data.id, data, deleted: false, updated_at: now, updated_by: "n8n", match_key: matchKeyFor(entity, data) });
    const registro = { etapa, em: now, instancia: instancia || null, status: status === "erro" ? "erro" : "enviado", erro: erro ? String(erro).slice(0, 200) : void 0 };
    let contact = found.contacts[0];
    if (!contact) {
      contact = {
        id: `ct-${found.phone.key}`,
        nome: nome || found.phone.display,
        telefones: [found.phone.display],
        emails: [],
        tags: [],
        customFields: {},
        canais: { whatsapp: found.phone.e164 },
        consentimentoMarketing: false,
        createdAt: now,
        updatedAt: now
      };
      put("contacts", contact);
    }
    let lead = found.leads[0];
    if (lead) {
      lead = { ...lead, disparos: [...lead.disparos || [], registro], updatedAt: now };
    } else {
      const { first } = await stagesById();
      const entry = first?.stages?.find((st) => st.tipo === "entrada");
      lead = {
        id: `dp-${found.phone.key}`,
        nome: nome || contact.nome,
        valor: 0,
        pipelineId: first?.id || "pipe-vendas",
        stageId: entry?.id || "st-entrada",
        responsavelId: "",
        contactIds: [contact.id],
        tags: [],
        origemId: "",
        customFields: {},
        produtos: [],
        createdAt: now,
        updatedAt: now,
        ultimaInteracaoAt: now,
        naoLidas: 0,
        rastreamento: { fonte: "Disparo do n8n" },
        disparos: [registro]
      };
    }
    put("leads", lead);
    check(await sb.from("crm_records").upsert(writes, { onConflict: "entity,id" }), "registrar disparo");
    return res.json({ ok: true, leadId: lead.id, criado: !found.leads[0] });
  } catch (err) {
    console.error("[Disparos registrar]", errorMessage(err));
    return res.status(500).json({ error: errorMessage(err) });
  }
});
app.get("/api/crm/data", async (_req, res) => {
  if (!supabaseAdmin) return res.status(503).json({ error: "Supabase não configurado no servidor" });
  const { data, error } = await supabaseAdmin.from("wa_instances").select("*").order("created_at", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  return res.json({
    wa_qr_instances: (data || []).filter((i) => i.nome_conexao || i.numero).map((i) => ({
      id: i.instance_name,
      instance_name: i.instance_name,
      nome_conexao: i.nome_conexao || i.instance_name,
      status: i.status || "close",
      numero: i.numero || "",
      perfil_nome: i.perfil_nome || ""
    }))
  });
});
app.post("/api/crm/data", (_req, res) => res.json({ success: true }));
app.get("/api/wa/diagnostics", async (req, res) => {
  if (!EVOLUTION_WEBHOOK_SECRET || req.query.token !== EVOLUTION_WEBHOOK_SECRET) {
    return res.status(401).json({ error: "Informe ?token= com o valor de EVOLUTION_WEBHOOK_SECRET" });
  }
  const instance = typeof req.query.instance === "string" ? req.query.instance : "";
  const out = {
    evolutionUrl: EVOLUTION_API_URL || "(não configurada)",
    evolutionKeyConfigurada: Boolean(EVOLUTION_API_KEY),
    webhookSecretConfigurado: Boolean(EVOLUTION_WEBHOOK_SECRET),
    urlPublicaDoCrm: PUBLIC_BASE_URL || "(não configurada)",
    aviso: publicUrlWarning(),
    supabaseConfigurado: Boolean(supabaseAdmin)
  };
  try {
    out.evolutionVersao = (await evo("/"))?.version || "respondeu";
  } catch (err) {
    out.evolutionErro = errorMessage(err);
  }
  if (instance) {
    try {
      out.estadoInstancia = await getInstanceInfo(instance);
    } catch (err) {
      out.estadoInstanciaErro = errorMessage(err);
    }
    try {
      const wh = await evo(`/webhook/find/${enc(instance)}`);
      out.webhookNaEvolution = wh ? { ...wh, url: String(wh.url || "").replace(/token=[^&]+/, "token=***"), headers: wh.headers ? "(definidos)" : null } : null;
    } catch (err) {
      out.webhookNaEvolutionErro = errorMessage(err);
    }
  }
  if (supabaseAdmin) {
    const counts = {};
    for (const t of ["wa_instances", "wa_conversations", "wa_messages"]) {
      const { count, error: error2 } = await supabaseAdmin.from(t).select("*", { count: "exact", head: true });
      counts[t] = error2 ? `erro: ${error2.message}` : count;
    }
    out.registrosNoSupabase = counts;
    const { data: logs, error } = await supabaseAdmin.from("wa_webhook_log").select("*").order("received_at", { ascending: false }).limit(20);
    out.ultimosEventosDoWebhook = error ? `erro: ${error.message}` : logs;
  }
  return res.json(out);
});
var api_index_default = app;
function logStartupWarnings() {
  const warning = publicUrlWarning();
  if (warning) console.warn(`[Config] ${warning}`);
  if (!supabaseAdmin) console.warn("[Config] Supabase não configurado no servidor (SUPABASE_SERVICE_ROLE_KEY).");
}
export {
  api_index_default as default,
  logStartupWarnings
};
