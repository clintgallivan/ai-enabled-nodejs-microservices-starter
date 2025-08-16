# Node.js Microservices Starter Conventions

This file contains project-specific conventions and preferences for AI assistants.

## Package Management
- **Always use Yarn** instead of npm for all package operations
- Use `yarn install` instead of `npm install`
- Use `yarn add` instead of `npm install <package>`
- Use `yarn dev` instead of `npm run dev`
- Update README files and documentation to reference yarn commands

## Code Conventions
- TypeScript for all new code
- Use absolute imports with path mapping (already configured)
- Follow existing patterns in the codebase
- Prefer functional components and hooks for any React code
- Use Prisma for database operations
- Use Winston for logging

## Architecture Patterns
- Microservices pattern for background services
- Queue-based architecture for async operations (Redis + Bull)
- Separation of concerns between main API and microservices
- RESTful API design
- JWT-based authentication with refresh tokens

## Testing
- Use Jest for testing
- Run tests with `yarn test`
- Maintain test coverage for critical paths
- Mock external services in tests

## Docker & Deployment
- Use Docker for containerization
- docker-compose for local development
- Follow multi-stage builds for production images
- Health checks required for all services

## Environment Configuration
- Use .env files for configuration
- Provide .env.example files
- Never commit secrets or API keys
- Use environment-specific configs (.env.development, .env.production)

## Documentation
- Update README files when adding new features
- Document API endpoints
- Include setup instructions using yarn
- Provide examples in documentation

## Database
- Prisma ORM for type-safe database operations
- PostgreSQL as primary database
- Redis for caching and queues
- Use migrations for schema changes

## Linting & Code Quality
- **ESLint**: TypeScript-aware linting with security rules (`yarn lint`, `yarn lint:check`)
- **Prettier**: Automatic code formatting (`yarn format`, `yarn format:check`)
- **Type checking**: `yarn type-check` for TypeScript validation
- **Combined quality check**: `yarn quality` (runs type-check + lint + format checks)
- Follow existing code formatting patterns (2-space indents, semicolons, double quotes)
- Use consistent naming conventions (camelCase for variables, PascalCase for classes)

**ESLint Disable Pattern:**
- When lines get too long with inline comments, use `eslint-disable-next-line` above the target line
- ❌ `const x: any = { // eslint-disable-line ...` (Prettier breaks this)  
- ✅ `// eslint-disable-next-line @typescript-eslint/no-explicit-any -- reason`
- ✅ `const x: any = {`

## Microservices
- Each microservice should have its own package.json
- Use yarn for microservice dependencies too
- Include health check endpoints
- Implement graceful shutdown
- Use structured logging

## Common Commands to Suggest
- `yarn install` - Install dependencies
- `yarn dev` - Start development server
- `yarn build` - Build for production
- `yarn start` - Start production server
- `yarn test` - Run tests
- `docker-compose up` - Start all services locally

## Release Management

**Synchronized Versioning Strategy:**
- All services (main API + microservices) share the same version number
- Use automated release scripts to bump all versions together
- Creates clean, unified releases with single commit

**Release Commands:**
- `yarn release:patch` - Patch release (1.0.3 → 1.0.4) for bug fixes
- `yarn release:minor` - Minor release (1.0.3 → 1.1.0) for new features  
- `yarn release:major` - Major release (1.0.3 → 2.0.0) for breaking changes

**Release Script Behavior:**
- Updates main package.json version using specified increment
- Sets all microservice versions to match the new main version exactly
- Creates single git commit with message "release: vX.X.X"
- No automatic git tagging (manual tagging recommended)

**New Service Setup:**
- When creating new microservices, set initial version to match current main version
- Add new service paths to `MICROSERVICES` array in `scripts/release.js`
- Ensures all services stay synchronized from day one

## Railway Deployment Pattern

When deploying microservices to Railway:

1. **Create "Empty Service"** in Railway dashboard
2. **Connect to GitHub** after service is created
3. **Set the file location/root directory** to point to the microservice folder (e.g., `microservices/email-service`, `microservices/token-cleanup`)
4. **Railway auto-detects the Dockerfile** in that directory
5. **Configure environment variables** in service settings → Variables
6. **Deploy happens automatically** after setup

**Important:** Use "Empty Service" first, then connect GitHub and set root directory - don't use "GitHub Repo" option directly.

## File Synchronization Responsibility

**🚨 CRITICAL:** This project uses both Claude Code (CLAUDE.md) and Cursor IDE (cursor_context.md) for AI assistance. These files must be kept in sync.

**⚠️ ALWAYS UPDATE BOTH FILES WHEN MAKING CHANGES:**
1. `CLAUDE.md` - For Claude Code sessions  
2. `cursor_context.md` - For Cursor IDE with Sonnet-4

**Key areas requiring immediate sync:**
- Project architecture changes (like release management)
- New authentication flows or endpoints
- Database schema modifications  
- Environment variable updates
- Deployment pattern changes
- New microservices or major features
- Development workflow updates (like new yarn commands)

**Mandatory sync procedure:**
1. Make changes to CLAUDE.md first (primary source)
2. **IMMEDIATELY** copy relevant updates to cursor_context.md
3. Update .cursorrules if coding standards or workflow changes
4. Ensure all three files reflect the same current state
5. Test that both Claude Code and Cursor have accurate context

**File purposes:**
- `CLAUDE.md` - Claude Code project context (this file)
- `cursor_context.md` - Cursor project context (mirrors this file)
- `.cursorrules` - Cursor behavior rules (coding standards, auto-applied)

**🔥 REMINDER FOR AI ASSISTANTS:** When updating project conventions, architecture, or adding new features like release commands, you MUST update both CLAUDE.md and cursor_context.md in the same session. Do not forget this step!

