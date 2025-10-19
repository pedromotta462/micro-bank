# Users Service 👥

Microsserviço responsável pelo gerenciamento de usuários, autenticação JWT, cache Redis e upload de arquivos do Micro Bank.

## 🚀 Tecnologias

- **NestJS 11.x** - Framework Node.js modular e escalável
- **PostgreSQL** - Banco de dados relacional para usuários
- **Prisma ORM** - Type-safe database access
- **Redis (ioredis)** - Cache de usuários e saldos (TTL: 5 minutos)
- **RabbitMQ** - Message broker (Request/Response + Pub/Sub)
- **JWT** - Autenticação e autorização
- **Argon2** - Hash seguro de senhas (OWASP recomendado)
- **AWS S3** - Upload de arquivos (fotos de perfil, documentos)
- **Pino Logger** - High-performance JSON logging
- **Jest** - Framework de testes (38 testes organizados)
- **Docker** - Containerização

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
PORT=3001
APP_NAME=users-service

# Banco de Dados PostgreSQL
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/users_db?schema=public"
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=users_db
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres

# JWT Authentication
JWT_SECRET=your-secret-key-change-in-production-use-openssl
JWT_EXPIRES_IN=7d

# RabbitMQ
RABBITMQ_URL=amqp://guest:guest@localhost:5672

# Redis Cache (TTL: 5 minutos)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# AWS S3 (Upload de arquivos)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=micro-bank-uploads

# Pino Logger
LOG_LEVEL=debug  # production: info
LOG_PRETTY=true  # production: false
```

### Gerar JWT Secret Seguro

```bash
# Gerar secret aleatório de 64 bytes
openssl rand -base64 64

# Ou usar Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

## 🏃 Como Executar

### Desenvolvimento Local (sem Docker)

```bash
# 1. Instalar dependências (na raiz do monorepo)
yarn install

# 2. Iniciar serviços dependentes
docker-compose up postgres redis rabbitmq -d

# 3. Executar migrations do Prisma
npx prisma migrate dev --schema=apps/users-service/prisma/schema.prisma

# 4. (Opcional) Popular dados de teste
npx prisma db seed --schema=apps/users-service/prisma/schema.prisma

# 5. Executar em modo desenvolvimento
nx serve users-service

# O serviço estará disponível em http://localhost:3001
```

### Com Docker Compose (Recomendado)

```bash
# Build e start de todos os serviços
docker-compose up --build

# Apenas o users-service + dependências
docker-compose up users-service postgres redis rabbitmq

# Em background
docker-compose up -d

# Ver logs em tempo real
docker-compose logs -f users-service
```

### Verificar Health

```bash
# Health check
curl http://localhost:3001/api/health

# Deve retornar:
# {"status":"ok","timestamp":"2025-01-17T...",..."service":"users-service"}
```

## 🧪 Testes

O serviço possui **38 testes organizados** em 5 arquivos especializados:

### Estrutura de Testes

```
src/app/users/services/__tests__/
├── test-helpers.ts                    # Mocks compartilhados
├── users.service.spec.ts              # 9 testes - Lifecycle & Health
├── users-cache.service.spec.ts        # 7 testes - Cache Redis
├── users-crud.service.spec.ts         # 12 testes - CRUD operations
├── users-transactions.service.spec.ts # 5 testes - Balance & Transactions
└── users-upload.service.spec.ts       # 5 testes - AWS S3 uploads
```

### Comandos

```bash
# Executar todos os testes (38 testes, ~9s)
nx test users-service

# Testes com coverage detalhado
nx test users-service --coverage

# Executar arquivo específico
nx test users-service --testFile=users-cache.service.spec.ts

# Watch mode (desenvolvimento)
nx test users-service --watch

# Testes E2E
nx e2e users-service-e2e

# Lint
nx lint users-service
```

### Cobertura de Testes

- **Cache**: Cache Redis, invalidação, TTL, fallbacks
- **CRUD**: Create, Read, Update, Delete, validações
- **Transações**: Saldo, atualização, histórico
- **Upload**: S3, validação de arquivos, erros
- **Lifecycle**: Health checks, inicialização, shutdown

📄 **Documentação completa**: `docs/USERS_SERVICE_TESTS_ORGANIZATION.md`

## 📡 Funcionalidades

O Users Service consome mensagens RabbitMQ e não expõe endpoints HTTP diretos. Todas as requisições passam pelo **API Gateway** na porta 3000.

### Operações Disponíveis (via RabbitMQ)

