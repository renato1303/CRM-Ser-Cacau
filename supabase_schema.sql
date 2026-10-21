-- Supabase SQL Schema for Conversa CRM
-- Run this script in your Supabase SQL Editor to create all required tables.

create table if not exists companies (
  id text primary key,
  nome text not null,
  segmento text,
  tamanho text,
  website text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists contacts (
  id text primary key,
  nome text not null,
  email text,
  telefone text,
  cargo text,
  empresa_id text references companies(id),
  avatar text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists products (
  id text primary key,
  nome text not null,
  descricao text,
  preco numeric not null,
  categoria text,
  sku text
);

create table if not exists leads (
  id text primary key,
  nome text not null,
  valor numeric not null,
  pipeline_id text not null,
  stage_id text not null,
  responsavel_id text not null,
  contact_ids jsonb default '[]'::jsonb,
  company_id text references companies(id),
  tags jsonb default '[]'::jsonb,
  origem_id text not null,
  motivo_perda_id text,
  comentario_perda text,
  custom_fields jsonb default '{}'::jsonb,
  produtos jsonb default '[]'::jsonb,
  closed_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  utm jsonb default '{}'::jsonb,
  ultima_interacao_at timestamp with time zone default timezone('utc'::text, now()) not null,
  nao_lidas integer default 0
);

create table if not exists tasks (
  id text primary key,
  titulo text not null,
  descricao text,
  tipo text not null,
  status text not null,
  prazo timestamp with time zone not null,
  lead_id text references leads(id),
  responsavel_id text not null,
  criado_por text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists notes (
  id text primary key,
  lead_id text references leads(id),
  autor_id text not null,
  conteudo text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists conversations (
  id text primary key,
  lead_id text references leads(id),
  contact_id text references contacts(id),
  canal text not null,
  status text not null,
  atendente_id text not null,
  ultima_mensagem text not null,
  ultima_mensagem_at timestamp with time zone not null,
  nao_lidas integer default 0
);

create table if not exists messages (
  id text primary key,
  conversation_id text references conversations(id) on delete cascade,
  remetente text not null,
  remetente_id text not null,
  tipo text not null,
  conteudo text not null,
  timestamp timestamp with time zone not null,
  status text not null
);

create table if not exists emails (
  id text primary key,
  contact_id text references contacts(id),
  lead_id text references leads(id),
  assunto text not null,
  corpo text not null,
  remetente text not null,
  destinatario text not null,
  direcao text not null,
  pasta text not null,
  lido boolean default false,
  rastreado boolean default false,
  created_at timestamp with time zone not null
);

create table if not exists message_templates (
  id text primary key,
  nome text not null,
  canal text not null,
  corpo text not null,
  variaveis jsonb default '[]'::jsonb
);

create table if not exists email_templates (
  id text primary key,
  nome text not null,
  assunto text not null,
  corpo text not null
);

create table if not exists automation_rules (
  id text primary key,
  nome text not null,
  gatilho text not null,
  condicoes jsonb default '[]'::jsonb,
  acoes jsonb default '[]'::jsonb,
  atraso_minutos integer default 0,
  ativo boolean default true,
  execucoes integer default 0
);

create table if not exists sales_bots (
  id text primary key,
  nome text not null,
  gatilho text not null,
  nodes jsonb default '[]'::jsonb,
  edges jsonb default '[]'::jsonb,
  ativo boolean default true,
  estatisticas jsonb default '{}'::jsonb
);

-- Enable Row Level Security (RLS) as recommended by Supabase
alter table companies enable row level security;
alter table contacts enable row level security;
alter table products enable row level security;
alter table leads enable row level security;
alter table tasks enable row level security;
alter table notes enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table emails enable row level security;
alter table message_templates enable row level security;
alter table email_templates enable row level security;
alter table automation_rules enable row level security;
alter table sales_bots enable row level security;

-- Create public read/write policies for development / prototype
create policy "Allow all access" on companies for all using (true) with check (true);
create policy "Allow all access" on contacts for all using (true) with check (true);
create policy "Allow all access" on products for all using (true) with check (true);
create policy "Allow all access" on leads for all using (true) with check (true);
create policy "Allow all access" on tasks for all using (true) with check (true);
create policy "Allow all access" on notes for all using (true) with check (true);
create policy "Allow all access" on conversations for all using (true) with check (true);
create policy "Allow all access" on messages for all using (true) with check (true);
create policy "Allow all access" on emails for all using (true) with check (true);
create policy "Allow all access" on message_templates for all using (true) with check (true);
create policy "Allow all access" on email_templates for all using (true) with check (true);
create policy "Allow all access" on automation_rules for all using (true) with check (true);
create policy "Allow all access" on sales_bots for all using (true) with check (true);
