# 🏦 MicroBank - Sistema Bancário com Microsserviços

Sistema bancário moderno construído com arquitetura de microsserviços usando NestJS, Nx Monorepo, RabbitMQ, PostgreSQL, Redis e AWS S3.

## ✨ Features Destacadas

### 📚 Documentação Swagger/OpenAPI
Todos os serviços possuem documentação interativa Swagger:
- **API Gateway**: http://localhost:3000/api/docs
- **Users Service**: http://localhost:3002/api/docs  
- **Transactions Service**: http://localhost:3001/api/docs

### 🔄 Idempotência em Transações
Sistema completo de idempotência para prevenir transações duplicadas:
- Suporte via `idempotencyKey` (UUID)
- Geração automática se não fornecido
- Proteção contra retry de rede e clique duplo
- Retorna transação existente ao invés de criar duplicata

📖 **Documentação completa**: [SWAGGER.md](./SWAGGER.md) | [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)

## 🚀 Tecnologias

### Backend & Framework
- **Framework**: NestJS 11.x
- **Runtime**: Node.js 20+
- **Monorepo**: Nx Workspace 20.x
- **Linguagem**: TypeScript 5.x

### Infraestrutura & Comunicação
- **Message Broker**: RabbitMQ (AMQP)
- **Banco de Dados**: PostgreSQL 16
- **ORM**: Prisma 6.x
- **Cache**: Redis 7.x (ioredis)
- **Storage**: AWS S3

### Segurança & Validação
- **Autenticação**: JWT (JSON Web Tokens)
- **Hash de Senhas**: Argon2
- **Validação**: Zod
- **Sanitização**: DOMPurify + Validator.js

### Logging & Monitoramento
- **Logger**: Pino (High-performance JSON logger)
- **Integration**: nestjs-pino

### Testes
- **Framework**: Jest 29.x
- **E2E**: @nestjs/testing
- **Coverage**: Implementado para users-service e transactions-service

## 📦 Microserviços

### 🌐 API Gateway (Porta 3000)
Gateway HTTP que atua como ponto de entrada único para todas as requisições REST.

**Responsabilidades:**
- Validação e sanitização de dados (Zod + DOMPurify)
- Autenticação JWT
- Roteamento para microserviços via RabbitMQ (Request/Response pattern)
- Upload de arquivos (Multer → AWS S3)
- Rate limiting e ownership validation
- Logging estruturado com Pino

**Endpoints:**
- `/api/auth/*` - Autenticação (register, login, profile)
- `/api/users/*` - Gerenciamento de usuários
- `/api/transactions/*` - Operações de transação

### 👥 Users Service (Porta 3001)
Microserviço de gerenciamento de usuários e autenticação.

**Responsabilidades:**
- CRUD de usuários e dados bancários
- Autenticação JWT (register, login, validation)
- Hash de senhas com Argon2
- Upload de profile picture para AWS S3
- Cache de usuários e saldos (Redis)
- Processamento de saldo de transações
- Emissão de eventos de atualização de saldo

**Banco de Dados:** `users_db`
- Tabelas: User, BankingDetails, BalanceHistory

**Cache Keys:**
- `user:{userId}` - Dados do usuário (TTL: 5min)
- `user_transaction_balance:{userId}` - Saldo (TTL: 5min)

**Testes:** 38 testes unitários organizados em 5 arquivos especializados

### 💰 Transactions Service (Porta 3002)
Microserviço de gerenciamento de transações financeiras.

**Responsabilidades:**
- Criação e processamento de transações
- Validação de saldo via users-service
- Cálculo automático de taxas (TRANSFER: 1%, PIX: 0%)
- Histórico e auditoria completa (TransactionEvent)
- Gerenciamento de status (PENDING → PROCESSING → COMPLETED/FAILED)
- Comunicação com users-service para atualização de saldos
- Emissão de eventos para notifications-service
- Idempotência (evita processamento duplicado)

