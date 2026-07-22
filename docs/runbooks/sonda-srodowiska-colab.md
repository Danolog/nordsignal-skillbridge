# Runbook — sonda środowiska Colab (ADR-016 D3)

**Kto wykonuje:** Darek (wymaga zalogowanej sesji przeglądarki w Colabie — CI tego nie zrobi).
**Ile trwa:** ok. 15 minut, z czego 5 to czekanie na wykonanie notebooka.
**Kiedy:** (a) **przed każdym zaciągiem nowej partii notebooków na produkcję**,
(b) kwartalnie razem z reweryfikacją odnośników, (c) po zgłoszeniu studenta
„widzę inny komunikat niż w instrukcji".
**Właściciel linii:** Ethan (CTO). Poprawki treści z sondy: Sophia.

---

## Po co to jest (jednym akapitem)

Treść ścieżki Data Science cytuje studentowi **dosłowne komunikaty błędów**
i surowe liczby — a te są wytworem wersji bibliotek, które Google podbija
w Colabie bez uprzedzenia. Nasze CI instaluje **nasz** pin, więc mierzy nasze
środowisko, nie środowisko studenta: testy zostają zielone na wersji, której
student już nie ma. Sonda jest jedynym pomiarem tego, co student naprawdę
dostaje. Bez niej bramka publikacji (`rozjazd`) jest martwa, bo nikt nie ma
skąd wziąć wartości tej flagi.

## Krok po kroku

1. **Otwórz sondę w Colabie.** Notebook: `notebooks/sonda/sonda-srodowiska.ipynb`
   (publikowany do publicznego repo notebooków razem z resztą — link „Otwórz
   w Colab" jak przy każdym labie).
2. **Świeża sesja.** Menu: *Środowisko wykonawcze → Uruchom ponownie sesję*.
   Chodzi o to, żeby zmierzyć czyste środowisko Colaba, a nie stan po czyichś
   wcześniejszych instalacjach.
3. **Uruchom wszystko.** *Środowisko wykonawcze → Uruchom wszystko*. Nic nie
   klikaj po drodze; ostatnia komórka kończy się linią
   `--- WYNIK MASZYNOWY (JSON) ---` i blokiem JSON.
   Pierwsza komórka wypisuje `colab True` — jeśli widzisz `colab False`,
   notebook biegnie poza Colabem i wynik **zostanie odrzucony** przy zapisie
   (to celowy bezpiecznik: pomiar z laptopa nie jest pomiarem Colaba).
4. **Skopiuj CAŁE wyjście** czterech komórek kodu (od `=== WERSJE SILNIKÓW…`
   do końca bloku JSON).
5. **Wklej do repozytorium** jako nowy plik:
   `docs/curation/sondy/sonda-srodowiska-RRRRMMDD.txt`
   (data uruchomienia, np. `sonda-srodowiska-20260722.txt`). To jest dowód
   w tej samej konwencji, co zrzuty ekranu UI — nie deklaracja, tylko pomiar.
6. **Przepisz wynik do deklaracji jedną komendą:**

   ```bash
   pnpm srodowisko:zapisz-sonde docs/curation/sondy/sonda-srodowiska-RRRRMMDD.txt
   ```

   Narzędzie samo aktualizuje `tools/content/notebooks/srodowisko-colab.json`
   (`zaobserwowano`, `zweryfikowano`, `ostatnia_sonda`) i **samo wylicza flagę
   `rozjazd`** — nie ustawiasz jej ręcznie ani „na oko".
7. **Sprawdź bramkę:**

   ```bash
   pnpm srodowisko:bramka   # kod wyjścia 0 = otwarta, 1 = zamknięta z powodem
   ```

8. **Commit** obu plików (wynik sondy + zaktualizowana deklaracja) na gałęzi,
   normalną ścieżką PR-a.

## Co robić z wynikiem

| Wynik sondy | Co się dzieje | Kto działa |
|---|---|---|
| Wszystkie cytaty `ZGODNY`, kontrakt BDL `ZGODNY`, wersje w granicach pinu | `rozjazd: false`, bramka otwarta na 100 dni od daty sondy | nikt, koniec |
| Wersja w Colabie wyszła poza nasz pin (np. duckdb 1.4) | `rozjazd: true` — **nawet gdy wszystkie cytaty się zgadzają** | Ethan: podbicie pinu (idziemy za Colabem) albo świadome „zostajemy" z uzasadnieniem. To rozstrzygnięcie z ADR-016 D4, nie decyzja skryptu |
| Choć jeden cytat `ROZJAZD` | `rozjazd: true` → packer i ingest odmawiają modułów M-\* | ticket Linear `[Ethan] rozjazd wersji Colab`; Ethan decyduje: idziemy za Colabem (podbicie pinu + poprawka treści przez Sophię) albo zostajemy z uzasadnieniem i datą przeglądu |
| Rozjazd kontraktu API GUS/BDL | jw. — `rozjazd: true` | Ethan + Sophia: notebooki M-EDA wołają żywe API, więc zmiana po stronie GUS wywraca lab studenta, mimo zielonego CI (testy jadą na atrapie) |
| API BDL nieosiągalne (sieć, limit 429) | **nie** ustawia rozjazdu | powtórz sondę; jeśli powtarzalne — zgłoś Ethanowi |
| `duckdb`/`pandas` = `BRAK` | treść M-SQL twierdzi, że są preinstalowane — to twardy rozjazd z rzeczywistością | natychmiast Ethan |

## Czego sonda NIE robi

- **Nie instaluje niczego pipem** — ma zmierzyć to, co Colab daje z pudełka.
  Gdyby instalowała nasze piny, mierzyłaby nasze życzenia (i była bezużyteczna).
- **Nie wystawia pieczątki ani tokenu** — to nie lab, student jej nie widzi.
- **Nie poprawia treści** — nazywa rozbieżność. Poprawka tekstu widzianego przez
  studenta to domena Sophii (sign-off treści), decyzja o pinie — Ethana.

## Gdzie to jest wpięte

| Element | Plik |
|---|---|
| Deklaracja środowiska (jedyne źródło wersji) | `tools/content/notebooks/srodowisko-colab.json` |
| Tablica cytatów (jedyne miejsce dopisania cytatu) | `tools/content/notebooks/cytaty-silnikow.ts` |
| Generator sondy | `tools/build-sonda-srodowiska.ts` (`pnpm content:build-sonda`) |
| Zapis wyniku sondy | `tools/zapisz-sonde.ts` (`pnpm srodowisko:zapisz-sonde`) |
| Bramka publikacji | `tools/srodowisko-colab.ts` → packer + ingest |
| Kontrakt-test CI | `tests/unit/ds/srodowisko-silnikow.contract.test.ts` |
