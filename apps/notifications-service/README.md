# 📨 Notifications Service

## 📋 Visão Geral

Microserviço responsável por processar e enviar notificações para usuários do Micro Bank. Atua como consumidor de eventos do RabbitMQ, recebendo notificações de outros microserviços e preparando-as para envio através de diferentes canais (email, SMS, push notifications, etc).

## 🏗️ Arquitetura

### Comunicação
- **Tipo:** Microservice (RabbitMQ Consumer)
- **Porta:** 3003 (configurável via ENV)
- **Queue:** `notifications_queue`
- **Transport:** RabbitMQ (AMQP)

### Padrão de Comunicação
```
Outros Services
  ├── users-service (emit)
  ├── transactions-service (emit)
  └── api-gateway (futuro)
        ↓
    RabbitMQ
        ↓
  notifications_queue
        ↓
notifications-service
  ├── Processa eventos
  ├── Formata mensagens
  ├── Registra logs
  └── Envia notificações
        ↓
    Provedores
  ├── Email (SendGrid/AWS SES) - TODO
  ├── SMS (Twilio) - TODO
  ├── Push (FCM) - TODO
  └── Webhooks (Slack/Discord) - TODO
```

## 📡 Eventos Recebidos

### 1. `transaction_notification`
Notificações relacionadas a transações.

**Payload:**
```typescript
{
  eventType: string;           // 'CREATED', 'COMPLETED', 'FAILED', etc
  transactionId: string;        // UUID da transação
  senderUserId: string;         // UUID do remetente
  receiverUserId: string;       // UUID do destinatário
  amount: number;               // Valor da transação
  status: string;               // Status atual
  timestamp: Date;              // Data/hora do evento
}
```

**Origem:** `transactions-service`

**Casos de Uso:**
- Transação criada (pendente)
- Transação processando
- Transação completada com sucesso
- Transação falhou
- Transação cancelada

### 2. `notifications.balance.updated`
Notificações de atualização de saldo.

**Payload:**
```typescript
{
  userId: string;               // UUID do usuário
  type: 'DEBIT' | 'CREDIT';     // Tipo de operação
  amount: number;               // Valor da operação
  newBalance: number;           // Novo saldo
  transactionId?: string;       // UUID da transação (opcional)
  timestamp: string;            // Data/hora ISO
}
```

**Origem:** `users-service`

**Casos de Uso:**
- Débito de saldo (envio de transação)
- Crédito de saldo (recebimento de transação)

### 3. `notifications.user.updated`
Notificações de atualização de dados de usuário.

**Payload:**
```typescript
{
  userId: string;               // UUID do usuário
  timestamp: string;            // Data/hora ISO
}
```

**Origem:** `users-service`

**Casos de Uso:**
- Dados do usuário atualizados
- Perfil modificado
- Dados bancários alterados

## 🔧 Funcionalidades Implementadas

### ✅ Core
- [x] Consumidor de eventos RabbitMQ
- [x] Processamento de notificações de transações
- [x] Processamento de notificações de saldo
- [x] Processamento de notificações de usuário
- [x] Logs estruturados com emojis
- [x] Tratamento de erros (não propaga para RabbitMQ)

### 🚧 TODO - Integrações
- [ ] Email via SendGrid/AWS SES
- [ ] SMS via Twilio
- [ ] Push Notifications via Firebase Cloud Messaging
- [ ] Webhooks para Slack/Discord
- [ ] Templates de mensagens
- [ ] Internacionalização (i18n)
- [ ] Retry automático em caso de falha
- [ ] Dead Letter Queue (DLQ)
- [ ] Histórico de notificações em banco de dados
- [ ] Dashboard de monitoramento

## 🚀 Como Executar

### Desenvolvimento

```bash
# Subir dependências (RabbitMQ)
docker-compose up -d rabbitmq

# Iniciar o serviço
yarn start:notifications

# Ou com Nx
nx serve notifications-service
```

### Build

```bash
# Build
yarn build:notifications

# Ou com Nx
nx build notifications-service
```

### Docker

```bash
# Build da imagem
docker build -f apps/notifications-service/Dockerfile -t micro-bank-notifications-service .

# Executar container
docker run -d \
  --name notifications-service \
  -p 3003:3003 \
  -e RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672 \
  -e RABBITMQ_QUEUE=notifications_queue \
  --network micro-bank-network \
  micro-bank-notifications-service

# Com Docker Compose (recomendado)
docker-compose up -d notifications-service

# Ver logs
docker-compose logs -f notifications-service
```