**Banco de Dados:** `transactions_db`
- Tabelas: Transaction, TransactionEvent

**Testes:** 24 testes unitários organizados em 3 arquivos especializados

### 📨 Notifications Service (Porta 3003)
Microserviço de notificações e eventos (Event-driven).

**Responsabilidades:**
- Consumo de eventos RabbitMQ (Pub/Sub pattern)
- Processamento de eventos de transação
- Processamento de eventos de atualização de saldo
- Logging estruturado de notificações
- Preparação para envio multi-canal (Email, SMS, Push - futuro)

**Queue:** `notifications_queue`

**Eventos Consumidos:**
- `transaction_notification` - Eventos de transação
- `notifications.balance.updated` - Atualização de saldo
- `notifications.user.updated` - Atualização de usuário

## 🎯 Funcionalidades Implementadas

### 🔐 Authentication (API Gateway)
- `POST /api/auth/register` - Registrar novo usuário
  - Validação de email único
  - Hash de senha com Argon2
  - Criação automática de BankingDetails (saldo inicial: R$ 1.000)
  - Retorna JWT token
- `POST /api/auth/login` - Login de usuário
  - Validação de credenciais
  - Retorna JWT token
- `GET /api/auth/profile` - Perfil do usuário autenticado
  - Requer JWT token
  - Retorna dados do usuário sem senha

### 👤 Users (API Gateway) 🔒 Protegido por JWT
- `GET /api/users/:userId` - Obter detalhes do usuário
  - Valida ownership (só o próprio usuário)
  - Exclui senha da resposta
  - Inclui BankingDetails
- `PATCH /api/users/:userId` - Atualizar dados do usuário
  - Valida ownership
  - Campos: name, email, address
  - Invalidação de cache automática
- `POST /api/users/:userId/profile-picture` - Upload de foto de perfil
  - Valida ownership
  - Upload para AWS S3
  - Suporta: JPEG, PNG, GIF (max: 5MB)
  - Invalidação de cache automática
- `GET /api/users/:userId/balance` - Consultar saldo
  - Valida ownership
  - Retorna balance com cache (Redis)

### 💸 Transactions (API Gateway) 🔒 Protegido por JWT
- `POST /api/transactions` - Criar nova transação
  - Valida ownership (sender deve ser o usuário autenticado)
  - Tipos: TRANSFER (taxa 1%), PIX (taxa 0%)
  - Validação automática de saldo
  - Processamento assíncrono
  - Status inicial: PENDING
- `GET /api/transactions/:transactionId` - Detalhes da transação
  - Valida ownership (sender ou receiver)
  - Inclui todos os campos e eventos
- `GET /api/transactions/user/:userId` - Listar transações
  - Valida ownership
  - Paginação (page, limit)
  - Filtros: status, type
  - Ordenação por data DESC

### 🔔 Eventos (Notifications Service)
- **transaction_notification** - Eventos de transação
  - CREATED, PROCESSING_STARTED, COMPLETED, FAILED
- **notifications.balance.updated** - Atualização de saldo
  - DEBIT (débito do sender)
  - CREDIT (crédito do receiver)
- **notifications.user.updated** - Atualização de usuário

**Nota:** Todos os endpoints de users e transactions requerem:
- ✅ Header `Authorization: Bearer <JWT_TOKEN>`
- ✅ Validação de ownership (usuário só acessa seus próprios dados)
- ✅ Validação e sanitização de inputs

## 📋 Estrutura do Projeto

