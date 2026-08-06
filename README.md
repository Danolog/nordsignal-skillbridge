# SkillBridge AI

Polish edtech platform that maps students' competencies (from university syllabus) to job market requirements, detects competency gaps, and connects students with graduated real-world projects. Built for the EduTech Masters competition by Grupa Merito.

## Features

- **Onboarding + Syllabus Parser** — 3-step wizard, AI parses university syllabus to extract competencies
- **Skill Map** — React Flow graph visualizing competencies vs. job market requirements
- **Gap Analysis** — AI detects missing skills with "why important" explanations
- **Project Marketplace** — Real-world projects graduated L1-L5 from open data and OSS. AI matchmaker recommends projects, generates personalized briefs with Learning Steps, and reviews submissions
- **Verified Project Receipts** — AI-reviewed project submissions displayed in the Competency Passport with scores, artifact links, and feedback
- **Competency Passport** — Shareable public page with student's skill profile and project receipts
- **Faculty Panel** — Aggregated dashboard showing program vs. market alignment (anonymized)

## Tech Stack

- **Framework:** Next.js 15 (App Router, `src/` directory)
- **UI:** React 19, Tailwind CSS v4, shadcn/ui, Lucide icons, Recharts
- **Database:** PostgreSQL (Docker locally, Neon on production) + Drizzle ORM
- **Auth:** Better Auth (email+password, Google OAuth)
- **AI:** Vercel AI SDK + Anthropic Claude (claude-sonnet-4-6)
- **Testing:** Vitest (unit), Playwright (E2E)
- **Linting/Formatting:** Biome

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- PostgreSQL (Docker: `docker run -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres`)

### Setup

1. **Install dependencies:**

   ```bash
   pnpm install
   ```

2. **Configure environment variables:**

   ```bash
   cp .env.example .env.local
   ```

   Fill in your database URL, Better Auth secret, and API keys.

3. **Run database migrations:**

   ```bash
   pnpm db:migrate
   ```

4. **Start the dev server:**

   ```bash
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server |
| `pnpm build` | Production build |
| `pnpm lint` | Lint with Biome |
| `pnpm lint:fix` | Auto-fix lint issues |
| `pnpm format` | Format with Biome |
| `pnpm test` | Run unit tests (watch mode) — no database needed |
| `pnpm test:run` | Run unit tests once — no database needed |
| `pnpm test:integration` | Run integration tests — **requires a test database, fails hard without one** |
| `pnpm test:e2e` | Run E2E tests |
| `pnpm db:push` | Push schema to database |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm db:studio` | Open Drizzle Studio |

### Integration tests need a real database — on purpose

`pnpm test:integration` runs against a real Postgres. Without a usable
`DATABASE_URL` the run **aborts with a non-zero exit code** and prints setup
instructions. It does *not* skip.

This is deliberate. Until 2026-08-06 a missing `DATABASE_URL` made the whole
integration suite skip silently: the run exited 0 and the summary read
`388 skipped`, which looks like success. Green runs said nothing about what
they were supposed to verify — that is why three placeholder guards survived in
the codebase until 2026-08-01. The precondition lives in the `integration`
vitest project (`src/test/integration-db-guard.ts`).

Local setup (4 steps):

```bash
docker compose -f docker-compose.test.yml up -d
cp .env.test.example .env.test        # template, no real secrets
set -a; source .env.test; set +a      # loads DATABASE_URL into the shell
pnpm db:migrate:test && pnpm test:integration
```

`DATABASE_URL` must point at `localhost` / `127.0.0.1` / `::1` **and** at a
database named `test` or ending in `_test`, with credentials in the address.
A remote host or your local dev database is rejected — this suite deletes and
rewrites rows. `CONFIRM_PROD_DB=1` and `E2E_ALLOW_REMOTE=1` do **not** open a
door here; they only apply to the migration scripts in `tools/`.

No database at hand? Use `pnpm test:run` — the unit project excludes the
integration suite and needs no Postgres. Note that `pnpm test:coverage` runs
*every* project, so it hits the same precondition; that is intended, because
coverage that quietly omits the integration suite overstates what is covered.
