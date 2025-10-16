# Transactions Service

Microsserviço responsável pelo gerenciamento de transações do Micro Bank.

## 🚀 Tecnologias

- **NestJS** - Framework Node.js
- **PostgreSQL** - Banco de dados relacional
- **Redis** - Cache
- **RabbitMQ** - Message broker
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
PORT=3001
APP_NAME=transactions-service
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=transactions_db
RABBITMQ_URL=amqp://localhost:5672
REDIS_HOST=localhost
```

## 🏃 Como Executar

### Desenvolvimento Local (sem Docker)

```bash
# Instalar dependências
yarn install

# Executar em modo desenvolvimento
nx serve transactions-service

# O serviço estará disponível em http://localhost:3001
```

### Com Docker Compose

```bash
# Build e start de todos os serviços
docker-compose up --build

# Apenas o transactions-service
docker-compose up transactions-service

# Em background
docker-compose up -d
```

## 🧪 Testes

```bash
# Testes unitários
nx test transactions-service

# Testes com coverage
nx test transactions-service --coverage

# Testes E2E
nx e2e transactions-service-e2e

# Lint
nx lint transactions-service
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
  "timestamp": "2025-10-15T10:30:45.123Z",
  "uptime": 123.456,
  "environment": "development",
  "version": "1.0.0",
  "service": "transactions-service"
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
docker build -f apps/transactions-service/Dockerfile -t micro-bank/transactions-service .
```

### Executar container

```bash
docker run -p 3001:3001 \
  -e DATABASE_HOST=postgres \
  -e REDIS_HOST=redis \
  -e RABBITMQ_URL=amqp://rabbitmq:5672 \
  micro-bank/transactions-service
```

## 🔧 Dependências

### Serviços Externos

- **PostgreSQL** (porta 5432)
- **Redis** (porta 6379)
- **RabbitMQ** (porta 5672)

O `docker-compose.yml` já configura todos esses serviços automaticamente.

## 📊 Arquitetura

```
┌─────────────────────────────────────┐
│         API Gateway (3000)          │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│    Transactions Service (3001)      │
├─────────────────────────────────────┤
│  ┌──────────────────────────────┐   │
│  │     Controllers              │   │
│  └──────────┬───────────────────┘   │
│             ▼                        │
│  ┌──────────────────────────────┐   │
│  │     Services                 │   │
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
- Usa `dumb-init` para gerenciamento de sinais
- Health checks configurados
- Variáveis sensíveis via environment

## 📝 Scripts Úteis

```bash
# Build para produção
nx build transactions-service --prod

# Verificar erros
nx lint transactions-service

# Gerar relatório de coverage
nx test transactions-service --coverage --coverageReporters=html

# Watch mode (desenvolvimento)
nx serve transactions-service --watch
```

## 🐛 Troubleshooting

### Porta 3001 já está em uso
```bash
# Encontrar o processo
lsof -i :3001

# Mudar a porta no .env
PORT=3002
```

### Erro de conexão com PostgreSQL
```bash
# Verificar se o PostgreSQL está rodando
docker-compose ps postgres

# Verificar logs
docker-compose logs postgres
```

### Erro de conexão com Redis
```bash
# Testar conexão
docker-compose exec redis redis-cli ping
# Deve retornar: PONG
```

## 📚 Referências

- [NestJS Documentation](https://docs.nestjs.com/)
- [Nx Documentation](https://nx.dev/)
- [Docker Documentation](https://docs.docker.com/)
