# Decision Document: Sanityzacja TheoryMarkdown (B3) — biblioteka i schema allowlisty

**Status:** Accepted
**Date:** 2026-05-31
**Author:** Ethan (CTO, with Claude Code)
**Sign-off:** Ethan (CTO). Strona security (XSS = powierzchnia domeny 8) — sign-off ad-hoc Ryana (CRCO) na schemat allowlisty przy landingzie B3/Z3 (nie pełen audyt domeny 8; analogicznie do DoD Z3 w `docs/briefings/2026-05-28-hire-jack-frontend.md` po stronie nordsignal).
**Related:** spec Mili `skillbridge-panel-studenta-b3-b4-b5-spec.md` v0.2 §2.5 (🔴 sanityzacja markdown), §2.7 (kontrakt renderowania + allowlista), §2.7.3 (`TheoryMarkdown`) · ADR-002 stack (`@ai-sdk/anthropic` — `theory_md` częściowo generowany LLM) · ADR-003 (wzorzec wielowarstwowej egzekucji) · G10 Jacka (executor nie wybiera bibliotek — ta decyzja jest tym wyborem)

---

## Context

B3 renderuje `projects.theory_md` — markdown z wprowadzeniem teoretycznym do projektu. Treść jest **częściowo generowana modelem językowym** (Sophia produkuje teorię z asystą AI, T4 katalogu, PRD §5), więc to **powierzchnia ataku XSS**: prompt injection albo zatruty fragment katalogu może wstrzyknąć HTML/skrypt, który renderuje się w przeglądarce studenta.

Spec Mili §2.5 i §2.7 nazywa **wymóg** (nie wybór): renderer `TheoryMarkdown` nie pass-throughuje surowego HTML, akceptuje **wyłącznie** podzbiór markdown z §2.7.1, resztę odrzuca (drop, nie escape do widocznego stringa). §2.7.3 wprost odsyła wybór biblioteki do mnie: *„Decyzja biblioteki — Ethan (sekcja 7.1)"*. To ten ADR. Bez niego Jack (executor, Haiku, G10) zgaduje bibliotekę i konfigurację — a zgadnięcie na granicy bezpieczeństwa to regresja, nie kosmetyka.

Allowlista ze spec §2.7.1 (źródło prawdy renderowanych elementów):

| Render | Dozwolone | Odrzucone (drop) |
|---|---|---|
| Blokowe | `p`, `ul`/`ol`/`li`, `h3`, `pre`>`code` | `h1`/`h2`/`h4`–`h6`, `blockquote`, `table`/`*`, `img`, `hr` |
| Inline | `code`, `a`, `strong`, `em` | surowy HTML `<div>…</div>` itd. |

---

## Problem

Trzy sposoby renderowania `theory_md` różnią się klasą gwarancji bezpieczeństwa:

1. **`dangerouslySetInnerHTML` z markdown→HTML (np. `marked`) bez sanityzacji** — wprost otwiera XSS. Wykluczone z definicji.
2. **`react-markdown` z `skipHtml` / `disallowedElements`** — `react-markdown` v9 **domyślnie nie renderuje surowego HTML** (wymaga osobnego `rehype-raw`, którego nie dodajemy). `skipHtml` jest więc praktycznie no-opem na domyślnej konfiguracji, a `disallowedElements` **usuwa tagi, ale nie sanityzuje atrybutów** (`href="javascript:…"`, `on*=`). To kontrola oparta na *zachowaniu domyślnym* i na liście *negatywnej* — krucha: ktoś w przyszłości doda `rehype-raw` dla innego widoku i granica cicho znika.
3. **`react-markdown` + `rehype-sanitize` z jawnym schematem allowlisty** — sanityzuje drzewo `hast` względem **zadeklarowanego, pozytywnego** schematu: odcina niedozwolone tagi **oraz** niebezpieczne atrybuty **oraz** protokoły URL (`javascript:`, `data:`). To narzędzie *przeznaczone* do bycia granicą bezpieczeństwa, a granica jest **jawna i audytowalna**, nie domyślna.

---

## Decision

**`react-markdown` (CommonMark, bez `rehype-raw`, bez `remark-gfm`) + `rehype-sanitize` z restrykcyjnym, własnym schematem allowlisty**, scentralizowane w komponencie `src/components/skillbridge/b3/TheoryMarkdown.tsx` (spec §2.7.3).

