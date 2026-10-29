import { create } from 'zustand';
import { 
  User, Pipeline, Tag, LeadSource, LossReason, 
  Lead, Contact, Company, Product, Task, Note, Conversation, Message, Channel, ActivityEvent, Notification, MessageTemplate, EmailMessage, EmailTemplate, AutomationRule, SalesBot, BotNode, TaskTypeConfig, TaskOutcomeConfig 
} from '../types';
import { db } from '../services/db/storage';
import { pullCrmChanges } from '../services/db/sync';
import { supabaseService, supabase } from '../services/db/supabase';

interface CRMState {
  currentUser: User;
  users: User[];
  pipelines: Pipeline[];
  tags: Tag[];
  sources: LeadSource[];
  lossReasons: LossReason[];
  companies: Company[];
  products: Product[];
  contacts: Contact[];
  leads: Lead[];
  tasks: Task[];
  notes: Note[];
  conversations: Conversation[];
  messages: Message[];
  channels: Channel[];
  activities: ActivityEvent[];
  notifications: Notification[];
  messageTemplates: MessageTemplate[];
  emails: EmailMessage[];
  emailTemplates: EmailTemplate[];
  automationRules: AutomationRule[];
  salesBots: SalesBot[];
  
  // UI states
  theme: 'light' | 'dark';
  wallpaper: string;
  activeModule: string;
  globalSearchOpen: boolean;
  aiCopilotOpen: boolean;
  toasts: { id: string; title: string; message: string; type?: 'success' | 'info' | 'error' }[];
  isAuthenticated: boolean;

  // Actions
  setCurrentUser: (user: User) => void;
  updateCurrentUser: (updates: Partial<User>) => void;
  login: (email: string, senha: string) => Promise<{ ok: boolean; error?: string }>;
  completeLogin: (email: string) => void;
  logout: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setWallpaper: (wallpaper: string) => void;
  setActiveModule: (module: string) => void;
  setGlobalSearchOpen: (open: boolean) => void;
  setAiCopilotOpen: (open: boolean) => void;
  addToast: (title: string, message: string, type?: 'success' | 'info' | 'error') => void;
  removeToast: (id: string) => void;

  // Lead actions
  addLead: (lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'ultimaInteracaoAt' | 'naoLidas'>) => Lead;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  deleteLead: (id: string) => void;
  moveLeadStage: (leadId: string, newStageId: string, motivoPerdaId?: string, comentarioPerda?: string) => void;
  bulkUpdateLeadsStage: (leadIds: string[], stageId: string) => void;
  bulkUpdateLeadsResponsavel: (leadIds: string[], responsavelId: string) => void;
  bulkDeleteLeads: (leadIds: string[]) => void;

  // Contact actions
  addContact: (contact: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>) => Contact;
  updateContact: (id: string, updates: Partial<Contact>) => void;
  deleteContact: (id: string) => void;

  // Task actions
  taskTypes: TaskTypeConfig[];
  taskOutcomes: TaskOutcomeConfig[];
  addTask: (task: Omit<Task, 'id' | 'createdAt'> & { status?: 'pendente' | 'em_andamento' | 'concluida' | 'cancelada'; prioridade?: 'baixa' | 'normal' | 'alta' | 'urgente' }) => Task;
  updateTask: (id: string, updates: Partial<Task>) => void;
  completeTask: (taskId: string, resultado?: string, desfecho?: string) => void;
  deleteTask: (taskId: string) => void;
  rescheduleTask: (taskId: string, novoPrazo: string) => void;

  // Note actions
  addNote: (note: Omit<Note, 'id' | 'createdAt'>) => Note;

  // Chat actions
  sendMessage: (conversationId: string, conteudo: string, direcao?: 'entrada' | 'saida' | 'interna', autor?: 'contato' | 'usuario' | 'bot' | 'ia', tipo?: 'texto' | 'imagem' | 'audio' | 'arquivo' | 'modelo', anexos?: any[]) => void;
  createConversation: (contactId: string, leadId?: string, canal?: 'whatsapp' | 'instagram' | 'messenger' | 'telegram' | 'email' | 'chat_site') => Conversation;
  simulateClientIncomingMessage: (nomeContato: string, telefone: string, canal: 'whatsapp' | 'instagram' | 'messenger' | 'telegram' | 'email' | 'chat_site', texto: string) => void;
  updateConversationStatus: (id: string, status: 'aberta' | 'encerrada') => void;
  assignConversation: (id: string, responsavelId: string) => void;
  markConversationUnread: (id: string) => void;

  // Template actions
  addMessageTemplate: (template: Omit<MessageTemplate, 'id'>) => void;
  deleteMessageTemplate: (id: string) => void;