## Project Architecture Overview

### Main API (`src/`)
The core Node.js/Express API with the following key components:

**Authentication System:**
- JWT access tokens (15 minutes) with refresh tokens (7 days)
- Password reset flow with database-backed tokens (1 hour expiry)
- Email verification system with database-backed tokens (24 hours expiry)
- Refresh token rotation for enhanced security
- Admin-only health and logs tokens

**Key Controllers:**
- `authController.ts` - Complete auth flows: register, login, refresh, logout, password reset, email verification
- Authentication endpoints: POST /v1/auth/register, /login, /refresh, /logout, /forgot-password, /reset-password, /change-password, /verify-email, /resend-verification

**Services:**
- `authTokenService.ts` - Database-backed tokens for password reset and email verification  
- `emailQueueService.ts` - Fire-and-forget email processing via microservice HTTP calls
- `redis/refreshTokens.ts` - Refresh token management with Redis storage
- `redis/jwtBlacklist.ts` - Access token blacklisting on logout

### Email Service Microservice (`microservices/email-service/`)
Dedicated email processing service using Bull queues:

**Features:**
- Queue-based email processing with Redis + Bull
- Support for multiple email providers (Nodemailer, SendGrid, AWS SES)
- Template system using Handlebars
- Email types: password-reset, email-verification, welcome, notification
- Health monitoring and retry logic with exponential backoff
- API endpoint: POST /send for queuing emails

**Integration:**
- Main API calls email service via `emailQueueService.sendEmailVerification()`, `sendPasswordResetEmail()` methods
- Fire-and-forget pattern to avoid blocking API requests
- Independent scaling and failure isolation

### Token Cleanup Service (`microservices/token-cleanup/`)
Automated database maintenance service:

**Purpose:**
- Cleans expired `password_reset` and `email_verify` tokens
- Removes orphaned tokens older than 30 days  
- Cron-scheduled execution (default: every 6 hours)
- Comprehensive logging and statistics

**Benefits:**
- Isolation from main API (failures don't affect user requests)
- Independent scaling and resource allocation
- Dedicated monitoring and health checks

## Database Schema (Prisma)

**Key Models:**
- `users` - User accounts with email verification status
- `auth_tokens` - Database-backed tokens for password reset and email verification
- Refresh tokens stored in Redis (not database) with session-based management
- Generated Prisma client location: `generated/prisma/`

## Authentication Flow Details

### Registration:
1. Validate email/password, hash password
2. Create user record with `email_verified: false`
3. Generate JWT access + refresh tokens
4. Queue email verification email via microservice
5. Return tokens immediately (email verification optional)

### Login:
1. Validate credentials against database
2. Generate new session ID and tokens
3. Store refresh token in Redis with expiration
4. Return both access and refresh tokens

### Token Refresh:
1. Validate refresh token against Redis
2. Revoke old refresh token (rotation)  
3. Generate new session with fresh access + refresh tokens
4. Return new tokens

### Password Reset:
1. Create database-backed token via `authTokenService`
2. Queue password reset email with token
3. Token validation on reset (single-use, time-limited)
4. Revoke all refresh tokens on successful reset

### Email Verification:
1. Database-backed verification tokens
2. Queue verification email via microservice
3. Mark `email_verified: true` on successful verification

## Environment Configuration

**Required Variables:**
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection (replaces separate host/port/password)  
- `JWT_SECRET` - Access token signing
- `ACCESS_TOKEN_EXPIRES_IN=15m`
- `REFRESH_TOKEN_EXPIRES_IN=7d`
- `PASSWORD_RESET_TOKEN_EXPIRES_IN=1h`
- `EMAIL_VERIFY_TOKEN_EXPIRES_IN=24h`

## Development Workflow

### Local Development:
```bash
yarn install
yarn dev                    # Main API on :3000
docker-compose up           # All services including Redis
```

### Adding Features:
1. Follow existing patterns in controllers and services
2. Use TypeScript throughout
3. Implement proper error handling and logging
4. Update tests and documentation
5. Use absolute imports (already configured)

### Testing:
- Use Jest for testing
- Mock external services (email service, Redis)
- Maintain coverage for auth flows and critical paths

## Common Patterns

**Fire-and-forget Email:**
```typescript
await emailQueueService.sendEmailVerification(email, token, undefined, true);
```

**Database-backed Token Creation:**
```typescript
const { token } = await authTokenService.createToken({
  userId: user.id,
  tokenType: "password_reset",
  expiresInMs: expiresInToSeconds(config.passwordResetTokenExpiresIn),
});
```

**Refresh Token Management:**
```typescript
await storeRefreshToken(userId, sessionId, refreshToken, expiresInSeconds);
await revokeRefreshToken(oldRefreshToken);
```

## Troubleshooting Common Issues

**Docker Build Failures:**
- Ensure consistent yarn usage (not npm)
- Run `yarn prisma generate` in both builder and production stages
- Enable corepack for yarn in Dockerfile

**Redis Connection Issues:**  
- Use `REDIS_URL` format instead of separate host/port
- Redis URL automatically handles IPv6 connectivity

**JWT Token Issues:**
- Access tokens are short-lived (15m), use refresh flow
- Check blacklist for logout-revoked tokens
- Verify environment variable parsing (no quotes in .env)

**Email Service Integration:**
- Ensure email service is running and accessible
- Check Redis connectivity for Bull queues
- Review email service logs for processing errors

**Migration Issues:**
- Run `yarn migrate:dev` after pulling schema changes
- Use `yarn migrate:generate` for new migrations
- Apply environment-specific migrations after deployments