```
micro-bank/
├── apps/
│   ├── api-gateway/               # Gateway HTTP → RabbitMQ
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── auth/          # Autenticação JWT
│   │   │   │   ├── users/         # Endpoints de usuários
│   │   │   │   ├── transactions/  # Endpoints de transações
│   │   │   │   └── common/        # Guards, interceptors, filters
│   │   │   └── docs/              # Documentação dos endpoints
│   │   └── Dockerfile
│   │
│   ├── users-service/             # Microserviço de usuários
│   │   ├── src/
│   │   │   └── app/
│   │   │       ├── users/         # Lógica de negócio
│   │   │       │   ├── services/
│   │   │       │   │   ├── __tests__/  # ✅ 38 testes organizados
│   │   │       │   │   └── users.service.ts
│   │   │       │   ├── controllers/
│   │   │       │   └── dtos/
│   │   │       └── common/        # Shared services (Prisma, Redis, S3)
│   │   ├── prisma/
│   │   │   ├── schema.prisma      # User, BankingDetails, BalanceHistory
│   │   │   ├── migrations/
│   │   │   └── seeds/
│   │   ├── generated/prisma/      # Cliente Prisma gerado
│   │   └── Dockerfile
│   │
│   ├── transactions-service/      # Microserviço de transações
│   │   ├── src/
│   │   │   └── app/
│   │   │       ├── transactions/  # Lógica de negócio
│   │   │       │   ├── services/
│   │   │       │   │   ├── __tests__/  # ✅ 24 testes organizados
│   │   │       │   │   └── transactions.service.ts
│   │   │       │   ├── controllers/
│   │   │       │   └── dtos/
│   │   │       └── common/        # Shared services
│   │   ├── prisma/
│   │   │   ├── schema.prisma      # Transaction, TransactionEvent
│   │   │   ├── migrations/
│   │   │   └── seeds/
│   │   ├── generated/prisma/
│   │   ├── docs/                  # Documentação técnica
│   │   └── Dockerfile
│   │
│   ├── notifications-service/     # Microserviço de notificações
│   │   ├── src/
│   │   │   └── app/
│   │   │       ├── notifications/ # Event consumers
│   │   │       └── common/
│   │   └── Dockerfile
│   │
│   └── *-e2e/                     # Testes E2E para cada serviço
│
├── docs/                          # Documentação arquitetural
│   ├── ARCHITECTURE.md            # Visão geral da arquitetura
│   ├── USERS_SERVICE_TESTS_ORGANIZATION.md
│   ├── TRANSACTIONS_SERVICE_TESTS_ORGANIZATION.md
│   └── MicroBank.postman_collection.json  # Collection para testes
│
├── tools/                         # Scripts utilitários
├── docker-compose.yml             # PostgreSQL + RabbitMQ + Redis
├── nx.json                        # Configuração do Nx
├── package.json                   # Scripts e dependências
└── tsconfig.base.json             # TypeScript config compartilhado
```

## 🏗️ Arquitetura

### Visão Geral
```
Cliente (HTTP/REST)
        ↓
┌───────────────────┐
│   API Gateway     │ ← Entrada única, validação, autenticação JWT
│   Porta: 3000     │
└─────────┬─────────┘
          │
          │ RabbitMQ (Request/Response + Pub/Sub)
          │
    ┌─────┴─────┬──────────────┬──────────────┐
    ↓           ↓              ↓              ↓
users_queue  trans_queue  notif_queue   events_exchange
    ↓           ↓              ↓              ↓
┌─────────┐ ┌─────────┐  ┌──────────┐   (Topic Type)
│ Users   │ │ Trans   │  │  Notif   │       │
│ Service │ │ Service │  │  Service │       │
│ :3001   │ │ :3002   │  │  :3003   │  ◄────┘
└────┬────┘ └────┬────┘  └──────────┘
     │           │
     │           │
PostgreSQL   PostgreSQL
(users_db)   (transactions_db)
     │
   Redis
  (Cache)
```

### Padrões de Comunicação

#### 1. Request/Response (Síncrono)
- **API Gateway ↔ Microservices**
- Usado para operações que precisam de resposta imediata
- Exemplos: GET user, POST transaction, etc.
- Queues dedicadas: `users_queue`, `transactions_queue`

#### 2. Event-Driven (Assíncrono)
- **Microservices → Notifications Service**
- Usado para notificações e eventos que não bloqueiam
- Exchange tipo Topic com routing keys
- Exemplos: `transaction.created`, `balance.updated`

