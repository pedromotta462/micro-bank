# API Gateway - Users Endpoints

Este documento descreve os endpoints disponíveis no API Gateway para gerenciamento de usuários.

## Comunicação via RabbitMQ

O API Gateway se comunica com o `users-service` através do RabbitMQ utilizando o padrão de mensageria:
- **Queue**: `users_queue`
- **Transport**: RabbitMQ (AMQP)
- **URL**: `amqp://guest:guest@localhost:5672` (desenvolvimento)

## Endpoints Disponíveis

### 1. Obter Detalhes do Usuário

**GET** `/api/users/:userId`

Retorna informações completas do cliente, incluindo dados bancários.

**Parâmetros de URL:**
- `userId` (string, UUID): ID do usuário

**Resposta de Sucesso (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "João Silva",
  "email": "joao@microbank.com",
  "address": "Rua Exemplo, 123 - Boa Viagem, Recife - PE",
  "profilePicture": "https://i.pravatar.cc/150?img=1",
  "bankingDetails": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "agency": "0001",
    "accountNumber": "12345-6"
  },
  "createdAt": "2025-01-15T10:30:00.000Z",
  "updatedAt": "2025-01-15T10:30:00.000Z"
}
```

**Erro (404):**
```json
{
  "statusCode": 404,
  "message": "User with ID {userId} not found"
}
```

---

### 2. Atualizar Dados do Usuário

**PATCH** `/api/users/:userId`

Atualização parcial dos dados do cliente. Todos os campos são opcionais.

**Parâmetros de URL:**
- `userId` (string, UUID): ID do usuário

**Corpo da Requisição:**
```json
{
  "name": "João Silva Atualizado",
  "email": "joao.novo@microbank.com",
  "address": "Nova Rua, 456 - Recife - PE",
  "bankingDetails": {
    "agency": "0002",
    "accountNumber": "98765-4"
  }
}
```

**Resposta de Sucesso (200):**
```json
{
  "message": "User updated successfully",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "João Silva Atualizado",
    "email": "joao.novo@microbank.com",
    "address": "Nova Rua, 456 - Recife - PE",
    "profilePicture": "https://i.pravatar.cc/150?img=1",
    "bankingDetails": {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "agency": "0002",
      "accountNumber": "98765-4"
    },
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T15:45:00.000Z"
  }
}
```

**Erro (404):**
```json
{
  "statusCode": 404,
  "message": "User with ID {userId} not found"
}
```

---

### 3. Atualizar Foto de Perfil

**PATCH** `/api/users/:userId/profile-picture`

Atualiza apenas a foto de perfil do usuário.

**Parâmetros de URL:**
- `userId` (string, UUID): ID do usuário

**Corpo da Requisição:**
```json
{
  "profilePicture": "https://i.pravatar.cc/150?img=10"
}
```

**Resposta de Sucesso (200):**
```json
{
  "message": "Profile picture updated successfully",
  "profilePicture": "https://i.pravatar.cc/150?img=10"
}
```

**Erro (404):**
```json
{
  "statusCode": 404,
  "message": "User with ID {userId} not found"
}
```

---

## Módulo de Autenticação (A ser implementado)

### POST `/api/auth/login`
Endpoint de login (estrutura preparada para implementação futura)

### POST `/api/auth/register`
Endpoint de registro (estrutura preparada para implementação futura)

---

## Arquitetura

### API Gateway (`apps/api-gateway`)
- **Responsabilidade**: Roteamento de requisições HTTP
- **Porta**: 3000
- **Comunicação**: Envia mensagens para microservices via RabbitMQ

**Estrutura:**
```
src/app/
├── users/
│   ├── dto/
│   │   ├── update-user.dto.ts
│   │   ├── update-profile-picture.dto.ts
│   │   └── user-response.dto.ts
│   ├── users.controller.ts
│   ├── users.service.ts
│   └── users.module.ts
└── auth/
    ├── dto/
    │   ├── login.dto.ts
    │   └── register.dto.ts
    ├── auth.controller.ts
    ├── auth.service.ts
    └── auth.module.ts
```

### Users Service (`apps/users-service`)
- **Responsabilidade**: Gerenciamento de usuários e dados bancários
- **Porta**: 3002
- **Banco de Dados**: PostgreSQL (porta 5433)
- **Comunicação**: Recebe e processa mensagens do RabbitMQ

**Estrutura:**
```
src/app/
├── users/
│   ├── dto/
│   │   ├── get-user-by-id.dto.ts
│   │   ├── update-user.dto.ts
│   │   └── update-profile-picture.dto.ts
│   ├── users.controller.ts  (Message Patterns)
│   ├── users.service.ts
│   └── users.module.ts
└── prisma.service.ts
```

**Message Patterns:**
- `{ cmd: 'get_user_by_id' }` - Buscar usuário por ID
- `{ cmd: 'update_user' }` - Atualizar dados do usuário
- `{ cmd: 'update_profile_picture' }` - Atualizar foto de perfil

---

## Como Testar

### 1. Iniciar os serviços

```bash
# Iniciar infraestrutura (PostgreSQL, RabbitMQ, Redis)
yarn docker:up

# Em terminais separados:
yarn start              # API Gateway (porta 3000)
yarn start:users        # Users Service (porta 3002)
```

### 2. Criar dados de teste (seed)

```bash
# No users-service
nx prisma:seed users-service
```

### 3. Testar endpoints

```bash
# Obter usuário
curl http://localhost:3000/api/users/{userId}

# Atualizar usuário
curl -X PATCH http://localhost:3000/api/users/{userId} \
  -H "Content-Type: application/json" \
  -d '{"name": "Novo Nome"}'

# Atualizar foto de perfil
curl -X PATCH http://localhost:3000/api/users/{userId}/profile-picture \
  -H "Content-Type: application/json" \
  -d '{"profilePicture": "https://example.com/photo.jpg"}'
```

---

## Próximos Passos

- [ ] Implementar autenticação JWT
- [ ] Adicionar guards de autorização
- [ ] Implementar validação de DTOs (class-validator)
- [ ] Adicionar tratamento de erros global
- [ ] Implementar rate limiting
- [ ] Adicionar logging estruturado
- [ ] Criar testes E2E para os endpoints
- [ ] Adicionar documentação Swagger/OpenAPI
