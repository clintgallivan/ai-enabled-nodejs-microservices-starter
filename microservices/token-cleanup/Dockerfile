# Multi-stage build for token cleanup service
FROM node:18-alpine AS builder

WORKDIR /app

# Enable corepack and install yarn
RUN corepack enable

# Copy package files
COPY package.json yarn.lock ./
COPY tsconfig.json ./

# Copy Prisma schema
COPY prisma/ ./prisma/

# Copy source code first (needed for prepare script)
COPY src/ ./src/

# Install ALL dependencies (including devDependencies for building)
RUN yarn install --frozen-lockfile

# Generate Prisma client
RUN yarn prisma generate

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Install dumb-init for proper signal handling and enable corepack
RUN apk add --no-cache dumb-init && corepack enable

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S token-cleanup -u 1001 -G nodejs

# Copy package files and Prisma schema
COPY package.json yarn.lock ./
COPY --from=builder /app/prisma ./prisma/

# Install only production dependencies
RUN yarn install --production --frozen-lockfile && yarn cache clean

# Generate Prisma client in production stage
RUN yarn prisma generate

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Change ownership to non-root user
RUN chown -R token-cleanup:nodejs /app
USER token-cleanup

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the service
CMD ["node", "dist/index.js"]