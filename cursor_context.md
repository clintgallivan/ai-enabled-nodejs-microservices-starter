# Node.js Microservices Starter - Cursor Context

## Project Overview

A **microservices architecture** starter template built on Node.js/TypeScript. The system includes a main API with dedicated email and token cleanup microservices for improved scalability and reliability.

## Current Architecture

### Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express  
- **Database**: PostgreSQL (hosted on Railway)
- **ORM**: Prisma
- **Authentication**: JWT with refresh tokens (15m access + 7d refresh)
- **Caching & Queues**: Redis (JWT blacklisting + Bull queues)
- **Email Processing**: Bull queue system with microservice
- **Containerization**: Docker with multi-stage builds
- **Deployment**: Railway with environment-specific deployments
- **Package Manager**: Yarn (always use yarn, never npm)

### Microservices Architecture

```
Main API (src/) ←→ PostgreSQL ←→ Token Cleanup Service
     ↓
Email Service ←→ Redis (Bull Queues)
```

## Project Structure

### Main API (`src/`)
```
src/
├── config/
│   └── index.ts                   # Environment configuration
├── controllers/
│   ├── authController.ts          # Complete auth flows (register, login, refresh, logout, password reset, email verify)
│   ├── exampleController.ts
│   └── healthController.ts
├── middleware/
│   ├── errorHandler.ts            # Central error handling
│   └── tokenAuthHandler.ts        # JWT verification + blacklist check
├── routes/
│   ├── index.ts                   # Route aggregation
│   └── v1/
│       ├── authRoute.ts           # /v1/auth routes
│       ├── healthRoute.ts
│       ├── logsRoute.ts
│       └── homeRoute.ts
├── services/
│   ├── redis/
│   │   ├── jwtBlacklist.ts        # Access token blacklisting
│   │   ├── refreshTokens.ts       # Refresh token management
│   │   └── redisClient.ts         # Redis connection
│   ├── authTokenService.ts        # Database-backed tokens (password reset, email verify)
│   └── emailQueueService.ts       # Fire-and-forget email processing
├── utils/
│   ├── assertions/                # Validation functions
│   └── logger.ts                  # Winston logger
├── app.ts                         # Express app setup
└── server.ts                      # Server entry point
```

### Microservices
```
microservices/
├── email-service/                 # Queue-based email processing
│   ├── src/
│   ├── Dockerfile
│   ├── package.json (yarn)
│   └── README.md
└── token-cleanup/                 # Automated token cleanup
    ├── src/
    ├── Dockerfile  
    ├── package.json (yarn)
    └── README.md
```

## Database Schema (Prisma)

### Essential Authentication Schema
```prisma
model users {
  id             String   @id @default(cuid())
  email          String   @unique
  password_hash  String
  role           String   @default("user")  // "user" or "admin"
  email_verified Boolean  @default(false)
  created_at     DateTime @default(now())
  updated_at     DateTime @updatedAt
  
  // Relations
  auth_tokens auth_tokens[]
}

model auth_tokens {
  id         String   @id @default(cuid())
  user_id    String
  token_type String   // "password_reset" | "email_verify"  
  token_hash String   @unique
  expires_at DateTime
  created_at DateTime @default(now())
  
  // Relations
  user users @relation(fields: [user_id], references: [id], onDelete: Cascade)
  
  // Indexes for performance
  @@index([user_id, token_type])
  @@index([token_hash])
  @@index([expires_at]) // For cleanup queries
}
```

- Generated Prisma client location: `generated/prisma/`
- Refresh tokens stored in Redis (not database) with session management

## Authentication System

### JWT Token Types & Expiration
- **Access Token**: 15 minutes (JWT_SECRET) 
- **Refresh Token**: 7 days (stored in Redis with rotation)
- **Password Reset**: 1 hour (database-backed, single use)
- **Email Verification**: 24 hours (database-backed, single use) 
- **Health Token**: 1 hour (HEALTH_SECRET, admin only)
- **Logs Token**: 1 hour (LOGS_SECRET, admin only)

### Authentication Flows

**Registration:**
1. Validate email/password, hash password
2. Create user with `email_verified: false`
3. Generate access + refresh tokens (return immediately)
4. Queue email verification via microservice (fire-and-forget)

**Login:** 
1. Validate credentials, generate session ID
2. Create access + refresh tokens
3. Store refresh token in Redis with session
4. Return both tokens

**Token Refresh:**
1. Validate refresh token from Redis
2. Revoke old token (rotation security)
3. Generate new session + tokens
4. Return new access + refresh tokens

**Password Reset:**
1. Create database-backed reset token
2. Queue reset email via microservice  
3. Single-use token validation on reset
4. Revoke all refresh tokens on success

**Email Verification:**
1. Database-backed verification tokens
2. Queue verification email via microservice
3. Mark `email_verified: true` on success

### User Roles
- `user` - Regular user (default)
- `admin` - Admin user (health/logs tokens, admin endpoints)

