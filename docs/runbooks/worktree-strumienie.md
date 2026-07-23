# Runbook — worktree per strumień (równoległe sesje agentów)

**Powód (incydent 2026-07-21):** dwie sesje agentów w JEDNYM katalogu roboczym
→ gałąź PR #190 przemyciła cudzy commit (mis3 siedział na lokalnym `main`
w momencie branchowania), a `git checkout` jednej sesji przełącza drzewo drugiej
w trakcie pracy. Decyzja Darka: strumienie rozdzielone na git worktree.

## Układ

```
~/Claude_Projekty/SkillBridge/                 # drzewo GŁÓWNE — strumień 1E/CI (Oliver)
~/Claude_Projekty/SkillBridge-worktrees/mis/   # strumień MIS (gałąź parkingowa strumien/mis)
~/Claude_Projekty/SkillBridge-worktrees/<X>/   # kolejne strumienie wg potrzeb
```

Wspólna baza obiektów `.git` (commity/gałęzie widoczne wszędzie od razu),
osobne drzewa robocze i osobne checkouty. Wspólne zostają też: kontenery
Postgres (`:5432` dev, `:5433` test) i store pnpm (instalacja w worktree ≈ 7 s).

## Reguły twarde

1. **Nikt nie commituje na lokalnym `main`.** `main` służy do `pull` i jako baza:
   `git fetch origin && git checkout -b feat/... origin/main` (zawsze z
   `origin/main`, nie z lokalnego HEAD — to dokładnie ten wektor przemytu).
2. **Jedna sesja agenta = jeden worktree.** Sesja w cudzym worktree nie robi
   `checkout`/`commit` (odczyt wolno).
3. **Porty dev:** drzewo główne `:3000`, `mis` `:3001`, kolejne `+1`
   (`PORT=3001 pnpm dev`). Bazy danych współdzielone — konflikty portów
   dotyczą tylko dev-serwera.
4. **Env i konfigi lokalne NIE są w gicie** — nowy worktree wymaga kopii:
   `.env.local`, `.env.test`, `.env.prod`, `.claude/settings.local.json`,
   `.vercel/project.json`.

## Nowy worktree (przepis)

```bash
cd ~/Claude_Projekty/SkillBridge
git worktree add ~/Claude_Projekty/SkillBridge-worktrees/<strumień> \
  -b strumien/<strumień> origin/main
cd ~/Claude_Projekty/SkillBridge-worktrees/<strumień>
mkdir -p .claude .vercel
cp ~/Claude_Projekty/SkillBridge/.env.{local,prod,test} .
cp ~/Claude_Projekty/SkillBridge/.claude/settings.local.json .claude/
cp ~/Claude_Projekty/SkillBridge/.vercel/project.json .vercel/
pnpm install --frozen-lockfile
```

Sprzątanie po zamknięciu strumienia:
`git worktree remove ~/Claude_Projekty/SkillBridge-worktrees/<strumień>`
(+ `git branch -d strumien/<strumień>`).

## Uwaga o gałęzi parkingowej

`strumien/<x>` to tylko miejsce postoju HEAD-a worktree (dwa worktree nie mogą
trzymać tej samej gałęzi, więc `main` zostaje w drzewie głównym). Pracy się na
niej NIE prowadzi — feature-gałęzie zawsze z `origin/main` (reguła 1).

## Serializacja operacji prod między sesjami (ingest / deploy / migracja)

Gdy dwie sesje żyją równolegle, **tylko jedna może wykonywać operację prod naraz**
(zaciąg danych NEON, deploy, migracja schemy). Build i bramki (review, testy, repack)
wolno równolegle — serializuje się **wyłącznie sam ingest/deploy/migrację**.

**Przed KAŻDĄ operacją prod — sprawdź, czy druga sesja nie zaciąga:**

1. `git fetch && git log origin/main -5` — czy main ruszył (druga sesja scaliła).
2. ⚠ **Backupy NEON to gałęzie Neona, NIE git.** `git branch -r | grep prod-backup`
   ZAWSZE zwróci false-negative — backupy nie są w repozytorium. Jedyny wiarygodny
   sprawdzian to **Neon API `GET /projects/{id}/branches`**, filtrowany po
   `prod-backup-pre-ingest-*` i świeżości `created_at`: świeży backup drugiej domeny
   (`*msql*`/`*mml*` itp.) = druga sesja właśnie zaciąga.
3. „STAN NA DZIŚ" w obu handoffach — marker zaciągu w toku.

Jeśli druga sesja zaciąga → **ZATRZYMAJ operację prod**, zbuduj tylko PR do bramki
i poczekaj/zsynchronizuj. To jedyna realna bariera serializacji między sesjami prod
(operacje na wierszach rozłącznych i tak są bezpieczne, ale model backup/restore
Neona wymaga jednego pisarza prod naraz). Ustalenie techniczne: Ethan (CTO), przy
f2-7 2026-07-23 — check `git branch -r` z wcześniejszej definicji pre-flightu był błędny.
