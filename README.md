# 🚀 AI-Enabled Node.js Microservices Starter

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/ai-enabled-nodejs-microservices-starter?referralCode=vl0Utz)

> **Production-ready TypeScript microservices with AI-powered development workflow**
> 
> ✨ **Claude Code + Cursor AI Ready** | 🐳 **Docker Native** | 🚄 **Railway Template** | 🔐 **Complete Auth**

An **AI-enhanced** microservices starter that gets you from zero to production in minutes. Built for modern development with **Claude Code** and **Cursor** integration, featuring complete authentication, microservices architecture, and one-click Railway deployment.

## ✨ Why This Template?

🤖 **AI-First Development**
- Pre-configured **Claude Code** context (CLAUDE.md)
- **Cursor IDE** integration with Sonnet-4 
- AI-aware project conventions and patterns
- Intelligent code completion and suggestions

🚄 **Railway Template Ready** 
- One-click deployment to Railway
- Pre-configured for microservices scaling
- Environment-specific deployments (dev/staging/prod)
- Auto-detected Dockerfiles for each service

🏗️ **Production Architecture**
- Microservices with dedicated email & token cleanup services
- JWT authentication with refresh token rotation
- Redis-backed queues and caching
- PostgreSQL with Prisma ORM
- Comprehensive logging and monitoring

🔧 **Developer Experience**
- TypeScript throughout with absolute imports
- Hot reload development environment
- Automated release management
- Quality gates (ESLint, Prettier, TypeScript)
- Docker containerization

## 📚 Tech Stack

- Node.js + TypeScript
- Express
- Prisma ORM + PostgreSQL
- Redis (JWT blacklist + Bull queues)
- JWT authentication (15m access + 7d refresh tokens) + scoped admin tokens (health/logs)
- Bull queue system for reliable email processing
- Microservices architecture (email-service, token-cleanup)
- Winston structured logging (env-aware)
- CORS per environment via config
- Docker containerization
- Railway-ready (dev/staging/prod)

## 🎯 Core Features

- User registration/login with validation (email + strong password)
- JWT access tokens (15m) + refresh tokens (7d) with rotation
- Password reset and email verification flows
- Admin-only token minting for health/logs endpoints
- Role-based access control (`user`, `admin`)
- Fire-and-forget email processing via microservice
- Automated token cleanup via dedicated microservice
- Centralized error handling
- Strong logging with global metadata (version, environment, service)
- Secure CORS configuration per environment
- Queue-based architecture for async operations

## 📁 Project Structure

```
src/
├── app.ts                         # Express app wiring (CORS, security, parsers, routes, errors)
├── server.ts                      # Server bootstrap + startup logs
├── config/
│   ├── env.ts                     # getEnvVar helper (no defaults; explicit envs)
│   └── index.ts                   # Typed config, reads env vars
├── controllers/
│   ├── authController.ts          # register, login, logout, refresh, password reset, email verify
│   ├── exampleController.ts
│   └── healthController.ts
├── middleware/
│   ├── errorHandler.ts            # Central error middleware
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
│   │   ├── jwtBlacklist.ts        # blacklistToken, isTokenBlacklisted
│   │   ├── refreshTokens.ts       # refresh token management
│   │   └── redisClient.ts         # Redis connection
│   ├── authTokenService.ts        # password reset & email verification tokens
│   └── emailQueueService.ts       # fire-and-forget email processing
├── utils/
│   ├── assertions/                # Validation (isValidEmail, isStrongPassword)
│   └── logger.ts                  # Winston logger

microservices/
├── email-service/                 # Dedicated email processing microservice
│   ├── src/
│   ├── Dockerfile
│   ├── package.json
│   └── README.md
└── token-cleanup/                 # Automated token cleanup microservice
    ├── src/
    ├── Dockerfile
    ├── package.json
    └── README.md
```

## 📍 Quick Start

### Option 1: Railway Template (Recommended)
1. Click the "Deploy on Railway" button above
2. Connect your GitHub account
3. Railway will automatically:
   - Fork this repository
   - Set up PostgreSQL and Redis
   - Deploy all microservices
   - Configure environment variables
4. Your app will be live in ~3 minutes!

### Option 2: Local Development

#### Prerequisites

- Node.js 18+
- PostgreSQL database per environment (dev/staging/prod)
- Redis instance per environment (or shared with env-specific keys)

#### Install & Setup

```bash
# Clone and install
git clone <your-repo-url>
cd nodejs-microservices-starter
yarn install
```

### Environment Files

Create the following files in the repo root (values are examples):

```bash
# .env.development
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:pass@localhost:5432/myapp_dev
JWT_SECRET=dev_jwt_secret
HEALTH_SECRET=dev_health_secret
LOGS_SECRET=dev_logs_secret
REDIS_URL=redis://localhost:6379
ALLOWED_ORIGINS=http://localhost:3001
```

```bash
# .env.staging
NODE_ENV=staging
DATABASE_URL=postgresql://...staging
JWT_SECRET=staging_jwt_secret
HEALTH_SECRET=staging_health_secret
LOGS_SECRET=staging_logs_secret
REDIS_URL=redis://...
ALLOWED_ORIGINS=https://staging-frontend.yourapp.com
```