### Fluxo de uma Transação Completa

```
1. Cliente faz POST /api/transactions
   ↓
2. API Gateway valida JWT + ownership
   ↓
3. API Gateway envia para transactions_queue
   ↓
4. Transactions Service:
   - Valida sender ≠ receiver
   - Calcula taxa (TRANSFER: 1%, PIX: 0%)
   - Cria Transaction (status: PENDING)
   - Cria TransactionEvent (CREATED)
   ↓
5. Processamento Assíncrono:
   - Atualiza status: PROCESSING
   - Envia para users_queue: validateAndUpdateBalance
   ↓
6. Users Service:
   - Valida saldo do sender
   - Debita sender (totalAmount)
   - Credita receiver (netAmount)
   - Cria 2x BalanceHistory
   - Invalida cache (4 keys)
   - Emite eventos de saldo (Pub/Sub)
   ↓
7. Transactions Service:
   - Atualiza status: COMPLETED
   - Cria TransactionEvent (COMPLETED)
   - Emite evento de transação (Pub/Sub)
   ↓
8. Notifications Service:
   - Recebe eventos assíncronos
   - Loga notificações estruturadas
   - (Futuro: envia email/SMS/push)
```

Ver documentação completa: [ARCHITECTURE.md](docs/ARCHITECTURE.md)

## 🚀 Como Executar

### ⚡ Início Rápido (Recomendado)

```bash
# 1. Subir infraestrutura (PostgreSQL, RabbitMQ, Redis)
yarn run infra

# 2. Instalar dependências
yarn install

# 3. Configurar banco de dados
yarn run prisma:generate  # Gerar clientes Prisma
yarn run prisma:migrate   # Aplicar migrations
yarn run prisma:seed      # Dados iniciais (opcional)

# 4. Iniciar TODOS os serviços com um comando
./start-all-services.sh
```

Após ~15 segundos, acesse:
- 📚 **Swagger API Gateway**: http://localhost:3000/api/docs
- 📚 **Swagger Users**: http://localhost:3002/api/docs
- 📚 **Swagger Transactions**: http://localhost:3001/api/docs

### 📋 Passo a Passo Detalhado

### 1. Pré-requisitos
```bash
node >= 20
yarn >= 1.22
docker & docker-compose
```

### 2. Instalação
```bash
# Instalar dependências
yarn install

# Subir infraestrutura (PostgreSQL + RabbitMQ + Redis)
yarn run infra
```

### 3. Configurar Banco de Dados
```bash
# Gerar cliente Prisma
yarn run prisma:generate

# Rodar migrations
yarn run prisma:migrate

# Seed (dados iniciais)
yarn run prisma:seed
```

### 4. Executar Serviços

#### 🎯 Opção 1: Script Automatizado (Recomendado)
```bash
./start-all-services.sh
```

#### 🔧 Opção 2: Manual - Todos os serviços juntos
```bash
yarn run start:all
# ou
nx run-many --target=serve --projects=api-gateway,users-service,transactions-service --parallel=3
```

#### 🛠️ Opção 3: Manual - Serviços individuais
```bash
# API Gateway (Porta 3000)
yarn start
# ou
nx serve api-gateway

# Users Service (Porta 3002)
yarn run start:users
# ou
nx serve users-service

# Transactions Service (Porta 3001)
yarn run start:transactions
# ou
nx serve transactions-service
```

### 5. Acessar
- **API Gateway**: http://localhost:3000
- **Users Service**: http://localhost:3001
- **Transactions Service**: http://localhost:3002
- **RabbitMQ Management**: http://localhost:15672 (guest/guest)

## 📚 Documentação

