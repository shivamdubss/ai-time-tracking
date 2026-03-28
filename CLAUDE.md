# CLAUDE.md

## gstack

Use the `/browse` skill from gstack for all web browsing. Never use `mcp__claude-in-chrome__*` tools.

### Available skills

- `/office-hours` — YC-style brainstorming and idea validation
- `/plan-ceo-review` — CEO/founder-mode plan review
- `/plan-eng-review` — Engineering manager plan review
- `/plan-design-review` — Designer's eye plan review
- `/design-consultation` — Design system and brand guidelines
- `/review` — Pre-landing PR code review
- `/ship` — Ship workflow (tests, review, PR)
- `/land-and-deploy` — Merge PR, deploy, verify production
- `/canary` — Post-deploy canary monitoring
- `/benchmark` — Performance regression detection
- `/browse` — Headless browser for testing and dogfooding
- `/qa` — QA test and fix bugs
- `/qa-only` — QA report only (no fixes)
- `/design-review` — Visual QA and design polish
- `/setup-browser-cookies` — Import browser cookies for auth
- `/setup-deploy` — Configure deployment settings
- `/retro` — Weekly engineering retrospective
- `/investigate` — Systematic debugging with root cause analysis
- `/document-release` — Post-ship documentation update
- `/codex` — OpenAI Codex second opinion
- `/cso` — Security audit and threat modeling
- `/autoplan` — Auto-review pipeline (CEO + design + eng)
- `/careful` — Safety guardrails for destructive commands
- `/freeze` — Restrict edits to a specific directory
- `/guard` — Full safety mode (careful + freeze)
- `/unfreeze` — Remove freeze boundary
- `/gstack-upgrade` — Upgrade gstack to latest version

## Landing Page Deployment
The marketing site lives in `landing/`. Vercel project is linked there.
- **Deploy:** `cd landing && npx vercel --prod`
- **Build:** `cd landing && npm run build`
- The repo root is NOT the landing page — deploying from root will fail (tries to build the React app).

## Desktop App Deployment (Windows + Mac)
The Electron app is built and released via GitHub Actions.
Artifact filenames are version-free (`DonnaSetup.exe`, `Donna.dmg`) so landing page links never need updating.
1. Bump version in `electron/package.json`
2. Commit and tag: `git tag v<version>`
3. Push with tags: `git push origin main --tags`
4. GitHub Actions builds Windows (NSIS installer) and macOS (DMG) automatically — monitor at the Actions tab
5. **Always deploy landing page after any landing/ changes:** `cd landing && npx vercel --prod`

## Web App Deployment
The web app deploys from `frontend/`. Separate Vercel project from the landing page.
- **Deploy:** `cd frontend && npx vercel --prod`
- **Build:** `cd frontend && npm run build`
- Requires `VITE_DEPLOY_TARGET=web` environment variable on Vercel (plus `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`).
- The web app talks directly to Supabase — no backend needed. Everything works except time tracking (screen capture).
- After creating the Vercel project, add its URL to Supabase Auth > URL Configuration > Redirect URLs for Google OAuth.

## Supabase Edge Function
The `summarize` edge function proxies AI calls to Anthropic so users don't need API keys.
- **Deploy:** `npx supabase functions deploy summarize --project-ref lyicrwtrcanotbffjnfk`
- **Set secrets:** `npx supabase secrets set ANTHROPIC_API_KEY=<key> --project-ref lyicrwtrcanotbffjnfk`
- **Code:** `supabase/functions/summarize/index.ts`
- If you modify the edge function, you must redeploy it separately from the desktop app.

## Design System
Always read DESIGN.md before making any visual or UI decisions.
All font choices, colors, spacing, and aesthetic direction are defined there.
Do not deviate without explicit user approval.
In QA mode, flag any code that doesn't match DESIGN.md.