  // Email actions
  sendEmail: (email: Omit<EmailMessage, 'id' | 'enviadoAt' | 'lido'>) => void;
  addEmailTemplate: (template: Omit<EmailTemplate, 'id'>) => void;
  deleteEmailTemplate: (id: string) => void;
  simulateIncomingEmail: (remetente: string, destinatario: string, assunto: string, corpo: string) => void;

  // Automation / Bot actions
  addAutomationRule: (rule: Omit<AutomationRule, 'id'>) => void;
  updateAutomationRule: (id: string, updates: Partial<AutomationRule>) => void;
  deleteAutomationRule: (id: string) => void;
  addSalesBot: (bot: Omit<SalesBot, 'id'>) => void;
  updateSalesBot: (id: string, updates: Partial<SalesBot>) => void;
  deleteSalesBot: (id: string) => void;

  // Public scheduling
  bookPublicAppointment: (nome: string, telefone: string, email: string, dataHora: string, usuarioId: string) => void;

  // System
  restoreSeed: () => void;
  clearAllData: () => void;
  clearAllDataCompletely: () => void;
  refreshData: () => void;
}

// ==========================================
// WHATSAPP VIA QR: junta no navegador o que chegou no servidor
// ==========================================
// v3: força baixar o WhatsApp de novo uma vez (corrige mensagens que ficaram de fora)
const WA_FEED_SINCE_KEY = 'conversa_crm_wa_feed_since_v3';
const WA_EPOCH = '1970-01-01T00:00:00.000Z';

const WA_DELETED_LEADS_KEY = 'conversa_crm_wa_deleted_leads_v1';

// Leads do WhatsApp excluídos: só voltam a ser criados se o contato mandar mensagem nova depois da exclusão
function getDeletedWaLeads(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(WA_DELETED_LEADS_KEY) || '{}'); } catch { return {}; }
}

function markWaLeadsDeleted(ids: string[]) {
  const waIds = ids.filter(id => id.startsWith('wa-l-'));
  if (waIds.length === 0) return;
  const map = getDeletedWaLeads();
  const now = new Date().toISOString();
  for (const id of waIds) map[id] = now;
  localStorage.setItem(WA_DELETED_LEADS_KEY, JSON.stringify(map));
}

const looksLikePhone = (name?: string) => !name || /^[+\d\s()-]+$/.test(name);