### Authentication Endpoints
- `POST /v1/auth/register` - Registration with email verification
- `POST /v1/auth/login` - User login  
- `POST /v1/auth/refresh` - Refresh access token
- `POST /v1/auth/logout` - Logout (optional ?all=true for all sessions)
- `POST /v1/auth/forgot-password` - Request password reset
- `POST /v1/auth/reset-password` - Reset password with token
- `POST /v1/auth/change-password` - Change password (authenticated)
- `POST /v1/auth/verify-email` - Verify email with token
- `POST /v1/auth/resend-verification` - Resend verification email
- `GET /v1/auth/health-token` - Get health token (admin only)
- `GET /v1/auth/logs-token` - Get logs token (admin only)

## Environment Configuration

### Environment Files
- `.env.development` - Local development
- `.env.staging` - Staging environment  
- `.env.production` - Production environment

### Required Variables
```bash
# App
NODE_ENV=development|staging|production
PORT=3000
ALLOWED_ORIGINS=http://localhost:3001

# Database
DATABASE_URL=postgresql://username:password@host:port/database

# Redis (use URL format, not separate host/port)
REDIS_URL=redis://localhost:6379

# JWT Secrets (different for each environment)
JWT_SECRET=your_jwt_secret
HEALTH_SECRET=your_health_secret
LOGS_SECRET=your_logs_secret

# Token Expiration  
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
PASSWORD_RESET_TOKEN_EXPIRES_IN=1h
EMAIL_VERIFY_TOKEN_EXPIRES_IN=24h
HEALTH_TOKEN_EXPIRES_IN=1h
LOGS_TOKEN_EXPIRES_IN=1h
```

## Microservices Details

### Email Service (`microservices/email-service/`)
**Purpose**: Queue-based email processing using Bull + Redis

**Features**:
- Multiple email providers (Nodemailer, SendGrid, AWS SES)
- Handlebars template system
- Email types: password-reset, email-verification, welcome, notification
- Retry logic with exponential backoff
- Health monitoring and queue statistics

**API**: 
- `POST /send` - Queue email for delivery
- `GET /health` - Service health + queue stats

**Integration**: Main API calls via `emailQueueService` methods for fire-and-forget processing

### Token Cleanup Service (`microservices/token-cleanup/`)
**Purpose**: Automated cleanup of expired database tokens

**Features**:
- Cleans expired `password_reset` and `email_verify` tokens
- Removes orphaned tokens older than 30 days
- Cron scheduling (default: every 6 hours)
- Comprehensive logging and statistics
- Independent scaling and monitoring

**Benefits**: Isolation from main API, dedicated resources, separate failure domain

## Development Workflow

### Local Development
```bash
# Main API
yarn install
yarn dev                           # API on :3000

# With Docker (all services)
docker-compose up                  # Redis + all services

# Individual microservices  
cd microservices/email-service && yarn dev
cd microservices/token-cleanup && yarn dev
```

### Common Commands (Always Use Yarn)
```bash
yarn install                       # Install dependencies
yarn dev                          # Development server
yarn build                        # Build for production
yarn start                        # Production server
yarn test                         # Run tests
yarn lint                         # Run ESLint with auto-fix
yarn lint:check                   # Check linting without fixing
yarn format                       # Auto-format with Prettier
yarn format:check                 # Check formatting without fixing
yarn type-check                   # TypeScript type checking
yarn quality                      # Run all quality checks (type + lint + format)
yarn prisma generate              # Generate Prisma client
yarn migrate:dev                  # Apply dev migrations

# Release Management
yarn release:patch                # Patch release (1.0.3 → 1.0.4) for bug fixes
yarn release:minor                # Minor release (1.0.3 → 1.1.0) for new features
yarn release:major                # Major release (1.0.3 → 2.0.0) for breaking changes
```

## Release Management

**Synchronized Versioning Strategy:**
- All services (main API + microservices) share the same version number
- Use automated release scripts to bump all versions together
- Creates clean, unified releases with single commit

**Release Script Behavior:**
- Updates main package.json version using specified increment
- Sets all microservice versions to match the new main version exactly
- Creates single git commit with message "release: vX.X.X"
- No automatic git tagging (manual tagging recommended)

**New Service Setup:**
- When creating new microservices, set initial version to match current main version
- Add new service paths to `MICROSERVICES` array in `scripts/release.js`
- Ensures all services stay synchronized from day one

### Database Changes
```bash
# 1. Modify prisma/schema.prisma
# 2. Generate migration
yarn migrate:generate -- --name migration_name
# 3. Apply migration  
yarn migrate:dev
# 4. Generate client
yarn prisma generate
```

### Adding Features
1. Follow existing patterns in controllers and services
2. Use TypeScript throughout with absolute imports
3. Implement proper error handling and logging
4. Use fire-and-forget email pattern: `emailQueueService.sendX()`
5. Use database-backed tokens for sensitive operations: `authTokenService.createToken()`
6. Run `yarn quality` before committing to ensure code quality

### ESLint Best Practices
- **Disable pattern**: When lines get too long with inline comments, use `eslint-disable-next-line` above the target line
- ❌ `const x: any = { // eslint-disable-line ...` (Prettier breaks this)  
- ✅ `// eslint-disable-next-line @typescript-eslint/no-explicit-any -- reason`
- ✅ `const x: any = {`

