# Transactions Service 💸

Microsserviço responsável pelo gerenciamento de transações financeiras com idempotência, cálculo de taxas e auditoria completa.

## 🚀 Tecnologias

- **NestJS 11.x** - Framework Node.js modular e escalável
- **PostgreSQL** - Banco de dados relacional para transações
- **Prisma ORM** - Type-safe database access com migrations
- **RabbitMQ** - Message broker (Request/Response + Pub/Sub)
- **Redis** - Cache opcional (verificação de duplicatas)
- **Pino Logger** - High-performance JSON logging
- **Jest** - Framework de testes (24 testes organizados)
- **Docker** - Containerização

## ✨ Features Principais

- ✅ **Idempotência**: Previne transações duplicadas (idempotencyKey)
- ✅ **Cálculo de Taxas**: Taxa de 2% para TED/DOC
- ✅ **Auditoria Completa**: Evento `TransactionEvent` para cada transação
- ✅ **Validações**: Saldo, limites, ownership
- ✅ **Paginação**: Lista transações com cursor-based pagination
- ✅ **Event-Driven**: Pub/Sub para notificações em tempo real

## 📋 Pré-requisitos

- Node.js 20+
- Yarn
- Docker & Docker Compose (para execução completa)

## ⚙️ Configuração

### Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env`:

```bash
cp .env.example .env
```

Principais variáveis:

```env
# Aplicação
NODE_ENV=development
PORT=3002
APP_NAME=transactions-service

# Banco de Dados PostgreSQL
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/transactions_db?schema=public"
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=transactions_db
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres

# RabbitMQ
RABBITMQ_URL=amqp://guest:guest@localhost:5672

# Redis (opcional - cache de idempotência)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=1

# Pino Logger
LOG_LEVEL=debug  # production: info
LOG_PRETTY=true  # production: false

# Taxas de Transação
TRANSACTION_FEE_PERCENTAGE=2  # 2% para TED/DOC
```

## 🏃 Como Executar

### Desenvolvimento Local (sem Docker)

```bash
# 1. Instalar dependências (na raiz do monorepo)
yarn install

# 2. Iniciar serviços dependentes
docker-compose up postgres rabbitmq -d

# 3. Executar migrations do Prisma
npx prisma migrate dev --schema=apps/transactions-service/prisma/schema.prisma

# 4. (Opcional) Popular dados de teste
npx prisma db seed --schema=apps/transactions-service/prisma/schema.prisma

# 5. Executar em modo desenvolvimento
nx serve transactions-service

# O serviço estará disponível em http://localhost:3002
```

### Com Docker Compose (Recomendado)

```bash
# Build e start de todos os serviços
docker-compose up --build

# Apenas o transactions-service + dependências
docker-compose up transactions-service postgres rabbitmq

# Em background
docker-compose up -d

# Ver logs em tempo real
docker-compose logs -f transactions-service
```

### Verificar Health

```bash
# Health check
curl http://localhost:3002/api/health

# Deve retornar:
# {"status":"ok","timestamp":"2025-01-17T...",..."service":"transactions-service"}
```

## 🧪 Testes

O serviço possui **24 testes organizados** em 3 arquivos especializados:

### Estrutura de Testes

```
src/app/transactions/services/__tests__/
├── test-helpers.ts                        # Mocks compartilhados
├── transactions.service.spec.ts           # 7 testes - Lifecycle & Health
├── transactions-create.service.spec.ts    # 6 testes - Criação & Validações
└── transactions-query.service.spec.ts     # 11 testes - Queries & Paginação
```

### Comandos

```bash
# Executar todos os testes (24 testes, ~3s)
nx test transactions-service

# Testes com coverage detalhado
nx test transactions-service --coverage

# Executar arquivo específico
nx test transactions-service --testFile=transactions-create.service.spec.ts

# Watch mode (desenvolvimento)
nx test transactions-service --watch

# Testes E2E
nx e2e transactions-service-e2e

# Lint
nx lint transactions-service
```

### Cobertura de Testes

- **Criação**: Idempotência, validações, cálculo de taxas, saldo insuficiente
- **Queries**: Listagem, paginação, busca por ID, filtros, authorization
- **Lifecycle**: Health checks, inicialização, shutdown, eventos RabbitMQ

