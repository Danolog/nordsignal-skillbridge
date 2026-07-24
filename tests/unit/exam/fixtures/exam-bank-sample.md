# FIXTURE — bank egzaminacyjny (syntetyczny, do testu jednostkowego packera)

> NIE jest to realny bank Sophii. Treść w pełni syntetyczna (trywialna arytmetyka),
> wierna formatowi §6 (`docs/curation/sophia-1e3-egzamin-f1-v0.1.md`): bloki `E{n}`,
> dwa warianty izomorficzne A/B, cztery opcje z jedną **pogrubioną** poprawną,
> linia konceptu `- → \`slug\` → …`, feedback D3. Utrzymuje kontrakt packera
> (`tools/content-curriculum-exam.ts`) niezależnie od niecommitowanego DRAFTu Sophii.
> Pokrycie: 2 koncepty × 3 sloty = 6 slotów (E1–E6), 12 wariantów; poprawne indeksy
> rozłożone na 0–3 (adwersaryjnie pod gradeAnswer); blok E99 w §7 = granica źródła.

## 6. Bank pytań egzaminacyjnych (E1–E6)

Format wpisu: **wariant A** i **wariant B** (izomorficzne); cztery opcje, **pogrubiona** poprawna; po opcjach diagnoza dystraktorów; `→ koncept → atom`; `Feedback studenta (D3):`.

### Koncept `dodawanie` (F.1) — E1–E3

**E1.** Suma dwóch małych liczb.
- **A. Ile to `2 + 2`?** — **`4`** / `3` / `5` / `22`
  - `3` — *błędne: o jeden za mało.* `5` — *błędne: o jeden za dużo.* `22` — *błędne: to sklejenie cyfr, nie suma.*
- **B. Ile to `3 + 3`?** — `5` / `7` / `33` / **`6`**
  - `5` — *błędne: za mało.* `7` — *błędne: za dużo.* `33` — *błędne: sklejenie.*
- → `dodawanie` → F.1
- **Feedback studenta (D3):** „Dodawanie to suma, nie sklejenie cyfr. Odśwież: atom F.1."

**E2.** Suma z inną parą składników.
- **A. Ile to `1 + 4`?** — `4` / `6` / **`5`** / `14`
  - `4` — *błędne: to tylko drugi składnik.* `6` — *błędne: za dużo.* `14` — *błędne: sklejenie.*
- **B. Ile to `2 + 5`?** — `6` / **`7`** / `8` / `25`
  - `6` — *błędne: za mało.* `8` — *błędne: za dużo.* `25` — *błędne: sklejenie.*
- → `dodawanie` → F.1
- **Feedback studenta (D3):** „Policz oba składniki razem. Odśwież: atom F.1."

**E3.** Suma z zerem i z bliźniakami.
- **A. Ile to `0 + 9`?** — `8` / `10` / `09` / **`9`**
  - `8` — *błędne: za mało.* `10` — *błędne: za dużo.* `09` — *błędne: to zapis, nie wynik.*
- **B. Ile to `5 + 5`?** — **`10`** / `9` / `11` / `55`
  - `9` — *błędne: za mało.* `11` — *błędne: za dużo.* `55` — *błędne: sklejenie.*
- → `dodawanie` → F.1
- **Feedback studenta (D3):** „Zero nic nie dodaje; bliźniaki się podwajają. Odśwież: atom F.1."

### Koncept `mnozenie` (F.2) — E4–E6

**E4.** Iloczyn dwóch małych liczb.
- **A. Ile to `2 * 3`?** — `5` / **`6`** / `8` / `23`
  - `5` — *błędne: to suma, nie iloczyn.* `8` — *błędne: za dużo.* `23` — *błędne: sklejenie.*
- **B. Ile to `3 * 3`?** — `6` / `12` / **`9`** / `33`
  - `6` — *błędne: to suma.* `12` — *błędne: za dużo.* `33` — *błędne: sklejenie.*
- → `mnozenie` → F.2
- **Feedback studenta (D3):** „Iloczyn to powtórzone dodawanie, nie suma. Odśwież: atom F.2."

**E5.** Iloczyn z inną parą.
- **A. Ile to `4 * 2`?** — **`8`** / `6` / `10` / `42`
  - `6` — *błędne: to suma.* `10` — *błędne: za dużo.* `42` — *błędne: sklejenie.*
- **B. Ile to `5 * 2`?** — `7` / **`10`** / `12` / `52`
  - `7` — *błędne: to suma.* `12` — *błędne: za dużo.* `52` — *błędne: sklejenie.*
- → `mnozenie` → F.2
- **Feedback studenta (D3):** „Podwojenie to mnożenie przez dwa. Odśwież: atom F.2."

**E6.** Iloczyn dający większy wynik.
- **A. Ile to `3 * 4`?** — `7` / `16` / **`12`** / `34`
  - `7` — *błędne: to suma.* `16` — *błędne: za dużo.* `34` — *błędne: sklejenie.*
- **B. Ile to `2 * 6`?** — `10` / **`12`** / `14` / `26`
  - `10` — *błędne: za mało.* `14` — *błędne: za dużo.* `26` — *błędne: sklejenie.*
- → `mnozenie` → F.2
- **Feedback studenta (D3):** „Iloczyn rośnie szybciej niż suma. Odśwież: atom F.2."

## 7. Brama przed oddaniem (poza §6 — packer musi to zignorować)

**E99.** Blok POZA sekcją §6 — nie może wejść do banku (granica źródła).
- **A. Ile to `9 + 9`?** — `17` / **`18`** / `19` / `99`
  - `17` — *błędne.* `19` — *błędne.* `99` — *błędne: sklejenie.*
- **B. Ile to `8 + 8`?** — **`16`** / `15` / `17` / `88`
  - `15` — *błędne.* `17` — *błędne.* `88` — *błędne: sklejenie.*
- → `dodawanie` → F.99
- **Feedback studenta (D3):** „Nie powinienem tu być — jestem w §7."
