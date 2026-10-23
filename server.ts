import express from 'express';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ verify: (req: any, res, buf) => { req.rawBody = buf; } }));

const PORT = process.env.PORT || 3000;
const GRAPH_API_VERSION = process.env.GRAPH_API_VERSION || 'v19.0';
const META_APP_ID = process.env.META_APP_ID || process.env.VITE_META_APP_ID || '';
const META_APP_SECRET = process.env.META_APP_SECRET || '';
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'conversa_verify_token_123';

// Evolution API v2 Secrets
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'https://api.evolution-api.com';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'evo_global_key_123';
const EVOLUTION_WEBHOOK_SECRET = process.env.EVOLUTION_WEBHOOK_SECRET || 'evo_secret_999';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabaseAdmin = (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null;

// Helper with logging for Evolution API calls
async function callEvolution(endpoint: string, options: RequestInit = {}) {
  const url = `${EVOLUTION_API_URL}${endpoint}`;
  const method = options.method || 'GET';
  const start = Date.now();

  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'apikey': EVOLUTION_API_KEY,
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
    const duration = Date.now() - start;
    const textBody = await res.text();
    let data;
    try {
      data = JSON.parse(textBody);
    } catch {
      data = { raw: textBody };
    }

    console.log(`[Evolution API] ${method} ${endpoint} - Status: ${res.status} (${duration}ms)`);
    return { ok: res.ok, status: res.status, data, errorText: res.ok ? null : textBody };
  } catch (err: any) {
    const duration = Date.now() - start;
    console.error(`[Evolution API Error] ${method} ${endpoint} - Failed after ${duration}ms:`, err.message);
    throw new Error(`Não foi possível acessar o servidor da Evolution API em ${EVOLUTION_API_URL}. Detalhe: ${err.message}`);
  }
}

// Anti-ban message queue helper
const messageQueue: Array<{ instance: string; phone: string; message: string; type: string }> = [];
let isProcessingQueue = false;

async function processMessageQueue() {
  if (isProcessingQueue || messageQueue.length === 0) return;
  isProcessingQueue = true;

  while (messageQueue.length > 0) {
    const item = messageQueue.shift();
    if (!item) break;

    try {
      const delay = Math.floor(Math.random() * 5000) + 3000;
      await new Promise(resolve => setTimeout(resolve, delay));

      await callEvolution(`/chat/sendPresence/${item.instance}`, {
        method: 'POST',
        body: JSON.stringify({ number: item.phone, presence: 'composing' })
      });

      await new Promise(resolve => setTimeout(resolve, 1500));

      await callEvolution(`/message/sendText/${item.instance}`, {
        method: 'POST',
        body: JSON.stringify({ number: item.phone, text: item.message })
      });
    } catch (err) {
      console.error('Error processing queued message:', err);
    }
  }

  isProcessingQueue = false;
}

// WhatsApp Official Webhook Verification (GET)
app.get('/api/webhook/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === WHATSAPP_VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    } else {
      return res.sendStatus(403);
    }
  }
  return res.sendStatus(400);
});

