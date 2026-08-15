# Kroje pisma bez sieci — dlaczego i jak to sprawdzić

**Data:** 2026-08-14 · **Właściciel:** Ethan (CTO) · **Dotyczy:** `src/app/fonts.css`, `src/app/fonts/`

## Wada, która to wywołała

2026-08-14, zgłoszenie #297: wymagana bramka `a11y-exam` zaczerwieniła się przy poprawnym kodzie.

Padł krok `pnpm build` **wewnątrz** zadania `a11y-exam`. Osobne zadanie `build (next build)` na **tym samym commicie, w tym samym przebiegu** — przeszło.

```
build (next build)   | conclusion=success | 11:03:49Z -> 11:04:54Z
a11y-exam            | conclusion=failure | KROK PADL: Run pnpm build
```
(przebieg `31794691125`, odczyt 2026-08-14)

Z dziennika zadania, które padło:

```
Received response with status 404 when requesting
  https://fonts.gstatic.com/s/dmsans/v17/...woff2
Error: Turbopack build failed with 6 errors:
Error: Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
```

`next/font/google` pobiera pliki kroju z serwera Google **w trakcie kompilacji**. Zadanie `build` zdążyło je pobrać, `a11y-exam` minutę później trafiło na `404`. Pięć zadań w przepływie buduje projekt osobno, więc jedna awaria cudzego serwera trafiała nas do pięciu razy na przebieg.

**Istota wady nie jest w tym, że Google bywa niedostępny — tylko w tym, że wymagana bramka zależała od cudzej infrastruktury.** Czerwień takiej bramki nie niesie informacji o naszym kodzie, a mimo to blokuje scalenie i zjada przebieg.

## Co zrobiliśmy

Pliki `.woff2` leżą w `src/app/fonts/` i są ładowane z dysku przez pakowarkę (ang. *bundler*). Reguły `@font-face` — `src/app/fonts.css`. `next/font/google` zniknął z repozytorium.

Pliki pobrano **raz** z Google Fonts i są to dokładnie te, które serwowałby `next/font/google`: te same podzbiory (ang. *subset*), te same wagi, te same zakresy znaków (`unicode-range` przepisane 1:1). Wygląd bez zmian.

Świadome koszty, obie strony:

- **Tracimy** automatyczny `preload` kroju, który dokładał `next/font`. Tekst pozostaje widoczny od pierwszej klatki (`font-display: swap`) — to koszt milisekund w pierwszym malowaniu, nie koszt dostępności.
- **Zyskujemy** determinizm wymaganej bramki i o jedną zewnętrzną zależność mniej w ścieżce krytycznej.
- **Dochodzi** 124 kB plików binarnych w repozytorium (5 plików) i obowiązek ręcznej aktualizacji kroju. Krój aktualizuje się raz na lata — to dobra wymiana.

## Strażnik

`src/app/__tests__/fonty-bez-sieci.test.ts` (bramka `test (vitest)`) — mierzy **repozytorium**:

1. nikt nie importuje krojów Google przez `next/font`;
2. żaden arkusz nie wskazuje kroju adresem sieciowym;
3. **każdy plik kroju przywołany w CSS istnieje na dysku** — bez tego literówka w ścieżce daje brak sieci *oraz* brak kroju, czyli zieleń bez pokrycia;
4. rodziny tekstowe mają podzbiór `latin-ext` (polskie znaki diakrytyczne).

## Sonda — pomiar, że budowanie NIE sięga po krój do sieci

Strażnik mierzy źródło. Sonda mierzy **przebieg**: odcina budowanie od sieci i sprawdza, czy nadal się udaje.

Uruchamiana **ręcznie** (nie w CI — nie chcemy trzeciego mechanizmu do utrzymania w bramce, która i tak już nie sięga do sieci).

