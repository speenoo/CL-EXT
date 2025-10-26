# Extension Credits API

This endpoint returns the current credit balance for an organization using the cookie-based auth model. The extension must send requests with `credentials: 'include'` so the browser attaches the HTTP-only session cookie.

Base path: `/api/extension/credits`

---

## Auth model (recap)
- Sign in first via `POST /api/extension/signin` (sets the session cookie with `SameSite=None; Secure; HttpOnly`).
- Then call this endpoint with `credentials: 'include'`.
- The server validates the cookie and checks that the user is a member of the requested organization.

---

## POST /api/extension/credits

Get credit balance by sending the `organizationId` in the JSON body.

Request (extension background):
```ts
const res = await fetch(`${APP_ORIGIN}/api/extension/credits`, {
  method: 'POST',
  credentials: 'include', // IMPORTANT: attach session cookie
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ organizationId })
});

if (res.status === 401) {
  // Not signed in or session expired — call /api/extension/signin again
}

const data = await res.json();
```

Success response (200):
```json
{
  "organizationId": "4fb1fd3a-6225-4590-930a-34daabed3f7b",
  "creditBalance": {
    "total": 4200,
    "subscription": 3000,
    "purchased": 1000,
    "bonus": 200
  }
}
```

Errors:
- 400: `{ "error": "organizationId is required" }`
- 401: `{ "error": "Unauthorized" }` (no/invalid session cookie)
- 403: `{ "error": "User not in organization" }`
- 500: `{ "error": "Internal server error" }`

---

## GET /api/extension/credits?organizationId=...

Same as POST but passes `organizationId` as a query parameter.

Request (extension background):
```ts
const res = await fetch(`${APP_ORIGIN}/api/extension/credits?organizationId=${encodeURIComponent(organizationId)}` , {
  credentials: 'include'
});
const data = await res.json();
```

Response: same as POST.

---

## Minimal utility wrapper (optional)

```ts
async function fetchJson(path: string, init: RequestInit = {}) {
  const res = await fetch(`${APP_ORIGIN}${path}`, {
    ...init,
    credentials: 'include'
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, json } as const;
}

export async function getCredits(organizationId: string) {
  return fetchJson(`/api/extension/credits`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ organizationId })
  });
}
```

---

## Troubleshooting
- 401 Unauthorized: session cookie missing/expired; call `/api/extension/signin` again.
- 403 User not in organization: verify the user has membership in the specified org.
- Empty/incorrect values: confirm the organizationId is correct and credits exist in the system.
- Dev HTTPS: cookie requires `SameSite=None; Secure`; use HTTPS locally (e.g., mkcert).