```bash
# .env.production
NODE_ENV=production
DATABASE_URL=postgresql://...production
JWT_SECRET=prod_jwt_secret
HEALTH_SECRET=prod_health_secret
LOGS_SECRET=prod_logs_secret
REDIS_URL=redis://...
ALLOWED_ORIGINS=https://yourapp.com,https://www.yourapp.com
```

Notes:

- No defaults are used for critical variables; missing envs will throw at startup.
- Railway sets `PORT` automatically; you do not need to set it there.

## 🤖 AI Development Workflow

This template is optimized for AI-assisted development:

### Claude Code Integration
- 📄 **CLAUDE.md**: Complete project context for Claude Code sessions
- 🎯 **Conventions**: AI-aware coding patterns and architecture
- 🛠️ **Commands**: Pre-configured yarn scripts for AI suggestions

### Cursor IDE Setup
- 📄 **cursor_context.md**: Mirrors CLAUDE.md for Cursor AI
- ⚙️ **.cursorrules**: Auto-applied coding standards
- 🔄 **Sync**: Automatic context synchronization

### What Makes This AI-Enhanced?

**🧠 Smart Context Files**
- `CLAUDE.md` - Complete project context for Claude Code
- `cursor_context.md` - Mirrors context for Cursor IDE  
- `.cursorrules` - Auto-applied coding standards
- Synchronized documentation across all AI tools

**🎯 AI-Optimized Patterns**
```bash
# AI understands these semantic commands
yarn quality              # Runs type-check + lint + format
yarn release:minor        # Intelligent version bumping
yarn migrate:dev          # Context-aware DB migrations
yarn dev                  # Hot reload with AI suggestions
```

**🚀 Instant AI Onboarding**
- Zero configuration needed for Claude Code or Cursor
- AI instantly understands your architecture and patterns
- Contextual suggestions based on microservices best practices
- Automated code quality and consistency

## 📜 Scripts

```json
{
  "dev": "dotenv -e .env.development -- ts-node-dev --respawn --transpile-only -r tsconfig-paths/register src/server.ts",
  "staging": "dotenv -e .env.staging -- ts-node-dev --respawn --transpile-only -r tsconfig-paths/register src/server.ts",
  "build": "tsc",
  "start": "dotenv -e .env.production -- node dist/server.js",
  "migrate:generate": "dotenv -e .env.development -- prisma migrate dev --create-only",
  "migrate:dev": "dotenv -e .env.development -- prisma migrate deploy",
  "migrate:staging": "dotenv -e .env.staging -- prisma migrate deploy",
  "migrate:prod": "dotenv -e .env.production -- prisma migrate deploy"
}
```

## 🏃‍♂️ Run Locally

```bash
# Development backend on http://localhost:3000
yarn dev

# Staging-config backend locally
yarn staging

# Start all services with Docker
docker-compose up
```

## 🗄 Database Setup (Prisma + PostgreSQL)

### 🚀 Quick Database Setup

#### Option 1: Railway Template (Automatic)
When you deploy via Railway template:
1. **PostgreSQL is auto-provisioned** and connected
2. **Migrations run automatically** during deployment
3. **Ready to use** - no manual setup needed!

#### Option 2: Local Development Setup

1. **Set up PostgreSQL locally** or use a cloud provider
2. **Configure DATABASE_URL** in your `.env.development`:
   ```bash
   DATABASE_URL=postgresql://user:password@localhost:5432/myapp_dev
   ```
3. **Run initial migration** to create tables:
   ```bash
   yarn migrate:dev
   ```
4. **Generate Prisma client**:
   ```bash
   yarn prisma generate
   ```

### 📊 Database Schema

The starter includes a minimal authentication schema:

- **`users`** - User accounts with email verification
- **`auth_tokens`** - Password reset & email verification tokens

Location: `prisma/schema.prisma` | Generated client: `generated/prisma/`

### 🔄 Migration Commands

```bash
# Development: Apply migrations and generate client
yarn migrate:dev

# Production environments: Apply migrations only  
yarn migrate:staging  # For staging environment
yarn migrate:prod     # For production environment

# Create new migration (when you modify schema)
yarn migrate:generate -- --name your_migration_name

# Generate Prisma client after schema changes
yarn prisma generate
```

### 🚨 Important Setup Notes

**For Railway Deployment:**
- Database is auto-configured ✅
- Migrations run automatically ✅  
- No manual setup required ✅

**For Manual Deployment:**
- Run `yarn migrate:prod` after first deployment
- Run migrations after each schema change
- Generate client in build process

**For Local Development:**
- Run `yarn migrate:dev` after cloning
- This creates tables and generates the client
- Redis also required (see docker-compose.yml)

### 🆕 First-Time Setup

When you first clone this template:

1. **No existing migrations** - The template starts clean
2. **Run `yarn migrate:dev`** - This will:
   - Create your first migration based on the schema
   - Apply it to your database
   - Generate the Prisma client
3. **Database ready** - You now have `users` and `auth_tokens` tables

The starter schema includes everything needed for authentication!

## 🔐 Authentication

