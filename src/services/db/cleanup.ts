// Limpeza única dos dados de exemplo (usuários fictícios, tarefas, contatos, empresas etc.).
// Roda uma vez para o CRM inteiro: deixa um marcador no servidor e nenhum outro navegador
// repete a limpeza. Assim, tarefas reais criadas depois nunca são apagadas.
import { db } from './storage';
import { lastPullSucceeded } from './sync';

const MARKER_ID = 'limpeza-dados-exemplo-v1';

const ids = (prefix: string, n: number) => Array.from({ length: n }, (_, i) => `${prefix}-${i + 1}`);

// Registros que vieram dos dados de exemplo antigos
const DEMO = {
  users: new Set(ids('user', 5)),
  companies: new Set(ids('comp', 5)),
  contacts: new Set(ids('cont', 5)),
  products: new Set(ids('prod', 4)),
  leads: new Set(ids('lead', 7)),
  notes: new Set(ids('note', 1)),
  activities: new Set(ids('act', 2)),
  conversations: new Set(ids('conv', 3)),
  messages: new Set(ids('msg', 4)),
  emails: new Set(ids('email', 2)),
  messageTemplates: new Set(ids('tpl', 2)),
  emailTemplates: new Set(ids('etpl', 1)),
  automationRules: new Set(ids('rule', 1)),
  salesBots: new Set(ids('bot', 1)),
};

// Valores fictícios do usuário principal no exemplo antigo
const DEMO_MASTER = {
  nome: 'Renato Inácio (Master)',
  telefone: '+55 (11) 99999-9999',
  avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
  metaMensal: 150000,
};

function without<T extends { id: string }>(list: T[], remove: Set<string>, extra?: (item: T) => boolean): T[] | null {
  const kept = list.filter(item => !remove.has(item.id) && !(extra && extra(item)));
  return kept.length === list.length ? null : kept; // null = nada mudou
}

function cleanMaster<T extends { id: string; nome: string; telefone?: string; avatar?: string; metaMensal?: number }>(u: T): T {
  if (u.id !== 'user-master') return u;
  return {
    ...u,
    nome: u.nome === DEMO_MASTER.nome ? 'Comercial Será Cacau' : u.nome,
    telefone: u.telefone === DEMO_MASTER.telefone ? '' : u.telefone,
    avatar: u.avatar === DEMO_MASTER.avatar ? '' : u.avatar,
    metaMensal: u.metaMensal === DEMO_MASTER.metaMensal ? 0 : u.metaMensal,
  };
}

// Retorna true se limpou algo (aí a tela precisa recarregar os dados)
export function cleanupDemoDataOnce(): boolean {
  // Só decide depois de conferir o servidor: o marcador pode já estar lá
  if (!lastPullSucceeded()) return false;
  const settings = db.getSettings();
  if (settings.some(s => s.id === MARKER_ID)) return false;

  const users = db.getUsers();
  const cleanedUsers = users.filter(u => !DEMO.users.has(u.id)).map(cleanMaster);
  if (JSON.stringify(cleanedUsers) !== JSON.stringify(users)) db.saveUsers(cleanedUsers);

  const current = db.getCurrentUser();
  if (current?.id === 'user-master') db.setCurrentUser(cleanMaster(current));

  // Todas as tarefas existentes saem: a lista começa limpa para o uso real
  if (db.getTasks().length > 0) db.saveTasks([]);

  const demoConvs = DEMO.conversations;
  const apply = <T extends { id: string }>(get: () => T[], save: (l: T[]) => void, remove: Set<string>, extra?: (i: T) => boolean) => {
    const next = without(get(), remove, extra);
    if (next) save(next);
  };
  apply(db.getCompanies, db.saveCompanies, DEMO.companies);
  apply(db.getContacts, db.saveContacts, DEMO.contacts);
  apply(db.getProducts, db.saveProducts, DEMO.products);
  apply(db.getLeads, db.saveLeads, DEMO.leads);
  apply(db.getNotes, db.saveNotes, DEMO.notes, (n: any) => DEMO.leads.has(n.entidadeId));
  apply(db.getActivities, db.saveActivities, DEMO.activities, (a: any) => DEMO.leads.has(a.entidadeId));
  apply(db.getConversations, db.saveConversations, demoConvs);
  apply(db.getMessages, db.saveMessages, DEMO.messages, (m: any) => demoConvs.has(m.conversationId));
  apply(db.getEmails, db.saveEmails, DEMO.emails);
  apply(db.getMessageTemplates, db.saveMessageTemplates, DEMO.messageTemplates);
  apply(db.getEmailTemplates, db.saveEmailTemplates, DEMO.emailTemplates);
  apply(db.getAutomationRules, db.saveAutomationRules, DEMO.automationRules);
  apply(db.getSalesBots, db.saveSalesBots, DEMO.salesBots);

  db.saveSettings([...settings, { id: MARKER_ID, feitaEm: new Date().toISOString() }]);
  return true;
}
