# Email Service Microservice

A microservice responsible for sending transactional emails using a queue-based architecture.

## Features

- **Queue-based processing**: Uses Redis and Bull queue for reliable email delivery
- **Multiple email providers**: Support for Nodemailer, SendGrid, and AWS SES
- **Template system**: Handlebars-based email templates
- **Retry logic**: Automatic retries with exponential backoff
- **Health monitoring**: Health check endpoints and queue statistics
- **Rate limiting**: Provider-aware rate limiting
- **Graceful shutdown**: Proper cleanup on service termination

## Email Types Supported

- **Password Reset**: Secure password reset with expiring tokens
- **Email Verification**: Account verification emails
- **Welcome**: Welcome emails for new users
- **Notifications**: General notification emails

## API Endpoints

### POST /send
Queue an email for delivery.

```json
{
  "type": "password-reset|email-verification|welcome|notification",
  "to": "user@example.com",
  "data": {
    "resetToken": "token_here",
    "name": "User Name"
  },
  "priority": 10,
  "delay": 0,
  "attempts": 3
}
```

### GET /health
Get service health status and queue statistics.

### GET /stats
Get detailed queue statistics.

## Configuration

Create a `.env` file based on `.env.example`:

```bash
# Email Provider
EMAIL_PROVIDER=nodemailer

# SMTP Settings (for nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# From Address
FROM_NAME=YourApp
FROM_EMAIL=noreply@yourapp.com

# Redis
REDIS_URL=redis://localhost:6379

# App
PORT=3001
BASE_URL=http://localhost:3000
```

## Development

```bash
# Install dependencies
yarn install

# Start development server
yarn dev

# Build for production
yarn build

# Start production server
yarn start
```

## Docker

```bash
# Build image
docker build -t email-service .

# Run container
docker run -p 3001:3001 --env-file .env email-service
```

## Queue Management

The service uses Bull queue with Redis for job processing:

- **Default attempts**: 3 retries with exponential backoff
- **Job cleanup**: Completed jobs are retained (100 max), failed jobs (50 max)
- **Processing concurrency**: 10 concurrent email jobs
- **Priority support**: Higher numbers = higher priority

## Email Templates

Templates are defined in `src/services/templateService.ts` using Handlebars:

- Automatic HTML and text versions
- Helper functions for dates and formatting  
- Template data validation
- Consistent branding and styling

## Monitoring

- Health checks via `/health` endpoint
- Queue statistics via `/stats` endpoint
- Structured logging with Winston
- Job completion/failure events

## Architecture Integration

```
Main App → HTTP Request → Email Service → Redis Queue → Email Provider
```

The main application sends HTTP requests to the email service, which queues the emails for processing. This decouples email sending from the main request flow, improving reliability and performance.