### 📖 Endpoints & API
- [🔐 Authentication](apps/api-gateway/src/docs/AUTHENTICATION.md) - Register, Login, Profile
- [👤 Users Endpoints](apps/api-gateway/src/docs/USERS_ENDPOINTS.md) - CRUD, Balance, Upload
- [💸 Transactions Endpoints](apps/api-gateway/src/docs/TRANSACTIONS_ENDPOINTS.md) - Create, Query, List
- [✅ Validation Strategy](apps/api-gateway/src/docs/VALIDATION.md) - Zod schemas e sanitização

### 🏗️ Arquitetura & Design
- [Architecture Overview](docs/ARCHITECTURE.md) - Visão geral completa
- [RabbitMQ Concepts](docs/RABBITMQ_CONCEPTS_ANALYSIS.md) - Request/Response + Pub/Sub
- [RabbitMQ Flow Diagrams](docs/RABBITMQ_FLOW_DIAGRAMS.md) - Fluxos visuais
- [Sanitization Strategy](docs/SANITIZATION_STRATEGY.md) - DOMPurify + Validator.js

### 🧪 Testes
- [Users Service Tests](docs/USERS_SERVICE_TESTS_ORGANIZATION.md) - 38 testes organizados
- [Transactions Service Tests](docs/TRANSACTIONS_SERVICE_TESTS_ORGANIZATION.md) - 24 testes organizados

### 📦 Microserviços
- [Users Service](apps/users-service/README.md) - Configuração e uso
- [Transactions Service](apps/transactions-service/README.md) - Configuração e uso
- [Notifications Service](apps/notifications-service/README.md) - Event consumers

### 🔧 Ferramentas
- [Postman Collection](docs/MicroBank.postman_collection.json) - Collection para testes de API

## 🧪 Testes

### Executar Testes

```bash
# Todos os testes unitários
npm run test:all

# Teste de um serviço específico
nx test api-gateway
nx test users-service
nx test transactions-service
nx test notifications-service

# Testes E2E
npm run e2e:all
nx e2e api-gateway-e2e
nx e2e users-service-e2e
nx e2e transactions-service-e2e

# Testes com coverage
nx test users-service --coverage
nx test transactions-service --coverage

# Apenas novos testes organizados (__tests__)
nx test users-service --testPathPatterns="__tests__"
nx test transactions-service --testPathPatterns="__tests__"
```

### Cobertura de Testes

#### ✅ Users Service (38 testes)
Testes organizados em 5 arquivos especializados:
- **test-helpers.ts** - Mocks e utilitários compartilhados
- **users-cache.service.spec.ts** (7 testes) - Cache Redis HIT/MISS, invalidação
- **users-crud.service.spec.ts** (12 testes) - CRUD, validações, conversões
- **users-transactions.service.spec.ts** (5 testes) - Processamento de transações, idempotência
- **users-upload.service.spec.ts** (5 testes) - Upload S3, formatos
- **users.service.spec.ts** (9 testes) - Health checks, lifecycle

**Documentação:** [USERS_SERVICE_TESTS_ORGANIZATION.md](docs/USERS_SERVICE_TESTS_ORGANIZATION.md)

#### ✅ Transactions Service (24 testes)
Testes organizados em 3 arquivos especializados:
- **test-helpers.ts** - Mocks e utilitários compartilhados
- **transactions-create.service.spec.ts** (6 testes) - Criação, validações, taxas
- **transactions-query.service.spec.ts** (11 testes) - Consultas, paginação, filtros
- **transactions.service.spec.ts** (7 testes) - Health checks, lifecycle

**Documentação:** [TRANSACTIONS_SERVICE_TESTS_ORGANIZATION.md](docs/TRANSACTIONS_SERVICE_TESTS_ORGANIZATION.md)

### Padrão de Organização

✅ **Best Practice Implementada:**
- Testes separados por responsabilidade (cache, CRUD, transactions, etc.)
- Mocks compartilhados (DRY principle)
- Arquivos pequenos e focados (~50-200 linhas)
- Nomenclatura clara: `{feature}.service.spec.ts`
- Diretório `__tests__/` para organização

