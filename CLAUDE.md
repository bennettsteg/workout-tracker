## What this is

A personal, single-user workout tracker: an exercise library, reusable workout templates, ad-hoc/templated session logging with per-set reps and weight (lbs), body weight history, and an Analytics tab with strength-progression and body-weight charts. Built as a Next.js (App Router) + TypeScript PWA, deployed via Docker on a home server and reachable only over an existing Tailscale VPN — no public exposure, no login wall, no auth of any kind. See issue #1 for the full v1 spec and its sub-issues (#2-#8) for the implementation breakdown.

## Commands

```bash
npm run dev               # Next.js dev server (Turbopack)
npm run build              # production build (also runs tsc)
npx tsc --noEmit            # typecheck only
npm run lint                # eslint
npm run test                 # vitest run (all tests)
npx vitest run path/to/file.test.ts   # single test file
npm run generate-icons        # regenerate public/icons/* and src/app/favicon.ico
```

### Local database

Point `DATABASE_URL` (see `.env.example`) at a local Postgres instance, then:

```bash
npx prisma migrate dev     # create/apply a migration during local schema iteration
npx prisma migrate deploy   # apply committed migrations only (what Docker/CI use)
```

Live-database tests (anything that imports `@/lib/db`) need `DATABASE_URL` pointing at a database with every migration applied; `vitest.config.ts` runs test files serially (`fileParallelism: false`) since the setup can't serve concurrent connections well. Run them against a scratch database, never one holding real data.

## Architecture

### Prisma 7 specifics

- Generator is `prisma-client` (not `prisma-client-js`), output goes to `src/generated/prisma` (gitignored, regenerated via `npx prisma generate` — never hand-edit it).
- The generated `PrismaClient` requires a driver adapter: `src/lib/db.ts` constructs it as `new PrismaClient({ adapter: new PrismaPg({ connectionString }) })`.
- Datasource URL for the CLI (migrate/db push) lives in `prisma.config.ts`, not in `prisma/schema.prisma`'s `datasource` block.

### Domain/service layer

A single testing seam: plain async functions directly on top of Prisma, under `src/lib/<area>/`. All business logic and validation lives there. Server Actions (`src/server-actions/*.ts`) are thin wrappers that call into it and do nothing else of consequence — the UI never talks to Prisma directly. See issue #3 for the full function list.

### Docker (`docker/Dockerfile`, `docker-compose.yml`)

Two build targets: `runner` (the `app` service, Next's standalone output) and `builder` (full `node_modules` + source, reused for the one-shot `migrate` service running `prisma migrate deploy`). No worker service — this app has no background jobs. Postgres is **not** a compose service: `app` and `migrate` join an external `database-network` and point at a new database on the existing Postgres instance via `DATABASE_URL`. `app` binds to `127.0.0.1:3000` only; Tailscale is the only access path.

### PWA (`public/sw.js`, `src/app/manifest.ts`)

Deliberately online-only: the service worker precaches `/offline.html` and serves it only when a navigation fails outright or the proxy returns 502/503/504. It never caches API/page data and never queues writes — any action needing the server must fail with a clear, visible error when offline, not silently. Registered in production builds only (`ServiceWorkerRegister`).

## Agent skills

### Issue tracker

Issues and specs live as GitHub issues on `bennettsteg/workout-tracker`, managed via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default canonical label vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`), unchanged from the skills' defaults. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout: `GLOSSARY.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
