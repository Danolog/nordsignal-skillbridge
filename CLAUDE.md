# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

SkillBridge AI is a Polish edtech platform that maps students' competencies (from their university syllabus) to job market requirements, detects competency gaps, and connects students with graduated real-world projects. AI serves as matchmaker, brief writer, and reviewer — students earn Verified Project Receipts in their Competency Passport. Originally built for the EduTech Masters competition by Grupa Merito — **won (2026)**; the project continues as an ongoing product with no competition deadline. Students get a shareable Competency Passport; faculty get an aggregated dashboard showing program vs. market alignment.

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| Next.js 15.5.12 (App Router) | Framework — server components by default |
| React 19.1.0 | UI rendering |
| TypeScript (strict) | Type safety, path alias `@/*` → `./src/*` |
| Better Auth 1.5.4 | Auth — email+password, Google OAuth; `dash()` plugin via `@better-auth/infra` |
| Drizzle ORM 0.45.1 | Database ORM with `db.query.*` and `db.select()` |
| PostgreSQL (`pg`) | Database — Docker locally, Neon on production |
| Vercel AI SDK v6 (`ai`) | `streamText`, `generateText` |
| `@ai-sdk/anthropic` | Anthropic provider for Claude |
| Tailwind CSS v4 | Styling via `@tailwindcss/postcss` |
| shadcn/ui | Component library in `src/components/ui/` |
| Recharts 3.x | Charts (faculty heatmap) |
| Zod 4.x | Schema validation |
| Biome 2.x | Linting + formatting (replaces ESLint + Prettier) |
| Vitest | Unit/component tests |

---

## Commands

```bash
# Development
pnpm dev

# Build (TypeScript + Next.js compile check)
pnpm build

# Lint (Biome)
pnpm lint
pnpm lint:fix

# Format
pnpm format

# Tests
pnpm test          # vitest watch
pnpm test:run      # vitest run (CI)
pnpm test:coverage # vitest with coverage
pnpm test:e2e      # bash-based E2E scripts (requires pnpm dev running)

# Database
pnpm db:generate   # generate migration files (after schema.ts changes)
pnpm db:migrate    # run migrations (source of truth)
pnpm db:push       # push schema to DB (deprecated — use migrations)
pnpm db:studio     # Drizzle Studio UI
pnpm db:seed       # seed demo data
```

---

## Implementation Status

