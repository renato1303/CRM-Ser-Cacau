import { 
  User, Team, Role, Pipeline, Stage, Tag, LeadSource, LossReason, 
  Lead, Contact, Company, Product, Task, Note, Conversation, Message, Channel, ActivityEvent 
} from '../../types';

export const initialTeams: Team[] = [
  { id: 'team-1', nome: 'Comercial Alpha', descricao: 'Equipe de vendas principal para novos leads' },
  { id: 'team-2', nome: 'Sucesso do Cliente', descricao: 'Equipe focada em onboarding, retenção e pós-venda' },
];

export const initialRoles: Role[] = [
  {
    id: 'role-admin',
    nome: 'Administrador',
    descricao: 'Acesso total a todas as funcionalidades e configurações',
    permissions: {
      lead: { ver: 'todos', criar: true, editar: true, excluir: true, exportar: true },
      contact: { ver: 'todos', criar: true, editar: true, excluir: true, exportar: true },
      company: { ver: 'todos', criar: true, editar: true, excluir: true, exportar: true },
      task: { ver: 'todos', criar: true, editar: true, excluir: true, exportar: true },
      chat: { ver: 'todos', criar: true, editar: true, excluir: true, exportar: true },
      report: { ver: 'todos', criar: true, editar: true, excluir: true, exportar: true },
      settings: { ver: 'todos', criar: true, editar: true, excluir: true, exportar: true },
    }
  },
  {
    id: 'role-manager',
    nome: 'Gerente de Vendas',
    descricao: 'Gerencia equipe, relatórios e funis de vendas',
    permissions: {
      lead: { ver: 'grupo', criar: true, editar: true, excluir: true, exportar: true },
      contact: { ver: 'grupo', criar: true, editar: true, excluir: true, exportar: true },
      company: { ver: 'grupo', criar: true, editar: true, excluir: true, exportar: true },
      task: { ver: 'grupo', criar: true, editar: true, excluir: true, exportar: true },
      chat: { ver: 'grupo', criar: true, editar: true, excluir: true, exportar: true },
      report: { ver: 'grupo', criar: true, editar: true, excluir: false, exportar: true },
      settings: { ver: 'nenhum', criar: false, editar: false, excluir: false, exportar: false },
    }
  },
  {
    id: 'role-agent',
    nome: 'Vendedor',
    descricao: 'Atende leads, chats e executa tarefas atribuídas',
    permissions: {
      lead: { ver: 'proprios', criar: true, editar: true, excluir: false, exportar: false },
      contact: { ver: 'proprios', criar: true, editar: true, excluir: false, exportar: false },
      company: { ver: 'proprios', criar: true, editar: true, excluir: false, exportar: false },
      task: { ver: 'proprios', criar: true, editar: true, excluir: true, exportar: false },
      chat: { ver: 'proprios', criar: true, editar: true, excluir: false, exportar: false },
      report: { ver: 'proprios', criar: false, editar: false, excluir: false, exportar: false },
      settings: { ver: 'nenhum', criar: false, editar: false, excluir: false, exportar: false },
    }
  }
];

export const initialUsers: User[] = [
  {
    id: 'user-master',
    nome: 'Renato Inácio (Master)',
    email: 'renatoinacio2@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    telefone: '+55 (11) 99999-9999',
    roleId: 'role-admin',
    teamId: 'team-1',
    ativo: true,
    metaMensal: 150000,
    senha: 'Remah13032019',
  },
  {
    id: 'user-1',
    nome: 'Carlos Mendes',
    email: 'carlos@conversacrm.io',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    telefone: '+55 (11) 98765-4321',
    roleId: 'role-admin',
    teamId: 'team-1',
    ativo: true,
    metaMensal: 85000,
    senha: '123456',
  },
  {
    id: 'user-2',
    nome: 'Mariana Souza',
    email: 'mariana@conversacrm.io',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    telefone: '+55 (11) 98123-4567',
    roleId: 'role-manager',
    teamId: 'team-1',
    ativo: true,
    metaMensal: 60000,
  },
  {
    id: 'user-3',
    nome: 'Lucas Ribeiro',
    email: 'lucas@conversacrm.io',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    telefone: '+55 (11) 97234-5678',
    roleId: 'role-agent',
    teamId: 'team-1',
    ativo: true,
    metaMensal: 45000,
  },
  {
    id: 'user-4',
    nome: 'Beatriz Lima',
    email: 'beatriz@conversacrm.io',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
    telefone: '+55 (21) 99345-6789',
    roleId: 'role-agent',
    teamId: 'team-2',
    ativo: true,
    metaMensal: 40000,
  },
  {
    id: 'user-5',
    nome: 'Rafael Costa',
    email: 'rafael@conversacrm.io',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    telefone: '+55 (31) 98456-7890',
    roleId: 'role-agent',
    teamId: 'team-2',
    ativo: true,
    metaMensal: 40000,
  }
];