📄 **Documentação completa**: `../../docs/TRANSACTIONS_SERVICE_TESTS_ORGANIZATION.md`

## 📡 Funcionalidades

O Transactions Service consome mensagens RabbitMQ e não expõe endpoints HTTP diretos. Todas as requisições passam pelo **API Gateway** na porta 3000.

### Operações Disponíveis (via RabbitMQ)

#### 1. **Criar Transação**
Pattern: `transactions.create`

**Validações**:
- Saldo suficiente (consulta Users Service)
- Usuário autenticado é o remetente
- Valores positivos (amount > 0)
- Idempotência (idempotencyKey único)

**Cálculo de Taxas**:
```typescript
// PIX: Sem taxas (fee = 0)
// TED/DOC: Taxa de 2%
finalAmount = amount + (amount * 0.02)
```

**Fluxo**:
1. Valida dados da transação
2. Verifica saldo no Users Service
3. Calcula taxa (se aplicável)
4. Cria registro no PostgreSQL
5. Atualiza saldo no Users Service (via RabbitMQ)
6. Publica evento `transaction.completed`
7. Retorna transação criada

#### 2. **Consultar Transações**
Pattern: `transactions.findAll`

**Features**:
- **Paginação**: Cursor-based (10 por página)
- **Filtros**: userId, type, status, dateRange
- **Ordenação**: Por data (DESC)
- **Authorization**: Usuário só vê suas transações

```typescript
// Exemplo de resposta paginada
{
  transactions: [...],
  pagination: {
    total: 150,
    page: 1,
    limit: 10,
    hasNext: true
  }
}
```

#### 3. **Buscar Transação por ID**
Pattern: `transactions.findOne`

- Retorna transação específica
- Valida ownership (usuário é sender ou receiver)
- Inclui detalhes completos (taxa, status, timestamps)

#### 4. **Auditoria**
Todas as transações geram eventos para auditoria:

```typescript
interface TransactionEvent {
  transactionId: string;
  type: 'PIX' | 'TED' | 'DOC';
  amount: number;
  fee: number;
  senderId: string;
  receiverId: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  createdAt: Date;
  idempotencyKey: string;
}
```

### Eventos Publicados

| Evento | Destino | Quando |
|--------|---------|--------|
| `transaction.created` | Notifications | Transação iniciada |
| `transaction.completed` | Notifications, Users | Transação concluída |
| `transaction.failed` | Notifications, Users | Transação falhou |

### Integração com Users Service

```
Transaction Service ──RMQ──> Users Service
                              │
                              ├─> users.getBalance
                              ├─> users.updateBalance
                              └─> users.validate (JWT)
```

## 💰 Tipos de Transação & Taxas

| Tipo | Taxa | Tempo Estimado | Exemplo |
|------|------|----------------|---------|
| **PIX** | 0% (gratuito) | Instantâneo | R$ 100,00 → R$ 100,00 |
| **TED** | 2% | 1-2 dias úteis | R$ 100,00 → R$ 102,00 |
| **DOC** | 2% | 1-2 dias úteis | R$ 100,00 → R$ 102,00 |

## 🔒 Segurança & Validações

### Idempotência
Previne transações duplicadas usando `idempotencyKey`:

```typescript
// Cliente gera UUID único
POST /transactions
{
  "idempotencyKey": "uuid-v4-here",
  ...
}

// Se já existir transação com essa key → retorna a existente
// Se não existir → cria nova
```

### Ownership Validation
- Usuário autenticado deve ser o **sender** da transação
- Previne que um usuário crie transações em nome de outro

### Validação de Saldo
- Consulta saldo em tempo real no Users Service
- Verifica: `saldo >= (amount + fee)`
- Atualiza saldo atomicamente (transação DB)

## 🔧 Dependências & Serviços Externos

### Serviços Obrigatórios

| Serviço | Porta | Função |
|---------|-------|--------|
| **PostgreSQL** | 5432 | Banco de dados principal (transactions_db) |
| **RabbitMQ** | 5672 | Message broker (Request/Response + Events) |
| **Users Service** | 3001 | Validação de saldo e usuários |

