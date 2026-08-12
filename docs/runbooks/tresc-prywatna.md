# Runbook — treść prywatna (klucze odpowiedzi) i bramki `main`

**Wersja:** v0.1 · 2026-08-01 · właściciel: Ethan (CTO)
**Powód:** repo `Danolog/nordsignal-skillbridge` jest **publiczne** od 2026-08-01 (decyzja
Darka: kod jawny, klucze odpowiedzi nie). Ma zostać publiczne do końca wdrożenia planu,
potem wraca na prywatne — i wtedy część bramek z tego dokumentu **zniknie sama z siebie**
(sekcja 6, punkt powrotu).

---

## 1. Co zostało wyniesione i dlaczego

Klucze odpowiedzi mieszkają w prywatnym repo **`Danolog/nordsignal-skillbridge-content`**.
Jedyne źródło prawdy o zbiorze: `tools/tresc-prywatna.ts` (`MANIFEST_TRESCI`, 20 pozycji).

| Co | Ile | Na czym stoi |
|---|---|---|
| `tools/content/question-bank-ds-partia-1.json` | 24 koncepty, 144 pytania, **144 klucze** (114 `correct` + 30 `numeric.value`) | diagnoza onboardingowa → placement 1E.7 |
| `tools/content/curriculum-atoms/*.json` | 9 plików, 66 pozycji, **129 pytań z kluczem** | drabina DS |
| `docs/curation/sophia-1e2-*-atomy.md` | 9 plików | źródła autorskie, z których packer generuje JSON-y wyżej |
| `docs/curation/sophia-1e3-egzamin-f1-v0.1.md` | 15 slotów × 2 warianty | **mastery gate 1E.3** (próg ≈90%, maks. 1 błąd) |

Bank egzaminu F1 był opublikowany **w obu wariantach izomorficznych** — czyli obrona
„po oblaniu dostajesz wariant B" była martwa z definicji. Stąd najwyższy priorytet.

**Kryterium przynależności** (oba warunki naraz, ustalenie Sophii): plik jest kluczem, gdy
(1) jego znajomość pozwala wyprodukować poprawną odpowiedź **bez kompetencji, którą ta
odpowiedź ma dowodzić**, i (2) produkt **zataja** tę informację przed studentem w chwili oceny.

**Świadomie ZOSTAJE publiczne:** `b3-theory-*.json` (teoria); `ds-projects-*` / `cyber-projects-*`
(rubryka to jawne kryterium — `rubricJson` idzie do briefu jako `acceptanceCriteria`,
`src/lib/ai/generate-brief.ts:121`); `curriculum-ds-drabina.json` (struktura, zero kluczy);
`tools/content/notebooks/**` i `notebooks/**` (student je pobiera; Colab otwiera wyłącznie
repo publiczne); generator `tools/pack-curriculum-atoms.ts` i walidatory `tools/content-*.ts`
(narzędzie, nie treść); dokumenty QG i audytu; specyfikacje formatu.

### Okno publiczności — kiedy repo faktycznie było jawne

**2026-08-01, między 13:50 a 14:05 CEST (11:50–12:05 UTC)** — moment otwarcia.

Ustalone dowodem z sesji, nie z interfejsu zdarzeń GitHuba (ten zwraca dla tego repo
artefakt z marca i **nie nadaje się** do datowania zmiany widoczności — sprawdzone przez
Ryana). Dowód: o **13:50 CEST** odczyt `gh api /repos/Danolog/nordsignal-skillbridge`
zwracał `private: true`; o **14:05 CEST** ten sam odczyt zwracał `visibility: public`
przy 0 forków. Górna granica okna jest więc twarda, dolna też — zdarzenie leży między
dwoma zarejestrowanymi odczytami.

**To jest wejście do progów powrotu Sophii** (jak długo treść była realnie eksponowana →
czy i które warianty pytań wymagają rotacji). Data zamknięcia okna dopisuje się tutaj przy
przełączaniu repo na prywatne (sekcja 6, pierwszy punkt checklisty).

**Historii gita NIE przepisywano.** Usunięcie jest ze stanu bieżącego (`git rm --cached`).
Powody: (a) `filter-repo` nie usunie tego, co już opublikowane i sklonowane — 4 unikalne
źródła klonowania w 14 dni; (b) w locie było 12 worktree'ów i ~35 gałęzi, przepisanie
zniszczyłoby cudzą pracę. **Klucze sprzed 2026-08-01 są w publicznej historii i trzeba
je traktować jak ujawnione** — rotacja treści (nowe warianty pytań) to decyzja Sophii,
nie zadanie tego runbooka.

