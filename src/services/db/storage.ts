import { 
  User, Team, Role, Pipeline, Tag, LeadSource, LossReason, 
  Lead, Contact, Company, Product, Task, Note, Conversation, Message, Channel, ActivityEvent, Notification, MessageTemplate, EmailMessage, EmailTemplate, AutomationRule, SalesBot, TaskTypeConfig, TaskOutcomeConfig 
} from '../../types';
import { 
  initialUsers, initialTeams, initialRoles, initialPipelines, initialTags, 
  initialSources, initialLossReasons, initialCompanies, initialProducts, 
  initialContacts, initialLeads, initialTasks, initialNotes, initialConversations, 
  initialMessages, initialChannels, initialActivityEvents, initialMessageTemplates, 
  initialEmails, initialEmailTemplates, initialAutomationRules, initialSalesBots 
} from './seed';

const STORAGE_KEYS = {
  USERS: 'conversa_crm_users_v1',
  TEAMS: 'conversa_crm_teams_v1',
  ROLES: 'conversa_crm_roles_v1',
  PIPELINES: 'conversa_crm_pipelines_v1',
  TAGS: 'conversa_crm_tags_v1',
  SOURCES: 'conversa_crm_sources_v1',
  LOSS_REASONS: 'conversa_crm_loss_reasons_v1',
  COMPANIES: 'conversa_crm_companies_v1',
  PRODUCTS: 'conversa_crm_products_v1',
  CONTACTS: 'conversa_crm_contacts_v1',
  LEADS: 'conversa_crm_leads_v1',
  TASKS: 'conversa_crm_tasks_v1',
  NOTES: 'conversa_crm_notes_v1',
  CONVERSATIONS: 'conversa_crm_conversations_v1',
  MESSAGES: 'conversa_crm_messages_v1',
  CHANNELS: 'conversa_crm_channels_v1',
  ACTIVITIES: 'conversa_crm_activities_v1',
  NOTIFICATIONS: 'conversa_crm_notifications_v1',
  MESSAGE_TEMPLATES: 'conversa_crm_templates_v1',
  EMAILS: 'conversa_crm_emails_v1',
  EMAIL_TEMPLATES: 'conversa_crm_email_templates_v1',
  AUTOMATION_RULES: 'conversa_crm_auto_rules_v1',
  SALES_BOTS: 'conversa_crm_sales_bots_v1',
  CURRENT_USER: 'conversa_crm_current_user_v1',
};

