# Extension Handoff (cookie-based)

This route is the login handoff page for the browser extension when using cookie-based auth (no token exchange).

## How it works

- Extension UI redirects the user to `/extension/handoff2` when they're not authenticated.
- Extension background does a credentials sign-in via `POST /api/extension/signin` with email + password.
- That endpoint **explicitly sets the session cookie with `SameSite=None; Secure; HttpOnly`** so it works cross-origin.
- Once the cookie is set, the extension background calls `GET /api/extension/session` with `credentials: 'include'` to read the session.
- The session cookie is now available in the extension's subsequent requests.
- The `/extension/handoff2` page is the confirmation view—it shows the user is signed in and can close the tab.

## Endpoints

- `POST /api/extension/signin` — Extension sign-in handler; accepts `{ email, password }` and sets the session cookie with `SameSite=None; Secure; HttpOnly`.

  - Returns `{ user: { id, email } }` on success (200).
  - Returns 401 on invalid credentials, 400 on missing fields, 500 on server error.
  - This is an isolated route that does NOT modify core NextAuth.

- `GET /api/extension/session` — Extension session check; returns `{ user }` when a valid session cookie is present.
  - Call with `credentials: 'include'` to attach the cookie.
  - Returns 401 if no session.

## Cookie requirements

For the extension to include the cookie from a different scheme (chrome-extension://), the session cookie must have:

- `SameSite=None`
- `Secure`
- `HttpOnly`

The `/api/extension/signin` endpoint **explicitly sets these attributes** when creating the session, ensuring the cookie works cross-origin.

Note: `Secure` requires HTTPS. Use HTTPS locally (e.g., mkcert) so `SameSite=None; Secure` works in dev.

## What to expect

1. Extension UI detects user is not signed in.
2. Extension background calls `POST /api/extension/signin` with email + password.
3. If successful, the session cookie is set with `SameSite=None; Secure; HttpOnly`.
4. Extension background then calls `GET /api/extension/session` with `credentials: 'include'`.
5. The browser attaches the session cookie; the endpoint returns `{ user }`.
6. Extension UI unlocks authenticated features.
7. (Optional) Open `/extension/handoff2` as a confirmation view; it shows you're signed in and auto-closes.

## Troubleshooting

- `POST /api/extension/signin` returns 401 (invalid credentials):

  - Verify email and password are correct.
  - Check the user exists in the database with that email.

- `GET /api/extension/session` returns 401 after sign-in:

  - Confirm the session cookie was set: DevTools → Application → Cookies → look for `__Secure-authjs.session-token` (or `authjs.session-token` on HTTP).
  - Ensure HTTPS is used on your app origin.
  - If the cookie exists but you still get 401, the session may have expired in the database. Try signing in again.

- Extension can't read the cookie:

  - Verify the extension manifest has `permissions: ["cookies"]` and `host_permissions` includes your app origin.
  - Ensure the extension background uses `credentials: 'include'` in fetch calls.

- Cookie attributes wrong or missing:
  - The `/api/extension/signin` endpoint is responsible for setting the cookie correctly.
  - If HTTPS is not available (dev), `SameSite=None; Secure` won't apply as expected; use HTTPS locally via mkcert.

## Notes

- We intentionally removed any token handoff. The extension should not store access tokens.
- Keep your app UI and API under the same origin (e.g., `https://app.example.com` with API under `/api`).
