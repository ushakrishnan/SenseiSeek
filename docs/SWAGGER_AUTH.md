## Authenticating Swagger UI

This short guide explains how to authenticate requests when using the static Swagger UI (`/swagger.html`) or ReDoc (`/redoc.html`) that load `public/openapi.json`.

- Summary
- Cookie-based auth: the app uses a session cookie named `ss-session` by default (the server sets `ss-session` when exchanging a Firebase ID token for a session cookie). Swagger will send that cookie when the UI is served from the same origin and the browser has the cookie set.
- Bearer token: you can paste a JWT into the Swagger Authorize dialog for `bearerAuth`.

Quick start

1. Serve the site (either run the Next dev server or serve the `public/` folder):

```powershell
# Serve the full app (recommended for normal testing):
npm run dev

# Or quickly serve the generated docs/static files (defaults to port 3001):
npm run docs
```

2. Open the Swagger UI:
- If running the Next dev server: http://localhost:3000/swagger.html
- If running `npm run docs`: http://localhost:3001/swagger.html

Cookie-based auth (recommended for end-to-end testing)

- Cookie name: `session`
- How it works: the OpenAPI spec is configured to use a cookie-based `session` auth by default. Swagger UI will send cookies that the browser already has for the origin hosting `swagger.html`.
- How to test:
  - Log in using the app (e.g., through the `/login` UI) on the same host and port as Swagger UI. That will set the `session` cookie in the browser; requests from Swagger UI will then include the cookie automatically.
  - If you can't log in interactively, you can manually add a cookie in your browser DevTools (Application → Cookies) for the host that served Swagger UI (name=`session`, value=`<your-session-cookie>`).
  - Make sure you open Swagger UI from the same origin as the cookie (same host and port) so the browser sends it.

Bearer token (alternate)

- Use the Authorize button in Swagger UI.
- Choose the `bearerAuth` scheme and paste `Bearer <your-jwt>` (Swagger will send `Authorization: Bearer <token>`).

Notes & troubleshooting

- Cross-origin cookies: browsers block cross-site cookies by default for many cases. If you serve Swagger UI from a different origin than the app, cookie auth may not work. Use bearerAuth in that case.
- Some endpoints require elevated admin privileges (custom claims). Use an admin session cookie or an admin JWT when testing those endpoints.
- Several routes accept JSON and internally convert to FormData for server actions; sending the JSON payload as described in the spec should work for those routes.
- Don't paste real production secrets into a public or shared environment. Revoke tokens/cookies when finished.

If you want, I can:
- Add a short entry in `docs/README.md` linking to this page.
- Add examples showing a minimal curl flow that uses a bearer token or sets a cookie header for manual testing.
Below are two minimal curl examples you can use to exercise protected endpoints from the command line.

Bearer token example (Authorization header)

```powershell
# Replace <JWT> and endpoint/data as needed
curl -X POST "http://localhost:3000/api/messages/initial" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT>" \
  -d '{"startupId":"startup_ABC","executiveId":"exec_123"}'
```

Cookie-based example (send session cookie in Cookie header)

```powershell
# Replace <SESSION_COOKIE> with your session cookie value (the cookie name is ss-session)
curl -X POST "http://localhost:3000/api/messages/initial" \
  -H "Content-Type: application/json" \
  -H "Cookie: ss-session=<SESSION_COOKIE>" \
  -d '{"startupId":"startup_ABC","executiveId":"exec_123"}'
```

Notes for curl testing
- Use the same origin (host/port) used by your app so session cookies are valid for that host. If your app runs on port 3000, use http://localhost:3000 in the examples.
- When testing cookie auth with curl you must supply a valid `session` cookie value. You can extract it from your browser after logging in, or set up a short-lived test JWT and use bearerAuth instead.
- For endpoints that require admin privileges, use an admin JWT or an admin session cookie.
- These examples send JSON; many routes internally build FormData from the JSON payload, which is handled by the server-side code.

Targeted curl examples

- Toggle shortlist

```powershell
curl -X POST "http://localhost:3000/api/shortlist" \
  -H "Content-Type: application/json" \
  -H "Cookie: ss-session=<SESSION_COOKIE>" \
  -d '{"startupId":"startup_ABC","executiveId":"exec_123","shortlist":true}'
```

- Toggle saved

```powershell
curl -X POST "http://localhost:3000/api/saved" \
  -H "Content-Type: application/json" \
  -H "Cookie: ss-session=<SESSION_COOKIE>" \
  -d '{"executiveId":"exec_123","startupNeedId":"need_456","save":true}'
```

- Promote user to admin (admin only)

```powershell
curl -X POST "http://localhost:3000/api/admin/promote" \
  -H "Content-Type: application/json" \
  -H "Cookie: ss-session=<ADMIN_SESSION_COOKIE>" \
  -d '{"email":"user@example.com"}'
```

- Parse resume (AI)

```powershell
curl -X POST "http://localhost:3000/api/ai/parse-resume" \
  -H "Content-Type: application/json" \
  -H "Cookie: ss-session=<SESSION_COOKIE>" \
  -d '{"resume":"Experienced product leader with ..."}'
```

If you want, I can:
 - Add a short entry in `docs/README.md` linking to this page.
 - Add more curl examples for other endpoints (shortlist, saved, admin/promote, parse-resume).