// Official WhatsApp Embedded Signup Onboarding
app.post('/api/whatsapp/onboarding', async (req, res) => {
  const { code, waba_id, phone_number_id, type } = req.body;
  if (!waba_id || !phone_number_id) {
    return res.status(400).json({ error: 'WABA ID and Phone Number ID are required' });
  }

  try {
    let accessToken = process.env.WHATSAPP_TOKEN || 'mock_system_user_token';
    if (code && META_APP_ID && META_APP_SECRET) {
      const tokenUrl = `https://graph.facebook.com/${GRAPH_API_VERSION}/oauth/access_token?client_id=${META_APP_ID}&client_secret=${META_APP_SECRET}&code=${code}`;
      const tokenRes = await fetch(tokenUrl);
      const tokenData = await tokenRes.json();
      if (tokenRes.ok && tokenData.access_token) {
        accessToken = tokenData.access_token;
      }
    }

    const accountRecord = {
      id: phone_number_id,
      waba_id,
      phone_number_id,
      display_name: 'WhatsApp Business ' + phone_number_id.slice(-4),
      formatted_number: '+55 (11) 98888-7777',
      quality_rating: 'GREEN',
      message_limit: 'TIER_1K',
      coexistence: type === 'app',
      access_token: accessToken,
      status: 'conectado',
      created_at: new Date().toISOString()
    };

    if (supabaseAdmin) {
      try {
        await supabaseAdmin.from('whatsapp_accounts').upsert(accountRecord);
      } catch (e) {
        console.warn('Supabase upsert warning:', e);
      }
    }

    return res.json({ success: true, account: { ...accountRecord, access_token: undefined } });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// ==========================================
// FASE 12: EVOLUTION API v2 QR CODE ENDPOINTS
// ==========================================

// Test Evolution Server Connection & API Key
app.post('/api/evolution/test', async (req, res) => {
  try {
    const rootCheck = await callEvolution('/');
    const instancesCheck = await callEvolution('/instance/fetchInstances');
    const maskedUrl = EVOLUTION_API_URL.replace(/:\/\/[^@]+@/, '://***@');

    return res.json({
      success: true,
      url: maskedUrl,
      responded: true,
      status: rootCheck.status,
      apiKeyAccepted: instancesCheck.ok,
      version: rootCheck.data?.version || 'v2.x',
      details: instancesCheck.data
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      url: EVOLUTION_API_URL,
      responded: false,
      error: err.message
    });
  }
});

// Fetch existing instances from Evolution
app.get('/api/evolution/instances', async (req, res) => {
  try {
    const result = await callEvolution('/instance/fetchInstances');
    return res.json({ success: true, instances: result.data || [] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Link an existing Evolution instance
app.post('/api/evolution/link', async (req, res) => {
  const { instanceName, nomeConexao } = req.body;
  if (!instanceName) return res.status(400).json({ error: 'instanceName is required' });

  try {
    const pubUrl = process.env.APP_URL || 'https://ais-dev-dyeavpmm35ffptzuz2wdop.run.app';
    const webhookUrl = `${pubUrl}/api/webhook/whatsapp-qr`;

    // 1. Reconfigure webhook
    await callEvolution(`/webhook/set/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify({
        url: webhookUrl,
        byEvents: false,
        base64: true,
        events: ['CONNECTION_UPDATE', 'MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'CONTACTS_UPSERT'],
        headers: { 'x-webhook-secret': EVOLUTION_WEBHOOK_SECRET }
      })
    }).catch(() => {});

    // 2. Check connection state
    const stateRes = await callEvolution(`/instance/connectionState/${instanceName}`);
    const state = stateRes.data?.instance?.state || stateRes.data?.state || 'close';

    // 3. Save in Supabase
    if (supabaseAdmin) {
      try {
        await supabaseAdmin.from('wa_qr_instances').upsert({
          id: instanceName,
          instance_name: instanceName,
          nome_conexao: nomeConexao || instanceName,
          status: state,
          created_at: new Date().toISOString()
        });
      } catch (e) {
        console.warn('Supabase link warning:', e);
      }
    }

    return res.json({ success: true, state });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Create or connect a specific instance (ensures ONE instance per connection)
app.post('/api/evolution/create', async (req, res) => {
  const { instanceName, options } = req.body;
  if (!instanceName) return res.status(400).json({ error: 'instanceName is required' });

  try {
    const pubUrl = process.env.APP_URL || 'https://ais-dev-dyeavpmm35ffptzuz2wdop.run.app';
    const webhookUrl = `${pubUrl}/api/webhook/whatsapp-qr`;

    // 1. Save in Supabase BEFORE creating in Evolution
    if (supabaseAdmin) {
      try {
        await supabaseAdmin.from('wa_qr_instances').upsert({
          id: instanceName,
          instance_name: instanceName,
          nome_conexao: options?.nomeConexao || instanceName,
          status: 'qrcode',
          funil_id: options?.funilId || 'pipeline-1',
          etapa_id: options?.etapaId || 'stage-1',
          responsavel_id: options?.responsavelId || 'user-1',
          opciones: options || {},
          created_at: new Date().toISOString()
        });
      } catch (e) {
        console.warn('Supabase wa_qr_instances warning:', e);
      }
    }

    // 2. Try creating instance (if already exists, Evolution might return conflict or success)
    await callEvolution('/instance/create', {
      method: 'POST',
      body: JSON.stringify({
        instanceName,
        integration: 'WHATSAPP-BAILEYS',
        qrcode: true,
        webhook: {
          url: webhookUrl,
          byEvents: false,
          base64: true,
          events: [
            'QRCODE_UPDATED',
            'CONNECTION_UPDATE',
            'MESSAGES_SET',
            'MESSAGES_UPSERT',
            'MESSAGES_UPDATE',
            'MESSAGES_DELETE',
            'SEND_MESSAGE',
            'CONTACTS_SET',
            'CONTACTS_UPSERT',
            'CONTACTS_UPDATE',
            'CHATS_SET',
            'CHATS_UPSERT'
          ],
          headers: { 'x-webhook-secret': EVOLUTION_WEBHOOK_SECRET }
        }
      })
    }).catch(() => {});

    await callEvolution(`/settings/set/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify({ rejectCall: options?.rejectCall || false, groupsIgnore: options?.ignoreGroups ?? true })
    }).catch(() => {});

    // 3. Get connect QR
    const connectResult = await callEvolution(`/instance/connect/${instanceName}`);
    if (!connectResult.ok) {
      return res.status(500).json({ error: `Erro ao obter QR code: ${connectResult.errorText || 'Erro desconhecido'}` });
    }

    const connectData = connectResult.data;
    const qrBase64 = connectData?.base64 || connectData?.qrcode?.base64 || null;
    const pairingCode = connectData?.pairingCode || null;

    return res.json({ success: true, qrBase64, pairingCode, instanceName });
  } catch (err: any) {
    console.error('Error in evolution create:', err);
    return res.status(500).json({ error: err.message || 'Failed to create QR instance' });
  }
});

// Get connect QR for existing instance ("Gerar novo QR" on same instance)
postOrDeleteAction('/api/evolution/connect-qr', async (req: any, res: any) => {
  const { instanceName } = req.body;
  if (!instanceName) return res.status(400).json({ error: 'instanceName is required' });

  try {
    const connectResult = await callEvolution(`/instance/connect/${instanceName}`);
    const connectData = connectResult.data;
    const qrBase64 = connectData?.base64 || connectData?.qrcode?.base64 || null;
    const pairingCode = connectData?.pairingCode || null;
    return res.json({ success: true, qrBase64, pairingCode });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/evolution/logout', async (req: any, res: any) => {
  const { instanceName } = req.body;
  await callEvolution(`/instance/logout/${instanceName}`, { method: 'DELETE' });
  return res.json({ success: true });
});

app.post('/api/evolution/delete', async (req: any, res: any) => {
  const { instanceName } = req.body;
  await callEvolution(`/instance/delete/${instanceName}`, { method: 'DELETE' });
  if (supabaseAdmin) {
    try {
      await supabaseAdmin.from('wa_qr_instances').delete().eq('instance_name', instanceName);
    } catch {}
  }
  return res.json({ success: true });
});

function postOrDeleteAction(path: string, handler: any) {
  app.post(path, handler);
}

// Evolution Webhook Endpoint (/api/webhook/whatsapp-qr) - Accepts secret via header or query ?token=
app.post('/api/webhook/whatsapp-qr', async (req, res) => {
  const secret = req.headers['x-webhook-secret'] || req.query.token;
  if (secret !== EVOLUTION_WEBHOOK_SECRET) {
    return res.sendStatus(401);
  }

  res.sendStatus(200);

  try {
    const body = req.body;
    const event = body.event;
    const instance = body.instance;

    if (event === 'CONNECTION_UPDATE') {
      const state = body.data?.state;
      if (supabaseAdmin && state) {
        try {
          await supabaseAdmin.from('wa_qr_instances').update({ status: state }).eq('instance_name', instance);
        } catch {}
      }
    } else if (event === 'QRCODE_UPDATED') {
      const qr = body.data?.base64 || body.data?.qrcode;
      console.log(`[Evolution QR ${instance}] QR Code updated`);
    } else if (event === 'MESSAGES_UPSERT') {
      const msgData = body.data;
      if (!msgData || msgData.status === 'broadcast') return;

      const remoteJid = msgData.key?.remoteJid || msgData.remoteJid;
      if (!remoteJid || remoteJid.includes('@g.us')) return;

      const fromMe = msgData.key?.fromMe || msgData.fromMe;
      const phone = remoteJid.replace('@s.whatsapp.net', '');
      const content = msgData.message?.conversation || msgData.message?.extendedTextMessage?.text || '[Mídia]';
      const timestamp = new Date(msgData.messageTimestamp ? msgData.messageTimestamp * 1000 : Date.now()).toISOString();
      const wamid = msgData.key?.id || `msg-${Date.now()}`;

      if (supabaseAdmin) {
        try {
          let { data: contact } = await supabaseAdmin.from('contacts').select('id').eq('telefone', phone).single();
          let contactId = contact?.id;
          if (!contactId) {
            contactId = `contact-${Date.now()}`;
            await supabaseAdmin.from('contacts').insert({ id: contactId, nome: `Contato ${phone}`, telefone: phone });
          }

          let { data: lead } = await supabaseAdmin.from('leads').select('id').eq('contact_ids', `["${contactId}"]`).single();
          let leadId = lead?.id;
          if (!leadId) {
            leadId = `lead-${Date.now()}`;
            await supabaseAdmin.from('leads').insert({
              id: leadId,
              nome: `Lead ${phone}`,
              valor: 1500,
              pipeline_id: 'pipeline-1',
              stage_id: 'stage-1',
              responsavel_id: 'user-1',
              origem_id: 'whatsapp_qr',
              contact_ids: [contactId]
            });
          }

          let { data: conv } = await supabaseAdmin.from('conversations').select('id').eq('contact_id', contactId).single();
          let convId = conv?.id;
          if (!convId) {
            convId = `conv-${Date.now()}`;
            await supabaseAdmin.from('conversations').insert({
              id: convId,
              contact_id: contactId,
              lead_id: leadId,
              canal: 'whatsapp_qr',
              status: 'aberta',
              atendente_id: 'user-1',
              ultima_mensagem: content,
              ultima_mensagem_at: timestamp,
              naoLidas: fromMe ? 0 : 1
            });
          } else {
            await supabaseAdmin.from('conversations').update({
              ultima_mensagem: content,
              ultima_mensagem_at: timestamp
            }).eq('id', convId);
          }

          await supabaseAdmin.from('messages').insert({
            id: wamid,
            conversation_id: convId,
            remetente: fromMe ? 'usuario' : 'contato',
            remetente_id: fromMe ? 'user-1' : contactId,
            tipo: 'texto',
            conteudo: content,
            timestamp: timestamp,
            status: fromMe ? 'enviada' : 'entregue'
          });
        } catch (e) {
          console.warn('DB error in Evolution webhook:', e);
        }
      }
    }
  } catch (err) {
    console.error('Error in Evolution webhook:', err);
  }
});

// Evolution Send Endpoint with Anti-Ban Queue
app.post('/api/evolution/send', async (req, res) => {
  const { instance, phone, message } = req.body;
  if (!instance || !phone || !message) {
    return res.status(400).json({ error: 'Instance, phone and message are required' });
  }

  messageQueue.push({ instance, phone, message, type: 'text' });
  processMessageQueue();

  return res.json({ success: true, queued: true });
});

// Setup Vite middleware or static serving
if (process.env.NODE_ENV !== 'production') {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa'
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