### Serviços Opcionais

| Serviço | Porta | Função |
|---------|-------|--------|
| **Redis** | 6379 | Cache de idempotencyKeys (previne duplicatas) |

O `docker-compose.yml` já configura PostgreSQL e RabbitMQ automaticamente.

### Integração com Outros Microserviços

```
API Gateway (3000) ──RMQ──> Transactions Service (3002)
                              │
                              ├─> PostgreSQL (transactions_db)
                              ├─> Redis (cache opcional)
                              │
                              ├─> RabbitMQ Request/Response:
                              │    • users.getBalance
                              │    • users.updateBalance
                              │    • users.validate
                              │
                              └─> RabbitMQ Events (Pub/Sub):
                                   • Publica: transaction.*
                                   • Notifica: Notifications Service
```

## 📊 Arquitetura Interna

```
transactions-service/
├── src/
│   ├── main.ts                            # Bootstrap (Pino logger, RabbitMQ)
│   └── app/
│       ├── app.module.ts                  # Módulo principal
│       ├── transactions/                  # Módulo de transações
│       │   ├── transactions.module.ts
│       │   ├── transactions.controller.ts # RabbitMQ message patterns
│       │   ├── dto/                       # Data Transfer Objects
│       │   ├── entities/                  # Prisma entities
│       │   └── services/
│       │       ├── __tests__/             # 24 testes organizados
│       │       │   ├── test-helpers.ts
│       │       │   ├── transactions.service.spec.ts
│       │       │   ├── transactions-create.service.spec.ts
│       │       │   └── transactions-query.service.spec.ts
│       │       ├── transactions.service.ts
│       │       ├── transactions-create.service.ts
│       │       └── transactions-query.service.ts
│       └── common/                        # Shared utilities
├── prisma/
│   ├── schema.prisma                      # Database schema
│   ├── migrations/                        # Migration history
│   └── seeds/                             # Seed data
└── generated/prisma/                      # Prisma Client (auto-generated)
```

## 🚀 Performance

- **Pino Logger**: 5-10x mais rápido que Winston/Bunyan
- **Prisma**: Query optimization automática
- **Connection Pooling**: PostgreSQL (max: 10 connections)
- **Idempotência**: Cache Redis para prevenir duplicatas
- **Indexação**: Índices em senderId, receiverId, createdAt, idempotencyKey

## 📝 Logs & Monitoramento

```bash
# Ver logs em tempo real
docker-compose logs -f transactions-service

# Logs estruturados (JSON)
{
  "level": 30,
  "time": 1705484400000,
  "pid": 1,
  "hostname": "transactions-service",
  "msg": "Transaction created successfully",
  "transactionId": "uuid",
  "type": "PIX",
  "amount": 100.00,
  "fee": 0.00
}
```

## 🐳 Docker

### Build da imagem

```bash
docker build -f apps/transactions-service/Dockerfile -t micro-bank/transactions-service .
```

### Executar container

```bash
docker run -p 3002:3002 \
  -e DATABASE_HOST=postgres \
  -e RABBITMQ_URL=amqp://rabbitmq:5672 \
  micro-bank/transactions-service
```

## 📚 Documentação Adicional

- **Testes**: `../../docs/TRANSACTIONS_SERVICE_TESTS_ORGANIZATION.md`
- **Arquitetura**: `../../docs/ARCHITECTURE.md`
- **RabbitMQ Flow**: `../../docs/RABBITMQ_FLOW_DIAGRAMS.md`
- **RabbitMQ Concepts**: `../../docs/RABBITMQ_CONCEPTS_ANALYSIS.md`
- **Implementação**: `../../docs/IMPLEMENTATION_SUMMARY.md`

## 🤝 Contribuindo

1. Crie uma branch feature: `git checkout -b feature/nome-da-feature`
2. Implemente mudanças + testes
3. Rode os testes: `nx test transactions-service`
4. Rode o lint: `nx lint transactions-service`
5. Commit: `git commit -m "feat: descrição"`
6. Push: `git push origin feature/nome-da-feature`
7. Abra um Pull Request

---

**Versão**: 1.0.0  
**Última atualização**: Janeiro 2025
