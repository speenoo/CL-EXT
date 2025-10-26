# Extension API: Audiences Endpoint

This document explains how the extension background should authenticate and fetch audiences from the dashboard.

## Overview

The extension uses **cookie-based authentication** (no JWT tokens). The session cookie is set during sign-in and automatically included by the browser when the extension makes API calls with `credentials: 'include'`.

## Authentication flow

1. **Sign in** via `POST /api/extension/signin`

   ```typescript
   const res = await fetch('https://your-app.com/api/extension/signin', {
     method: 'POST',
     credentials: 'include',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       email: 'user@example.com',
       password: 'password123'
     })
   });

   // On success (200): session cookie is set with SameSite=None; Secure; HttpOnly
   // On failure (401): invalid credentials
   ```

2. **Verify session** via `GET /api/extension/session` (optional check)

   ```typescript
   const res = await fetch('https://your-app.com/api/extension/session', {
     credentials: 'include'
   });

   // Returns { user: { id, email, name, image } } if authenticated
   // Returns 401 if no valid session
   ```

3. **Use the session cookie** for subsequent API calls
   - Always use `credentials: 'include'` so the browser attaches the session cookie
   - The cookie is HTTP-only and cannot be read by JavaScript

## Audiences endpoint

### `POST /api/extension/audiences-2`

Fetch all audiences for a specific organization.

**Request:**

```typescript
const res = await fetch('https://your-app.com/api/extension/audiences-2', {
  method: 'POST',
  credentials: 'include', // IMPORTANT: attach session cookie
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    organizationId: 'org-uuid-here'
  })
});

const data = await res.json();
```

**Success response (200):**

```json
{
  "audiences": [
    {
      "id": "aud-1",
      "name": "Tech Buyers",
      "description": "Decision makers in tech",
      "linkedin": true,
      "google": false,
      "facebook": true,
      "createdAt": "2025-10-24T00:00:00Z",
      "updatedAt": "2025-10-24T00:00:00Z"
    }
  ]
}
```

**Error responses:**

- `400`: `{ "error": "organizationId is required" }` — Missing organizationId in body
- `401`: `{ "error": "Unauthorized" }` — No valid session cookie (not signed in)
- `403`: `{ "error": "User not in organization" }` — User is not a member of the organization
- `500`: `{ "error": "Internal server error" }` — Server error

### `GET /api/extension/audiences-2`

Alternative method to fetch audiences via query params.

**Request:**

```typescript
const res = await fetch(
  'https://your-app.com/api/extension/audiences-2?organizationId=org-uuid-here',
  {
    credentials: 'include' // IMPORTANT: attach session cookie
  }
);

const data = await res.json();
```

**Response:** Same as POST endpoint above.

## Key points

- **Always use `credentials: 'include'`** in all fetch calls so the browser includes the session cookie.
- The session cookie is **HTTP-only**, so you cannot read it from JavaScript; the browser handles it automatically.
- The cookie has `SameSite=None; Secure` attributes, which requires **HTTPS** on both dev and production.
- If you get a 401, the session has expired or the user is not logged in. Call `/api/extension/signin` again.
- If you get a 403, verify the `organizationId` is correct and the user is a member of that organization.

## Example: Complete sign-in and fetch flow

```typescript
async function extensionFetch(endpoint: string, options: RequestInit = {}) {
  const baseUrl = 'https://your-app.com';
  const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    credentials: 'include' // Always include cookies
  });

  if (response.status === 401) {
    // Session expired; need to sign in again
    console.warn('Session expired, redirecting to sign-in');
    // Trigger extension sign-in UI or redirect user
  }

  return response.json();
}

// Step 1: Sign in
async function signIn(email: string, password: string) {
  return extensionFetch('/api/extension/signin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
}

// Step 2: Fetch audiences
async function fetchAudiences(organizationId: string) {
  return extensionFetch('/api/extension/audiences-2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ organizationId })
  });
}

// Usage
const signInResult = await signIn('user@example.com', 'password123');
if (signInResult.user) {
  const audiencesResult = await fetchAudiences('org-uuid');
  console.log(audiencesResult.audiences);
}
```

## Troubleshooting

- **403 User not in organization**: Verify the user has been invited to and accepted membership in the organization.
- **401 Unauthorized**: The session cookie is missing or expired. Sign in again.
- **Cookie not being set**: Ensure HTTPS is used (or localhost with mkcert on dev). `SameSite=None; Secure` cookies cannot be set on HTTP.
- **CORS errors**: This endpoint has CORS headers enabled for extension usage, so CORS should not be an issue.

## Related endpoints

- `POST /api/extension/signin` — Credentials sign-in (sets session cookie)
- `GET /api/extension/session` — Check current session (verify you're logged in)