## Railway Deployment

### Main API
- Use "GitHub Repo" option
- Railway auto-detects root Dockerfile

### Microservices  
1. **Create "Empty Service"** in Railway dashboard
2. **Connect to GitHub** after service creation
3. **Set root directory**: `microservices/email-service` or `microservices/token-cleanup`  
4. **Railway auto-detects Dockerfile** in microservice folder
5. **Configure environment variables** in service settings
6. **Automatic deployment** after setup

**Important**: Use "Empty Service" first, then connect GitHub - don't use "GitHub Repo" for microservices.

## File Synchronization Responsibility

**CRITICAL:** This project uses both Claude Code (CLAUDE.md) and Cursor IDE (cursor_context.md) for AI assistance. These files must be kept in sync.

**When making architectural changes, always update BOTH files:**
1. `CLAUDE.md` - For Claude Code sessions  
2. `cursor_context.md` - For Cursor IDE with Sonnet-4

**Key areas requiring sync:**
- Project architecture changes
- New authentication flows or endpoints
- Database schema modifications  
- Environment variable updates
- Deployment pattern changes
- New microservices or major features
- Development workflow updates

**Sync procedure:**
1. Make changes to CLAUDE.md first (primary source)
2. Copy relevant updates to cursor_context.md
3. Update .cursorrules if coding standards or workflow changes
4. Ensure all three files reflect the same current state
5. Test that both Claude Code and Cursor have accurate context

**File purposes:**
- `CLAUDE.md` - Claude Code project context
- `cursor_context.md` - Cursor project context (this file, mirrors CLAUDE.md)
- `.cursorrules` - Cursor behavior rules (coding standards, auto-applied)

## Common Code Patterns

### Fire-and-forget Email
```typescript
// Registration email verification
await emailQueueService.sendEmailVerification(email, verifyToken, undefined, true);

// Password reset email  
await emailQueueService.sendPasswordResetEmail(email, resetToken);
```

### Database-backed Token Management
```typescript
// Create single-use token
const { token } = await authTokenService.createToken({
  userId: user.id,
  tokenType: "password_reset",
  expiresInMs: expiresInToSeconds(config.passwordResetTokenExpiresIn),
});

// Validate and consume token
const tokenData = await authTokenService.findValidToken(token, "password_reset");
await authTokenService.consumeToken(tokenData.id);
```

### Refresh Token Management  
```typescript
// Store refresh token with session
await storeRefreshToken(userId, sessionId, refreshToken, expiresInSeconds);

// Rotate refresh token (revoke old, create new)
await revokeRefreshToken(oldRefreshToken);
const newRefreshToken = generateRandomToken();
await storeRefreshToken(userId, newSessionId, newRefreshToken, ttl);
```

### Access Token Blacklisting
```typescript
// Logout: blacklist current access token
const decoded = jwt.decode(token) as JwtPayload;
const ttl = decoded.exp - Math.floor(Date.now() / 1000);
await blacklistToken(token, ttl);
```

## Key Implementation Notes

### Always Use Yarn
- Never use npm commands - always use yarn
- All documentation references yarn commands
- Docker files use yarn install --frozen-lockfile

### Redis Configuration  
- Use `REDIS_URL` format, not separate host/port/password
- Automatically handles IPv6 connectivity issues
- Used for both JWT blacklisting and Bull queues

### Docker Best Practices
- Multi-stage builds for production optimization
- Enable corepack for yarn support
- Run `yarn prisma generate` in both builder and runtime stages
- Health checks for all services

### Error Handling Patterns
- Centralized error middleware in Express app
- Structured logging with Winston (JSON in production) 
- Don't fail registration/login if email sending fails
- Always return success for password reset (prevent enumeration)

## Troubleshooting Common Issues

### Docker Build Failures
- Ensure consistent yarn usage throughout
- Enable corepack in Dockerfile
- Generate Prisma client in both stages

### Redis Connection Issues
- Use REDIS_URL format vs host/port  
- Check Redis connectivity for Bull queues
- Review IPv6/IPv4 binding issues

### JWT Token Issues  
- Access tokens are short-lived (15m) - implement refresh flow
- Check Redis blacklist for logged-out tokens
- Verify environment variable parsing (no quotes in .env)

### Email Service Integration
- Ensure email service is running and accessible
- Check Bull queue processing in Redis
- Review email service logs for delivery issues

### Migration Issues
- Run environment-specific migrations after deployments
- Use `yarn migrate:dev` after schema changes
- Generate new migrations with descriptive names

## Current Status

### ✅ Implemented
- Complete microservices architecture  
- JWT authentication with refresh token rotation
- Password reset and email verification flows
- Fire-and-forget email processing
- Automated token cleanup service
- Docker containerization
- Railway deployment with proper microservice setup
- Comprehensive logging and error handling

### 📋 Template Features
- Complete authentication system with refresh tokens
- Microservices architecture with email processing
- Database token management and cleanup
- Docker containerization
- Railway deployment patterns
- TypeScript throughout

## Repository Status
- Production-ready authentication system
- Scalable microservices architecture
- Environment-specific deployments working
- Database migrations and schema management
- Ready for custom feature development