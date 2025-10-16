# Users Service

Microsserviço responsável pelo gerenciamento de usuários e autenticação do Micro Bank.

## 🚀 Tecnologias

- **NestJS** - Framework Node.js
- **PostgreSQL** - Banco de dados relacional
- **Redis** - Cache e sessões
- **RabbitMQ** - Message broker
- **JWT** - Autenticação e autorização
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
NODE_ENV=development
PORT=3002
APP_NAME=users-service
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=users_db
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d
RABBITMQ_URL=amqp://localhost:5672
REDIS_HOST=localhost
```

## 🏃 Como Executar

### Desenvolvimento Local (sem Docker)

```bash
# Instalar dependências
yarn install

# Executar em modo desenvolvimento
nx serve users-service

# O serviço estará disponível em http://localhost:3002
```

### Com Docker Compose

```bash
# Build e start de todos os serviços
docker-compose up --build

# Apenas o users-service
docker-compose up users-service

# Em background
docker-compose up -d
```

## 🧪 Testes

```bash
# Testes unitários
nx test users-service

# Testes com coverage
nx test users-service --coverage

# Testes E2E
nx e2e users-service-e2e

# Lint
nx lint users-service
```

## 📡 Endpoints

### Health Check
```
GET /api/health
```

**Resposta:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-16T10:30:45.123Z",
  "uptime": 123.456,
  "environment": "development",
  "version": "1.0.0",
  "service": "users-service"
}
```

### API Base
```
GET /api
```

**Resposta:**
```json
{
  "message": "Hello API"
}
```

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

## 🔧 Dependências

### Serviços Externos

- **PostgreSQL** (porta 5432) - Banco de dados principal
- **Redis** (porta 6379) - Cache e sessões
- **RabbitMQ** (porta 5672) - Message queue

O `docker-compose.yml` já configura todos esses serviços automaticamente.

## 📊 Arquitetura

```
┌─────────────────────────────────────┐
│         API Gateway (3000)          │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│      Users Service (3002)           │
├─────────────────────────────────────┤
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