export const initialPipelines: Pipeline[] = [
  {
    id: 'pipe-vendas',
    nome: 'Vendas Principais',
    descricao: 'Funil principal de conversão de novos clientes',
    stages: [
      { id: 'st-entrada', pipelineId: 'pipe-vendas', nome: 'Leads de Entrada', cor: '#64748B', ordem: 1, tipo: 'entrada' },
      { id: 'st-primeiro', pipelineId: 'pipe-vendas', nome: 'Primeiro Contato', cor: '#3B82F6', ordem: 2, tipo: 'normal' },
      { id: 'st-qualificado', pipelineId: 'pipe-vendas', nome: 'Qualificado', cor: '#8B5CF6', ordem: 3, tipo: 'normal' },
      { id: 'st-proposta', pipelineId: 'pipe-vendas', nome: 'Proposta Enviada', cor: '#F59E0B', ordem: 4, tipo: 'normal' },
      { id: 'st-negociacao', pipelineId: 'pipe-vendas', nome: 'Negociação', cor: '#EC4899', ordem: 5, tipo: 'normal' },
      { id: 'st-ganho', pipelineId: 'pipe-vendas', nome: 'Venda Ganha', cor: '#16A34A', ordem: 6, tipo: 'ganho' },
      { id: 'st-perdido', pipelineId: 'pipe-vendas', nome: 'Venda Perdida', cor: '#DC2626', ordem: 7, tipo: 'perdido' },
    ]
  },
  {
    id: 'pipe-pos',
    nome: 'Pós-venda e Onboarding',
    descricao: 'Acompanhamento e expansão de contas',
    stages: [
      { id: 'st-pos-entrada', pipelineId: 'pipe-pos', nome: 'Novos Clientes', cor: '#64748B', ordem: 1, tipo: 'entrada' },
      { id: 'st-onboarding', pipelineId: 'pipe-pos', nome: 'Onboarding Ativo', cor: '#0EA5E9', ordem: 2, tipo: 'normal' },
      { id: 'st-ativo', pipelineId: 'pipe-pos', nome: 'Cliente Ativo', cor: '#16A34A', ordem: 3, tipo: 'normal' },
      { id: 'st-renovacao', pipelineId: 'pipe-pos', nome: 'Renovação', cor: '#8B5CF6', ordem: 4, tipo: 'normal' },
      { id: 'st-churn', pipelineId: 'pipe-pos', nome: 'Cancelado', cor: '#DC2626', ordem: 5, tipo: 'perdido' },
    ]
  }
];

export const initialTags: Tag[] = [
  { id: 'tag-vip', nome: 'VIP', cor: '#8B5CF6' },
  { id: 'tag-urgente', nome: 'Urgente', cor: '#DC2626' },
  { id: 'tag-enterprise', nome: 'Enterprise', cor: '#2563EB' },
  { id: 'tag-quente', nome: 'Lead Quente', cor: '#EA580C' },
  { id: 'tag-parceiro', nome: 'Parceiro', cor: '#16A34A' },
];

export const initialSources: LeadSource[] = [
  { id: 'src-wa', nome: 'WhatsApp Direct', custoMedio: 15 },
  { id: 'src-insta', nome: 'Instagram Ads', custoMedio: 45 },
  { id: 'src-site', nome: 'Formulário Site', custoMedio: 30 },
  { id: 'src-google', nome: 'Google Ads', custoMedio: 65 },
  { id: 'src-ind', nome: 'Indicação', custoMedio: 0 },
];