function mergeWhatsAppFeed(feed: any) {
  const serverConvs: any[] = Array.isArray(feed?.conversations) ? feed.conversations : [];
  const serverMsgs: any[] = Array.isArray(feed?.messages) ? feed.messages : [];
  if (serverConvs.length === 0 && serverMsgs.length === 0) return;

  const now = new Date().toISOString();
  const contacts = db.getContacts();
  const leads = db.getLeads();
  const conversations = db.getConversations();
  const messages = db.getMessages();
  const currentUser = db.getCurrentUser();

  const pipelines = db.getPipelines();
  const firstPipeline = pipelines[0];
  const entryStage = firstPipeline?.stages.find(st => st.tipo === 'entrada') || firstPipeline?.stages[0];

  const deletedWaLeads = getDeletedWaLeads();
  let deletedWaLeadsChanged = false;
  const newestIncomingByConv = new Map<string, string>();
  for (const sm of serverMsgs) {
    if (sm.direcao !== 'entrada' || !sm.enviadaAt) continue;
    const iso = new Date(sm.enviadaAt).toISOString();
    if (iso > (newestIncomingByConv.get(sm.conversationId) || '')) newestIncomingByConv.set(sm.conversationId, iso);
  }

  const contactById = new Map(contacts.map((c, i) => [c.id, i]));
  // Mesmo telefone = mesmo contato (ex.: lead da planilha que depois chamou no WhatsApp)
  const phoneKeyOf = (raw?: string) => {
    let d = (raw || '').replace(/\D/g, '');
    if (d.length === 10 || d.length === 11) d = '55' + d;
    if (d.startsWith('55') && (d.length === 12 || d.length === 13)) return `55${d.slice(2, 4)}${d.slice(-8)}`;
    return d;
  };
  const contactByPhone = new Map<string, string>();
  contacts.forEach(c => (c.telefones || []).forEach(t => {
    const k = phoneKeyOf(t);
    if (k && !contactByPhone.has(k)) contactByPhone.set(k, c.id);
  }));
  const leadByContact = new Map<string, string>();
  leads.forEach(l => (l.contactIds || []).forEach(cid => { if (!leadByContact.has(cid)) leadByContact.set(cid, l.id); }));
  const leadById = new Map(leads.map((l, i) => [l.id, i]));
  const convById = new Map(conversations.map((c, i) => [c.id, i]));

  for (const sc of serverConvs) {
    const phone = sc.waPhone ? `+${sc.waPhone}` : '';
    const matchedContactId = !contactById.has(sc.contactId) && sc.waPhone ? contactByPhone.get(phoneKeyOf(sc.waPhone)) : undefined;
    if (matchedContactId) sc.contactId = matchedContactId;
    const existingLeadForContact = leadByContact.get(sc.contactId);
    if (existingLeadForContact && !leadById.has(sc.leadId)) sc.leadId = existingLeadForContact;
    const name = sc.contactName || phone || 'Contato WhatsApp';

    // Contato
    if (!contactById.has(sc.contactId)) {
      contacts.push({
        id: sc.contactId,
        nome: name,
        telefones: phone ? [phone] : [],
        emails: [],
        tags: [],
        customFields: {},
        canais: { whatsapp: phone || undefined },
        consentimentoMarketing: false,
        createdAt: now,
        updatedAt: now
      });
      contactById.set(sc.contactId, contacts.length - 1);
      if (sc.waPhone) contactByPhone.set(phoneKeyOf(sc.waPhone), sc.contactId);
    } else {
      const i = contactById.get(sc.contactId)!;
      if (looksLikePhone(contacts[i].nome) && !looksLikePhone(sc.contactName)) {
        contacts[i] = { ...contacts[i], nome: sc.contactName, updatedAt: now };
      }
    }

    // Lead: só para conversas com mensagem nova recebida (não para o histórico importado)
    let leadId: string | undefined = leadById.has(sc.leadId) ? sc.leadId : undefined;
    const deletedAt = deletedWaLeads[sc.leadId];
    const canCreateLead = !deletedAt || (newestIncomingByConv.get(sc.id) || '') > deletedAt;
    if (!leadId && sc.criarLead && canCreateLead && firstPipeline && entryStage) {
      if (deletedAt) {
        delete deletedWaLeads[sc.leadId];
        deletedWaLeadsChanged = true;
      }
      leads.push({
        id: sc.leadId,
        nome: name,
        valor: 0,
        pipelineId: firstPipeline.id,
        stageId: entryStage.id,
        responsavelId: currentUser?.id,
        contactIds: [sc.contactId],
        tags: [],
        origemId: 'src-wa',
        customFields: {},
        produtos: [],
        createdAt: now,
        updatedAt: now,
        ultimaInteracaoAt: sc.ultimaMensagemAt || now,
        naoLidas: sc.naoLidas || 0
      });
      leadById.set(sc.leadId, leads.length - 1);
      leadByContact.set(sc.contactId, sc.leadId);
      leadId = sc.leadId;
    } else if (leadId) {
      const i = leadById.get(leadId)!;
      leads[i] = { ...leads[i], ultimaInteracaoAt: sc.ultimaMensagemAt || leads[i].ultimaInteracaoAt, naoLidas: sc.naoLidas || 0 };
    }

    // Conversa
    if (convById.has(sc.id)) {
      const i = convById.get(sc.id)!;
      conversations[i] = {
        ...conversations[i],
        naoLidas: sc.naoLidas || 0,
        ultimaMensagemAt: sc.ultimaMensagemAt || conversations[i].ultimaMensagemAt,
        leadId: conversations[i].leadId || leadId
      };
    } else {
      conversations.push({
        id: sc.id,
        canal: 'whatsapp',
        contactId: sc.contactId,
        leadId,
        status: 'aberta',
        naoLidas: sc.naoLidas || 0,
        ultimaMensagemAt: sc.ultimaMensagemAt || now
      });
      convById.set(sc.id, conversations.length - 1);
    }
  }

  // Mensagens: o servidor é a fonte da verdade (substitui pelo id)
  const msgById = new Map(messages.map((m, i) => [m.id, i]));
  for (const sm of serverMsgs) {
    const msg: Message = {
      id: sm.id,
      conversationId: sm.conversationId,
      direcao: sm.direcao,
      autor: sm.autor,
      tipo: sm.tipo,
      conteudo: sm.conteudo,
      status: sm.status,
      enviadaAt: sm.enviadaAt
    };
    if (msgById.has(sm.id)) {
      messages[msgById.get(sm.id)!] = msg;
    } else {
      messages.push(msg);
      msgById.set(sm.id, messages.length - 1);
    }
  }
  messages.sort((a, b) => new Date(a.enviadaAt).getTime() - new Date(b.enviadaAt).getTime());

  db.saveContacts(contacts);
  db.saveLeads(leads);
  db.saveConversations(conversations);
  db.saveMessages(messages);
  if (deletedWaLeadsChanged) localStorage.setItem(WA_DELETED_LEADS_KEY, JSON.stringify(deletedWaLeads));
}