**Benefícios:**
- ✅ Manutenibilidade (fácil encontrar e atualizar testes)
- ✅ Legibilidade (cada arquivo tem propósito claro)
- ✅ Performance CI/CD (execução paralela)
- ✅ Colaboração (menos merge conflicts)

## 🏗️ Build

```bash
# Build de todos os projetos
npm run build:all

# Build individual
npm run build              # api-gateway
npm run build:users        # users-service
npm run build:transactions # transactions-service
```

## 🐳 Docker

```bash
# Subir infraestrutura
npm run docker:up

# Parar
npm run docker:down

# Ver logs
npm run docker:logs

# Restart
npm run docker:restart
```

## 📊 Database

### Prisma Commands

```bash
# Gerar cliente Prisma para todos
npm run prisma:generate

# Migrations
npm run prisma:migrate

# Prisma Studio (GUI)
npm run prisma:studio

# Push schema (dev)
npm run prisma:push

# Seed
npm run prisma:seed
```

### Comandos específicos por serviço

```bash
# Users Service
nx run users-service:prisma:generate
nx run users-service:prisma:migrate
nx run users-service:prisma:studio

# Transactions Service
nx run transactions-service:prisma:generate
nx run transactions-service:prisma:migrate
nx run transactions-service:prisma:studio

### Scripts Úteis

```bash
# Iniciar todos os serviços
./start-all-services.sh

# Parar todos os serviços
pkill -f "nx serve"

# Ver logs em tempo real
tail -f /tmp/api-gateway.log
tail -f /tmp/users.log
tail -f /tmp/transactions.log

# Health checks
curl http://localhost:3000/api/health
curl http://localhost:3001/api/health
curl http://localhost:3002/api/health
```
```

## 🔐 Variáveis de Ambiente

### api-gateway/.env
```env
# Server
PORT=3000
NODE_ENV=development

# RabbitMQ
RABBITMQ_URL=amqp://guest:guest@localhost:5672

# JWT
JWT_SECRET=your-secret-key-change-in-production-use-openssl-rand-base64-32
JWT_EXPIRES_IN=24h

# Logging
LOG_LEVEL=info  # info, debug, warn, error
```

### users-service/.env
```env
# Server
PORT=3001
NODE_ENV=development

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/users_db

# RabbitMQ
RABBITMQ_URL=amqp://guest:guest@localhost:5672

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=  # opcional

# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
S3_BUCKET_NAME=microbank-profile-pictures

# JWT (deve ser igual ao api-gateway)
JWT_SECRET=your-secret-key-change-in-production-use-openssl-rand-base64-32

# Logging
LOG_LEVEL=info
```

### transactions-service/.env
```env
# Server
PORT=3002
NODE_ENV=development

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/transactions_db

# RabbitMQ
RABBITMQ_URL=amqp://guest:guest@localhost:5672

# Logging
LOG_LEVEL=info
```

### notifications-service/.env
```env
# Server
PORT=3003
NODE_ENV=development

# RabbitMQ
RABBITMQ_URL=amqp://guest:guest@localhost:5672

# Logging
LOG_LEVEL=info

# Providers (Futuro)
# SENDGRID_API_KEY=your_sendgrid_key
# TWILIO_ACCOUNT_SID=your_twilio_sid
# TWILIO_AUTH_TOKEN=your_twilio_token
```

### 🔑 Gerar JWT Secret

```bash
# Usando openssl
openssl rand -base64 32

# Usando node
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## 📝 Lint

```bash
# Lint em todos os projetos
npm run lint:all

