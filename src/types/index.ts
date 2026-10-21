export type RoleType = 'admin' | 'manager' | 'agent';

export interface User {
  id: string;
  nome: string;
  email: string;
  avatar: string;
  telefone: string;
  roleId: string;
  teamId: string;
  ativo: boolean;
  metaMensal: number;
  senha?: string;
}

export interface Team {
  id: string;
  nome: string;
  descricao: string;
}

export interface Role {
  id: string;
  nome: string;
  descricao: string;
  permissions: {
    [entity: string]: {
      ver: 'todos' | 'grupo' | 'proprios' | 'nenhum';
      criar: boolean;
      editar: boolean;
      excluir: boolean;
      exportar: boolean;
    };
  };
}

export interface Stage {
  id: string;
  pipelineId: string;
  nome: string;
  cor: string;
  ordem: number;
  tipo: 'entrada' | 'normal' | 'ganho' | 'perdido';
}

export interface Pipeline {
  id: string;
  nome: string;
  descricao: string;
  stages: Stage[];
}

export interface Tag {
  id: string;
  nome: string;
  cor: string;
}

export interface LeadSource {
  id: string;
  nome: string;
  custoMedio?: number;
}

export interface LossReason {
  id: string;
  nome: string;
}

export interface LeadProduct {
  productId: string;
  quantidade: number;
  precoUnitario: number;
  desconto: number; // em %
}

export interface Lead {
  id: string;
  nome: string;
  valor: number;
  pipelineId: string;
  stageId: string;
  responsavelId: string;
  contactIds: string[];
  companyId?: string;
  tags: string[];
  origemId: string;
  motivoPerdaId?: string;
  comentarioPerda?: string;
  customFields: Record<string, any>;
  produtos: LeadProduct[];
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    content?: string;
    term?: string;
  };
  ultimaInteracaoAt: string;
  naoLidas: number;
}