export const initialLossReasons: LossReason[] = [
  { id: 'loss-preco', nome: 'Preço alto / Orçamento insuficiente' },
  { id: 'loss-concorrente', nome: 'Fechou com concorrente' },
  { id: 'loss-timing', nome: 'Sem timing / Adiara para o futuro' },
  { id: 'loss-sem-contato', nome: 'Cliente sumiu / Sem resposta' },
  { id: 'loss-produto', nome: 'Produto não atende aos requisitos' },
];

export const initialCompanies: Company[] = [
  { id: 'comp-1', nome: 'TechVibe Soluções', cnpj: '45.123.890/0001-22', site: 'https://techvibe.ex', telefone: '+55 (11) 3456-7890', segmento: 'Tecnologia / SaaS', customFields: {}, createdAt: '2026-01-10T10:00:00Z' },
  { id: 'comp-2', nome: 'Logística Express Brasil', cnpj: '12.456.789/0001-99', site: 'https://logexpress.ex', telefone: '+55 (11) 3322-1144', segmento: 'Logística & Transportes', customFields: {}, createdAt: '2026-01-12T11:30:00Z' },
  { id: 'comp-3', nome: 'Inova Mídia Digital', cnpj: '78.901.234/0001-55', site: 'https://inovamidia.ex', telefone: '+55 (21) 3988-7766', segmento: 'Marketing & Publicidade', customFields: {}, createdAt: '2026-01-15T14:20:00Z' },
  { id: 'comp-4', nome: 'Construtora Horizonte', cnpj: '33.555.777/0001-10', site: 'https://horizonteeng.ex', telefone: '+55 (31) 3211-9988', segmento: 'Construção Civil', customFields: {}, createdAt: '2026-02-01T09:00:00Z' },
  { id: 'comp-5', nome: 'Clínica Saúde Plena', cnpj: '19.888.333/0001-44', site: 'https://saudeplena.ex', telefone: '+55 (41) 3012-4455', segmento: 'Saúde & Bem-estar', customFields: {}, createdAt: '2026-02-10T16:15:00Z' },
];

export const initialProducts: Product[] = [
  { id: 'prod-1', nome: 'Plano Enterprise CRM (Anual)', sku: 'CRM-ENT-ANN', preco: 12000, descricao: 'Licença anual para até 50 usuários com IA avançada', estoque: 999, ativo: true },
  { id: 'prod-2', nome: 'Plano Pro CRM (Mensal)', sku: 'CRM-PRO-MO', preco: 1200, descricao: 'Licença mensal para até 15 usuários', estoque: 999, ativo: true },
  { id: 'prod-3', nome: 'Implantação & Treinamento VIP', sku: 'SRV-IMP', preco: 3500, descricao: 'Consultoria de 20h para setup personalizado e migração', estoque: 50, ativo: true },
  { id: 'prod-4', nome: 'Pacote de Disparos WhatsApp (10k)', sku: 'ADD-WHATS', preco: 800, descricao: 'Créditos para campanhas automatizadas', estoque: 500, ativo: true },
];

export const initialContacts: Contact[] = [
  { id: 'cont-1', nome: 'Fernanda Lima', telefones: ['+55 (11) 99111-2222'], emails: ['fernanda@techvibe.ex'], cargo: 'Diretora de Vendas', companyId: 'comp-1', tags: ['VIP', 'Enterprise'], customFields: {}, canais: { whatsapp: '+55 (11) 99111-2222', email: 'fernanda@techvibe.ex' }, consentimentoMarketing: true, createdAt: '2026-02-01T10:00:00Z', updatedAt: '2026-02-01T10:00:00Z' },
  { id: 'cont-2', nome: 'Roberto Alencar', telefones: ['+55 (11) 98222-3333'], emails: ['roberto@logexpress.ex'], cargo: 'Gerente de Operações', companyId: 'comp-2', tags: ['quente'], customFields: {}, canais: { whatsapp: '+55 (11) 98222-3333' }, consentimentoMarketing: true, createdAt: '2026-02-03T11:00:00Z', updatedAt: '2026-02-03T11:00:00Z' },
  { id: 'cont-3', nome: 'Camila Duarte', telefones: ['+55 (21) 97333-4444'], emails: ['camila@inovamidia.ex'], cargo: 'CEO', companyId: 'comp-3', tags: ['VIP'], customFields: {}, canais: { whatsapp: '+55 (21) 97333-4444', instagram: '@camiladuarte' }, consentimentoMarketing: true, createdAt: '2026-02-05T14:00:00Z', updatedAt: '2026-02-05T14:00:00Z' },
  { id: 'cont-4', nome: 'Marcos Vinicius', telefones: ['+55 (31) 96444-5555'], emails: ['marcos@horizonteeng.ex'], cargo: 'Diretor Comercial', companyId: 'comp-4', tags: [], customFields: {}, canais: { whatsapp: '+55 (31) 96444-5555' }, consentimentoMarketing: false, createdAt: '2026-02-10T09:30:00Z', updatedAt: '2026-02-10T09:30:00Z' },
  { id: 'cont-5', nome: 'Dra. Patricia Siqueira', telefones: ['+55 (41) 95555-6666'], emails: ['patricia@saudeplena.ex'], cargo: 'Diretor Clínico', companyId: 'comp-5', tags: ['urgente'], customFields: {}, canais: { whatsapp: '+55 (41) 95555-6666', email: 'patricia@saudeplena.ex' }, consentimentoMarketing: true, createdAt: '2026-02-12T16:00:00Z', updatedAt: '2026-02-12T16:00:00Z' },
];