```bash
pnpm add react-markdown rehype-sanitize
# remark-gfm CELOWO pominięte — dodaje tabele i strikethrough; tabele = OUT w spec v0.2 (§2.7.1).
# rehype-raw CELOWO niedodane — to jedyna droga, którą surowy HTML wszedłby do drzewa jako elementy.
```

Schemat = `defaultSchema` z `rehype-sanitize` zawężony do allowlisty §2.7.1, z utwardzeniem linków:

```typescript
// src/components/skillbridge/b3/theory-markdown-schema.ts
import { defaultSchema } from "rehype-sanitize";

export const theoryMarkdownSchema = {
	...defaultSchema,
	tagNames: ["p", "ul", "ol", "li", "h3", "pre", "code", "a", "strong", "em", "br"],
	attributes: {
		a: ["href"], // target/rel dokładamy w components (niżej), nie z treści
		code: ["className"], // language-* dla bloków kodu; reszta odcięta
	},
	// Protokoły linków — tylko bezpieczne; javascript:/data: odrzucone:
	protocols: { href: ["http", "https", "mailto"] },
	// h1/h2/h4-h6, blockquote, img, table*, hr, del, input — NIEobecne w tagNames → drop.
	clobberPrefix: "theory-", // brak kolizji id/name z resztą DOM
};
```

```tsx
// TheoryMarkdown.tsx — szkielet kontraktu (Jack implementuje resztę wg spec §2.7.2 tokeny)
<ReactMarkdown
	rehypePlugins={[[rehypeSanitize, theoryMarkdownSchema]]}
	// brak rehypeRaw, brak remarkGfm
	components={{
		a: ({ href, children }) => (
			<a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
		),
		// pre: focusable przy scrollu (a11y §2.7.3), tokeny per element §2.7.2
	}}
>
	{source}
</ReactMarkdown>
```

To zgodne z rekomendacją Leo (`rehype-sanitize`) — ratyfikuję ją i dokładam dwie rzeczy, których goła rekomendacja nie nazywa: **(a)** jawny zakaz `rehype-raw` jako osobna warstwa, **(b)** allowlistę protokołów `href` (bez niej `[x](javascript:alert(1))` nadal przechodzi przez sam filtr tagów).

---

## Why this variant — egzekucja wielowarstwowa (wzorzec ADR-003 §3.2)

Granica XSS, jak izolacja tenanta w ADR-003, jest egzekwowana **wielowarstwowo** — żadna warstwa sama nie jest jedynym punktem awarii:

| Warstwa | Mechanizm | Co łapie |
|---|---|---|
| 1 | **Brak `rehype-raw`** w pipeline `react-markdown` | surowy HTML nigdy nie wchodzi do drzewa jako elementy |
| 2 | **`rehype-sanitize` + `theoryMarkdownSchema`** (pozytywna allowlista) | tagi spoza §2.7.1, niebezpieczne atrybuty (`on*`), `style` |
| 3 | **`protocols.href`** = `http`/`https`/`mailto` | `javascript:`/`data:` URL w linkach prozy |
| 4 | **Centralizacja w `TheoryMarkdown`** (spec §2.7.3) | jedno audytowalne miejsce; allowlista nie rozlewa się po stronach (paszport/panel faculty w Fazie 2 reużyją tego samego kontraktu) |
| 5 | **Test bezpieczeństwa** (Validation plan niżej) | regresja, gdyby ktoś rozluźnił schemat |

Warstwa 1 może zniknąć (ktoś doda `rehype-raw`) → łapie warstwa 2. Schemat ktoś rozluźni → łapie warstwa 3 dla linków i warstwa 5 w CI. To ten sam wzorzec, którym SkillBridge egzekwuje tenant-isolation — nie inwencja, ratyfikacja doktryny.

---

## Consequences / gotchas

