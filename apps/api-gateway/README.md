# API Gateway 🌐

Gateway HTTP que expõe endpoints REST e encaminha requisições para os microserviços via RabbitMQ.

## 🚀 Tecnologias

- **NestJS 11.x** - Framework Node.js modular e escalável
- **RabbitMQ** - Message broker (Request/Response pattern)
- **JWT** - Autenticação e autorização (Guards)
- **DOMPurify** - Sanitização de HTML/XSS
- **Validator.js** - Validação e sanitização de strings
- **class-validator** - Validação de DTOs
- **class-transformer** - Transformação de objetos
- **Pino Logger** - High-performance JSON logging
- **Jest** - Framework de testes
- **Docker** - Containerização

## ✨ Features Principais

- ✅ **HTTP → RabbitMQ Gateway**: Converte requisições HTTP para mensagens RabbitMQ
- ✅ **Autenticação JWT**: Valida tokens em todos os endpoints protegidos
- ✅ **Sanitização de Inputs**: DOMPurify + Validator.js (previne XSS/injection)
- ✅ **Validação de DTOs**: class-validator com decorators
- ✅ **Logs Estruturados**: Pino logger com request IDs
- ✅ **Error Handling**: Tratamento unificado de erros
- ✅ **CORS**: Configurado para desenvolvimento

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
PORT=3000
APP_NAME=api-gateway

# RabbitMQ
RABBITMQ_URL=amqp://guest:guest@localhost:5672

# JWT Authentication
JWT_SECRET=your-secret-key-change-in-production-use-openssl
JWT_EXPIRES_IN=7d

# Pino Logger
LOG_LEVEL=debug  # production: info
LOG_PRETTY=true  # production: false

# CORS
CORS_ORIGIN=http://localhost:4200  # Frontend URL
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

# 2. Iniciar RabbitMQ
docker-compose up rabbitmq -d

# 3. Iniciar microserviços dependentes
nx serve users-service &
nx serve transactions-service &

# 4. Executar API Gateway em modo desenvolvimento
nx serve api-gateway

# O gateway estará disponível em http://localhost:3000
```

### Com Docker Compose (Recomendado)

```bash
# Build e start de todos os serviços
docker-compose up --build

# Em background
docker-compose up -d

# Ver logs em tempo real
docker-compose logs -f api-gateway
```

### Verificar Health

```bash
# Health check
curl http://localhost:3000/api/health

# Deve retornar:
# {"status":"ok","timestamp":"2025-01-17T...",..."service":"api-gateway"}
```

## 🧪 Testes

```bash
# Testes unitários
nx test api-gateway

# Testes com coverage
nx test api-gateway --coverage

# Watch mode (desenvolvimento)
nx test api-gateway --watch

# Testes E2E (testa todo o fluxo HTTP → RabbitMQ → Microserviços)
nx e2e api-gateway-e2e

# Lint
nx lint api-gateway
```

## 📡 Endpoints

### 🔓 Públicos (sem autenticação)

#### Health Check
```http
GET /api/health
```
Verifica saúde do gateway.

---

#### Registro de Usuário
```http
POST /api/users/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "StrongP@ssw0rd",
  "name": "João Silva",
  "cpf": "123.456.789-00"
}
```

**Validações**:
- Email válido e único
- Senha forte (min 8 chars, maiúscula, minúscula, número, especial)
- CPF válido
- Nome sanitizado (previne XSS)

**Resposta**:
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "João Silva"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

#### Login
```http
POST /api/users/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "StrongP@ssw0rd"
}
```

**Resposta**:
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "João Silva"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### 🔒 Protegidos (requerem JWT)

> **Autenticação**: Adicione o header `Authorization: Bearer <token>` em todas as requisições protegidas.

#### Buscar Usuário Atual
```http
GET /api/users/me
Authorization: Bearer <token>
```

**Resposta**:
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "João Silva",
  "cpf": "123.456.789-00",
  "balance": 1000.00,
  "createdAt": "2025-01-15T10:00:00Z"
}
```

---