export const initialChannels: Channel[] = [
  { id: 'chan-1', tipo: 'whatsapp', nome: 'WhatsApp Comercial Principal', status: 'simulado', identificador: '+55 11 99999-8888' },
  { id: 'chan-2', tipo: 'instagram', nome: 'Instagram Direct (@conversacrm)', status: 'simulado', identificador: '@conversacrm' },
  { id: 'chan-3', tipo: 'chat_site', nome: 'Chat Widget do Site Oficial', status: 'conectado', identificador: 'widget-site-01' },
];

// Generate 25+ rich leads across stages
export const initialLeads: Lead[] = [
  {
    id: 'lead-1',
    nome: 'Implantação CRM TechVibe',
    valor: 15500,
    pipelineId: 'pipe-vendas',
    stageId: 'st-negociacao',
    responsavelId: 'user-1',
    contactIds: ['cont-1'],
    companyId: 'comp-1',
    tags: ['VIP', 'Enterprise'],
    origemId: 'src-wa',
    customFields: { segmento: 'Tecnologia', equipe: '15 pessoas' },
    produtos: [{ productId: 'prod-1', quantidade: 1, precoUnitario: 12000, desconto: 0 }, { productId: 'prod-3', quantidade: 1, precoUnitario: 3500, desconto: 0 }],
    createdAt: '2026-03-01T10:00:00Z',
    updatedAt: '2026-03-15T14:30:00Z',
    utm: { source: 'google', medium: 'cpc', campaign: 'enterprise_q1' },
    ultimaInteracaoAt: '2026-03-15T14:30:00Z',
    naoLidas: 0,
  },
  {
    id: 'lead-2',
    nome: 'Automação Logística Express',
    valor: 8500,
    pipelineId: 'pipe-vendas',
    stageId: 'st-proposta',
    responsavelId: 'user-2',
    contactIds: ['cont-2'],
    companyId: 'comp-2',
    tags: ['quente'],
    origemId: 'src-insta',
    customFields: { segmento: 'Logística' },
    produtos: [{ productId: 'prod-2', quantidade: 5, precoUnitario: 1200, desconto: 10 }],
    createdAt: '2026-03-05T11:00:00Z',
    updatedAt: '2026-03-16T09:15:00Z',
    utm: { source: 'instagram', medium: 'social', campaign: 'reels_ads' },
    ultimaInteracaoAt: '2026-03-16T09:15:00Z',
    naoLidas: 2,
  },
  {
    id: 'lead-3',
    nome: 'Inova Mídia - Expansão de Canais',
    valor: 12000,
    pipelineId: 'pipe-vendas',
    stageId: 'st-qualificado',
    responsavelId: 'user-1',
    contactIds: ['cont-3'],
    companyId: 'comp-3',
    tags: ['VIP'],
    origemId: 'src-ind',
    customFields: {},
    produtos: [{ productId: 'prod-1', quantidade: 1, precoUnitario: 12000, desconto: 0 }],
    createdAt: '2026-03-10T14:00:00Z',
    updatedAt: '2026-03-14T16:20:00Z',
    ultimaInteracaoAt: '2026-03-14T16:20:00Z',
    naoLidas: 0,
  },
  {
    id: 'lead-4',
    nome: 'Construtora Horizonte - Proposta Inicial',
    valor: 24000,
    pipelineId: 'pipe-vendas',
    stageId: 'st-entrada',
    responsavelId: 'user-3',
    contactIds: ['cont-4'],
    companyId: 'comp-4',
    tags: [],
    origemId: 'src-google',
    customFields: {},
    produtos: [{ productId: 'prod-1', quantidade: 2, precoUnitario: 12000, desconto: 0 }],
    createdAt: '2026-03-18T08:30:00Z',
    updatedAt: '2026-03-18T08:30:00Z',
    ultimaInteracaoAt: '2026-03-18T08:30:00Z',
    naoLidas: 1,
  },
  {
    id: 'lead-5',
    nome: 'Clínica Saúde Plena - CRM de Atendimento',
    valor: 6500,
    pipelineId: 'pipe-vendas',
    stageId: 'st-primeiro',
    responsavelId: 'user-2',
    contactIds: ['cont-5'],
    companyId: 'comp-5',
    tags: ['urgente'],
    origemId: 'src-site',
    customFields: {},
    produtos: [{ productId: 'prod-2', quantidade: 3, precoUnitario: 1200, desconto: 0 }],
    createdAt: '2026-03-12T09:00:00Z',
    updatedAt: '2026-03-17T11:45:00Z',
    ultimaInteracaoAt: '2026-03-17T11:45:00Z',
    naoLidas: 0,
  },
  {
    id: 'lead-6',
    nome: 'Venda Fechada - E-commerce Global',
    valor: 35000,
    pipelineId: 'pipe-vendas',
    stageId: 'st-ganho',
    responsavelId: 'user-1',
    contactIds: ['cont-1'],
    companyId: 'comp-1',
    tags: ['VIP', 'Enterprise'],
    origemId: 'src-ind',
    customFields: {},
    produtos: [{ productId: 'prod-1', quantidade: 2, precoUnitario: 12000, desconto: 5 }, { productId: 'prod-3', quantidade: 1, precoUnitario: 3500, desconto: 0 }],
    closedAt: '2026-03-10T16:00:00Z',
    createdAt: '2026-02-15T10:00:00Z',
    updatedAt: '2026-03-10T16:00:00Z',
    ultimaInteracaoAt: '2026-03-10T16:00:00Z',
    naoLidas: 0,
  },
  {
    id: 'lead-7',
    nome: 'Projeto Perdido - Startup Alpha',
    valor: 9800,
    pipelineId: 'pipe-vendas',
    stageId: 'st-perdido',
    responsavelId: 'user-3',
    contactIds: ['cont-2'],
    tags: [],
    origemId: 'src-insta',
    motivoPerdaId: 'loss-preco',
    comentarioPerda: 'Cliente optou por concorrente mais barato.',
    customFields: {},
    produtos: [],
    closedAt: '2026-03-14T11:00:00Z',
    createdAt: '2026-02-20T10:00:00Z',
    updatedAt: '2026-03-14T11:00:00Z',
    ultimaInteracaoAt: '2026-03-14T11:00:00Z',
    naoLidas: 0,
  }
];

