# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./ 
COPY nx.json tsconfig.base.json jest.config.ts jest.preset.js ./ 

# Copy ESLint config (que estava faltando)
COPY eslint.config.mjs ./ 

# Copy workspace files
COPY apps/users-service ./apps/users-service

# Install dependencies
RUN yarn install --frozen-lockfile

# Generate Prisma Client
RUN cd apps/users-service && npx prisma generate

# Build the application
RUN yarn nx build users-service --prod

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init openssl

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copy node_modules (inclui Prisma Client gerado)
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules

# Copy built application
COPY --from=builder --chown=nestjs:nodejs /app/dist/apps/users-service ./dist

# Copy Prisma files (para migrations em runtime se necessário)
COPY --from=builder --chown=nestjs:nodejs /app/apps/users-service/prisma ./prisma

# Copiar o Prisma Client gerado para o container de produção
COPY --from=builder --chown=nestjs:nodejs /app/apps/users-service/generated/prisma ./generated/prisma

# Copy package.json
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3002/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/main.js"]