export const db = {
  getUsers: (): User[] => {
    const data = localStorage.getItem(STORAGE_KEYS.USERS);
    return data ? JSON.parse(data) : initialUsers;
  },
  saveUsers: (items: User[]) => localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(items)),

  getTeams: (): Team[] => {
    const data = localStorage.getItem(STORAGE_KEYS.TEAMS);
    return data ? JSON.parse(data) : initialTeams;
  },

  getRoles: (): Role[] => {
    const data = localStorage.getItem(STORAGE_KEYS.ROLES);
    return data ? JSON.parse(data) : initialRoles;
  },

  getPipelines: (): Pipeline[] => {
    const data = localStorage.getItem(STORAGE_KEYS.PIPELINES);
    return data ? JSON.parse(data) : initialPipelines;
  },
  savePipelines: (items: Pipeline[]) => localStorage.setItem(STORAGE_KEYS.PIPELINES, JSON.stringify(items)),

  getTags: (): Tag[] => {
    const data = localStorage.getItem(STORAGE_KEYS.TAGS);
    return data ? JSON.parse(data) : initialTags;
  },
  saveTags: (items: Tag[]) => localStorage.setItem(STORAGE_KEYS.TAGS, JSON.stringify(items)),

  getSources: (): LeadSource[] => {
    const data = localStorage.getItem(STORAGE_KEYS.SOURCES);
    return data ? JSON.parse(data) : initialSources;
  },

  getLossReasons: (): LossReason[] => {
    const data = localStorage.getItem(STORAGE_KEYS.LOSS_REASONS);
    return data ? JSON.parse(data) : initialLossReasons;
  },

  getCompanies: (): Company[] => {
    const data = localStorage.getItem(STORAGE_KEYS.COMPANIES);
    return data ? JSON.parse(data) : [];
  },
  saveCompanies: (items: Company[]) => localStorage.setItem(STORAGE_KEYS.COMPANIES, JSON.stringify(items)),

  getProducts: (): Product[] => {
    const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    return data ? JSON.parse(data) : [];
  },
  saveProducts: (items: Product[]) => localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(items)),

  getContacts: (): Contact[] => {
    const data = localStorage.getItem(STORAGE_KEYS.CONTACTS);
    return data ? JSON.parse(data) : [];
  },
  saveContacts: (items: Contact[]) => localStorage.setItem(STORAGE_KEYS.CONTACTS, JSON.stringify(items)),

  getLeads: (): Lead[] => {
    const data = localStorage.getItem(STORAGE_KEYS.LEADS);
    return data ? JSON.parse(data) : [];
  },
  saveLeads: (items: Lead[]) => localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(items)),

  getTasks: (): Task[] => {
    const version = localStorage.getItem('conversa_crm_schema_version');
    const data = localStorage.getItem(STORAGE_KEYS.TASKS);
    const existing: Task[] = data ? JSON.parse(data) : initialTasks;

    if (!version || version !== '2') {
      const migrated = existing.map(t => ({
        ...t,
        status: t.status === 'concluida' ? 'concluida' : t.status === 'cancelada' ? 'cancelada' : 'pendente',
        prioridade: (t as any).prioridade || 'normal',
        tipo: t.tipo || 'ligar',
        texto: t.texto || '',
        prazo: t.prazo || new Date().toISOString(),
        responsavelId: t.responsavelId || 'user-1',
        createdAt: t.createdAt || new Date().toISOString(),
        checklist: t.checklist || [],
        recorrencia: (t as any).recorrencia || 'nenhuma',
      }));
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(migrated));
      localStorage.setItem('conversa_crm_schema_version', '2');
      return migrated;
    }

    return existing;
  },
  saveTasks: (items: Task[]) => localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(items)),

  getNotes: (): Note[] => {
    const data = localStorage.getItem(STORAGE_KEYS.NOTES);
    return data ? JSON.parse(data) : [];
  },
  saveNotes: (items: Note[]) => localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(items)),

  getConversations: (): Conversation[] => {
    const data = localStorage.getItem(STORAGE_KEYS.CONVERSATIONS);
    return data ? JSON.parse(data) : [];
  },
  saveConversations: (items: Conversation[]) => localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(items)),

  getMessages: (): Message[] => {
    const data = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    return data ? JSON.parse(data) : [];
  },
  saveMessages: (items: Message[]) => localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(items)),

  getChannels: (): Channel[] => {
    const data = localStorage.getItem(STORAGE_KEYS.CHANNELS);
    return data ? JSON.parse(data) : initialChannels;
  },

  getActivities: (): ActivityEvent[] => {
    const data = localStorage.getItem(STORAGE_KEYS.ACTIVITIES);
    return data ? JSON.parse(data) : [];
  },
  saveActivities: (items: ActivityEvent[]) => localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(items)),

  getMessageTemplates: (): MessageTemplate[] => {
    const data = localStorage.getItem(STORAGE_KEYS.MESSAGE_TEMPLATES);
    return data ? JSON.parse(data) : [];
  },
  saveMessageTemplates: (items: MessageTemplate[]) => localStorage.setItem(STORAGE_KEYS.MESSAGE_TEMPLATES, JSON.stringify(items)),

  getEmails: (): EmailMessage[] => {
    const data = localStorage.getItem(STORAGE_KEYS.EMAILS);
    return data ? JSON.parse(data) : [];
  },
  saveEmails: (items: EmailMessage[]) => localStorage.setItem(STORAGE_KEYS.EMAILS, JSON.stringify(items)),

  getEmailTemplates: (): EmailTemplate[] => {
    const data = localStorage.getItem(STORAGE_KEYS.EMAIL_TEMPLATES);
    return data ? JSON.parse(data) : [];
  },
  saveEmailTemplates: (items: EmailTemplate[]) => localStorage.setItem(STORAGE_KEYS.EMAIL_TEMPLATES, JSON.stringify(items)),

  getAutomationRules: (): AutomationRule[] => {
    const data = localStorage.getItem(STORAGE_KEYS.AUTOMATION_RULES);
    return data ? JSON.parse(data) : [];
  },
  saveAutomationRules: (items: AutomationRule[]) => localStorage.setItem(STORAGE_KEYS.AUTOMATION_RULES, JSON.stringify(items)),

  getSalesBots: (): SalesBot[] => {
    const data = localStorage.getItem(STORAGE_KEYS.SALES_BOTS);
    return data ? JSON.parse(data) : [];
  },
  saveSalesBots: (items: SalesBot[]) => localStorage.setItem(STORAGE_KEYS.SALES_BOTS, JSON.stringify(items)),

  getTaskTypes: (): TaskTypeConfig[] => {
    const data = localStorage.getItem('conversa_crm_task_types_v2');
    if (data) return JSON.parse(data);
    const defaults: TaskTypeConfig[] = [
      { id: 't-ligar', nome: 'Ligar', icone: 'Phone', cor: '#3B82F6' },
      { id: 't-reuniao', nome: 'Reunião', icone: 'Users', cor: '#8B5CF6' },
      { id: 't-follow', nome: 'Follow-up', icone: 'Clock', cor: '#F59E0B' },
      { id: 't-email', nome: 'E-mail', icone: 'Mail', cor: '#10B981' },
      { id: 't-visita', nome: 'Visita', icone: 'MapPin', cor: '#EC4899' },
      { id: 't-wa', nome: 'WhatsApp', icone: 'MessageSquare', cor: '#22C55E' },
    ];
    localStorage.setItem('conversa_crm_task_types_v2', JSON.stringify(defaults));
    return defaults;
  },
  saveTaskTypes: (types: TaskTypeConfig[]) => localStorage.setItem('conversa_crm_task_types_v2', JSON.stringify(types)),

  getTaskOutcomes: (): TaskOutcomeConfig[] => {
    const data = localStorage.getItem('conversa_crm_task_outcomes_v2');
    if (data) return JSON.parse(data);
    const defaults: TaskOutcomeConfig[] = [
      { id: 'out-1', nome: 'Atendeu' },
      { id: 'out-2', nome: 'Não atendeu' },
      { id: 'out-3', nome: 'Reagendar' },
      { id: 'out-4', nome: 'Sem interesse' },
      { id: 'out-5', nome: 'Proposta aceita' },
    ];
    localStorage.setItem('conversa_crm_task_outcomes_v2', JSON.stringify(defaults));
    return defaults;
  },
  saveTaskOutcomes: (outcomes: TaskOutcomeConfig[]) => localStorage.setItem('conversa_crm_task_outcomes_v2', JSON.stringify(outcomes)),

  getCurrentUser: (): User => {
    const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (data) {
      try { return JSON.parse(data); } catch { /* ignore */ }
    }
    return initialUsers[0];
  },
  setCurrentUser: (user: User) => localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user)),

  restoreSeed: () => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(initialUsers));
    localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(initialTeams));
    localStorage.setItem(STORAGE_KEYS.ROLES, JSON.stringify(initialRoles));
    localStorage.setItem(STORAGE_KEYS.PIPELINES, JSON.stringify(initialPipelines));
    localStorage.setItem(STORAGE_KEYS.TAGS, JSON.stringify(initialTags));
    localStorage.setItem(STORAGE_KEYS.SOURCES, JSON.stringify(initialSources));
    localStorage.setItem(STORAGE_KEYS.LOSS_REASONS, JSON.stringify(initialLossReasons));
    localStorage.setItem(STORAGE_KEYS.CHANNELS, JSON.stringify(initialChannels));
    localStorage.setItem(STORAGE_KEYS.COMPANIES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.CONTACTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.MESSAGE_TEMPLATES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.EMAILS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.EMAIL_TEMPLATES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.AUTOMATION_RULES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.SALES_BOTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(initialUsers[0]));
  },

  exportBackup: (): string => {
    const backup = {
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
      templates: db.getMessageTemplates(),
      emails: db.getEmails(),
      emailTemplates: db.getEmailTemplates(),
      automationRules: db.getAutomationRules(),
      salesBots: db.getSalesBots(),
      version: '1.0',
      exportedAt: new Date().toISOString(),
    };
    return JSON.stringify(backup, null, 2);
  },

  importBackup: (jsonString: string): boolean => {
    try {
      const data = JSON.parse(jsonString);
      if (data.leads) localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(data.leads));
      if (data.contacts) localStorage.setItem(STORAGE_KEYS.CONTACTS, JSON.stringify(data.contacts));
      if (data.companies) localStorage.setItem(STORAGE_KEYS.COMPANIES, JSON.stringify(data.companies));
      if (data.products) localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(data.products));
      if (data.tasks) localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(data.tasks));
      if (data.notes) localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(data.notes));
      if (data.conversations) localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(data.conversations));
      if (data.messages) localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(data.messages));
      if (data.templates) localStorage.setItem(STORAGE_KEYS.MESSAGE_TEMPLATES, JSON.stringify(data.templates));
      if (data.emails) localStorage.setItem(STORAGE_KEYS.EMAILS, JSON.stringify(data.emails));
      if (data.emailTemplates) localStorage.setItem(STORAGE_KEYS.EMAIL_TEMPLATES, JSON.stringify(data.emailTemplates));
      if (data.automationRules) localStorage.setItem(STORAGE_KEYS.AUTOMATION_RULES, JSON.stringify(data.automationRules));
      if (data.salesBots) localStorage.setItem(STORAGE_KEYS.SALES_BOTS, JSON.stringify(data.salesBots));
      return true;
    } catch {
      return false;
    }
  },

  clearAll: () => {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
    db.restoreSeed();
  },

  clearAllCompletely: () => {
    localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.CONTACTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.COMPANIES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.EMAILS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.MESSAGE_TEMPLATES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.EMAIL_TEMPLATES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.AUTOMATION_RULES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.SALES_BOTS, JSON.stringify([]));
  }
};