export const initialTasks: Task[] = [
  {
    id: 'task-1',
    tipo: 'reuniao',
    texto: 'Apresentar proposta final e contrato para diretoria da TechVibe',
    prazo: new Date(Date.now() + 3600000 * 2).toISOString(), // em 2 horas (hoje)
    responsavelId: 'user-1',
    entidadeTipo: 'lead',
    entidadeId: 'lead-1',
    status: 'pendente',
    prioridade: 'normal',
    createdAt: '2026-03-15T10:00:00Z',
  },
  {
    id: 'task-2',
    tipo: 'ligar',
    texto: 'Ligar para Roberto para confirmar recebimento da proposta comercial',
    prazo: new Date(Date.now() - 3600000 * 4).toISOString(), // atrasada
    responsavelId: 'user-2',
    entidadeTipo: 'lead',
    entidadeId: 'lead-2',
    status: 'pendente',
    prioridade: 'normal',
    createdAt: '2026-03-14T09:00:00Z',
  },
  {
    id: 'task-3',
    tipo: 'follow-up',
    texto: 'Enviar materiais adicionais sobre integração via API',
    prazo: new Date(Date.now() + 86400000 * 2).toISOString(), // futuro
    responsavelId: 'user-1',
    entidadeTipo: 'lead',
    entidadeId: 'lead-3',
    status: 'pendente',
    prioridade: 'normal',
    createdAt: '2026-03-16T11:00:00Z',
  }
];