#### Consultar Saldo
```http
GET /api/users/balance
Authorization: Bearer <token>
```

**Resposta**:
```json
{
  "balance": 1000.00,
  "userId": "uuid"
}
```

---

#### Atualizar Perfil
```http
PATCH /api/users/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "João Pedro Silva",
  "email": "newmail@example.com"
}
```

**Validações**:
- Ownership: Usuário só pode atualizar seu próprio perfil
- Email único (se alterado)
- Dados sanitizados

---

#### Criar Transação
```http
POST /api/transactions
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "PIX",
  "amount": 100.00,
  "receiverId": "receiver-uuid",
  "idempotencyKey": "uuid-v4-unique"
}
```

**Validações**:
- Saldo suficiente (amount + fee)
- Valores positivos
- receiverId existe
- idempotencyKey único (previne duplicatas)

**Cálculo de Taxas**:
- **PIX**: 0% (gratuito)
- **TED/DOC**: 2% sobre o valor

**Resposta**:
```json
{
  "id": "transaction-uuid",
  "type": "PIX",
  "amount": 100.00,
  "fee": 0.00,
  "totalAmount": 100.00,
  "senderId": "sender-uuid",
  "receiverId": "receiver-uuid",
  "status": "COMPLETED",
  "createdAt": "2025-01-17T14:30:00Z"
}
```

---

#### Listar Transações
```http
GET /api/transactions?page=1&limit=10
Authorization: Bearer <token>
```

**Query Params**:
- `page` (default: 1)
- `limit` (default: 10, max: 100)
- `type` (PIX | TED | DOC)
- `status` (PENDING | COMPLETED | FAILED)

**Resposta**:
```json
{
  "transactions": [...],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 10,
    "hasNext": true
  }
}
```

---

#### Buscar Transação por ID
```http
GET /api/transactions/:id
Authorization: Bearer <token>
```

**Validação**: Usuário deve ser sender ou receiver da transação.

---

#### Upload de Arquivo
```http
POST /api/users/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

file=@profile.jpg
```

**Validações**:
- Tipos permitidos: image/jpeg, image/png, image/jpg
- Tamanho máximo: 5MB
- Sanitização de filename

**Resposta**:
```json
{
  "url": "https://s3.amazonaws.com/bucket/uuid-profile.jpg",
  "key": "uuid-profile.jpg"
}
```

## 🔒 Segurança

### 1. **Autenticação JWT**
- Token obrigatório em todos os endpoints protegidos
- Validação via `JwtAuthGuard`
- Extração de `userId` do token

### 2. **Sanitização de Inputs**
Todos os inputs passam por:

```typescript
// DOMPurify: Remove tags HTML/scripts
const clean = DOMPurify.sanitize(dirtyInput);

// Validator.js: Escapa caracteres especiais
const escaped = validator.escape(userInput);
```

**Previne**:
- XSS (Cross-Site Scripting)
- HTML Injection
- SQL Injection (via ORM)

### 3. **Validação de DTOs**
```typescript
class CreateTransactionDto {
  @IsEnum(['PIX', 'TED', 'DOC'])
  type: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsUUID()
  receiverId: string;

  @IsUUID()
  idempotencyKey: string;
}
```

### 4. **Ownership Validation**
- Usuário só pode:
  - Ver/editar seu próprio perfil
  - Criar transações como sender
  - Ver transações onde é sender ou receiver

### 5. **Error Handling**
- Erros sanitizados (não expõe stack traces em produção)
- HTTP status codes apropriados
- Mensagens genéricas para falhas de autenticação

## 🔧 Dependências & Serviços Externos

### Serviços Obrigatórios

| Serviço | Porta | Função |
|---------|-------|--------|
| **RabbitMQ** | 5672 | Message broker (Request/Response) |
| **Users Service** | 3001 | Autenticação, usuários, saldo |
| **Transactions Service** | 3002 | Transações financeiras |

O `docker-compose.yml` já configura todos os serviços automaticamente.

### Integração com Microserviços

