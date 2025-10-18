# MicroBank - Sistema Bancário com Microsserviços

Sistema bancário moderno construído com arquitetura de microsserviços usando NestJS, Nx Monorepo, RabbitMQ, PostgreSQL, Redis e AWS S3.

## 🚀 Tecnologias

- **Framework**: NestJS
- **Monorepo**: Nx Workspace
- **Message Broker**: RabbitMQ
- **Banco de Dados**: PostgreSQL
- **ORM**: Prisma
- **Cache**: Redis (ioredis)
- **Storage**: AWS S3
- **Validação**: Zod
- **Autenticação**: JWT + Argon2

## 📦 Microserviços

### API Gateway (Porta 3000)
- Ponto de entrada único para requisições HTTP
- Validação e sanitização de dados
- Roteamento para microserviços via RabbitMQ
- Upload de arquivos (Multer)

### Users Service (Porta 3001)
- Gerenciamento de usuários
- Autenticação (JWT)
- Upload de profile picture (AWS S3)
- Cache com Redis

### Transactions Service (Porta 3002)
- Gerenciamento de transações bancárias
- Validação de saldo
- Cálculo de taxas
- Histórico e auditoria completa
- Comunicação com Users Service
- Emissão de eventos para Notifications Service

### Notifications Service (Porta 3003) - Futuro
- Notificações por email, SMS, push
- Consumo de eventos de transação

## 🎯 Funcionalidades Implementadas

### API Gateway - Endpoints

#### Users
- `GET /api/users/:userId` - Obter detalhes do usuário
- `PATCH /api/users/:userId` - Atualizar usuário
- `POST /api/users/:userId/profile-picture` - Upload de foto

#### Transactions ✨ **NOVO**
- `POST /api/transactions` - Criar nova transação
- `GET /api/transactions/:transactionId` - Detalhes da transação
- `GET /api/transactions/user/:userId` - Listar transações do usuário

## 📋 Estrutura do Projeto

```
micro-bank/
├── apps/
│   ├── api-gateway/           # Gateway HTTP → RabbitMQ
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── users/     # Module de usuários
│   │   │   │   ├── auth/      # Module de autenticação
│   │   │   │   └── transactions/  # Module de transações ✨ NOVO
│   │   │   └── docs/          # Documentação dos endpoints
│   │   └── Dockerfile
│   ├── users-service/         # Microserviço de usuários
│   │   ├── src/
│   │   ├── prisma/
│   │   └── Dockerfile
│   ├── transactions-service/  # Microserviço de transações ✨ NOVO
│   │   ├── src/
│   │   │   └── app/
│   │   │       └── transactions/  # Lógica de negócio
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   ├── docs/
│   │   └── Dockerfile
│   └── *-e2e/                 # Testes E2E
├── docs/                      # Documentação arquitetural
└── docker-compose.yml         # PostgreSQL + RabbitMQ
```

## 🏗️ Arquitetura

```
Cliente → API Gateway (HTTP) → RabbitMQ → Microserviços
                                    ↓
                          ┌─────────┼──────────┐
                          ▼         ▼          ▼
                    Users Service   Transactions   Notifications
                          ↓         ↓
                    PostgreSQL   PostgreSQL
```

Ver documentação completa: [ARCHITECTURE.md](docs/ARCHITECTURE.md)

## 🚀 Como Executar

### 1. Pré-requisitos
```bash
node >= 18
npm >= 9
docker & docker-compose
```

### 2. Instalação
```bash
# Instalar dependências
npm install

# Subir infraestrutura (PostgreSQL + RabbitMQ)
npm run docker:up
```

### 3. Configurar Banco de Dados
```bash
# Gerar cliente Prisma
npm run prisma:generate

# Rodar migrations
npm run prisma:migrate

# Seed (dados iniciais)
npm run prisma:seed
```

### 4. Executar Serviços

#### Desenvolvimento (todos os serviços juntos)
```bash
npm run start:all
# ou
nx run-many --target=serve --projects=api-gateway,users-service,transactions-service --parallel=3
```

#### Desenvolvimento (serviços individuais)
```bash
# API Gateway
npm start
# ou
nx serve api-gateway

# Users Service
npm run start:users
# ou
nx serve users-service

# Transactions Service
npm run start:transactions
# ou
nx serve transactions-service
```

### 5. Acessar
- **API Gateway**: http://localhost:3000
- **Users Service**: http://localhost:3001
- **Transactions Service**: http://localhost:3002
- **RabbitMQ Management**: http://localhost:15672 (guest/guest)

## 📚 Documentação

### Endpoints
- [Users Endpoints](apps/api-gateway/src/docs/USERS_ENDPOINTS.md)
- [Transactions Endpoints](apps/api-gateway/src/docs/TRANSACTIONS_ENDPOINTS.md) ✨ **NOVO**
- [Validation Strategy](apps/api-gateway/src/docs/VALIDATION.md)

### Arquitetura
- [Architecture Overview](docs/ARCHITECTURE.md)
- [RabbitMQ Concepts](docs/RABBITMQ_CONCEPTS_ANALYSIS.md)
- [RabbitMQ Flow Diagrams](docs/RABBITMQ_FLOW_DIAGRAMS.md)
- [Sanitization Strategy](docs/SANITIZATION_STRATEGY.md)

### Microserviços
- [Transactions Service](apps/transactions-service/docs/TRANSACTIONS_SERVICE.md) ✨ **NOVO**

## 🧪 Testes

```bash
# Todos os testes
npm run test:all

# Teste específico
nx test api-gateway
nx test users-service
nx test transactions-service

# E2E
npm run e2e:all
```

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
```

## 🔐 Variáveis de Ambiente

Crie arquivos `.env` em cada serviço:

### api-gateway/.env
```env
PORT=3000
RABBITMQ_URL=amqp://guest:guest@localhost:5672
```

### users-service/.env
```env
PORT=3001
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/users_db
RABBITMQ_URL=amqp://guest:guest@localhost:5672
REDIS_HOST=localhost
REDIS_PORT=6379
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
S3_BUCKET_NAME=microbank-profile-pictures
JWT_SECRET=your_jwt_secret
```

### transactions-service/.env
```env
PORT=3002
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/transactions_db
RABBITMQ_URL=amqp://guest:guest@localhost:5672
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

## 🎯 Próximos Passos

- [ ] Implementar Notifications Service
- [ ] Adicionar autenticação JWT nos endpoints
- [ ] Implementar rate limiting
- [ ] Adicionar circuit breaker
- [ ] Implementar retry automático para transações
- [ ] Adicionar cache de validação de usuários
- [ ] Webhook para notificação de status
- [ ] Suporte a transações em lote
- [ ] Agendamento de transações futuras
- [ ] Cancelamento/estorno de transações

## Links Úteis

- [Nx Docs](https://nx.dev/docs/technologies/node/nest/introduction)
- [NestJS Docs](https://docs.nestjs.com/microservices/rabbitmq)
- [Prisma Docs](https://www.prisma.io/docs/)
- [RabbitMQ Docs](https://www.rabbitmq.com/documentation.html)