# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./
COPY nx.json tsconfig.base.json jest.config.ts jest.preset.js ./

# Copy workspace files
COPY apps/api-gateway ./apps/api-gateway

# Install dependencies
RUN yarn install --frozen-lockfile

# Build the application
RUN yarn nx build api-gateway --prod

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copy built application
COPY --from=builder --chown=nestjs:nodejs /app/dist/apps/api-gateway ./

# Install production dependencies only
RUN yarn install --production --frozen-lockfile && \
    yarn cache clean

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "main.js"]