```
HTTP Client ──────> API Gateway (3000)
                         │
                         ├─> Sanitiza inputs (DOMPurify + Validator)
                         ├─> Valida DTOs (class-validator)
                         ├─> Valida JWT (se protegido)
                         │
                         ▼ (RabbitMQ Request/Response)
                    ┌────────────────────┐
                    │     RabbitMQ       │
                    └────────┬───────────┘
                             │
                ┌────────────┴────────────┐
                ▼                         ▼
         Users Service              Transactions Service
            (3001)                       (3002)
```

## 📊 Estrutura Interna

```
api-gateway/
├── src/
│   ├── main.ts                         # Bootstrap (Pino, CORS, Validation Pipe)
│   └── app/
│       ├── app.module.ts               # Módulo principal
│       ├── auth/                       # JWT authentication
│       │   ├── auth.module.ts
│       │   ├── guards/
│       │   │   └── jwt-auth.guard.ts   # Guard para rotas protegidas
│       │   └── strategies/
│       │       └── jwt.strategy.ts     # Validação JWT
│       ├── users/                      # Módulo de usuários
│       │   ├── users.module.ts
│       │   ├── users.controller.ts     # HTTP → RabbitMQ
│       │   ├── dto/                    # DTOs com validações
│       │   └── tests/
│       ├── transactions/               # Módulo de transações
│       │   ├── transactions.module.ts
│       │   ├── transactions.controller.ts
│       │   ├── dto/
│       │   └── tests/
│       └── common/                     # Shared utilities
│           ├── filters/                # Exception filters
│           ├── interceptors/           # Logging interceptors
│           ├── pipes/                  # Validation pipes
│           └── sanitizers/             # DOMPurify + Validator
├── Dockerfile
└── docs/
    ├── USERS_ENDPOINTS.md              # Documentação detalhada
    └── VALIDATION.md                   # Estratégias de validação
```

## 📝 Logs Estruturados

```bash
# Ver logs em tempo real
docker-compose logs -f api-gateway

# Exemplo de log de request
{
  "level": 30,
  "time": 1705484400000,
  "pid": 1,
  "hostname": "api-gateway",
  "msg": "Incoming request",
  "method": "POST",
  "url": "/api/transactions",
  "userId": "uuid",
  "requestId": "req-uuid"
}

# Exemplo de log de resposta
{
  "level": 30,
  "time": 1705484401000,
  "msg": "Request completed",
  "method": "POST",
  "url": "/api/transactions",
  "statusCode": 201,
  "duration": 1234  // ms
}
```

## 🚀 Performance

- **Pino Logger**: 5-10x mais rápido que Winston
- **RabbitMQ**: Request/Response pattern com timeout de 5s
- **Connection Pooling**: RabbitMQ (reutilização de conexões)
- **Caching**: JWT validado via strategy (cache interno do Passport)

## 🐳 Docker

### Build da imagem

```bash
docker build -f apps/api-gateway/Dockerfile -t micro-bank/api-gateway .
```

### Executar container

```bash
docker run -p 3000:3000 \
  -e RABBITMQ_URL=amqp://rabbitmq:5672 \
  -e JWT_SECRET=your-secret \
  micro-bank/api-gateway
```

## 📚 Documentação Adicional

- **Endpoints de Usuários**: `src/docs/USERS_ENDPOINTS.md`
- **Validação**: `src/docs/VALIDATION.md`
- **Arquitetura**: `../../docs/ARCHITECTURE.md`
- **Sanitização**: `../../docs/SANITIZATION_STRATEGY.md`
- **Implementação**: `../../docs/IMPLEMENTATION_SUMMARY.md`

## 🤝 Contribuindo

1. Crie uma branch feature: `git checkout -b feature/nome-da-feature`
2. Implemente mudanças + testes
3. Rode os testes: `nx test api-gateway`
4. Rode os testes E2E: `nx e2e api-gateway-e2e`
5. Rode o lint: `nx lint api-gateway`
6. Commit: `git commit -m "feat: descrição"`
7. Push: `git push origin feature/nome-da-feature`
8. Abra um Pull Request

---

**Versão**: 1.0.0  
**Última atualização**: Janeiro 2025