### Currently Implemented
- Auth: login/signup pages, Google OAuth, Better Auth server + client
- DB schema: Better Auth tables + domain tables (`students`, `competencies`, `gaps`, `skillMaps`, `microCourses`, `passports`, `jobMarketData`) + project marketplace tables (`projects`, `projectCompetencies`, `projectSubmissions`, `projectSources`)
- Landing page (`/`) — hero, value props, how it works, CTA, footer with faculty panel link
- Dashboard: sidebar layout + hub with welcome card, stats, 4 nav tiles
- Onboarding: 3-step wizard (profile + career goal + syllabus upload) + AI syllabus parser
- Skill Map: React Flow competency graph with interactive nodes, detail panel, status coloring
- Gap Analysis: prioritized gap list with ring charts, "Why important?" AI generation, expandable explanations
- Project Marketplace: catalog with filters, personalized AI briefs, submission with AI review, Verified Project Receipts
- AI matchmaker: keyword overlap + Haiku LLM rerank (`match-projects.ts`)
- Project brief generator with inline Learning Steps (`generate-brief.ts`)
- Submission review with cheat detection (`review-submission.ts`)
- Competency Passport: private view + public shareable link (UUID) + PDF export + Verified Project Receipts
- Faculty Panel: shared password auth (`FACULTY_PASSWORD` cookie), heatmap dashboard (Recharts), top missing competencies, AI curriculum suggestions
- AI modules: `parse-syllabus`, `generate-skill-map`, `generate-why`, `generate-micro-course` (deprecated — `generateLearningSteps` extracted), `generate-faculty-suggestions`, `match-projects`, `generate-brief`, `review-submission`, `verify-gaps` (AG.1 — reusable gap-grounding verifier; jego pierwotny konsument `generate-gaps` usunięty w AG.2)
- Route protection middleware for authenticated routes
- Seed data: 15 demo students across 5 career paths, 90 job market records, 20 demo projects (L1-L3)
- Drizzle migrations as source of truth (in `drizzle/`)
- UI components: `button`, `card`, `dialog`, `dropdown-menu`, `input`, `label`, `select`, `separator`, `sonner`, `tabs`, `textarea`, `avatar`
- Biome config, Vitest config with comprehensive test coverage

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/                  # Login + signup pages (centered layout)
│   │   ├── layout.tsx
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (dashboard)/             # Authenticated app — sidebar layout
│   │   ├── layout.tsx           # Auth check + sidebar shell
│   │   ├── dashboard/page.tsx   # Hub with 4 nav tiles
│   │   ├── onboarding/page.tsx  # 3-step onboarding + syllabus parser
│   │   ├── skill-map/page.tsx   # React Flow competency graph
│   │   ├── gap-analysis/page.tsx
│   │   ├── micro-courses/
│   │   │   ├── page.tsx         # Course list
│   │   │   └── [id]/page.tsx    # Single course view
│   │   ├── projects/
│   │   │   ├── page.tsx         # Project catalog with filters
│   │   │   └── [id]/page.tsx    # Project detail + brief + submission
│   │   └── passport/page.tsx    # Competency passport
│   ├── faculty/                 # Faculty panel (shared password auth)
│   │   ├── login/page.tsx
│   │   └── page.tsx
│   ├── passport/[id]/page.tsx   # PUBLIC passport (no login required)
│   ├── chat/page.tsx            # Dev/demo AI chat page
│   ├── api/
│   │   ├── auth/[...path]/route.ts  # Better Auth handler
│   │   ├── chat/route.ts            # AI streaming chat
│   │   ├── onboarding/route.ts      # Save student + competencies
│   │   ├── syllabus/parse/route.ts  # AI syllabus parser
│   │   ├── skill-map/route.ts       # Skill map data
│   │   ├── gaps/                    # Gap list + "why important" AI
│   │   │   ├── route.ts
│   │   │   └── [id]/why/route.ts
│   │   ├── micro-courses/           # Course generation + completion
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   ├── passport/               # Passport data
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   └── faculty/                # Faculty login + dashboard data
│   │       ├── login/route.ts
│   │       └── dashboard/route.ts
│   ├── globals.css
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Landing page (public)
├── components/
│   ├── auth/                    # Login/signup forms + Google button
│   ├── ui/                      # shadcn/ui components
│   ├── dashboard/               # Sidebar, nav tiles, hub
│   ├── onboarding/              # 3-step wizard components
│   ├── skill-map/               # React Flow nodes, panels
│   ├── gap-analysis/            # Gap cards, list
│   ├── micro-courses/           # Course view, step accordion
│   ├── passport/                # Passport card, PDF export
│   └── faculty/                 # Faculty login form, heatmap
└── lib/
    ├── auth/
    │   ├── server.ts            # betterAuth instance (email+password + Google + dash)
    │   └── client.ts            # authClient (use client)
    ├── db/
    │   ├── index.ts             # db instance
    │   ├── schema.ts            # All DB tables and relations
    │   └── seed.ts              # Demo data seeding
    ├── ai/                      # AI generation modules
    │   ├── parse-syllabus.ts
    │   ├── generate-skill-map.ts
    │   ├── verify-gaps.ts       # AG.1: reusable gap-grounding verifier (Haiku)
    │   ├── generate-why.ts      # "Why is this important?"
    │   ├── generate-micro-course.ts  # @deprecated, Learning Steps extracted
    │   ├── generate-faculty-suggestions.ts
    │   ├── match-projects.ts    # Hybrid matchmaker (Haiku)
    │   ├── generate-brief.ts    # Personalized project brief (Sonnet)
    │   └── review-submission.ts # AI submission review (Sonnet)
    ├── faculty-auth.ts          # Cookie check for faculty panel
    └── utils.ts                 # cn() helper
```

---

## Architecture

**Next.js App Router** — server components by default, `"use client"` only where needed (interactivity, hooks, browser APIs).

Data flow:
1. **Server components** fetch data directly from DB via Drizzle, pass as props to client components
2. **Client components** call API routes for mutations and AI generation
3. **API routes** handle auth, DB writes, and AI calls (never from client directly)
4. **AI generation** always server-side via Vercel AI SDK + Anthropic provider

Route groups:
- `(auth)` — centered layout, no sidebar (public login/signup)
- `(dashboard)` — sidebar shell, requires Better Auth session
- `faculty/` — standalone, requires `faculty_session` cookie
- `passport/[id]` — fully public, no auth

---

## Code Patterns

### Auth — Server Component
```typescript
import { auth } from "@/lib/auth/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

const session = await auth.api.getSession({ headers: await headers() });
if (!session) redirect("/login");
const userId = session.user.id;
```

### Auth — API Route
```typescript
const session = await auth.api.getSession({ headers: await headers() });
if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
```

### Auth — Client Component
```typescript
import { authClient } from "@/lib/auth/client";
const { data: session } = authClient.useSession();
// or
await authClient.signOut();
```

### Database Query
```typescript
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { students } from "@/lib/db/schema";

