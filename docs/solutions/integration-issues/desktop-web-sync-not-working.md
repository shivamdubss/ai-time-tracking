---
title: "Desktop and web app not sharing data — sync engine never activates"
category: integration-issues
date: 2026-03-28
tags: [supabase, sync, electron, desktop, web, auth, service-key, access-token]
components: [backend/sync.py, backend/main.py, frontend/src/hooks/useAuth.tsx, frontend/src/lib/api.ts, run_production.py]
severity: critical
---

## Problem

The Windows desktop app and the web app showed completely different data despite the user being signed into the same Supabase account on both. Desktop data stayed local; the web app showed nothing from the desktop.

## Root Causes (three compounding issues)

### 1. Sync engine never activated

The backend has a `POST /api/auth/sync` endpoint (`backend/main.py:96`) that accepts a `user_id` and starts the `SyncEngine`. **The frontend never called it.** So `SyncEngine._sync_all()` checked `if not self._user_id` and returned immediately on every cycle — desktop data stayed in local SQLite forever.

### 2. Invalid Supabase service key

Supabase migrated to a new API key format. The `.env` had the old key (`ysb_secret_...`) which returned "Invalid API key" on every request. Even if the sync engine had activated, all push/pull operations would have failed silently (caught by `try/except`, logged as warnings).

**How we found it:** Running `sb.table('clients').select('id,name').execute()` with the old key threw `APIError: Invalid API key`. The new key format starts with `sb_secret_` instead of `ysb_secret_`.

### 3. Desktop app had no Supabase credentials

`run_production.py` loads `.env` from the app data directory (`%APPDATA%\Donna/.env` on Windows), not the project root. This file didn't contain `SUPABASE_URL` or any Supabase keys, so the sync engine was never even initialized on end-user machines.

### Bonus: Web app silently swallowed errors

`ClientsMattersPage.tsx` had a bare `catch { setClients([]) }` that hid all fetch errors. The user saw "no data" instead of "Not authenticated" or network errors, making debugging harder.

## Solution

### v1.0.5: Wire up sync activation (commits `5164ebf`, `f71e1b1`)

- **`api.ts`**: Added `notifyDesktopSync()` that POSTs user_id to `/api/auth/sync`
- **`useAuth.tsx`**: Calls `notifySync()` in both `getSession()` (app startup) and `onAuthStateChange` (sign-in), gated behind `isDesktopMode`
- **`auth.py`**: Added `/api/auth/sync` to `PUBLIC_PATHS` (fixes timing race — AuthProvider fires before bearer token is fetched)
- **`sessions.py`**: Triggers `sync_engine.sync_now()` after session completion for immediate push
- **`sync.py`**: Reduced sync interval from 300s to 60s

### v1.0.6: Use user access token instead of service key (commit `0c17642`)

Embedding the service_role key in a distributed binary is a security risk (bypasses RLS, full DB access). Instead:

- **`run_production.py`**: Bakes in `SUPABASE_URL` and `SUPABASE_ANON_KEY` as defaults (both are safe/public). No service key.
- **`main.py`**: Creates Supabase client with anon key instead of service key. Accepts `access_token` in `/api/auth/sync`.
- **`sync.py`**: Added `set_access_token()` that swaps the auth header on the Supabase client: `self._supabase.options.headers["Authorization"] = f"Bearer {access_token}"`
- **`useAuth.tsx`**: Passes `session.access_token` alongside `user.id`. Token refresh is handled naturally — `onAuthStateChange` fires on `TOKEN_REFRESHED` and re-sends the fresh token.
- **`ClientsMattersPage.tsx`**: Added `console.error()` to catch blocks.

## Key Debugging Steps

1. **Grep for the endpoint call**: `grep -r "api/auth/sync" frontend/` returned zero results — confirmed nobody called it
2. **Test service key directly**: `sb.table('clients').select('*').execute()` → "Invalid API key" — confirmed key was bad
3. **Check Supabase dashboard**: Data existed with correct `user_id` from seed triggers, but nothing from sync
4. **Check deployed JS bundle**: `curl <vercel-url>/assets/index-*.js | grep lyicrwtrcanotbffjnfk` — confirmed creds were baked in
5. **Compare user IDs**: Browser console `JSON.parse(localStorage.getItem('sb-...-auth-token'))?.user?.id` matched Supabase rows

## Prevention

- **Don't silently catch errors in data-fetching hooks** — at minimum `console.error()` so the browser console shows what's failing
- **When adding a backend endpoint, add the frontend call in the same PR** — the sync endpoint existed for weeks without anyone calling it
- **When Supabase rotates key formats, update all `.env` files** — check the API Keys page for "Your new API keys are here" banners
- **For distributed apps, never embed service_role keys** — use the user's access token with the anon key instead, letting RLS enforce access control
- **Bake safe defaults (URL, anon key) into the entry point** so the app works without manual `.env` configuration on end-user machines
