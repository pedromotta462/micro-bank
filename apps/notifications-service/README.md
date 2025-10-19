# Notifications Service 🔔

Microsserviço responsável por consumir eventos de transações e saldos, preparando notificações para usuários.

## 🚀 Tecnologias

- **NestJS 11.x** - Framework Node.js modular e escalável
- **RabbitMQ** - Message broker (Event Consumer Pub/Sub)
- **Pino Logger** - High-performance JSON logging
- **Jest** - Framework de testes
- **Docker** - Containerização

## ✨ Features Principais

- ✅ **Event-Driven Architecture**: Consome eventos do RabbitMQ (Pub/Sub)
- ✅ **Notificações de Transações**: `transaction.completed`, `transaction.failed`
- ✅ **Notificações de Saldo**: `balance.updated`
- ✅ **Logs Estruturados**: Pino logger para auditoria
- ✅ **Preparado para Expansão**: Email, SMS, Push Notifications

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
PORT=3003
APP_NAME=notifications-service

# RabbitMQ
RABBITMQ_URL=amqp://guest:guest@localhost:5672

# Pino Logger
LOG_LEVEL=debug  # production: info
LOG_PRETTY=true  # production: false

# (Futuro) Provedores de Email
# SENDGRID_API_KEY=your-api-key
# AWS_SES_REGION=us-east-1

# (Futuro) Provedores de SMS
# TWILIO_ACCOUNT_SID=your-sid
# TWILIO_AUTH_TOKEN=your-token

# (Futuro) Push Notifications
# FCM_SERVER_KEY=your-fcm-key
```

## 🏃 Como Executar

### Desenvolvimento Local (sem Docker)

```bash
# 1. Instalar dependências (na raiz do monorepo)
yarn install

# 2. Iniciar RabbitMQ
docker-compose up rabbitmq -d

# 3. Executar em modo desenvolvimento
nx serve notifications-service

# O serviço estará disponível em http://localhost:3003
```

### Com Docker Compose (Recomendado)

```bash
# Build e start de todos os serviços
docker-compose up --build

# Apenas o notifications-service + RabbitMQ
docker-compose up notifications-service rabbitmq

# Em background
docker-compose up -d

# Ver logs em tempo real
docker-compose logs -f notifications-service
```

### Verificar Health

```bash
# Health check
curl http://localhost:3003/api/health

# Deve retornar:
# {"status":"ok","timestamp":"2025-01-17T...",..."service":"notifications-service"}
```

## 🧪 Testes

```bash
# Testes unitários
nx test notifications-service

# Testes com coverage
nx test notifications-service --coverage

# Watch mode (desenvolvimento)
nx test notifications-service --watch

# Testes E2E
nx e2e notifications-service-e2e

# Lint
nx lint notifications-service
```

## 📡 Eventos Consumidos

O Notifications Service escuta eventos do RabbitMQ publicados por outros microserviços:

### 1. **Transações Criadas**
**Evento**: `transaction.created`  
**Origem**: Transactions Service

```typescript
{
  transactionId: string;
  type: 'PIX' | 'TED' | 'DOC';
  amount: number;
  fee: number;
  senderId: string;
  receiverId: string;
  status: 'PENDING';
  createdAt: Date;
}
```

**Ação**: Log da transação iniciada

---

### 2. **Transações Concluídas**
**Evento**: `transaction.completed`  
**Origem**: Transactions Service

```typescript
{
  transactionId: string;
  type: 'PIX' | 'TED' | 'DOC';
  amount: number;
  fee: number;
  senderId: string;
  receiverId: string;
  status: 'COMPLETED';
  createdAt: Date;
}
```

**Ação**: 
- Log da transação concluída
- (Futuro) Enviar email/SMS para sender e receiver

---

### 3. **Transações Falhadas**
**Evento**: `transaction.failed`  
**Origem**: Transactions Service

```typescript
{
  transactionId: string;
  senderId: string;
  receiverId: string;
  amount: number;
  reason: string;  // Motivo da falha
  createdAt: Date;
}
```

**Ação**: 
- Log do erro
- (Futuro) Notificar usuário sobre falha

---

### 4. **Saldo Atualizado**
**Evento**: `balance.updated`  
**Origem**: Users Service

```typescript
{
  userId: string;
  type: 'DEBIT' | 'CREDIT';
  amount: number;
  newBalance: number;
  transactionId?: string;
  timestamp: string;
}
```

**Ação**: 
- Log da alteração de saldo
- (Futuro) Notificar sobre crédito/débito

---

### 5. **Usuário Criado**
**Evento**: `user.created`  
**Origem**: Users Service

```typescript
{
  userId: string;
  email: string;
  name: string;
  createdAt: Date;
}
```

**Ação**: 
- Log do novo usuário
- (Futuro) Email de boas-vindas

---

### 6. **Usuário Atualizado**
**Evento**: `user.updated`  
**Origem**: Users Service

```typescript
{
  userId: string;
  timestamp: string;
}
```

**Ação**: 
- Log da atualização
- (Futuro) Confirmar mudanças por email

## 📊 Arquitetura de Consumo de Eventos

```
┌─────────────────────────────────────────────┐
│         Transactions Service (3002)         │
│              Users Service (3001)           │
└──────────────────┬──────────────────────────┘
                   │
                   ▼ (Pub/Sub)
