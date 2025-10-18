# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar arquivos de dependências
COPY package.json yarn.lock ./
COPY nx.json tsconfig.base.json ./

# Instalar dependências
RUN yarn install --frozen-lockfile

# Copiar código fonte
COPY . .

# Build do notifications-service
RUN yarn nx build notifications-service --prod

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copiar dependências de produção
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Copiar build do notifications-service
COPY --from=builder /app/dist/apps/notifications-service ./dist/apps/notifications-service

# Copiar .env (opcional, melhor usar variáveis de ambiente do Docker)
COPY --from=builder /app/apps/notifications-service/.env ./apps/notifications-service/.env

# Definir usuário
USER nestjs

# Expor porta (não necessário para microservice puro, mas útil para debug)
EXPOSE 3003

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "console.log('Health check')" || exit 1

# Comando de inicialização
CMD ["node", "dist/apps/notifications-service/main.js"]
