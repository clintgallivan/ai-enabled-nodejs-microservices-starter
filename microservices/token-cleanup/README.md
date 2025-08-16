# Token Cleanup Microservice

A dedicated microservice for cleaning up expired authentication tokens from your application.

## 🎯 Purpose

This microservice runs independently from the main API to:

- Clean up expired `password_reset` tokens
- Clean up expired `email_verify` tokens
- Remove orphaned tokens older than 30 days
- Provide token statistics and health monitoring

## 🏗️ Architecture

```
main-api          ←→ PostgreSQL DB ←→ token-cleanup (this service)
```

**Benefits of separation:**

- ✅ **Isolation**: Cleanup failures don't affect main API
- ✅ **Scalability**: Independent scaling and resource allocation
- ✅ **Reliability**: Dedicated monitoring and alerting
- ✅ **Performance**: No cleanup overhead on API requests

## 🚀 Quick Start

### Development

```bash
# Install dependencies
yarn install

# Copy environment file
cp .env.example .env

# Edit DATABASE_URL to match your main API
vim .env

# Start in development mode
yarn dev
```

### Production

```bash
# Build the service
yarn build

# Start production
yarn start
```

## ⚙️ Configuration

### Environment Variables

| Variable           | Default       | Description                                      |
| ------------------ | ------------- | ------------------------------------------------ |
| `DATABASE_URL`     | -             | PostgreSQL connection string (same as main API)  |
| `NODE_ENV`         | `development` | Environment (`development`, `production`)        |
| `LOG_LEVEL`        | `info`        | Logging level (`error`, `warn`, `info`, `debug`) |
| `CLEANUP_SCHEDULE` | `0 */6 * * *` | Cron schedule (every 6 hours)                    |
| `TIMEZONE`         | `UTC`         | Timezone for cron jobs                           |

### Cron Schedule Examples

```bash
# Every 6 hours (default)
CLEANUP_SCHEDULE="0 */6 * * *"

# Daily at 2 AM
CLEANUP_SCHEDULE="0 2 * * *"

# Every 4 hours
CLEANUP_SCHEDULE="0 */4 * * *"

# Weekly on Sunday at 1:30 AM
CLEANUP_SCHEDULE="30 1 * * 0"
```

## 📊 Monitoring

The service logs comprehensive metrics:

```json
{
  "level": "info",
  "message": "Token cleanup completed",
  "cleanedCount": 42,
  "before": {
    "total": 150,
    "byType": {
      "password_reset": 25,
      "email_verify": 125
    },
    "expired": 42
  },
  "after": {
    "total": 108,
    "byType": {
      "password_reset": 15,
      "email_verify": 93
    },
    "expired": 0
  }
}
```

## 🚢 Deployment

### Railway Deployment

1. **Create "Empty Service"** in Railway dashboard
2. **Connect to GitHub** after service is created  
3. **Set the root directory** to `microservices/token-cleanup`
4. **Railway auto-detects the Dockerfile** in that directory
5. **Configure environment variables** in service settings:
   - `DATABASE_URL=your_db_url`
   - `NODE_ENV=production` 
   - `CLEANUP_SCHEDULE="0 */6 * * *"`
6. **Deploy happens automatically** after setup

**Important:** Use "Empty Service" first, then connect GitHub and set root directory - don't use "GitHub Repo" option directly for microservices.

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json yarn.lock ./
RUN yarn install --frozen-lockfile --production
COPY dist/ ./dist/
CMD ["yarn", "start"]
```

## 🔧 Development

```bash
# Install dependencies
yarn install

# Run in development mode with auto-reload
yarn dev

# Build TypeScript
yarn build

# Clean build artifacts
yarn clean
```

## 📝 Logs

Logs are written to:

- **Console**: All environments
- **File**: `logs/combined.log` (all logs)
- **File**: `logs/error.log` (errors only)

## 🏥 Health Checks

The service validates database connectivity on startup and provides health check methods for monitoring systems.

## 🔐 Security

- Uses the same database connection as main API
- No external API exposure (internal service only)
- Secure token handling with proper cleanup
- Graceful shutdown handling
