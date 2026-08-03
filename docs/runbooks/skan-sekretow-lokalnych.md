# Runbook — skan sekretów w lokalnych plikach środowiskowych

**Wersja:** v1.0 · 2026-08-03 · właściciel: Eva (Platform/DevOps) · sign-off bezpieczeństwa: Ryan (CRCO)
**Geneza:** follow-up po zapłonie 1E.4 (2026-07-26) — realny produkcyjny klucz Anthropic leżał
jawnym tekstem w `.env.test`. Do gita nigdy nie wszedł (zero aktywnego wycieku), ale naruszał
CLAUDE.md §10 (sekrety do magazynu sekretów, nigdy jawnym tekstem w środowisku).

## 1. Problem, który ta bramka rozwiązuje

Job `secret-scan (gitleaks)` w `.github/workflows/pr.yml` skanuje **commity** pull requesta.
`.env.test` jest w `.gitignore` (`.gitignore:80`) i nigdy nie był w historii repozytorium — dla CI
jest więc **strukturalnie niewidoczny**. Żadna bramka po stronie serwera nie mogła i nie może złapać
sekretu, który leży wyłącznie na dysku dewelopera. Bramka musi stać lokalnie, przed commitem.

Podział pracy między bramki:

| Gdzie leży sekret | Kto go łapie |
|---|---|
| w commicie / w historii gita | `secret-scan (gitleaks)` w CI (istnieje, bez zmian) |
| w lokalnym `.env.test` lub w szablonie `*.example` | **ten runbook** — hook `pre-commit` |
| w `.env.local` / `.env.prod` | nikt automatycznie — patrz sekcja 5 (znana, nazwana luka) |

## 2. Co jest skanowane

Pliki, które **z kontraktu** mają być wolne od realnych poświadczeń:

- `.env.test` — konfiguracja lokalnej bazy testowej (Docker, port 5433)
- `.env.example` — szablon śledzony przez gita
- `.env.test.example` — szablon śledzony przez gita (wzorzec ustalony w commicie `01f9f22`, PR #253)

Trzy warstwy detekcji, wszystkie w `tools/scan-local-secrets.sh`:

1. **gitleaks** (`gitleaks dir <plik> --redact`) — reguły + entropia; szeroka, ale zależna od zestawu reguł.
2. **lista zakazanych prefiksów** — deterministyczna siatka na kształty poświadczeń, które reguła
   entropijna może przepuścić: prefiksy kluczy Anthropic, OpenAI, hasła roli Neona, tokenów GitHuba
   i kluczy Stripe'a (pełna lista w nagłówku skryptu). Prefiks wyszukiwany jest **w dowolnym miejscu
   linii**, nie tylko zaraz po znaku równości — hasło roli bazy siedzi w środku adresu połączenia.
3. **host bazy w `.env.test` musi być lokalny** — każdy adres połączenia z bazą musi wskazywać
   `localhost` albo `127.0.0.1`. Poświadczenie produkcyjne wklejone tu w całości nie musi mieć
   żadnego rozpoznawalnego prefiksu ani wysokiej entropii, ale **zawsze** ma zdalny host. Warstwa
   dotyczy wyłącznie `.env.test` (szablony `*.example` wolno mają hosty przykładowe).

Skan biegnie z `--redact`; **wartość sekretu nigdy nie trafia na wyjście** — ani do terminala,
ani do logu CI (CLAUDE.md §8).

## 3. Uruchomienie i aktywacja

```bash
pnpm secrets:scan-local               # ręcznie, w dowolnej chwili
git config core.hooksPath .githooks   # aktywacja hooka (robi to `pnpm install` przez skrypt `prepare`)
git config --get core.hooksPath       # weryfikacja: ma zwrócić `.githooks`
```

Hook `pre-commit` odpala ten sam skrypt przed każdym commitem. Skaner biegnie na trzech małych
plikach — koszt rzędu kilku milisekund, więc nie ma pokusy go omijać.

**Kiedy bramka jest uzbrojona:** hook działa tam, gdzie jednocześnie (a) `core.hooksPath` wskazuje
`.githooks` i (b) katalog `.githooks/` istnieje w drzewie roboczym. Do czasu scalenia tej gałęzi do
`main` warunek (b) spełniają tylko checkouty z tą gałęzią. Po scaleniu — wszystkie.
`pnpm install` w nowym klonie ustawia `core.hooksPath` sam.

**Brak binarki `gitleaks` = błąd twardy (kod 2), nie ciche przepuszczenie.** Bramka bez skanera jest
atrapą; instalacja: `brew install gitleaks`.

## 4. Co zrobić, gdy bramka jest czerwona

Nie wpisuj poświadczenia do pliku. Wzorzec jest udokumentowany w `.env.test.example`: klucz podaje
się **eksportem zmiennej w powłoce**, z wartością wziętą z magazynu sekretów. `dotenv` nie nadpisuje
zmiennej ustawionej w powłoce — eksport wygrywa nad plikiem. W CI klucz wstrzykuje osobny sekret
`ANTHROPIC_API_KEY_CI` (GitHub Secrets), niezależny od tego pliku. Bez klucza suity oznaczone
`@llm` jawnie się pomijają (skip).

Jeśli sekret już trafił do commita — bramka lokalna jest za późno; ścieżka to unieważnienie
(rotacja) poświadczenia u dostawcy, nie przepisywanie historii.

## 5. Znana luka — `.env.local` i `.env.prod`

Te dwa pliki **z definicji** trzymają realne poświadczenia, więc skan zawsze byłby czerwony,
a bramka czerwona-zawsze to bramka wyłączona. Świadomie ich nie skanujemy. Ich obrona to dziś:
prawa dostępu `0600`, `.gitignore` oraz gitleaks w CI (gdyby ktoś je jednak zacommitował).

Otwarte zadanie (właściciel: Ethan/CTO, poza zakresem tego runbooka): migracja obu do magazynu
sekretów zgodnie z CLAUDE.md §10. Do tego czasu luka jest **nazwana, nie zamknięta** — nikt nie ma
prawa cytować tej bramki jako dowodu, że „sekretów w plikach środowiskowych już nie ma".

## 6. Dowód, że bramka nie jest atrapą

Bramka bez mutacji, która ją czerwieni, jest atrapą. Procedura — do powtórzenia przy **każdej**
zmianie skryptu. Wszystkie ładunki są syntetyczne (losowane na miejscu z `/dev/urandom`); w repo
nigdy nie zapisujemy prawdziwej wartości.

| # | Mutacja dopisana do `.env.test` | Oczekiwanie |
|---|---|---|
| M1 | zmienna o kształcie klucza Anthropic (prefiks `sk-ant-api03-` + 95 znaków) | czerwona (warstwy 1+2) |
| M2 | adres bazy z hasłem roli Neona (prefiks `npg_`) na zdalnym hoście | czerwona (warstwy 2+3) |
| M3 | zdalny adres bazy z hasłem **bez** rozpoznawalnego prefiksu | czerwona (warstwa 3) |

Po każdej mutacji: `pnpm secrets:scan-local` ma zwrócić kod `1`, a `git commit` ma zostać
**zablokowany** przez hook. Po przywróceniu pliku — kod `0`.

Wynik przebiegu 2026-08-03 (Eva): M1 czerwona, M2 czerwona, M3 czerwona, commit zablokowany
(`git commit` → kod 1, HEAD bez zmian), po przywróceniu bramka zielona na realnych plikach
kanonicznego checkoutu (zero fałszywych alarmów).

**Historia jednej atrapy — nie usuwać.** Pierwsza wersja warstwy 2 dopasowywała `ZMIENNA=<prefiks>`
i przez to **przepuściła** mutację M2: hasło roli bazy nie stoi po znaku równości, tylko w środku
adresu połączenia. Wykryła to dopiero mutacja, nie przegląd kodu. Stąd warstwa 3 i wymóg, żeby
każda zmiana skryptu przechodziła całą tabelę powyżej.