export const initialNotes: Note[] = [
  {
    id: 'note-1',
    texto: 'Cliente muito interessado em IA e automações de atendimento no WhatsApp. Decisor principal é a Fernanda.',
    entidadeTipo: 'lead',
    entidadeId: 'lead-1',
    autorId: 'user-1',
    fixada: true,
    createdAt: '2026-03-02T15:00:00Z',
  }
];

export const initialConversations: Conversation[] = [
  {
    id: 'conv-1',
    canal: 'whatsapp',
    contactId: 'cont-1',
    leadId: 'lead-1',
    responsavelId: 'user-1',
    status: 'aberta',
    naoLidas: 0,
    ultimaMensagemAt: '2026-03-15T14:30:00Z',
    primeiraRespostaEm: '00:04:12',
  },
  {
    id: 'conv-2',
    canal: 'whatsapp',
    contactId: 'cont-2',
    leadId: 'lead-2',
    responsavelId: 'user-2',
    status: 'aberta',
    naoLidas: 2,
    ultimaMensagemAt: '2026-03-16T09:15:00Z',
    primeiraRespostaEm: '00:12:05',
  },
  {
    id: 'conv-3',
    canal: 'instagram',
    contactId: 'cont-3',
    leadId: 'lead-3',
    responsavelId: 'user-1',
    status: 'aberta',
    naoLidas: 0,
    ultimaMensagemAt: '2026-03-14T16:20:00Z',
  }
];

export const initialMessages: Message[] = [
  {
    id: 'msg-1',
    conversationId: 'conv-1',
    direcao: 'entrada',
    autor: 'contato',
    tipo: 'texto',
    conteudo: 'Olá Carlos, analisamos a proposta. Podemos agendar a reunião final hoje?',
    status: 'lida',
    enviadaAt: '2026-03-15T14:25:00Z',
  },
  {
    id: 'msg-2',
    conversationId: 'conv-1',
    direcao: 'saida',
    autor: 'usuario',
    autorId: 'user-1',
    tipo: 'texto',
    conteudo: 'Olá Fernanda! Claro, combinado às 16h por vídeo.',
    status: 'lida',
    enviadaAt: '2026-03-15T14:30:00Z',
  },
  {
    id: 'msg-3',
    conversationId: 'conv-2',
    direcao: 'entrada',
    autor: 'contato',
    tipo: 'texto',
    conteudo: 'Bom dia! Gostaria de saber se conseguem desconto para 5 licenças.',
    status: 'enviada',
    enviadaAt: '2026-03-16T09:14:00Z',
  },
  {
    id: 'msg-4',
    conversationId: 'conv-2',
    direcao: 'entrada',
    autor: 'contato',
    tipo: 'texto',
    conteudo: 'Ficamos aguardando retorno.',
    status: 'enviada',
    enviadaAt: '2026-03-16T09:15:00Z',
  }
];

export const initialActivityEvents: ActivityEvent[] = [
  {
    id: 'act-1',
    tipo: 'lead_criado',
    entidadeTipo: 'lead',
    entidadeId: 'lead-1',
    detalhe: 'Lead criado via WhatsApp Direct',
    usuarioId: 'user-1',
    timestamp: '2026-03-01T10:00:00Z',
  },
  {
    id: 'act-2',
    tipo: 'etapa_alterada',
    entidadeTipo: 'lead',
    entidadeId: 'lead-1',
    detalhe: 'Etapa alterada de Qualificado para Negociação',
    de: 'Qualificado',
    para: 'Negociação',
    usuarioId: 'user-1',
    timestamp: '2026-03-15T10:30:00Z',
  }
];