# Lint individual
npm run lint              # api-gateway
npm run lint:users        # users-service
npm run lint:transactions # transactions-service
```

## 🎯 Próximos Passos e Roadmap

### ✅ Concluído (Epic 1-5)
- [x] Implementar Notifications Service
- [x] Adicionar autenticação JWT nos endpoints
- [x] Implementar ownership validation
- [x] Hash de senhas com Argon2
- [x] Migrar para Pino Logger (high-performance)
- [x] Implementar testes unitários organizados (users + transactions)
- [x] Sanitização de inputs (DOMPurify + Validator.js)
- [x] Cache Redis para usuários e saldos
- [x] Upload de arquivos para AWS S3
- [x] Event-driven architecture (Pub/Sub)
- [x] Auditoria completa de transações (TransactionEvent)
- [x] Idempotência em transações

### 🚀 Próximas Features (Epic 6+)
- [ ] **Autenticação Avançada**
  - [ ] Refresh tokens
  - [ ] 2FA (Two-Factor Authentication)
  - [ ] OAuth2 (Google, Facebook)
  - [ ] Session management

- [ ] **Segurança & Performance**
  - [ ] Rate limiting (por usuário e global)
  - [ ] Circuit breaker pattern
  - [ ] Health checks avançados
  - [ ] Distributed tracing (Jaeger/Zipkin)
  - [ ] API versioning

- [ ] **Transações Avançadas**
  - [ ] Retry automático para transações falhadas
  - [ ] Transações em lote
  - [ ] Agendamento de transações futuras
  - [ ] Cancelamento/estorno de transações
  - [ ] Limite de transação por período
  - [ ] Detecção de fraude básica

- [ ] **Notificações**
  - [ ] Envio de email (SendGrid/AWS SES)
  - [ ] Envio de SMS (Twilio)
  - [ ] Push notifications (FCM)
  - [ ] Webhooks customizáveis
  - [ ] Templates de notificação

- [ ] **Relatórios & Analytics**
  - [ ] Dashboard de transações
  - [ ] Extrato mensal
  - [ ] Gráficos de gastos
  - [ ] Export para CSV/PDF

- [ ] **DevOps & Infraestrutura**
  - [ ] CI/CD com GitHub Actions
  - [ ] Deploy automatizado (AWS ECS/EKS)
  - [ ] Monitoring com Prometheus + Grafana
  - [ ] Logs centralizados (ELK Stack)
  - [ ] Backup automático de bancos
  - [ ] Disaster recovery plan

### 📝 Melhorias Técnicas
- [ ] Cache de validação de usuários entre serviços
- [ ] GraphQL Gateway (alternativa ao REST)
- [ ] WebSockets para notificações real-time
- [ ] gRPC entre microserviços (alternativa ao RabbitMQ)
- [ ] Testes de carga (K6/Artillery)
- [ ] Documentação OpenAPI/Swagger
- [ ] SDK client (JavaScript/TypeScript)

## 🤝 Contribuindo

### Padrões do Projeto

1. **Commits**: Conventional Commits
   ```
   feat: adiciona endpoint de extrato
   fix: corrige validação de saldo
   docs: atualiza README
   test: adiciona testes de transação
   refactor: melhora performance do cache
   ```

2. **Branches**: GitFlow
   ```
   main         → Produção
   develop      → Desenvolvimento
   feature/*    → Novas features
   fix/*        → Correções
   release/*    → Preparação para release
   ```

3. **Pull Requests**
   - Título descritivo
   - Descrição clara do que foi feito
   - Testes passando
   - Code review aprovado
   - Sem conflitos com develop

### Comandos Úteis

```bash
# Criar nova feature
git checkout -b feature/nome-da-feature develop

# Commitar mudanças
git add .
git commit -m "feat: descrição da feature"

# Sincronizar com develop
git checkout develop
git pull origin develop
git checkout feature/nome-da-feature
git rebase develop

# Criar PR
git push origin feature/nome-da-feature
# Abrir PR no GitHub: feature/nome-da-feature → develop
```

## Links Úteis

- [Nx Docs](https://nx.dev/docs/technologies/node/nest/introduction)
- [NestJS Docs](https://docs.nestjs.com/microservices/rabbitmq)
- [Prisma Docs](https://www.prisma.io/docs/)
- [RabbitMQ Docs](https://www.rabbitmq.com/documentation.html)