const student = await db.query.students.findFirst({
	where: eq(students.userId, userId),
});
```

### AI Generation
```typescript
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

const { text } = await generateText({
	model: anthropic("claude-sonnet-4-6"),
	maxTokens: 2000,
	prompt: `...`,
});
// Strip JSON code blocks before parsing:
const cleaned = text.trim().replace(/^```json?\n?/, "").replace(/\n?```$/, "");
const result = JSON.parse(cleaned);
```

Always add `export const maxDuration = 60;` to API routes that call AI (generation can take 15–30s).

### Toast Notifications
```typescript
import { toast } from "sonner";
toast.success("Sukces!");
toast.error("Błąd!");
```

### Naming Conventions
- Files: `kebab-case.tsx`
- Components: `PascalCase`
- Hooks: `camelCase` with `use` prefix
- DB tables: `camelCase` in TS, `snake_case` in SQL
- API routes: `route.ts` inside directory matching URL path

### Code Style (Biome)
- Indent: **tabs** (not spaces)
- Quotes: **double**
- Trailing commas: **all**
- Semicolons: **always**
- Line width: 100

---

## Testing

- **Run tests**: `pnpm test:run`
- **Test location**: `src/**/*.{test,spec}.{ts,tsx}` and `tests/unit/**/*.{test,spec}.{ts,tsx}`
- **Framework**: Vitest + React Testing Library
- **E2E**: bash scripts in `tests/e2e/` — `pnpm test:e2e` (requires `pnpm dev` running)

---

## Validation

Run after every feature:

```bash
pnpm build     # TypeScript + Next.js compile — must pass with 0 errors
pnpm lint      # Biome — must pass with 0 warnings
pnpm db:generate # If schema.ts changed — generates migration
pnpm db:migrate  # Apply migrations
```

---

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/db/schema.ts` | Single source of truth for all DB tables and relations |
| `src/lib/auth/server.ts` | Better Auth instance — import `auth` from here |
| `src/lib/auth/client.ts` | Client-side auth — import `authClient` from here |
| `src/lib/db/index.ts` | Drizzle DB instance — import `db` from here |
| `src/middleware.ts` | Next.js middleware — route protection matchers |
| `drizzle.config.ts` | Drizzle Kit config (loads `.env.local` via dotenv) |
| `.agents/plans/00-master-roadmap.md` | Implementation sequence and shared patterns |

---

## On-Demand Context

| Topic | File |
|-------|------|
| Full implementation roadmap | `.agents/plans/00-master-roadmap.md` |
| DB schema plan | `.agents/plans/01-database-schema.md` |
| Landing page | `.agents/plans/02-landing-page.md` |
| Onboarding + syllabus parser | `.agents/plans/03-onboarding-flow.md` |
| Dashboard layout | `.agents/plans/04-dashboard-layout.md` |
| Skill Map (React Flow) | `.agents/plans/05-skill-map.md` |
| Gap Analysis | `.agents/plans/06-gap-analysis.md` |
| Micro-courses | `.agents/plans/07-micro-courses.md` |
| Competency Passport + PDF | `.agents/plans/08-passport.md` |
| Faculty Panel | `.agents/plans/09-faculty-panel.md` |
| Project Marketplace | `.agents/plans/10-project-marketplace.md` |
| Product requirements | `.claude/PRD.md` |
| Project Marketplace pivot | `docs/decisions/001-project-marketplace.md` |

---

## Notes

- **AI models**: `anthropic("claude-sonnet-4-6")` for quality generation (briefs, reviews); `anthropic("claude-haiku-4-5-20251001")` for matchmaker only
- **Project Marketplace**: replaces micro-courses as primary learning modality. `microCourses` table is deprecated (read-only, no new entries)
- **Drizzle migrations**: use `pnpm db:generate` after schema changes, `pnpm db:migrate` to apply. Migrations in `drizzle/` are source of truth. `db:push` is deprecated.
- **No SSR for browser-only libs**: `jsPDF`, `html2canvas`, `@xyflow/react` — must be `"use client"` and dynamically imported if needed
- **Faculty auth**: separate from Better Auth — uses `FACULTY_PASSWORD` env var + `faculty_session` HttpOnly cookie
- **Polish UI**: all user-facing text is in Polish (labels, toasts, error messages, AI outputs)
- **Anonymized faculty data**: faculty panel never shows student names or emails
- **Biome over ESLint**: do NOT add ESLint config — project uses Biome exclusively
- **pnpm only**: do NOT use npm or yarn — project uses pnpm workspaces
- **`@better-auth/infra` `dash()` plugin**: already configured in `src/lib/auth/server.ts` — provides Better Auth dashboard