export const initialMessageTemplates = [
  {
    id: 'tpl-1',
    canal: 'whatsapp',
    nome: 'Boas-vindas Padrão',
    corpo: 'Olá {{contato.nome}}, tudo bem? Sou o {{usuario.nome}} da Conversa CRM. Recebemos seu contato e gostaria de entender melhor sua operação.',
    variaveis: ['contato.nome', 'usuario.nome']
  },
  {
    id: 'tpl-2',
    canal: 'whatsapp',
    nome: 'Envio de Proposta',
    corpo: 'Oi {{contato.nome}}, conforme conversamos, segue a proposta comercial para o lead {{lead.nome}} no valor de R$ {{lead.valor}}.',
    variaveis: ['contato.nome', 'lead.nome', 'lead.valor']
  }
];

export const initialEmails = [
  {
    id: 'email-1',
    pasta: 'entrada' as const,
    remetente: 'fernanda@techvibe.ex',
    destinatario: 'carlos@conversacrm.io',
    assunto: 'Dúvidas sobre integração com API',
    corpo: 'Olá Carlos, estivemos revisando a documentação e gostaríamos de saber se vocês possuem suporte dedicado para implantação da API.',
    lido: false,
    rastreamentoAbertura: { aberta: true, abertaAt: '2026-03-15T15:00:00Z' },
    contactId: 'cont-1',
    leadId: 'lead-1',
    enviadoAt: '2026-03-15T14:50:00Z',
  },
  {
    id: 'email-2',
    pasta: 'enviados' as const,
    remetente: 'carlos@conversacrm.io',
    destinatario: 'roberto@logexpress.ex',
    assunto: 'Proposta Comercial - Conversa CRM',
    corpo: 'Olá Roberto, conforme conversamos por telefone, segue em anexo a proposta comercial detalhada.',
    lido: true,
    rastreamentoAbertura: { aberta: true, abertaAt: '2026-03-16T10:00:00Z' },
    contactId: 'cont-2',
    leadId: 'lead-2',
    enviadoAt: '2026-03-16T09:30:00Z',
  }
];

export const initialEmailTemplates = [
  {
    id: 'etpl-1',
    nome: 'Apresentação Comercial',
    assunto: 'Revolucione suas Vendas com o Conversa CRM',
    corpo: 'Olá {{contato.nome}}, notei seu interesse em otimizar o atendimento da {{empresa.nome}}. Gostaria de agendar 15 minutos para demonstração?'
  }
];

export const initialAutomationRules = [
  {
    id: 'rule-1',
    pipelineId: 'pipe-vendas',
    stageId: 'st-entrada',
    gatilho: 'lead_entrou' as const,
    condicoes: {},
    acoes: ['Criar Tarefa de Boas-vindas', 'Enviar Mensagem WhatsApp Padrão'],
    atraso: { valor: 0, unidade: 'minutos' as const },
    ativo: true,
    nome: 'Automação de Entrada de Leads'
  }
];

export const initialSalesBots = [
  {
    id: 'bot-1',
    nome: 'Salesbot Qualificador Principal',
    gatilhos: ['primeira_mensagem', 'palavra_chave:preco'],
    nodes: [
      { id: 'node-1', tipo: 'inicio' as const, titulo: 'Início do Bot', config: {}, x: 100, y: 150 },
      { id: 'node-2', tipo: 'mensagem' as const, titulo: 'Enviar Boas-vindas', config: { texto: 'Olá! Bem-vindo à Conversa CRM. Como posso ajudar?' }, x: 350, y: 150 },
      { id: 'node-3', tipo: 'pergunta' as const, titulo: 'Qual o tamanho da sua equipe?', config: { pergunta: 'Quantos usuários vão usar o CRM?', opcoes: ['1 a 5', '6 a 20', '20+'] }, x: 650, y: 150 },
      { id: 'node-4', tipo: 'fim' as const, titulo: 'Fim do Atendimento', config: {}, x: 950, y: 150 },
    ],
    edges: [
      { id: 'edge-1', from: 'node-1', to: 'node-2' },
      { id: 'edge-2', from: 'node-2', to: 'node-3' },
      { id: 'edge-3', from: 'node-3', to: 'node-4' },
    ],
    ativo: true,
    estatisticas: { executado: 142, convertido: 88 }
  }
];