┌─────────────────────────────────────────────┐
│              RabbitMQ Broker                │
│                                             │
│  Exchanges:                                 │
│  ├─ transactions.events (topic)             │
│  └─ users.events (topic)                    │
│                                             │
│  Queues:                                    │
│  ├─ notifications_queue                     │
│  └─ (auto-bind com routing keys)            │
└──────────────────┬──────────────────────────┘
                   │
                   ▼ (Subscribe)
┌─────────────────────────────────────────────┐
│       Notifications Service (3003)          │
│                                             │
│  Consumers:                                 │
│  ├─ TransactionEventsConsumer               │
│  └─ BalanceEventsConsumer                   │
│                                             │
│  Processamento:                             │
│  ├─ 1. Recebe evento                        │
│  ├─ 2. Valida payload                       │
│  ├─ 3. Formata mensagem                     │
│  ├─ 4. Loga estruturadamente (Pino)         │
│  └─ 5. (Futuro) Envia notificação           │
└─────────────────────────────────────────────┘
                   │
                   ▼ (Futuro)
┌─────────────────────────────────────────────┐
│          Provedores de Notificação          │
│                                             │
│  ├─ Email (SendGrid / AWS SES)              │
│  ├─ SMS (Twilio)                            │
│  ├─ Push (Firebase Cloud Messaging)         │
│  └─ Webhooks (Slack, Discord)               │
└─────────────────────────────────────────────┘
```

## 🔧 Dependências & Serviços Externos

### Serviços Obrigatórios

| Serviço | Porta | Função |
|---------|-------|--------|
| **RabbitMQ** | 5672 | Message broker (Event Consumer) |

### Serviços Opcionais (Futuro)

| Serviço | Função |
|---------|--------|
| **SendGrid / AWS SES** | Envio de emails |
| **Twilio** | Envio de SMS |
| **Firebase (FCM)** | Push notifications |

O `docker-compose.yml` já configura o RabbitMQ automaticamente.

### Integração com Outros Microserviços

```
Transactions Service ──(Pub)──> RabbitMQ ──(Sub)──> Notifications Service
Users Service ──(Pub)──────────> RabbitMQ ──(Sub)──> Notifications Service
```

## 📊 Estrutura Interna

```
notifications-service/
├── src/
│   ├── main.ts                          # Bootstrap (Pino logger, RabbitMQ)
│   └── app/
│       ├── app.module.ts                # Módulo principal
│       ├── notifications/               # Módulo de notificações
│       │   ├── notifications.module.ts
│       │   ├── consumers/               # Event consumers
│       │   │   ├── transaction-events.consumer.ts
│       │   │   └── balance-events.consumer.ts
│       │   └── services/
│       │       └── notifications.service.ts
│       └── common/                      # Shared utilities
└── Dockerfile
```

## 📝 Logs Estruturados

O serviço utiliza **Pino** para logging estruturado (JSON):

```bash
# Ver logs em tempo real
docker-compose logs -f notifications-service

# Exemplo de log
{
  "level": 30,
  "time": 1705484400000,
  "pid": 1,
  "hostname": "notifications-service",
  "msg": "Transaction notification received",
  "event": "transaction.completed",
  "transactionId": "uuid",
  "senderId": "uuid",
  "receiverId": "uuid",
  "amount": 100.00
}
```

## 🔮 Roadmap de Features

### 🚧 Em Desenvolvimento
- [ ] Testes unitários completos
- [ ] Health checks avançados

### 📅 Próximas Features
- [ ] **Email Notifications**
  - [ ] Integração SendGrid ou AWS SES
  - [ ] Templates de email
  - [ ] Email de boas-vindas
  - [ ] Confirmação de transações
  - [ ] Alertas de saldo baixo

- [ ] **SMS Notifications**
  - [ ] Integração Twilio
  - [ ] OTP (One-Time Password)
  - [ ] Alertas de segurança

- [ ] **Push Notifications**
  - [ ] Firebase Cloud Messaging
  - [ ] Notificações em tempo real
  - [ ] Preferências de usuário

- [ ] **Webhooks**
  - [ ] Integração Slack
  - [ ] Integração Discord
  - [ ] Webhooks customizáveis

- [ ] **Gestão de Templates**
  - [ ] Templates dinâmicos
  - [ ] Variáveis de substituição
  - [ ] Suporte multi-idioma

- [ ] **Preferências de Notificação**
  - [ ] Usuário escolhe canais (email, SMS, push)
  - [ ] Horários preferenciais
  - [ ] Desativar notificações específicas

## 🐳 Docker

### Build da imagem

```bash
docker build -f apps/notifications-service/Dockerfile -t micro-bank/notifications-service .
```

### Executar container

```bash
docker run -p 3003:3003 \
  -e RABBITMQ_URL=amqp://rabbitmq:5672 \
  micro-bank/notifications-service
```

## 📚 Documentação Adicional

- **Arquitetura**: `../../docs/ARCHITECTURE.md`
- **RabbitMQ Flow**: `../../docs/RABBITMQ_FLOW_DIAGRAMS.md`
- **RabbitMQ Concepts**: `../../docs/RABBITMQ_CONCEPTS_ANALYSIS.md`
- **Implementação**: `../../docs/IMPLEMENTATION_SUMMARY.md`

## 🤝 Contribuindo

1. Crie uma branch feature: `git checkout -b feature/nome-da-feature`
2. Implemente mudanças + testes
3. Rode os testes: `nx test notifications-service`
4. Rode o lint: `nx lint notifications-service`
5. Commit: `git commit -m "feat: descrição"`
6. Push: `git push origin feature/nome-da-feature`
7. Abra um Pull Request

---

**Versão**: 1.0.0  
**Última atualização**: Janeiro 2025