### Testes

```bash
# Testes unitários
nx test notifications-service

# Testes e2e
nx e2e notifications-service-e2e

# Lint
yarn lint:notifications
```

## 📁 Estrutura de Pastas

```
notifications-service/
├── src/
│   ├── app/
│   │   ├── notifications/
│   │   │   ├── controllers/
│   │   │   │   └── notifications.controller.ts   # Event Patterns
│   │   │   ├── services/
│   │   │   │   └── notifications.service.ts       # Lógica de negócio
│   │   │   ├── dto/
│   │   │   │   ├── transaction-notification.dto.ts
│   │   │   │   ├── balance-updated-notification.dto.ts
│   │   │   │   └── user-updated-notification.dto.ts
│   │   │   └── modules/
│   │   │       └── notifications.module.ts
│   │   ├── app.module.ts
│   │   ├── app.controller.ts
│   │   └── app.service.ts
│   ├── main.ts                                     # Bootstrap do microservice
│   └── assets/
├── .env
├── .env.example
├── project.json
├── tsconfig.json
└── README.md
```

## 🔐 Variáveis de Ambiente

```bash
# Application
NODE_ENV=development
PORT=3003
APP_NAME=notifications-service
APP_VERSION=1.0.0

# RabbitMQ
RABBITMQ_URL=amqp://admin:admin@localhost:5672
RABBITMQ_QUEUE=notifications_queue

# Email (TODO)
# SENDGRID_API_KEY=
# AWS_SES_REGION=
# AWS_SES_ACCESS_KEY=
# AWS_SES_SECRET_KEY=

# SMS (TODO)
# TWILIO_ACCOUNT_SID=
# TWILIO_AUTH_TOKEN=
# TWILIO_PHONE_NUMBER=

# Push Notifications (TODO)
# FCM_SERVER_KEY=
# FCM_PROJECT_ID=

# Webhooks (TODO)
# SLACK_WEBHOOK_URL=
# DISCORD_WEBHOOK_URL=
```

## 📊 Monitoramento

### Logs
```bash
# Ver logs do serviço
tail -f logs/notifications-service.log

# Via Docker Compose (se configurado)
docker-compose logs -f notifications-service
```

### Health Check
```bash
# Verificar status do serviço
curl http://localhost:3003/api/health
```

## 🧪 Testes Manuais

### Enviar Notificação de Transação
```bash
# Via RabbitMQ Management UI
# 1. Acesse http://localhost:15672
# 2. Vá em Queues -> notifications_queue
# 3. Publish message:
{
  "pattern": "transaction_notification",
  "data": {
    "eventType": "COMPLETED",
    "transactionId": "123e4567-e89b-12d3-a456-426614174000",
    "senderUserId": "123e4567-e89b-12d3-a456-426614174000",
    "receiverUserId": "223e4567-e89b-12d3-a456-426614174001",
    "amount": 100.50,
    "status": "COMPLETED",
    "timestamp": "2025-10-18T12:00:00Z"
  }
}
```

## 🎯 Próximos Passos

1. **Implementar SendGrid/AWS SES**
   - Configurar credenciais
   - Criar templates de email
   - Implementar envio assíncrono

2. **Implementar Twilio SMS**
   - Configurar conta Twilio
   - Criar templates de SMS
   - Validar números de telefone

3. **Implementar FCM Push**
   - Configurar Firebase
   - Gerenciar device tokens
   - Enviar notificações push

4. **Banco de Dados**
   - Criar schema Prisma para histórico
   - Armazenar notificações enviadas
   - Dashboard de consulta

5. **Retry e DLQ**
   - Implementar retry exponencial
   - Configurar Dead Letter Queue
   - Alertas de falhas críticas

## 📝 Notas Importantes

- ⚠️ O serviço atualmente apenas **loga** as notificações (fase de desenvolvimento)
- ⚠️ Não propaga erros para RabbitMQ para evitar reenvio infinito
- ⚠️ Integrações com provedores externos estão marcadas como TODO
- ✅ Pronto para integração assim que as credenciais forem configuradas

## 🤝 Integração com Outros Serviços

### Users Service
Emite eventos:
- `notifications.user.updated`
- `notifications.balance.updated`

### Transactions Service
Emite eventos:
- `transaction_notification`

**Status:** ✅ Em Desenvolvimento
**Versão:** 1.0.0
**Última Atualização:** 18/10/2025
