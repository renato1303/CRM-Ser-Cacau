# Conversa CRM - Vendas Conversacionais e Gestão de Leads

O **Conversa CRM** é uma plataforma SaaS completa de vendas conversacionais, projetada para gerenciar funis de vendas Kanban, caixas de entrada unificadas multi-canal (WhatsApp, Instagram, E-mail), automações, agentes de inteligência artificial (Gemini), relatórios gerenciais e **integração nativa com Supabase**.

---

## 1. Arquitetura e Organização de Pastas

A arquitetura foi construída em camadas desacopladas para garantir manutenibilidade, testabilidade e facilidade de integração com banco de dados:

```text
src/
├── components/          # Componentes reutilizáveis de UI e Layout (Sidebar, Topbar, Modal, Button, Tabs, etc.)
│   ├── chat/            # Compositor compartilhado de mensagens
│   └── layout/          # Shell, navegação lateral, busca global, copiloto flutuante e toasts
├── modules/             # Módulos de negócio divididos por domínio
│   ├── painel/          # Dashboard com widgets, filtros e personalização
│   ├── leads/           # Funil Kanban, lista e card detalhado do lead com feed e abas
│   ├── chats/           # Caixa de entrada unificada em 3 colunas e simulador de cliente
│   ├── agenda/          # Agenda, visões de tarefas e página pública de agendamento
│   ├── listas/          # Contatos, empresas e catálogo de produtos
│   ├── email/           # E-mail comercial e regra de email parsing
│   ├── estatisticas/    # Relatórios, gráficos Recharts e cálculo de ROI
│   ├── automacoes/      # Funil digital e construtor visual de Salesbot
│   ├── transmissoes/    # Campanhas em massa respeitando consentimento (Opt-in)
│   ├── ia/              # Assistente Gemini, agente de atendimento e analista de dados
│   ├── captura/         # Construtor de formulários web e gerador WhatsApp/Widget
│   └── configuracoes/   # Configurações gerais, papéis, permissões e modelos de mensagem
├── services/
│   ├── ai.ts            # Integração centralizada com o SDK oficial @google/genai
│   └── db/              
│       ├── storage.ts   # Camada de repositório (localStorage com migração)
│       └── supabase.ts  # Cliente oficial e serviços de sincronização Supabase
├── store/
│   └── useStore.ts      # Estado global com Zustand
└── types/               # Tipagens TypeScript completas e estritas
```

---

## 2. Como Conectar ao Banco de Dados do Supabase

O Conversa CRM já possui suporte nativo ao **Supabase** via `@supabase/supabase-js`. Para conectar seu banco de dados Supabase:

1. **Criar as Tabelas no Supabase**:
   Copie o script SQL localizado em `/supabase_schema.sql` e execute-o no **SQL Editor** do seu projeto Supabase. Isso criará todas as tabelas necessárias (`leads`, `contacts`, `companies`, `tasks`, `conversations`, `messages`, `emails`, etc.) com políticas de segurança (RLS).

2. **Configurar as Variáveis de Ambiente**:
   No arquivo `.env` (ou nas configurações de ambiente do seu deploy), adicione suas credenciais do projeto Supabase:
   ```env
   VITE_SUPABASE_URL="https://seu-projeto.supabase.co"
   VITE_SUPABASE_ANON_KEY="sua-chave-anon-publica"
   ```

3. **Fallback Automático**:
   Se as variáveis do Supabase não forem fornecidas, o sistema opera utilizando o armazenamento local (`localStorage`) de alta performance, garantindo funcionamento offline e em modo de demonstração.

---

## 3. Requisitos de Backend para Produção

Para escalar o Conversa CRM para um ambiente de produção real com milhares de usuários concorrentes:
1. **Servidor API & Webhooks**: Microsserviço Node.js / Express para webhooks oficiais da Meta (WhatsApp, Instagram) e servidores de e-mail (IMAP/SMTP).
2. **Fila de Execução**: Redis + BullMQ para motor de automações e transmissões em massa.
3. **Banco de Dados**: PostgreSQL gerenciado no Supabase ou AWS RDS.
4. **Proxy Seguro**: Isolamento da chave da API Gemini no servidor.