```bash
# Martwy pośrednik (ang. proxy): każde połączenie wychodzące trafia w port,
# na którym nikt nie słucha. Budowanie, które potrzebuje sieci, padnie.
export HTTPS_PROXY=http://127.0.0.1:9 https_proxy=http://127.0.0.1:9
export HTTP_PROXY=http://127.0.0.1:9  http_proxy=http://127.0.0.1:9
rm -rf .next && pnpm build
```

> **Sondę uruchamiaj we własnym drzewie roboczym** (osobny klon albo `git worktree`), nigdy w cudzym checkoucie — budowanie kasuje `.next`.
>
> **Zależności musisz w tym drzewie zainstalować (`pnpm install`), nie da się ich dowiązać.** Dowiązanie symboliczne `node_modules` do innego drzewa **nie działa** — Turbopack odmawia:
>
> ```
> Symlink … points out of the filesystem root
> ```
>
> (znalezione przez Leo, 2026-08-14). To jest pułapka warta minuty czytania: bez tego sonda wywala się z powodu **niezwiązanego z krojami**, a następna osoba zobaczy czerwień i wyciągnie z niej wniosek „kroje znowu sięgają do sieci". Instalacja trwa dłużej niż dowiązanie — i tak ma być.

**Kontrola dwustronna jest obowiązkowa** — sonda, która nigdy się nie odzywa, jest nieodróżnialna od sondy zepsutej:

- **człon dodatni** (sonda ma moc): przywróć w `src/app/layout.tsx` import kroju z `next/font/google` i zbuduj pod martwym pośrednikiem → budowanie ma **paść**;
- **człon ujemny** (kod jest czysty): zbuduj bieżący kod pod martwym pośrednikiem → budowanie ma **przejść**.

Wynik obu członów, z datą, wpisuje się do opisu zgłoszenia zmieniającego kroje.

### Pomiar z 2026-08-14 (oba człony)

| człon | kod | wynik |
|---|---|---|
| mutacja (`next/font/google`) + martwy pośrednik | `EXIT=1` | `Turbopack build failed with 1 error` · `next/font: error` |
| stan po naprawie + martwy pośrednik | `EXIT=0` | budowanie przeszło, zero żądań o krój |

### Pułapka: pierwsza wersja tej sondy była atrapą

Pierwsze podejście podmieniało `dns.lookup` w Node (`NODE_OPTIONS=--require …`) i przerywało proces przy pytaniu o `fonts.gstatic.com`. **Człon ujemny wyszedł zielono — i nic nie znaczył.** Człon dodatni (mutacja) też wyszedł zielono, choć budowanie *na pewno* pobrało krój: w wyniku leżały dwa dodatkowe pliki o nazwach generowanych przez `next/font` (`5c285b27cdda1fe8-s.p.woff2`, `c3cb240f9c892514-s.woff2`).

Przyczyna: **Turbopack pobiera krój w kodzie natywnym (Rust), nie przez `node:dns`.** Hak na poziomie Node jest na to ślepy.

Wniosek szerszy niż kroje: **sonda umieszczona w niewłaściwej warstwie daje ciszę nieodróżnialną od czystości.** Dlatego człon dodatni nie jest formalnością — to on wykrył, że narzędzie pomiarowe jest bezwładne. Gdyby zrobić tylko człon ujemny, wpisalibyśmy do repozytorium „zmierzone, budowanie nie sięga do sieci" na podstawie pomiaru, który nie mógł niczego wykryć.

## Kiedy wrócić do tego pliku

- Zmiana kroju albo dołożenie wagi/podzbioru → pobierz plik, dopisz `@font-face`, uruchom sondę (oba człony).
- Ktoś proponuje `next/font/google` „bo wygodniejsze" → to jest ta rozmowa; wygoda kosztuje determinizm wymaganej bramki.
- Dochodzi `latin-ext` dla `Geist Mono` → to **zmiana wyglądu** (dziś mono nie ma polskiej diakrytyki i nie miało jej też przed tą zmianą), więc osobna decyzja, nie efekt uboczny.