---

## 2. Praca lokalna

```bash
pnpm tresc:sync       # klonuje repo treści i nakłada drzewo na miejsce
pnpm tresc:sprawdz    # sam audyt: 20/20 obecnych? (exit 1 przy brakach)
```

Ścieżki po obu stronach są **identyczne**, więc zaciąg to zwykłe nałożenie drzewa — żaden
`readFileSync` w narzędziach ani testach nie zna innej ścieżki. Pliki są w `.gitignore`,
więc `git add -A` nie wrzuci ich z powrotem na widok publiczny.

**Dodajesz nowy plik z kluczem?** Dopisz go do `MANIFEST_TRESCI` i do `.gitignore`, i
przenieś do repo treści — inaczej klucz wyląduje w publicznym repo przy najbliższym commicie.

---

## 3. Jak to działa w CI

Zaciąg jest w jobie **`test (vitest)`** — jedynym, który czyta te pliki (`integration`,
`build`, `a11y-*` ich nie dotykają).

1. `actions/checkout` repo treści do `.tresc-prywatna` przez `ssh-key: ${{ secrets.CONTENT_REPO_KEY }}`
   — **deploy key read-only o zakresie jednego repo** (nie PAT, nie token o szerszym zasięgu).
2. Nałożenie drzewa na miejsce, usunięcie `.tresc-prywatna`.
3. Krok **„Bramka treści prywatnej"** rozstrzyga trzy stany:

| Stan | Warunek | Zachowanie |
|---|---|---|
| Nasz przebieg | sekret obecny | `pnpm tresc:sprawdz` — **brak pliku = exit 1, job czerwony** |
| PR z forka | brak sekretu **i** `head.repo != repozytorium` | `::warning::` + `SKILLBRIDGE_TRESC_OPCJONALNA=1` → testy treści **jawnie pominięte** |
| **PR Dependabota** | brak sekretu **i** `pull_request.user.login == 'dependabot[bot]'` | jak wyżej — **pominięcie z ostrzeżeniem**, nigdy twardy błąd |
| Awaria konfiguracji | brak sekretu, a to **ani fork, ani Dependabot** | `::error::` + exit 1 — **nie degradujemy do pominięcia** |

Ostatni wiersz jest tu najważniejszy: skasowanie sekretu nie może po cichu zamienić bramki
w pominięcie.

**Dlaczego Dependabot ma osobny wiersz (W1, audyt Ryana — wada złapana przed scaleniem).**
Pierwsza wersja tej bramki rozróżniała tylko „fork / nie-fork" i zmienna nazywała się
`Z_FORKA`. Gałęzie Dependabota są **w naszym repo** (`head-owner=Danolog` na wszystkich
7 otwartych PR-ach), więc wychodziło `fork=false`. Ale przebiegi Dependabota **nie dostają
sekretów Actions** — mają własny magazyn „Dependabot secrets" — więc wychodziło też
`sekret=false`. Oba fałsze prowadziły do gałęzi „awaria konfiguracji" → `exit 1`, a
`test (vitest)` jest jednym z 12 wymaganych checków. Skutek byłby taki, że **każdy PR
Dependabota staje się trwale niescalny**: `deps-scan (pnpm audit)` wykrywa podatną
zależność, a łatka nie ma jak wejść. Bramka bezpieczeństwa wyłączałaby aktualizacje
bezpieczeństwa.

Stąd zmiana nazwy na **`SEKRET_ODCIETY_PRZEZ_GITHUB`** — warunek nie pyta już „czy fork",
tylko „czy GitHub miał powód nie dać sekretu". Nazwa `Z_FORKA` kłamała i to kłamstwo
kosztowało wadę. Kierunek bez zmian (warunek Ryana): **brak sekretu = pominięcie widoczne
w totalach, nigdy ciche zielone, nigdy `skip-if-absent`.**

### Dlaczego nie „skip-if-absent"

Mamy w tym repo udokumentowaną pułapkę: `pnpm test:integration` bez `DATABASE_URL` pomijał
**46 z 51 plików**, kończył się kodem 0 i wypisywał te same totale w nawiasach co pełny
przebieg — „zielone" znaczyło dokładnie nic. Dlatego pominięcie tutaj wymaga **jawnej
deklaracji w środowisku**, a `tests/unit/tresc-prywatna-bramka.test.ts` biegnie zawsze i
w trybie pominiętym krzyczy `::warning::`. Zmieniają się też widoczne totale
(„4 skipped", „55 skipped"), a nie tylko treść logu.