1. **`theory_md` z elementem spoza allowlisty renderuje się jako *brak* tego elementu, nie błąd.** Drop jest cichy z punktu widzenia studenta (spec §2.7.1: drop, nie escape do śmiecia w UI). Konsekwencja operacyjna: jeśli teoria Sophii użyje tabeli/obrazu, zniknie bez śladu w UI — to defekt katalogu do wyłapania w kuracji Sophii (HITL §2.6), nie w runtime.
2. **`--font-mono` dla `code`/`pre` nie jest w fundamencie v0.1.1** (spec §2.7.2 nota). Jack używa fallback stacku `ui-monospace, …, monospace` do fundamentu v0.1.2. Nie blokuje tego ADR — to dług Mili (fundament), nie sanityzacji.
3. **Bloki kodu: `overflow-x: auto`, nie zawijanie** (spec §2.7.3) — sanityzacja nie dotyka stylu, ale `className="language-*"` przepuszczamy świadomie (potrzebny do ewentualnego highlightu; sam w sobie nieszkodliwy).
4. **Brak `remark-gfm` znaczy brak autolinków i tabel.** Linki muszą być jawne `[tekst](url)` — zgodne ze spec (tabele = OUT v0.2; autolink nie jest w §2.7.1).
5. **Nowa zależność = decyzja stacku (G10).** `react-markdown` + `rehype-sanitize` to dwie produkcyjne, szeroko utrzymywane biblioteki (unified/rehype ekosystem). Wpisuję je jako ratyfikowane tym ADR — Jack (G10) ich nie dobierał, konsumuje decyzję.

---

## Alternatives considered

- **`react-markdown` z `disallowedElements` + `skipHtml`, bez `rehype-sanitize`.** Lżejsze (jedna zależność), ale: lista negatywna (łatwo o przeoczenie nowego wektora), brak sanityzacji atrybutów/protokołów, oparte na domyślnym braku renderu HTML (kruche przy przyszłej zmianie). **Odrzucone** — granica bezpieczeństwa ma być jawna i pozytywna, nie domyślna.
- **`marked`/`markdown-it` + `DOMPurify` na wyjściowym HTML + `dangerouslySetInnerHTML`.** Działa i `DOMPurify` jest solidny, ale wprowadza `dangerouslySetInnerHTML` do kodu (powierzchnia, której wolimy nie mieć w repo jako wzorca) i drugi parser markdown obok ekosystemu React. **Odrzucone** — `react-markdown` renderuje przez React bez `dangerouslySetInnerHTML`, a `rehype-sanitize` daje równoważną twardość na drzewie `hast`.
- **Sanityzacja po stronie zapisu (przy generowaniu teorii w katalogu), render bez sanityzacji.** Przeniosłoby koszt do T4 Sophii. **Odrzucone** — defense-in-depth wymaga sanityzacji *przy renderze* (treść w DB może być zmieniona inną ścieżką; render jest ostatnią bramką przed przeglądarką). Sanityzacja przy zapisie może dojść jako *dodatkowa* warstwa, nie zamiast.

---

## Validation plan (przy landingzie B3/Z3 — NIE w tym ADR)

1. **Test komponentu `TheoryMarkdown.test.tsx`** — feed złośliwych wejść, asercja że znikają:
   - `<script>alert(1)</script>` → brak `<script>` w DOM.
   - `<img src=x onerror=alert(1)>` → brak `<img>`.
   - `[klik](javascript:alert(1))` → `<a>` bez `href` albo bez renderu linku (protokół odcięty).
   - `<div onclick=…>x</div>` → tekst `x` bez `<div>`/atrybutu.
   - `> cytat`, `| a | b |`, `# H1` → odrzucone (blockquote/table/h1 spoza allowlisty).
2. **Test pozytywny** — `p`, `ul`/`ol`, `h3`, ```` ```sql … ``` ````, `` `inline` ``, `[link](https://…)`, `**bold**` renderują się zgodnie z §2.7.1 + linki mają `target="_blank" rel="noopener noreferrer"`.
3. **Owner review:** Ethan (decyzja) + Ryan ad-hoc (schemat allowlisty) — bo dotyka domeny 8 (XSS). Wpięte w DoD Z3 (Jack brief, nordsignal).

---

## Out of Scope

- Implementacja tokenów typografii per element (spec §2.7.2) — robota Jacka (Z3), nie tego ADR.
- `--font-mono` w fundamencie — dług Mili (fundament v0.1.2).
- Highlight składni bloków kodu — nieobjęte v0.2 (spec nie wymaga; `className="language-*"` przepuszczone na przyszłość, ale bez highlightera).
- Sanityzacja `theory_md` przy zapisie/generowaniu w katalogu — możliwa dodatkowa warstwa, osobna decyzja po stronie pipeline'u katalogu (T4 Sophii).