export const useStore = create<CRMState>((set, get) => ({
  currentUser: db.getCurrentUser(),
  users: db.getUsers(),
  pipelines: db.getPipelines(),
  tags: db.getTags(),
  sources: db.getSources(),
  lossReasons: db.getLossReasons(),
  companies: db.getCompanies(),
  products: db.getProducts(),
  contacts: db.getContacts(),
  leads: db.getLeads(),
  tasks: db.getTasks(),
  taskTypes: db.getTaskTypes(),
  taskOutcomes: db.getTaskOutcomes(),
  notes: db.getNotes(),
  conversations: db.getConversations(),
  messages: db.getMessages(),
  channels: db.getChannels(),
  activities: db.getActivities(),
  notifications: [],
  messageTemplates: db.getMessageTemplates(),
  emails: db.getEmails(),
  emailTemplates: db.getEmailTemplates(),
  automationRules: db.getAutomationRules(),
  salesBots: db.getSalesBots(),

  theme: 'dark',
  wallpaper: 'gradient-indigo',
  activeModule: 'painel',
  globalSearchOpen: false,
  aiCopilotOpen: false,
  toasts: [],
  isAuthenticated: false,

  // Login real pelo Supabase Auth (a senha nunca fica no código nem no navegador)
  login: async (email: string, senha: string) => {
    if (!supabase) {
      return { ok: false, error: 'Login indisponível: faltam VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nas variáveis da Vercel.' };
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
    if (error || !data.session) {
      const msg = error?.message || '';
      if (/invalid login|invalid credentials/i.test(msg)) return { ok: false, error: 'E-mail ou senha inválidos.' };
      if (/email not confirmed/i.test(msg)) return { ok: false, error: 'Confirme o e-mail antes de entrar (ou marque "Auto Confirm" ao criar o usuário no Supabase).' };
      return { ok: false, error: msg || 'Não foi possível entrar.' };
    }
    get().completeLogin(data.session.user.email || email);
    return { ok: true };
  },

  // Liga o login ao usuário do CRM com o mesmo e-mail (ou ao primeiro administrador)
  completeLogin: (email: string) => {
    const users = get().users;
    const found = users.find(u => u.email.toLowerCase() === email.toLowerCase())
      || users.find(u => u.roleId === 'role-admin')
      || users[0];
    const current = found ? { ...found, email } : { ...get().currentUser, email };
    db.setCurrentUser(current);
    set({ currentUser: current, isAuthenticated: true });
  },

  logout: () => {
    supabase?.auth.signOut();
    set({ isAuthenticated: false });
  },

  setCurrentUser: (user) => {
    db.setCurrentUser(user);
    set({ currentUser: user });
  },

  updateCurrentUser: (updates) => {
    const updatedUser = { ...get().currentUser, ...updates };
    db.setCurrentUser(updatedUser);
    const users = get().users.map(u => u.id === updatedUser.id ? updatedUser : u);
    db.saveUsers(users);
    set({ currentUser: updatedUser, users });
    get().addToast('Perfil Atualizado', 'Suas informações foram salvas com sucesso.');
  },

  setTheme: (theme) => set({ theme }),
  setWallpaper: (wallpaper) => set({ wallpaper }),
  setActiveModule: (activeModule) => set({ activeModule }),
  setGlobalSearchOpen: (globalSearchOpen) => set({ globalSearchOpen }),
  setAiCopilotOpen: (aiCopilotOpen) => set({ aiCopilotOpen }),

  addToast: (title, message, type = 'success') => {
    const id = `toast-${Date.now()}`;
    set(state => ({ toasts: [...state.toasts, { id, title, message, type }] }));
    setTimeout(() => {
      get().removeToast(id);
    }, 4000);
  },

  removeToast: (id) => {
    set(state => ({ toasts: state.toasts.filter(t => t.id !== id) }));
  },

  refreshData: async () => {
    await pullCrmChanges();
    try {
      const hasWaConversations = db.getConversations().some(c => c.id.startsWith('wa:'));
      let since = hasWaConversations ? (localStorage.getItem(WA_FEED_SINCE_KEY) || WA_EPOCH) : WA_EPOCH;
      for (let round = 0; round < 10; round++) {
        const res = await fetch(`/api/wa/feed?since=${encodeURIComponent(since)}`);
        if (!res.ok) break;
        const feed = await res.json();
        mergeWhatsAppFeed(feed);
        if (feed.nextSince) {
          since = feed.nextSince;
          localStorage.setItem(WA_FEED_SINCE_KEY, since);
        }
        if (!feed.hasMore) break;
      }
    } catch (err) {
      console.warn('[WhatsApp feed]', err);
    }

    set({
      users: db.getUsers(),
      pipelines: db.getPipelines(),
      tags: db.getTags(),
      companies: db.getCompanies(),
      products: db.getProducts(),
      contacts: db.getContacts(),
      leads: db.getLeads(),
      tasks: db.getTasks(),
      notes: db.getNotes(),
      conversations: db.getConversations(),
      messages: db.getMessages(),
      activities: db.getActivities(),
      messageTemplates: db.getMessageTemplates(),
      emails: db.getEmails(),
      emailTemplates: db.getEmailTemplates(),
      automationRules: db.getAutomationRules(),
      salesBots: db.getSalesBots(),
    });
  },

  addLead: (leadData) => {
    const newLead: Lead = {
      ...leadData,
      id: `lead-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ultimaInteracaoAt: new Date().toISOString(),
      naoLidas: 0,
    };
    const leads = [newLead, ...get().leads];
    db.saveLeads(leads);
    set({ leads });
    get().addToast('Lead Criado', `Lead "${newLead.nome}" adicionado com sucesso.`);
    return newLead;
  },

  updateLead: (id, updates) => {
    const leads = get().leads.map(l => {
      if (l.id === id) {
        const updated = { ...l, ...updates, updatedAt: new Date().toISOString() };
        supabaseService.upsertRecord('leads', updated);
        return updated;
      }
      return l;
    });
    db.saveLeads(leads);
    set({ leads });
  },

  deleteLead: (id) => {
    const leads = get().leads.filter(l => l.id !== id);
    db.saveLeads(leads);
    supabaseService.deleteRecord('leads', id);
    const conversations = get().conversations.map(c => c.leadId === id ? { ...c, leadId: undefined } : c);
    db.saveConversations(conversations);
    markWaLeadsDeleted([id]);
    set({ leads, conversations });
  },

  moveLeadStage: (leadId, newStageId) => {
    const leads = get().leads.map(l => {
      if (l.id === leadId) {
        const updated = { ...l, stageId: newStageId, updatedAt: new Date().toISOString() };
        supabaseService.upsertRecord('leads', updated);
        return updated;
      }
      return l;
    });
    db.saveLeads(leads);
    set({ leads });
  },

  bulkUpdateLeadsStage: (leadIds, stageId) => {
    const leads = get().leads.map(l => leadIds.includes(l.id) ? { ...l, stageId, updatedAt: new Date().toISOString() } : l);
    db.saveLeads(leads);
    set({ leads });
  },

  bulkUpdateLeadsResponsavel: (leadIds, responsavelId) => {
    const leads = get().leads.map(l => leadIds.includes(l.id) ? { ...l, responsavelId, updatedAt: new Date().toISOString() } : l);
    db.saveLeads(leads);
    set({ leads });
  },

  bulkDeleteLeads: (leadIds) => {
    const leads = get().leads.filter(l => !leadIds.includes(l.id));
    db.saveLeads(leads);
    leadIds.forEach(id => supabaseService.deleteRecord('leads', id));
    const conversations = get().conversations.map(c => c.leadId && leadIds.includes(c.leadId) ? { ...c, leadId: undefined } : c);
    db.saveConversations(conversations);
    markWaLeadsDeleted(leadIds);
    set({ leads, conversations });
  },

  addContact: (contactData) => {
    const newContact: Contact = {
      ...contactData,
      id: `cont-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const contacts = [newContact, ...get().contacts];
    db.saveContacts(contacts);
    set({ contacts });
    return newContact;
  },

  updateContact: (id, updates) => {
    const contacts = get().contacts.map(c => c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c);
    db.saveContacts(contacts);
    set({ contacts });
  },

  deleteContact: (id) => {
    const contacts = get().contacts.filter(c => c.id !== id);
    db.saveContacts(contacts);
    set({ contacts });
  },

  addTask: (taskData) => {
    const newTask: Task = { 
      prioridade: 'normal',
      ...taskData, 
      id: `task-${Date.now()}`, 
      status: taskData.status || 'pendente', 
      createdAt: new Date().toISOString() 
    };
    const tasks = [newTask, ...get().tasks];
    db.saveTasks(tasks);
    set({ tasks });
    get().addToast('Tarefa Criada', `Nova tarefa agendada com sucesso.`);
    return newTask;
  },

  updateTask: (id, updates) => {
    const tasks = get().tasks.map(t => t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t);
    db.saveTasks(tasks);
    set({ tasks });
  },

  completeTask: (taskId, resultado = 'Concluída', desfecho) => {
    const task = get().tasks.find(t => t.id === taskId);
    const tasks = get().tasks.map(t => t.id === taskId ? { 
      ...t, 
      status: 'concluida' as const, 
      resultado: resultado, 
      desfecho: desfecho || t.desfecho,
      concluidaAt: new Date().toISOString() 
    } : t);
    db.saveTasks(tasks);

    if (task && task.entidadeTipo === 'lead' && task.entidadeId) {
      get().addNote({
        texto: `Tarefa concluída: "${task.texto}". Desfecho: ${desfecho || 'Concluído'}. Resultado: ${resultado}`,
        entidadeTipo: 'lead',
        entidadeId: task.entidadeId,
        autorId: get().currentUser.id,
        fixada: false,
      });
    }

    set({ tasks });
    get().addToast('Tarefa Concluída', 'Tarefa marcada como concluída e registrada no feed.');
  },

  deleteTask: (taskId) => {
    const tasks = get().tasks.filter(t => t.id !== taskId);
    db.saveTasks(tasks);
    set({ tasks });
  },

  rescheduleTask: (taskId, novoPrazo) => {
    const tasks = get().tasks.map(t => t.id === taskId ? { ...t, prazo: novoPrazo } : t);
    db.saveTasks(tasks);
    set({ tasks });
    get().addToast('Reagendado', 'Tarefa reagendada com sucesso.');
  },

  addNote: (noteData) => {
    const newNote: Note = { ...noteData, id: `note-${Date.now()}`, createdAt: new Date().toISOString() };
    const notes = [newNote, ...get().notes];
    db.saveNotes(notes);
    set({ notes });
    return newNote;
  },

  sendMessage: (conversationId, conteudo, direcao = 'saida', autor = 'usuario', tipo = 'texto', anexos = []) => {
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      conversationId,
      direcao,
      autor,
      autorId: autor === 'usuario' ? get().currentUser.id : undefined,
      tipo,
      conteudo,
      anexos,
      status: 'enviada',
      enviadaAt: new Date().toISOString(),
    };
    const messages = [...get().messages, newMessage];
    db.saveMessages(messages);

    const conversations = get().conversations.map(c => c.id === conversationId ? {
      ...c,
      ultimaMensagemAt: new Date().toISOString(),
      naoLidas: direcao === 'entrada' ? c.naoLidas + 1 : (direcao === 'saida' && conversationId.startsWith('wa:') ? 0 : c.naoLidas)
    } : c);
    db.saveConversations(conversations);

    set({ messages, conversations });

    // Conversas do WhatsApp via QR: envia de verdade pelo servidor (Evolution API)
    if (conversationId.startsWith('wa:') && direcao === 'saida' && autor === 'usuario') {
      const markFailed = (reason: string) => {
        const updated = get().messages.map(m => m.id === newMessage.id ? { ...m, status: 'falhou' as const } : m);
        db.saveMessages(updated);
        set({ messages: updated });
        get().addToast('Mensagem não enviada', reason, 'error');
      };

      if (tipo !== 'texto' || (anexos && anexos.length > 0)) {
        markFailed('Por enquanto, o WhatsApp via QR Code envia apenas mensagens de texto.');
        return;
      }

      fetch('/api/wa/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, text: conteudo })
      })
        .then(async res => {
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || `Erro ${res.status} ao enviar`);
          return data;
        })
        .then(data => {
          const serverMsg = data.message;
          const replaced = get().messages.map(m => m.id === newMessage.id
            ? { ...m, id: serverMsg?.id || m.id, status: serverMsg?.status || m.status }
            : m);
          const seen = new Set<string>();
          const deduped = replaced.filter(m => (seen.has(m.id) ? false : (seen.add(m.id), true)));
          db.saveMessages(deduped);
          set({ messages: deduped });
        })
        .catch(err => markFailed(err?.message || 'Falha ao enviar pelo WhatsApp.'));
    }
  },

  createConversation: (contactId, leadId, canal = 'whatsapp') => {
    const existing = get().conversations.find(c => c.contactId === contactId && c.status === 'aberta');
    if (existing) return existing;

    const newConv: Conversation = {
      id: `conv-${Date.now()}`,
      canal,
      contactId,
      leadId,
      responsavelId: get().currentUser.id,
      status: 'aberta',
      naoLidas: 0,
      ultimaMensagemAt: new Date().toISOString(),
    };
    const conversations = [newConv, ...get().conversations];
    db.saveConversations(conversations);
    set({ conversations });
    return newConv;
  },

  simulateClientIncomingMessage: (nomeContato, telefone, canal, texto) => {
    let contact = get().contacts.find(c => c.telefones.includes(telefone) || c.nome.toLowerCase() === nomeContato.toLowerCase());
    if (!contact) {
      contact = get().addContact({
        nome: nomeContato,
        telefones: [telefone],
        emails: [`${nomeContato.toLowerCase().replace(/\s+/g, '')}@exemplo.com`],
        tags: ['novo'],
        customFields: {},
        canais: { [canal]: telefone },
        consentimentoMarketing: true,
      });

      const defaultPipeline = get().pipelines[0];
      const entradaStage = defaultPipeline.stages.find(s => s.tipo === 'entrada') || defaultPipeline.stages[0];
      get().addLead({
        nome: `Lead de ${nomeContato}`,
        valor: 5000,
        pipelineId: defaultPipeline.id,
        stageId: entradaStage.id,
        responsavelId: get().users[0].id,
        contactIds: [contact.id],
        tags: ['novo', canal],
        origemId: get().sources[0].id,
        customFields: {},
        produtos: [],
      });
      get().addToast('Novo Lead Gerado!', `Contato desconhecido "${nomeContato}" gerou lead em Leads de entrada.`, 'info');
    }

    let conv = get().conversations.find(c => c.contactId === contact!.id && c.status === 'aberta');
    if (!conv) {
      conv = get().createConversation(contact!.id, undefined, canal);
    }

    get().sendMessage(conv.id, texto, 'entrada', 'contato');
    get().addToast('Nova Mensagem', `${nomeContato}: "${texto}"`, 'info');

    // Salesbot trigger integration
    const activeBots = get().salesBots.filter((b: SalesBot) => b.ativo);
    if (activeBots.length > 0) {
      setTimeout(() => {
        const bot = activeBots[0];
        const msgNode = bot.nodes.find((n: BotNode) => n.tipo === 'mensagem' || n.tipo === 'pergunta');
        if (msgNode) {
          const botReply = msgNode.config.texto || msgNode.config.pergunta || 'Olá! Como posso ajudar?';
          get().sendMessage(conv!.id, botReply, 'saida', 'bot', 'texto');
        }
      }, 1200);
    }
  },

  updateConversationStatus: (id, status) => {
    const conversations = get().conversations.map(c => c.id === id ? { ...c, status } : c);
    db.saveConversations(conversations);
    set({ conversations });
  },

  assignConversation: (id, responsavelId) => {
    const conversations = get().conversations.map(c => c.id === id ? { ...c, responsavelId } : c);
    db.saveConversations(conversations);
    set({ conversations });
  },

  markConversationUnread: (id) => {
    const conversations = get().conversations.map(c => c.id === id ? { ...c, naoLidas: c.naoLidas + 1 } : c);
    db.saveConversations(conversations);
    set({ conversations });
  },

  addMessageTemplate: (templateData) => {
    const newTpl: MessageTemplate = { ...templateData, id: `tpl-${Date.now()}` };
    const messageTemplates = [...get().messageTemplates, newTpl];
    db.saveMessageTemplates(messageTemplates);
    set({ messageTemplates });
    get().addToast('Modelo Salvo', `Modelo "${newTpl.nome}" criado com sucesso.`);
  },

  deleteMessageTemplate: (id) => {
    const messageTemplates = get().messageTemplates.filter(t => t.id !== id);
    db.saveMessageTemplates(messageTemplates);
    set({ messageTemplates });
  },

  sendEmail: (emailData) => {
    const newEmail: EmailMessage = {
      ...emailData,
      id: `email-${Date.now()}`,
      lido: true,
      enviadoAt: new Date().toISOString(),
    };
    const emails = [newEmail, ...get().emails];
    db.saveEmails(emails);
    set({ emails });
    get().addToast('E-mail Enviado', `Mensagem enviada para ${emailData.destinatario}`);
  },

  addEmailTemplate: (templateData) => {
    const newTpl: EmailTemplate = { ...templateData, id: `etpl-${Date.now()}` };
    const emailTemplates = [...get().emailTemplates, newTpl];
    db.saveEmailTemplates(emailTemplates);
    set({ emailTemplates });
    get().addToast('Modelo de E-mail Salvo', `Modelo "${newTpl.nome}" criado com sucesso.`);
  },

  deleteEmailTemplate: (id) => {
    const emailTemplates = get().emailTemplates.filter(t => t.id !== id);
    db.saveEmailTemplates(emailTemplates);
    set({ emailTemplates });
  },

  simulateIncomingEmail: (remetente, destinatario, assunto, corpo) => {
    let contact = get().contacts.find(c => c.emails.includes(remetente));
    let leadId: string | undefined;

    if (!contact) {
      const nomeParsed = remetente.split('@')[0];
      contact = get().addContact({
        nome: nomeParsed.charAt(0).toUpperCase() + nomeParsed.slice(1),
        telefones: ['+55 (11) 90000-0000'],
        emails: [remetente],
        tags: ['email_parsing'],
        customFields: {},
        canais: { email: remetente },
        consentimentoMarketing: true,
      });

      const defaultPipeline = get().pipelines[0];
      const entradaStage = defaultPipeline.stages.find(s => s.tipo === 'entrada') || defaultPipeline.stages[0];
      const newLead = get().addLead({
        nome: `Lead via E-mail: ${assunto}`,
        valor: 6000,
        pipelineId: defaultPipeline.id,
        stageId: entradaStage.id,
        responsavelId: get().users[0].id,
        contactIds: [contact.id],
        tags: ['email_parsing'],
        origemId: get().sources[0].id,
        customFields: {},
        produtos: [],
      });
      leadId = newLead.id;
      get().addToast('Novo Lead via E-mail', `E-mail de ${remetente} gerou novo lead em Leads de entrada.`, 'info');
    }

    const newEmail: EmailMessage = {
      id: `email-${Date.now()}`,
      pasta: 'entrada',
      remetente,
      destinatario,
      assunto,
      corpo,
      lido: false,
      rastreamentoAbertura: { aberta: false },
      contactId: contact.id,
      leadId,
      enviadoAt: new Date().toISOString(),
    };
    const emails = [newEmail, ...get().emails];
    db.saveEmails(emails);
    set({ emails });
  },

  addAutomationRule: (ruleData) => {
    const newRule: AutomationRule = { ...ruleData, id: `rule-${Date.now()}` };
    const automationRules = [...get().automationRules, newRule];
    db.saveAutomationRules(automationRules);
    set({ automationRules });
    get().addToast('Regra Criada', `Automação "${newRule.nome}" salva.`);
  },

  updateAutomationRule: (id, updates) => {
    const automationRules = get().automationRules.map(r => r.id === id ? { ...r, ...updates } : r);
    db.saveAutomationRules(automationRules);
    set({ automationRules });
  },

  deleteAutomationRule: (id) => {
    const automationRules = get().automationRules.filter(r => r.id !== id);
    db.saveAutomationRules(automationRules);
    set({ automationRules });
  },

  addSalesBot: (botData) => {
    const newBot: SalesBot = { ...botData, id: `bot-${Date.now()}` };
    const salesBots = [...get().salesBots, newBot];
    db.saveSalesBots(salesBots);
    set({ salesBots });
    get().addToast('Salesbot Criado', `Bot "${newBot.nome}" criado.`);
  },

  updateSalesBot: (id, updates) => {
    const salesBots = get().salesBots.map(b => b.id === id ? { ...b, ...updates } : b);
    db.saveSalesBots(salesBots);
    set({ salesBots });
  },

  deleteSalesBot: (id) => {
    const salesBots = get().salesBots.filter(b => b.id !== id);
    db.saveSalesBots(salesBots);
    set({ salesBots });
  },

  bookPublicAppointment: (nome, telefone, email, dataHora, usuarioId) => {
    const contact = get().addContact({
      nome,
      telefones: [telefone],
      emails: [email],
      tags: ['agendamento_publico'],
      customFields: {},
      canais: { whatsapp: telefone },
      consentimentoMarketing: true,
    });

    const defaultPipeline = get().pipelines[0];
    const entradaStage = defaultPipeline.stages.find(s => s.tipo === 'entrada') || defaultPipeline.stages[0];
    const newLead = get().addLead({
      nome: `Reunião Agendada - ${nome}`,
      valor: 8000,
      pipelineId: defaultPipeline.id,
      stageId: entradaStage.id,
      responsavelId: usuarioId,
      contactIds: [contact.id],
      tags: ['agendamento'],
      origemId: get().sources[0].id,
      customFields: {},
      produtos: [],
    });

    get().addTask({
      tipo: 'reuniao',
      texto: `Reunião agendada com ${nome} via link público`,
      prazo: dataHora,
      responsavelId: usuarioId,
      entidadeTipo: 'lead',
      entidadeId: newLead.id,
    });

    get().addToast('Agendamento Realizado!', `Reunião confirmada para ${new Date(dataHora).toLocaleString('pt-BR')}`);
  },

  restoreSeed: () => {
    db.restoreSeed();
    get().refreshData();
  },

  clearAllData: () => {
    db.clearAll();
    get().refreshData();
  },

  clearAllDataCompletely: () => {
    db.clearAllCompletely();
    set({
      leads: [],
      contacts: [],
      companies: [],
      products: [],
      tasks: [],
      notes: [],
      conversations: [],
      messages: [],
      emails: [],
      activities: [],
      messageTemplates: [],
      emailTemplates: [],
      automationRules: [],
      salesBots: [],
    });
    window.location.reload();
  }
}));
