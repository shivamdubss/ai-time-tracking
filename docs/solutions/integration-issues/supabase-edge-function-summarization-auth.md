---
title: "AI Summarization fails with auth errors via Supabase Edge Function"
category: integration-issues
date: 2026-03-27
tags: [supabase, edge-function, auth, summarization, anthropic, access-token]
components: [backend/summarizer.py, backend/routes/sessions.py, supabase/functions/summarize/index.ts, frontend/src/lib/api.ts]
---

## Problem

After stopping a tracking session, AI summarization fails. Error messages evolved through three stages:

1. `"Could not resolve authentication method. Expected either api_key or auth_token to be set."` — Anthropic SDK error
2. `"Client error '404 Not Found' for url 'https://...supabase.co/functions/v1/summarize'"` — Edge function not deployed
3. `"401 Unauthorized"` — Edge function rejecting the auth token

## Root Cause (Three-Layer Issue)

**Layer 1 — Missing token threading:** `summarize_session()` in `backend/summarizer.py:272` gates the edge function path on `if SUPABASE_FUNCTION_URL and access_token`. The `access_token` parameter was never passed from the frontend. It defaulted to `""`, the condition always failed, and every request fell through to the direct Anthropic SDK path — which fails in production because `ANTHROPIC_API_KEY` isn't set on client machines.

**Layer 2 — Edge function never deployed:** Even after fixing the token threading, the Supabase Edge Function at `supabase/functions/summarize/index.ts` had never been deployed to the Supabase project, and the `ANTHROPIC_API_KEY` secret wasn't set on Supabase.

**Layer 3 — Edge function JWT verification too strict:** The edge function verified the caller's JWT via `supabaseClient.auth.getUser()`. The token passed from the backend wasn't a valid Supabase user JWT (users may not be logged into Supabase auth), causing 401s.

## Solution

### Fix 1: Thread the Supabase access token (frontend + backend)

**`frontend/src/lib/api.ts`** — `stopSession()` now accepts and sends the token:
```ts
stopSession: (supabaseAccessToken?: string) =>
  request<{ id: string; status: string }>('/sessions/stop', {
    method: 'POST',
    body: JSON.stringify({ supabase_access_token: supabaseAccessToken || '' }),
  }),
```

**`frontend/src/hooks/useTrackingContext.tsx`** — Gets token from `useAuth()` and passes it:
```ts
const { session: authSession } = useAuth()
// ...
await api.stopSession(authSession?.access_token)
```

**`backend/routes/sessions.py`** — Extracts token from request body, threads through `_summarize_and_cleanup()` to `summarize_session()`:
```python
body = await request.json()
supabase_access_token = body.get("supabase_access_token", "")
```

### Fix 2: Deploy edge function + set secret

```bash
npx supabase functions deploy summarize --no-verify-jwt --project-ref lyicrwtrcanotbffjnfk
npx supabase secrets set ANTHROPIC_API_KEY=<key> --project-ref lyicrwtrcanotbffjnfk
```

### Fix 3: Remove JWT verification from edge function

Removed the `supabaseClient.auth.getUser()` check and deployed with `--no-verify-jwt`. The backend already authenticates users via `TIMETRACK_AUTH_TOKEN`; double-verifying at the edge function was unnecessary and fragile.

## Prevention

- **Document deployment dependencies:** Edge functions must be deployed separately from the Electron app. Added deploy commands to `CLAUDE.md`.
- **Test the full chain:** Auth token threading spans 4 files across frontend and backend. When adding proxy layers, trace the full request path from UI to final API call.
- **Avoid redundant auth layers:** If your backend already authenticates callers, a serverless proxy doesn't need its own user-level auth — it just needs to not be publicly discoverable or rate-limited.

## Key Files

- `backend/summarizer.py` — `summarize_session()` with edge function vs direct Anthropic branching
- `backend/routes/sessions.py` — Session stop endpoint, background summarization task
- `supabase/functions/summarize/index.ts` — Edge function proxying to Anthropic
- `frontend/src/lib/api.ts` — API client
- `frontend/src/hooks/useTrackingContext.tsx` — Tracking UI logic
- `run_production.py:41` — Hardcoded default `SUPABASE_FUNCTION_URL`
