# SkillBridge AI — Master Implementation Roadmap

**Deadline**: 19 marca 2026 (12 dni)
**Stack**: Next.js 15 App Router · Better Auth · Drizzle ORM · PostgreSQL (Docker local / Neon prod) · Vercel AI SDK + Claude claude-sonnet-4-6 · Tailwind v4 · shadcn/ui · TypeScript strict · Biome

---

## Execution Order (strict dependency sequence)

| # | Plan File | Feature | Depends On | Complexity | Est. Time |
|---|-----------|---------|-----------|-----------|-----------|
| 01 | `01-database-schema.md` | DB Schema + Seed | — | Medium | 1h |
| 02 | `02-landing-page.md` | Landing Page | — | Low | 1h |
| 03 | `03-onboarding-flow.md` | Onboarding + Syllabus Parser | 01 | High | 3h |
| 04 | `04-dashboard-layout.md` | Dashboard Layout + Nav | 01, 03 | Low | 1h |
| 05 | `05-skill-map.md` | Skill Map (React Flow) | 01, 03, 04 | High | 3h |
| 06 | `06-gap-analysis.md` | Gap Analysis | 01, 03, 04 | Medium | 2h |
| 07 | `07-micro-courses.md` | Micro-course Generator | 06 | High | 2h |
| 08 | `08-passport.md` | Competency Passport + PDF + Public Link | 01, 03, 04, 07 | Medium | 2h |
| 09 | `09-faculty-panel.md` | Faculty Panel | 01 | Medium | 2h |

**Total estimated**: ~17h across 9 features

---

## Mandatory Workflow Rules

### UX/UI Design (before implementing any frontend feature)
**Every feature that involves UI screens must start with the `/ux-ui-designer` skill.**

Steps:
1. Invoke `/ux-ui-designer` with the feature context before writing any frontend code
2. The skill produces interactive HTML wireframes — review them in the browser
3. Use the approved wireframes as the design spec when implementing components
4. Do NOT write production UI code without an approved wireframe

Applies to: Landing Page (02), Onboarding (03), Dashboard Layout (04), Skill Map (05), Gap Analysis (06), Micro-courses (07), Passport (08), Faculty Panel (09).

### Testing (after every feature AND after every phase)
**Every completed feature must be validated with the `/testing-loop` skill.**

Steps after each feature:
1. Run `pnpm build` — must pass with 0 errors
2. Run `pnpm lint` — must pass with 0 warnings
3. Invoke `/testing-loop` (Feature Testing Loop mode) for the just-completed feature
4. Fix all failures before starting the next feature

Steps after each phase (group of related features):
1. Invoke `/testing-loop` (Pre-Production Testing mode) for a full audit
2. Ensure CI/CD quality gate passes before marking the phase done

**Never skip testing.** A feature is not "done" until `/testing-loop` passes.

---

## Tech Stack Reference

### Framework
- **Next.js 15.5.12** — App Router, server components by default
- **React 19.1.0**
- **TypeScript** — strict mode, path alias `@/*` → `./src/*`

### Auth
- **Better Auth 1.5.4** — email+password enabled
- Server: `import { auth } from "@/lib/auth/server"`
- Client: `import { authClient } from "@/lib/auth/client"`
- Session (server component): `auth.api.getSession({ headers: await headers() })`
- Session (client): `authClient.useSession()` or `authClient.getSession()`

### Database
- **Drizzle ORM 0.45.1** — `import { db } from "@/lib/db"`
- **PostgreSQL** — Docker local (`postgresql://skillbridge:skillbridge@localhost:5432/skillbridge`)
- Push schema: `pnpm db:push`
- Studio: `pnpm db:studio`

### AI
- **Vercel AI SDK 6.x** — `import { streamText, generateText } from "ai"`
- **Anthropic provider** — `import { anthropic } from "@ai-sdk/anthropic"`
- **Model**: `anthropic('claude-sonnet-4-6')`

### UI Components (shadcn/ui — already installed)
- `@/components/ui/button`, `card`, `input`, `label`, `textarea`, `dialog`
- `@/components/ui/tabs`, `separator`, `sonner`, `dropdown-menu`, `avatar`
- **lucide-react** icons
- **recharts** (already in deps) for charts

### Code Style (Biome)
- Indent: **tabs**
- Quotes: **double**
- Trailing commas: **all**
- Semicolons: **always**
- Line width: 100

### Validation Commands (run after every feature)
```bash
pnpm build              # TypeScript + Next.js compile check
pnpm lint               # Biome linter
pnpm db:push            # If schema changed
```

> After running these commands, always invoke `/testing-loop` to complete the validation cycle.

---

## Shared Patterns

### Server Component Auth Check
```typescript
import { auth } from "@/lib/auth/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

const session = await auth.api.getSession({ headers: await headers() });
if (!session) redirect("/login");
const userId = session.user.id;
```