#### 1. **Autenticação & Autorização**
- **Registro de usuário**: `users.register`
  - Valida dados (email único, senha forte)
  - Hash de senha com Argon2
  - Criação de usuário no PostgreSQL
  - Retorna JWT token

- **Login**: `users.login`
  - Valida credenciais
  - Verifica hash Argon2
  - Gera JWT token (validade: 7 dias)

- **Validação de token**: `users.validate`
  - Verifica assinatura JWT
  - Retorna dados do usuário (sem senha)
  - Usado por todos os microserviços

#### 2. **Gerenciamento de Usuários (CRUD)**
- **Buscar usuário**: `users.findOne` (com cache Redis)
- **Listar usuários**: `users.findAll` (paginado)
- **Atualizar perfil**: `users.update` (ownership validation)
- **Deletar usuário**: `users.delete` (soft delete)

#### 3. **Cache Redis**
- **TTL**: 5 minutos para usuários e saldos
- **Invalidação**: Automática em updates/deletes
- **Fallback**: PostgreSQL se Redis falhar

#### 4. **Gerenciamento de Saldo**
- **Consultar saldo**: `users.getBalance` (cached)
- **Atualizar saldo**: `users.updateBalance` (transacional)
- **Verificar saldo suficiente**: `users.checkBalance`
- **Histórico**: Atualizado via eventos de transações

#### 5. **Upload de Arquivos (AWS S3)**
- **Upload de foto de perfil**: `users.uploadPhoto`
- **Upload de documentos**: `users.uploadDocument`
- **Validação**: Tipo, tamanho, formato
- **Storage**: AWS S3 com URLs assinadas

### Eventos Consumidos

| Evento | Origem | Ação |
|--------|--------|------|
| `transaction.completed` | Transactions Service | Atualiza saldo do usuário |
| `transaction.failed` | Transactions Service | Reverte saldo (se necessário) |

### Eventos Publicados

| Evento | Destino | Quando |
|--------|---------|--------|
| `user.created` | Notifications Service | Novo usuário registrado |
| `user.updated` | Notifications Service | Perfil atualizado |
| `balance.updated` | Notifications Service | Saldo alterado |

## 🐳 Docker

### Build da imagem

```bash
docker build -f apps/users-service/Dockerfile -t micro-bank/users-service .
```

### Executar container

```bash
docker run -p 3002:3002 \
  -e DATABASE_HOST=postgres \
  -e REDIS_HOST=redis \
  -e RABBITMQ_URL=amqp://rabbitmq:5672 \
  -e JWT_SECRET=your-secret \
  micro-bank/users-service
```

## 🔧 Dependências & Serviços Externos

### Serviços Obrigatórios

| Serviço | Porta | Função |
|---------|-------|--------|
| **PostgreSQL** | 5432 | Banco de dados principal (users_db) |
| **Redis** | 6379 | Cache de usuários e saldos (TTL: 5min) |
| **RabbitMQ** | 5672 | Message broker (Request/Response + Events) |
| **AWS S3** | - | Upload de arquivos (fotos, documentos) |

O `docker-compose.yml` já configura PostgreSQL, Redis e RabbitMQ automaticamente.

### Integração com Outros Microserviços

```
API Gateway (3000) ──RMQ──> Users Service (3001)
                              │
                              ├─> PostgreSQL (users_db)
                              ├─> Redis (cache)
                              ├─> AWS S3 (uploads)
                              │
                              └─> RabbitMQ Events:
                                   • Consome: transaction.*
                                   • Publica: user.*, balance.*
```

## 📊 Arquitetura Interna

```
users-service/
├── src/
│   ├── main.ts                        # Bootstrap (Pino logger, RabbitMQ)
│   └── app/
│       ├── app.module.ts              # Módulo principal
│       ├── users/                     # Módulo de usuários
│       │   ├── users.module.ts
│       │   ├── users.controller.ts    # RabbitMQ message patterns
│       │   ├── dto/                   # Data Transfer Objects
│       │   ├── entities/              # Prisma entities
│       │   └── services/
│       │       ├── __tests__/         # 38 testes organizados
│       │       │   ├── test-helpers.ts
│       │       │   ├── users.service.spec.ts
│       │       │   ├── users-cache.service.spec.ts
│       │       │   ├── users-crud.service.spec.ts
│       │       │   ├── users-transactions.service.spec.ts
│       │       │   └── users-upload.service.spec.ts
│       │       ├── users.service.ts   # Lógica principal
│       │       ├── users-cache.service.ts
│       │       ├── users-crud.service.ts
│       │       ├── users-transactions.service.ts
│       │       └── users-upload.service.ts
│       ├── auth/                      # JWT, Argon2, Guards
│       └── common/                    # Shared utilities
├── prisma/
│   ├── schema.prisma                  # Database schema
│   ├── migrations/                    # Migration history
│   └── seeds/                         # Seed data
└── generated/prisma/                  # Prisma Client (auto-generated)
```