Ten sam mechanizm naprawił zastany dług: `tests/unit/exam/exam-bank-f1-packer.test.ts` miał
`it.skipIf(!existsSync(...))` postawiony na **fałszywym** założeniu, że bank egzaminu F1 jest
niecommitowanym draftem. Plik wszedł do repo tego samego dnia (`63bee3b`, PR #232), godziny
po napisaniu testu (`0461dcd`, PR #227) — walidacja realnego banku od 2026-07-24 biegła
w CI, choć komentarz twierdził, że jest pomijana. Bramka działająca „przypadkiem" jest tak
samo zła jak pominięta: nikt jej nie pilnuje. Teraz jest to jawna bramka treści.

### Kontrola jakości treści jedzie tam, gdzie treść

Wymóg Sophii, realizacja: **testy kontraktowe zostają w repo kodu**, a treść jest do nich
dowożona. Uzasadnienie — walidatory (`tools/content-curriculum-atoms.ts`,
`tools/content-curriculum-exam.ts`, `content-question-bank.ts`) są kodem i muszą stać obok
kodu, który ćwiczą; przeniesienie ich do repo treści rozjechałoby jedno z drugim przy
pierwszej zmianie schematu. Bramka merge'owa i tak jest w repo kodu.

**Residual, świadomie przyjęty:** commit w repo treści nie jest walidowany w chwili powstania
(repo treści nie ma własnego CI). Łapie go **następny** przebieg repo kodu — a że job `test`
biega także na nocnym cronie (03:00 UTC), dryf treści wychodzi najpóźniej w 24 h, bez
czekania na czyjkolwiek PR. Jeśli to okaże się za wolno, następny krok to workflow w repo
treści wołający `workflow_dispatch` tutaj (wymaga tokenu w drugą stronę — osobna decyzja).

---

## 4. Bramki `main` (required status checks)

Włączone 2026-08-01 (dostępne dopiero odkąd repo jest publiczne — na darmowym planie
prywatne repo dostawało 403). **12 wymaganych checków**:

```
lint (biome)                                        typecheck (tsc --noEmit)
test (vitest)                                       build (next build)
integration (drizzle migrate + seed + k3-validate)  secret-scan (gitleaks)
deps-scan (pnpm audit)                              a11y-exam (…bramki 1E.3)
a11y-tutor (…panelu tutora C11)                     a11y-review (…powtórek 1E.4 R6)
rate-limit-review (…scope=burst 1E.4)               rate-limit-review (…scope=daily 1E.4)
```

Nazwy to pola `name:` jobów, nie identyfikatory — muszą się zgadzać co do znaku.

**`e2e-llm` świadomie NIE jest wymagany**: ma `if: schedule || workflow_dispatch`, więc na
PR-ze nigdy nie raportuje — wpięcie go zablokowałoby każdy merge na zawsze.

**Ustawienia:** `strict: false` (nie wymuszamy rebase'u — ~35 gałęzi w locie),
`enforce_admins: false`, `allow_force_pushes: false`, `allow_deletions: false`,
bez wymogu review (jedyny człowiek nie zrecenzuje własnego PR-a — blokada byłaby totalna).

⚠ **`enforce_admins: false` znaczy, że właściciel repo bramkę przeskoczy.** To świadomy
wybór: `main` dostaje bezpośrednie pushe dokumentów handoffu, a ceremonia 1E.7 jest w locie.
Bramka jest tu **widocznym progiem, nie ścianą** — realnym zabezpieczeniem zostaje
dyscyplina z sekcji 5.

---

## 5. Dyscyplina, która nie zależy od GitHuba

> **Wykonawca sprawdza KONKLUZJĘ checku, nie sam fakt, że CI wystartowało.**

Przed każdym scaleniem do `main`:

1. Każdy z 12 checków ma konkluzję **`success`** — nie „in progress", nie „skipped",
   nie „neutral".
2. **Ostrzeżenie o pominiętej treści czytasz razem z autorem PR-a, nie samo.**
   Na PR-ze Dependabota `::warning::` o pominiętych kontraktach treści jest stanem
   **normalnym** (sekret odcięty z zasady, sekcja 3) — nie zgłaszaj go jako awarii.
   Na PR-ze **człowieka z tego repo** to samo ostrzeżenie znaczy, że sekret zniknął,
   i wtedy jest awarią. Rozstrzygający jest przebieg **po scaleniu** (`push` do `main`):
   on sekret dostaje zawsze, więc jego zieleń jest jedynym dowodem, że kontrakty treści
   faktycznie przeszły. Scalając PR Dependabota, sprawdź ten przebieg.
   *(Poprzednia wersja tego punktu mówiła „ostrzeżenie na naszym przebiegu = coś nie tak
   z sekretem, bo my nigdy nie jesteśmy forkiem". Po dodaniu Dependabota to nieprawda, a
   reguła dyscypliny, która krzyczy przy normalnym stanie, przestaje być czytana.)*
3. Liczby z `pnpm test:run` się zgadzają — spadek liczby **plików** testowych jest
   sygnałem, że coś się przestało wykonywać (lekcja 46/51).
4. Leo review GO, autor commita = Darek (`mubueu@gmail.com`), jeden pisarz gita per gałąź.

---

## 6. PUNKT POWROTU — repo wraca na prywatne

Kiedy plan zostanie wdrożony i repo wróci na prywatne, **GitHub sam zdejmie branch
protection** (darmowy plan: `403` przy próbie ustawienia bramek na repo prywatnym; patrz
notatka „CI required-checks niedostępne"). Bramki **znikną cicho** — nikt nie dostanie
powiadomienia, a `gh api …/branches/main/protection` zacznie zwracać `404 Branch not protected`.

**To jest moment, w którym najłatwiej stracić czujność.** Checklista przy przełączaniu na
prywatne:

- [ ] Zanotuj w audit logu **datę i godzinę** przełączenia oraz to, że 12 required checks
      przestało obowiązywać z tą chwilą. **Dopisz tę datę do sekcji 1 („Okno
      publiczności”) jako domknięcie okna** — Sophia potrzebuje obu końców, żeby ocenić
      progi rotacji treści.
- [ ] Zweryfikuj utratę bramek jawnie: `gh api repos/Danolog/nordsignal-skillbridge/branches/main/protection`
      → oczekiwane `404`. Brak weryfikacji = założenie, że bramka działa, gdy nie działa.
- [ ] Ogłoś zespołowi, że od tej chwili **jedyną** bramką jest dyscyplina z sekcji 5.
      Punkty 1–4 obowiązują dalej, tyle że nikt ich już nie wymusza maszynowo.
- [ ] **Nie przywracaj** kluczy odpowiedzi do repo kodu. Prywatność repo to nie to samo co
      brak wycieku: klucze sprzed 2026-08-01 są w publicznej historii, a rozdział treści od
      kodu ma dalej sens (rotacja treści bez ruszania kodu, węższy krąg dostępu).
      Zaciąg z sekcji 3 działa tak samo na repo prywatnym — **niczego nie trzeba cofać**.
- [ ] **Poświadczenie ZOSTAJE** — rozstrzygnięte przez Ryana (CRCO) 2026-08-01, nie jest
      już otwartym pytaniem. Deploy key i sekret **nie są kasowane** przy powrocie na
      prywatne: treść nie wraca do repo kodu, więc zaciąg musi działać dalej dokładnie tak
      samo. Zamiast kasowania: **wpis w inwentarzu poświadczeń Ryana**, **rotacja co
      12 miesięcy** i **natychmiast przy jakimkolwiek podejrzeniu**.
- [ ] Jeśli GitHub zmieni plan/politykę i bramki znów będą dostępne na prywatnym — wróć do
      sekcji 4 i wepnij te same 12 nazw.

### Wycofanie poświadczenia (tylko gdy naprawdę likwidujesz zaciąg)

Nie jest to część powrotu na prywatne (punkt wyżej). Potrzebne przy likwidacji integracji
albo przy kompromitacji klucza. **Kolejność ma znaczenie i każde polecenie ma przypięte
repo** — obie komendy dotyczą RÓŻNYCH repozytoriów, a bez `-R`/`--repo` `gh` bierze to
z katalogu roboczego. Wykonane dosłownie z checkoutu repo treści trafiłyby w złe miejsce:
pierwsza skasowałaby klucz, druga próbowałaby usunąć sekret z repo treści (gdzie go nie ma),
padłaby albo trafiła nie tam — a operator odhaczyłby punkt jako zrobiony, zostawiając żywy sekret.

```bash
# 1. Najpierw sekret w repo KODU (bez niego CI przestaje mieć czym się uwierzytelnić).
gh secret delete CONTENT_REPO_KEY --repo Danolog/nordsignal-skillbridge

# 2. Potem deploy key w repo TREŚCI.
gh api -X DELETE repos/Danolog/nordsignal-skillbridge-content/keys/158985345

# 3. WERYFIKACJA — bez niej to tylko założenie, że się udało.
#    Oczekiwane: pusta lista kluczy…
gh api repos/Danolog/nordsignal-skillbridge-content/keys --jq 'length'   # -> 0
#    …i brak CONTENT_REPO_KEY wśród sekretów repo kodu.
gh secret list --repo Danolog/nordsignal-skillbridge | grep -c CONTENT_REPO_KEY  # -> 0
```

Ta sama zasada, co przy zdejmowaniu bramek wyżej: **brak weryfikacji to założenie, że
zadziałało.** Punkt 3 nie jest opcjonalny.

---

## 7. Poświadczenie CI

- **Deploy key** `id=158985345` na `Danolog/nordsignal-skillbridge-content`, tytuł
  „CI nordsignal-skillbridge (read-only)", **`read_only: true`**, ed25519,
  odcisk `SHA256:54gpVwLkXJ5I9xEqoUkriP+L7sFenbGx/kTCToeJweU`.
- **Sekret** `CONTENT_REPO_KEY` w `Danolog/nordsignal-skillbridge` (klucz prywatny;
  wygenerowany lokalnie, wgrany przez `gh secret set`, kopia lokalna skasowana).
- Zakres jest minimalny z założenia — **odczyt jednego repo**, zero dostępu do kodu, prod,
  Neona czy Vercela.
- **Rotacja: co 12 miesięcy i natychmiast przy podejrzeniu** (rozstrzygnięcie Ryana,
  2026-08-01). Poświadczenie widnieje w inwentarzu poświadczeń Ryana.

### Procedura rotacji — kroki, które łatwo pominąć

Trzy poniższe kroki zostały wykonane przy pierwszym wgraniu, ale nie były zapisane;
bez nich następna rotacja ich nie powtórzy (W4, audyt Ryana).

1. Wygeneruj nową parę (`ssh-keygen -t ed25519 -N "" -f <katalog-tymczasowy>/id`).
2. Dodaj **nowy** deploy key do repo treści (`read_only=true`) — stary jeszcze zostaw.
3. Podmień sekret, podając klucz prywatny **wyłącznie przez standardowe wejście**:
   `gh secret set CONTENT_REPO_KEY --repo Danolog/nordsignal-skillbridge < <ścieżka>/id`.
   **Nigdy jako argument polecenia** — argumenty trafiają do historii powłoki i do listy
   procesów widocznej dla innych użytkowników maszyny.
4. **Skasuj kopię lokalną klucza prywatnego natychmiast** po wgraniu (`rm -rf` katalogu
   tymczasowego). Materiał prywatny nie ma prawa przeżyć operacji na dysku.
5. **Poczekaj na zielony przebieg CI (job `test`, krok „Zaciąg treści prywatnej”) i DOPIERO
   POTEM skasuj stary deploy key.** Odwrotna kolejność jest pułapką: nieudane wgranie
   sekretu w połączeniu z już skasowanym starym kluczem zostawia CI bez działającego
   poświadczenia i bez drogi powrotu.
6. Zanotuj rotację w inwentarzu poświadczeń Ryana (data, odcisk nowego klucza).

### Residual przyjęty świadomie

Klucz prywatny jest na dysku runnera przez **cały** czas trwania joba `test` — a w tym
jobie wykonuje się kod testowy pochodzący z PR-a. Ktoś, kto potrafi wykonać dowolny kod
w tym jobie, potrafi też odczytać klucz.

**Nie naprawiamy tego i to jest decyzja, nie przeoczenie:** zasięg klucza to *odczyt
jednego repo treści*, a jedyni, którzy mogą uruchomić kod w tym jobie z sekretem, to
autorzy PR-ów **z tego repo** — czyli osoby, które mają prawo zapisu i tak. Fork sekretu
nie dostaje (sekcja 3). Zawężenie okna (np. zaciąg do artefaktu w osobnym jobie bez kodu
PR-a) kosztowałoby więcej złożoności, niż warte jest ryzyko przy tym zasięgu.
