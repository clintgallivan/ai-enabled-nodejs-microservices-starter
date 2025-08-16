# 🚀 API Testing with Postman

This collection provides comprehensive testing for all authentication endpoints in the microservices starter.

## 📦 Import Collection

1. **Open Postman**
2. **Click "Import"** in the top left
3. **Select `nodejs-microservices-starter.postman_collection.json`** from this folder
4. **Collection will appear** in your sidebar with organized folders

## ⚙️ Setup & Configuration

### Variables

The collection uses these variables (automatically managed):

| Variable       | Description              | Auto-set                |
| -------------- | ------------------------ | ----------------------- |
| `baseUrl`      | API base URL             | `http://localhost:3000` |
| `accessToken`  | JWT access token         | ✅ After login/register |
| `refreshToken` | Refresh token            | ✅ After login/register |
| `resetToken`   | Password reset token     | ⚠️ Manual (from logs)   |
| `verifyToken`  | Email verification token | ⚠️ Manual (from logs)   |

### Environment Setup

1. **Start your server**: `yarn dev`
2. **Update baseUrl** if needed (default: `http://localhost:3000`)

## 🧪 Testing Flows

### 1. **Basic Authentication Flow**

```
Register User → Login User → Refresh Token → Logout
```

**Tokens are automatically saved** between requests!

### 2. **Password Reset Flow**

```
1. Forgot Password → Check logs for reset token
2. Copy token to {{resetToken}} variable
3. Reset Password → Use new password to login
```

### 3. **Email Verification Flow**

```
1. Register User → Check logs for verification token
2. Copy token to {{verifyToken}} variable
3. Verify Email → Email marked as verified
```

### 4. **Admin Testing**

```
1. Login as admin user
2. Get Health Token → Use for health check
3. Get Logs Token → Use for log download
```

## 🔍 Finding Tokens in Logs

Since emails are mocked, tokens appear in your server logs:

```bash
# Watch your server logs for:
yarn dev

# Look for these patterns:
[INFO] Email verification sent on registration { email: "test@example.com" }
[INFO] Password reset email sent { email: "test@example.com" }
```

**To get actual tokens**, check your auth_tokens database table or implement a debug endpoint.

## 📋 Request Examples

### Register User

```json
POST /v1/auth/register
{
  "email": "test@example.com",
  "password": "SecurePass123!"
}
```

### Forgot Password

```json
POST /v1/auth/forgot-password
{
  "email": "test@example.com"
}
```

### Reset Password

```json
POST /v1/auth/reset-password
{
  "token": "your-reset-token-here",
  "password": "NewSecurePass123!"
}
```

## 🛡️ Rate Limiting Testing

The collection respects rate limits:

- **Password routes**: 3-10 requests per hour
- **Auth routes**: 5-50 requests per 15 minutes
- **Public routes**: 20-100 requests per minute

## 🎯 Expected Responses

### ✅ Success Responses

- **201**: Registration successful
- **200**: Login, logout, password change, etc.

### ❌ Error Responses

- **400**: Invalid request/token
- **401**: Invalid credentials/token
- **403**: Forbidden (admin only)
- **409**: User already exists
- **429**: Rate limit exceeded

## 🔧 Troubleshooting

### Token Issues

- **Invalid token**: Check expiration (1h for reset, 24h for verify)
- **Token not found**: Ensure you copied from logs correctly

### Admin Endpoints

- **403 Forbidden**: User needs admin role in database
- **Update user role**: `UPDATE users SET role = 'admin' WHERE email = 'test@example.com'`

### Rate Limiting

- **429 errors**: Wait for rate limit window to reset
- **Development**: Limits are more lenient than production

## 📝 Notes

- **Tokens auto-save** for core auth endpoints
- **Email tokens** must be copied manually from logs
- **Collection variables** persist across requests
- **Admin endpoints** require admin role in database