### API Route Auth Check
```typescript
import { auth } from "@/lib/auth/server";
import { headers } from "next/headers";

const session = await auth.api.getSession({ headers: await headers() });
if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
```

### Drizzle Query Pattern
```typescript
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { students } from "@/lib/db/schema";

const student = await db.query.students.findFirst({
	where: eq(students.userId, userId),
});
```

### AI Generation Pattern
```typescript
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

const { text } = await generateText({
	model: anthropic("claude-sonnet-4-6"),
	prompt: `...`,
	maxTokens: 2000,
});
const result = JSON.parse(text);
```

### Toast Notifications
```typescript
import { toast } from "sonner";
toast.success("Message");
toast.error("Error message");
```

---

## File Structure After All Features

```
src/
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx              ← NEW: sidebar + nav
│   │   ├── dashboard/page.tsx      ← NEW: main dashboard hub
│   │   ├── onboarding/page.tsx     ← NEW: 3-step onboarding
│   │   ├── skill-map/page.tsx      ← NEW: React Flow
│   │   ├── gap-analysis/page.tsx   ← NEW
│   │   ├── micro-courses/
│   │   │   ├── page.tsx            ← NEW: courses list
│   │   │   └── [id]/page.tsx       ← NEW: single course
│   │   └── passport/page.tsx       ← NEW
│   ├── (public)/
│   │   └── passport/[id]/page.tsx  ← NEW: public read-only
│   ├── api/
│   │   ├── auth/[...path]/route.ts
│   │   ├── chat/route.ts
│   │   ├── onboarding/route.ts     ← NEW
│   │   ├── syllabus/parse/route.ts ← NEW
│   │   ├── skill-map/route.ts      ← NEW
│   │   ├── gaps/route.ts           ← NEW
│   │   ├── gaps/[id]/why/route.ts  ← NEW
│   │   ├── micro-courses/route.ts  ← NEW
│   │   ├── micro-courses/[id]/route.ts ← NEW
│   │   ├── passport/route.ts       ← NEW
│   │   └── faculty/
│   │       ├── login/route.ts      ← NEW
│   │       └── dashboard/route.ts  ← NEW
│   ├── faculty/
│   │   ├── login/page.tsx          ← NEW
│   │   └── page.tsx                ← NEW
│   ├── passport/[id]/page.tsx      ← NEW (public)
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                    ← UPDATE: landing page
├── components/
│   ├── auth/ (existing)
│   ├── ui/ (existing)
│   ├── onboarding/                 ← NEW
│   ├── skill-map/                  ← NEW
│   ├── gap-analysis/               ← NEW
│   ├── micro-courses/              ← NEW
│   ├── passport/                   ← NEW
│   └── faculty/                    ← NEW
└── lib/
    ├── auth/ (existing)
    ├── db/
    │   ├── index.ts (existing)
    │   ├── schema.ts               ← UPDATE: add all tables
    │   └── seed.ts                 ← NEW: job market data
    ├── ai/
    │   ├── parse-syllabus.ts       ← NEW
    │   ├── generate-skill-map.ts   ← NEW
    │   ├── generate-gaps.ts        ← NEW
    │   ├── generate-micro-course.ts ← NEW
    │   └── generate-why.ts         ← NEW
    └── utils.ts (existing)
```

---

## Merito Universities List (for onboarding dropdown)
```
WSB Merito Gdańsk, WSB Merito Gdynia, WSB Merito Wrocław,
WSB Merito Poznań, WSB Merito Warszawa, WSB Merito Bydgoszcz,
WSB Merito Toruń, WSB Merito Łódź, WSB Merito Szczecin,
WSB Merito Opole, WSB Merito Chorzów, WSB Merito Kraków,
WSB Merito Rzeszów, WSB Merito Lublin
```

## Career Goals List (for onboarding dropdown)
```
Data Analyst, Data Scientist, Frontend Developer, Backend Developer,
Full-stack Developer, UX/UI Designer, Project Manager,
DevOps Engineer, Cybersecurity Analyst, Inne (wpisz)
```

## Dług techniczny (po Becie v0.1)

Świadomie odłożone utwardzenia — nie blokują Bety, do domknięcia po niej.

- **[#19](https://github.com/Danolog/nordsignal-skillbridge/issues/19) — FORCE RLS + dedykowana rola login nie-owner dla runtime.** K3 (PR #18) wprowadził RLS w trybie `ENABLE` (nie `FORCE`); runtime łączy się jako owner, który bypassuje non-FORCE RLS. Dziś izolacja danych studenta opiera się **wyłącznie** na `WHERE student_id/user_id` (warstwa 1) — działa, ale bez backupu RLS. Zakres: rola login nie-owner bez `BYPASSRLS`, osobny connection string runtime, `FORCE ROW LEVEL SECURITY`, przepięcie ścieżek studenta na `withTenantContext`, oraz wpięcie `tools/k3-validate.ts` do CI. Patrz ADR-003, `docs/security/rls-matrix.md`.