### Endpoints

- POST `/v1/auth/register` (with email verification)
- POST `/v1/auth/login`
- POST `/v1/auth/refresh` (refresh access token)
- POST `/v1/auth/logout` (blacklists token, optional ?all=true)
- POST `/v1/auth/forgot-password`
- POST `/v1/auth/reset-password`
- POST `/v1/auth/change-password` (authenticated)
- POST `/v1/auth/verify-email`
- POST `/v1/auth/resend-verification`
- GET `/v1/auth/health-token` (admin only)
- GET `/v1/auth/logs-token` (admin only)

### JWT Tokens

- Access token: 15 minutes, signed with `JWT_SECRET`
- Refresh token: 7 days, stored in Redis with session rotation
- Password reset tokens: 1 hour, database-backed with single use
- Email verification tokens: 24 hours, database-backed with single use
- Health/Logs tokens: 1 hour, signed separately (`HEALTH_SECRET`, `LOGS_SECRET`). Intended for service endpoints like `/v1/health` and `/v1/logs`

### Middleware: `tokenAuthHandler`

- Verifies token using the expected secret (based on route scope) and populates `req.user`.
- Checks Redis blacklist for access tokens (revoked on logout). If blacklisted → 401.

### Logout

- Blacklists current access token in Redis with TTL matching token expiry.
- Health/Logs tokens are not blacklisted during user logout (different scope/use).

## ✅ Validation

- Email: `utils/assertions/isValidEmail.ts`
- Password strength: `utils/assertions/isStrongPassword.ts`

## 🌐 CORS

Configured in `src/app.ts` using `config.allowedOrigins` from `ALLOWED_ORIGINS` (comma-separated).

- Local dev: `http://localhost:3001` (your Next.js app)
- Staging/Prod: set to the corresponding frontend domain per environment

## 📈 Logging

- Winston logger with environment-aware formatting:
  - Development: human-readable with structured metadata appended
  - Production: JSON logs suitable for aggregation
- Global metadata on every log: `version`, `environment`, `service`
- Startup log includes port/url; auth logs include `userId`, `email`, `ip`, `userAgent` when relevant
- File transport writes to `logs/server.log`

Examples:

```text
[2025-07-26T00:30:10.171Z] INFO: Server started {"version":"1.0.0","environment":"development","service":"nodejs-microservices-starter","port":"3000","url":"http://localhost:3000"}
[... ] INFO: User logged in successfully {"userId":"abc123","email":"user@example.com","role":"user","ip":"::1","userAgent":"Mozilla/5.0 ..."}
```

## 🟥 Redis

- `services/redis/redisClient.ts` connects on import and logs errors
- `services/redis/jwtBlacklist.ts` exposes:
  - `blacklistToken(token, ttl)`
  - `isTokenBlacklisted(token)`

## 🚄 Railway Deployment

> **This template is optimized for Railway's platform**

### Main API Deployment
- Create Railway service using "GitHub Repo" option
- Set environment variables per service (see Environment Files)
- Railway provides `PORT` automatically

### 🔍 Microservices Deployment
For each microservice (email-service, token-cleanup):

1. **Create "Empty Service"** in Railway dashboard
2. **Connect to GitHub** after service is created  
3. **Set the root directory** to point to microservice folder:
   - `microservices/email-service`
   - `microservices/token-cleanup`
4. **Railway auto-detects the Dockerfile** in that directory
5. **Configure environment variables** in service settings
6. **Deploy happens automatically** after setup

After promoting code, run:

```bash
# In staging service shell
yarn migrate:staging

# In production service shell
yarn migrate:prod
```

## 🏷️ Releases & Versioning

- Use Semantic Versioning (MAJOR.MINOR.PATCH)
- Recommended PR naming:
  - Dev → Staging: `Staging v1.0.0`
  - Staging → Main: `Release v1.0.0`
- Create git tags for production releases: `v1.0.0`, `v1.1.0`, etc. (via GitHub/GitLab Releases or CLI)

## 🔧 Troubleshooting

- 401 "Invalid token": Check `Authorization: Bearer <token>` and token not blacklisted
- 400 on logout: ensure Redis is reachable and connected
- `ClientClosedError: The client is closed`: Redis client wasn’t connected — the app now connects on import
- CORS blocked: verify `ALLOWED_ORIGINS` is set correctly for the environment
- Missing DB column (e.g., `role`): run `npm run migrate:<env>` against that environment
- `Environment variable ... is missing.`: set it in the env file or Railway variables

## 🔍 Microservices

### Email Service
- Queue-based email processing with Bull and Redis
- Support for password reset, email verification, and notification emails
- Template system with Handlebars
- Multiple email provider support (Nodemailer, SendGrid, AWS SES)
- Health monitoring and retry logic

### Token Cleanup Service  
- Automated cleanup of expired authentication tokens
- Configurable cron scheduling (default: every 6 hours)
- Comprehensive logging and statistics
- Independent scaling and monitoring

## 🗺️ Roadmap

- Rate limiting rules per route group
- Observability/metrics integration
- Test suite (unit/integration)
- Additional microservices (notifications, analytics)

## 📄 License

ISC