## 🔒 Segurança

- **Senhas**: Hash Argon2 (OWASP recomendado, resiste a GPU cracking)
- **JWT**: Tokens assinados com HS256 (validação em todos os serviços)
- **Ownership Validation**: Usuário só pode modificar seus próprios dados
- **Sanitização**: Inputs sanitizados no API Gateway
- **Logs**: Pino logger (sem dados sensíveis em produção)

## 🚀 Performance

- **Cache Redis**: Reduz 80%+ das queries ao PostgreSQL
- **Pino Logger**: 5-10x mais rápido que Winston/Bunyan
- **Prisma**: Query optimization automática
- **Connection Pooling**: PostgreSQL (max: 10 connections)

## 📝 Logs & Monitoramento

```bash
# Ver logs em tempo real
docker-compose logs -f users-service

# Logs estruturados (JSON)
{
  "level": 30,
  "time": 1705484400000,
  "pid": 1,
  "hostname": "users-service",
  "msg": "User registered successfully",
  "userId": "uuid",
  "email": "user@example.com"
}
```

## 📚 Documentação Adicional

- **Testes**: `../../docs/USERS_SERVICE_TESTS_ORGANIZATION.md`
- **Endpoints do Gateway**: `../api-gateway/src/docs/USERS_ENDPOINTS.md`
- **Validação**: `../api-gateway/src/docs/VALIDATION.md`
- **Arquitetura**: `../../docs/ARCHITECTURE.md`
- **Sanitização**: `../../docs/SANITIZATION_STRATEGY.md`

## 🤝 Contribuindo

1. Crie uma branch feature: `git checkout -b feature/nome-da-feature`
2. Implemente mudanças + testes
3. Rode os testes: `nx test users-service`
4. Rode o lint: `nx lint users-service`
5. Commit: `git commit -m "feat: descrição"`
6. Push: `git push origin feature/nome-da-feature`
7. Abra um Pull Request

---

**Versão**: 1.0.0  
**Última atualização**: Janeiro 2025
│  ┌──────────────────────────────┐   │
│  │     Controllers              │   │
│  └──────────┬───────────────────┘   │
│             ▼                        │
│  ┌──────────────────────────────┐   │
│  │     Services                 │   │
│  │  - Authentication            │   │
│  │  - User Management           │   │
│  │  - JWT Token                 │   │
│  └──────────┬───────────────────┘   │
│             ▼                        │
│  ┌──────────────────────────────┐   │
│  │     Repositories             │   │
│  └──────────┬───────────────────┘   │
└─────────────┼────────────────────────┘
              │
    ┌─────────┼─────────┐
    ▼         ▼         ▼
┌────────┐ ┌──────┐ ┌──────────┐
│Postgres│ │Redis │ │ RabbitMQ │
└────────┘ └──────┘ └──────────┘
```

## 🔐 Segurança

- Container roda como usuário não-root
- JWT para autenticação
- Senhas hasheadas (quando implementado)
- Variáveis sensíveis via environment
- Health checks configurados

## 🎯 Funcionalidades Futuras

- [ ] Registro de usuários
- [ ] Login / Logout
- [ ] Gestão de perfis
- [ ] Autorização baseada em roles
- [ ] Refresh tokens
- [ ] 2FA (Two-Factor Authentication)
- [ ] Recuperação de senha
- [ ] Auditoria de ações

## 📝 Scripts Úteis

```bash
# Build para produção
nx build users-service --prod

# Verificar erros
nx lint users-service

# Gerar relatório de coverage
nx test users-service --coverage --coverageReporters=html

# Watch mode (desenvolvimento)
nx serve users-service --watch
```

## 🐛 Troubleshooting

### Porta 3002 já está em uso
```bash
# Encontrar o processo
lsof -i :3002

# Mudar a porta no .env
PORT=3003
```

### Erro de conexão com PostgreSQL
```bash
# Verificar se o PostgreSQL está rodando
docker-compose ps postgres

# Verificar logs
docker-compose logs postgres
```

### Erro JWT
```bash
# Certificar que JWT_SECRET está definido
echo $JWT_SECRET

# Ou no .env
cat .env | grep JWT_SECRET
```

## 📚 Referências

- [NestJS Documentation](https://docs.nestjs.com/)
- [JWT Best Practices](https://jwt.io/introduction)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Nx Documentation](https://nx.dev/)