export interface Contact {
  id: string;
  nome: string;
  telefones: string[];
  emails: string[];
  cargo?: string;
  companyId?: string;
  tags: string[];
  customFields: Record<string, any>;
  canais: {
    whatsapp?: string;
    instagram?: string;
    messenger?: string;
    telegram?: string;
    email?: string;
  };
  consentimentoMarketing: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Company {
  id: string;
  nome: string;
  cnpj?: string;
  site?: string;
  telefone?: string;
  endereco?: string;
  segmento?: string;
  customFields: Record<string, any>;
  createdAt: string;
}

export interface Product {
  id: string;
  nome: string;
  sku: string;
  preco: number;
  descricao: string;
  estoque: number;
  ativo: boolean;
}

export interface TaskChecklistItem {
  id: string;
  texto: string;
  concluida: boolean;
}

export interface Task {
  id: string;
  tipo: string;
  texto: string;
  descricao?: string;
  prazo: string;
  duracao?: number; // em minutos
  responsavelId: string;
  entidadeTipo?: 'lead' | 'contact' | 'company';
  entidadeId?: string;
  status: 'pendente' | 'em_andamento' | 'concluida' | 'cancelada';
  prioridade: 'baixa' | 'normal' | 'alta' | 'urgente';
  resultado?: string;
  desfecho?: string;
  motivoCancelamento?: string;
  checklist?: TaskChecklistItem[];
  recorrencia?: 'nenhuma' | 'diaria' | 'semanal' | 'mensal';
  lembrete?: 'nenhum' | 'no_horario' | '15_min' | '1_hora' | '1_dia';
  observacoes?: string;
  criadaPorId?: string;
  concluidaAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface TaskTypeConfig {
  id: string;
  nome: string;
  icone: string;
  cor: string;
}

export interface TaskOutcomeConfig {
  id: string;
  nome: string;
}

export interface Note {
  id: string;
  texto: string;
  entidadeTipo: 'lead' | 'contact' | 'company';
  entidadeId: string;
  autorId: string;
  fixada: boolean;
  createdAt: string;
}

export interface Conversation {
  id: string;
  canal: 'whatsapp' | 'instagram' | 'messenger' | 'telegram' | 'email' | 'chat_site';
  contactId: string;
  leadId?: string;
  responsavelId?: string;
  status: 'aberta' | 'encerrada';
  naoLidas: number;
  ultimaMensagemAt: string;
  primeiraRespostaEm?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  direcao: 'entrada' | 'saida' | 'interna';
  autor: 'contato' | 'usuario' | 'bot' | 'ia';
  autorId?: string;
  tipo: 'texto' | 'imagem' | 'audio' | 'arquivo' | 'modelo';
  conteudo: string;
  anexos?: { url: string; nome: string; tipo: string }[];
  status: 'enviada' | 'entregue' | 'lida' | 'falhou';
  enviadaAt: string;
}

export interface Channel {
  id: string;
  tipo: 'whatsapp' | 'instagram' | 'messenger' | 'telegram' | 'email' | 'chat_site';
  nome: string;
  status: 'conectado' | 'simulado' | 'desconectado';
  identificador?: string;
}

export interface ActivityEvent {
  id: string;
  tipo: 
    | 'lead_criado' 
    | 'etapa_alterada' 
    | 'responsavel_alterado' 
    | 'valor_alterado' 
    | 'campo_alterado' 
    | 'tag_adicionada' 
    | 'tarefa_criada' 
    | 'tarefa_concluida' 
    | 'mensagem_enviada' 
    | 'mensagem_recebida' 
    | 'nota_adicionada' 
    | 'lead_ganho' 
    | 'lead_perdido' 
    | 'bot_executado';
  entidadeTipo: 'lead' | 'contact' | 'company';
  entidadeId: string;
  detalhe: string;
  de?: string;
  para?: string;
  usuarioId: string;
  timestamp: string;
}

export interface Notification {
  id: string;
  userId: string;
  titulo: string;
  mensagem: string;
  lida: boolean;
  link?: string;
  createdAt: string;
}

export interface WidgetConfig {
  id: string;
  type: string;
  title: string;
  size: '1x1' | '2x1' | '2x2';
  enabled: boolean;
  order: number;
}

export interface MessageTemplate {
  id: string;
  canal: string;
  nome: string;
  corpo: string;
  variaveis: string[];
}

export interface EmailMessage {
  id: string;
  pasta: 'entrada' | 'enviados' | 'rascunhos';
  remetente: string;
  destinatario: string;
  assunto: string;
  corpo: string;
  lido: boolean;
  rastreamentoAbertura?: { aberta: boolean; abertaAt?: string };
  contactId?: string;
  leadId?: string;
  enviadoAt: string;
}

export interface EmailTemplate {
  id: string;
  nome: string;
  assunto: string;
  corpo: string;
}

export interface AutomationRule {
  id: string;
  pipelineId: string;
  stageId: string;
  gatilho: 'lead_entrou' | 'lead_saiu' | 'tempo_etapa' | 'mensagem_recebida' | 'campo_alterado';
  condicoes: Record<string, any>;
  acoes: string[];
  atraso: { valor: number; unidade: 'minutos' | 'horas' | 'dias' };
  ativo: boolean;
  nome: string;
}

export interface BotNode {
  id: string;
  tipo: 'inicio' | 'mensagem' | 'pergunta' | 'aguardar' | 'condicao' | 'salvar_campo' | 'mudar_etapa' | 'tag' | 'tarefa' | 'transferir' | 'webhook' | 'pausa' | 'fim';
  titulo: string;
  config: Record<string, any>;
  x: number;
  y: number;
}

export interface BotEdge {
  id: string;
  from: string;
  to: string;
}

export interface SalesBot {
  id: string;
  nome: string;
  gatilhos: string[];
  nodes: BotNode[];
  edges: BotEdge[];
  ativo: boolean;
  estatisticas: { executado: number; convertido: number };
}



