# Rejestr czynności przetwarzania (RoPA) — SkillBridge

> **RoPA** (Records of Processing Activities) = rejestr czynności przetwarzania z **art. 30 RODO**:
> wewnętrzny wykaz „co, po co, na jakiej podstawie, jak długo i jak chronimy" — dokument
> **rozliczalności** (art. 5 ust. 2), nie tekst pokazywany osobie (tym jest klauzula informacyjna
> z art. 13 — osobny artefakt, którego jeszcze nie ma; patrz E-1 w
> `docs/security/hint-reveals-retencja-signoff.md` §7).

**Wersja:** v0.4 · 2026-08-01 · **Owner:** Ryan (CRCO nordsignal) → Wendy (Legal) od Fazy 3.
**Administrator danych:** nordsignal (podmiot w rejestracji — NIP TBD, trigger A/B/C, CLAUDE.md §9).
**Status:** **rejestr minimalny, zasiany** — założony przy sign-offie FSRS (1E.4, rls-matrix v0.30).
Kompletny przegląd wszystkich czynności przetwarzania w produkcie = **Wendy, Faza 3**, przed pierwszą
realną rejestracją studenta. Poniższe wpisy to stan wiedzy zweryfikowany na kodzie na dziś.

**Changelog v0.3 → v0.4 (2026-08-01) — nowy wpis #6 „Ślad rozliczalności i bezpieczeństwa (`audit_log`)"; Ryan (CRCO).** Powód: rozstrzygając dopuszczenie zdarzenia `curriculum.placement.skipped` (`docs/data/audit-log-taksonomia.md` v0.1) ustaliłem, że **`audit_log` w ogóle nie występuje w tym rejestrze** — a przechowuje `actor_id` (identyfikator studenta dla części zdarzeń), adres IP i podpis przeglądarki, czyli dane osobowe. Nie mogłem dopuścić nowej kategorii wierszy do magazynu nieopisanego w rejestrze (art. 30 ust. 1), więc wpis #6 jest **warunkiem tamtego rozstrzygnięcia**, nie osobną inicjatywą. Wpis nazywa też **dług A-1**: `actor_id` jest zwykłym `text` bez klucza obcego i bez kaskady, a wyzwalacz append-only z migracji `0008` blokuje `DELETE` nawet właścicielowi — dla zdarzeń zapisujących `actor_id` studenta **usunięcie z art. 17 jest dziś strukturalnie niewykonalne**. Klasa: WAŻNE dla kontroli, INFO dla danych (zero prawdziwych studentów); próg naprawy — **przed pierwszą prawdziwą rejestracją**. Zmiana **policy-only** — żaden kod, hook ani migracja nie ruszone; wpisy #1–#5 bez zmian.

**Changelog v0.2 → v0.3 (2026-07-26) — nowy wpis #5 „Automatyczne dopasowanie ścieżki nauki
(placement curriculum)"; Ryan (CRCO), bramka projektowa PRZED implementacją 1E.7 L3.** Powód
osobnego wpisu, a nie dopisania do #3 (profilowanie FSRS): **inny cel przetwarzania** (otwarcie
nawigacji po drabinie kontra harmonogram powtórek — art. 30 ust. 1 lit. b wymaga celów, a zlanie
dwóch celów w jeden wpis kasuje sens rejestru), **inna retencja** (nośnik uprawnienia kontra ślad)
i — rozstrzygające — **pierwsza w produkcie zautomatyzowana decyzja zmieniająca dostęp człowieka do
materiału**, więc ocena art. 22 musi mieć własne miejsce, a nie pożyczać uzasadnienia napisanego dla
FSRS. ⚠ **Nie mylić z wpisem #4** („Zdarzenia zawodowe / placement", `placement_events`, podstawa
= zgoda): słowo „placement" oznacza w tych dwóch wpisach **dwie zupełnie różne rzeczy** — #4 to
staż/praca (dane zawodowe, zgoda odwoływalna, delete-on-revoke), #5 to otwarcie modułu w drabinie
nauki (wykonanie umowy, bez zgody). Kolizja nazewnicza jest znana i celowo nazwana tutaj, żeby
Wendy nie scaliła obu wpisów w Fazie 3. Zmiana **policy-only, przed kodem** — migracja `0045` nie
istnieje jeszcze w chwili tego wpisu; wpis jest bramką jej projektu, nie opisem stanu wdrożonego
(status jawnie oznaczony w treści wpisu).

**Changelog v0.1 → v0.2 (2026-07-26) — sprostowanie opisu środków bezpieczeństwa we wpisie #3
(art. 30 ust. 1 lit. g); Ryan (CRCO), samodoniesienie.** W v0.1 napisałem „RLS ENABLE+FORCE na obu
tabelach" jako opis środka. Zdanie jest formalnie prawdziwe (FORCE jest ustawione), ale **sugeruje
egzekucję na poziomie bazy szerszą niż faktyczna** — polityka `owner_passthrough` z migracji `0012`
przepuszcza właściciela bezwarunkowo, więc FORCE wiąże rolę wykonawczą (`app_runtime`), a nie
ścieżki idące połączeniem właściciela. Podpisałem tamten opis, opierając się na macierzy RLS zamiast
na własności sprawdzonej na produkcji. Weryfikacja produkcji 2026-07-26 wypadła **korzystnie**
(aplikacja faktycznie łączy się rolą `app_runtime`, `NOBYPASSRLS`), ale prostuję mimo korzystnego
wyniku: rejestr ma opisywać środki takimi, jakie są, również wtedy, gdy prawda jest po naszej
stronie. Pełny ślad ustalenia faktu i klasyfikacja:
`../../../docs/audyty/2026-07-26-rls-bypassrls-prod.md` (v0.2). Zmiana **policy-only** — żaden kod,
hook ani migracja nie ruszone; wpis #3 co do zakresu danych, podstawy prawnej, retencji i
minimalizacji **bez zmian**.

**Podstawa istnienia tego pliku:** decyzja Ryana (CRCO) w domenie ryzyka/RODO — akt **wewnętrzny,
odwracalny, bez wydatku, niewychodzący na zewnątrz, spoza plików rządzenia** (CLAUDE.md §5, stała
władza Poziomu 2). Opublikowanie klauzuli informacyjnej studentom to akt **wychodzący** — poza tym
mandatem, idzie do Darka (E-1).

---

## Czynności przetwarzania

| # | Czynność | Podstawa prawna | Zgoda? | Retencja | Odbiorcy zewn. |
|---|---|---|---|---|---|
| 1 | Konto i uwierzytelnianie (Better Auth: e-mail, hasło/OAuth Google) | art. 6 ust. 1 lit. b (umowa) | nie | czas trwania konta (kaskada) | brak *(wpis skrócony — do uzupełnienia, Wendy Faza 3)* |
| 2 | Mapowanie kompetencji i analiza luk (sylabus → kompetencje → rynek) | art. 6 ust. 1 lit. b (umowa) | nie | czas trwania konta | brak *(wpis skrócony)* |
| **3** | **Profilowanie uczenia się — dobór i harmonogram powtórek (FSRS)** | **art. 6 ust. 1 lit. b (umowa)** | **nie** | `review_logs` 12 m-cy; `review_states` czas trwania konta | **brak** |
| 4 | Zdarzenia **zawodowe** / placement zawodowy (staż, praca — deklarowane) | art. 6 ust. 1 lit. a (zgoda) | **tak** — odwoływalna, delete-on-revoke | do odwołania zgody | brak *(wpis skrócony)* |
| **5** | **Automatyczne dopasowanie ścieżki nauki (placement curriculum — odblokowanie modułów wynikiem diagnozy)** | **art. 6 ust. 1 lit. b (umowa)** | **nie** | `curriculum_placements` — czas trwania konta | **brak** |
| **6** | **Ślad rozliczalności i bezpieczeństwa (`audit_log`)** | **art. 6 ust. 1 lit. f (prawnie uzasadniony interes) + art. 5 ust. 2 / art. 32** | **nie** | **bezterminowa — tabela append-only; patrz dług A-1** | **brak** |

Pełny opis niżej mają **wpis #3** (przedmiot sign-offu 1E.4), **wpis #5** (bramka projektowa
1E.7 L3) i **wpis #6** (warunek rozstrzygnięcia taksonomii `audit_log`). Wpisy 1/2/4 są zasiane
skrótowo — Wendy uzupełnia je w Fazie 3 do pełnego formatu art. 30.

> ⚠ **Wpis #4 i wpis #5 to dwie różne czynności mimo wspólnego słowa „placement".** #4 =
> **placement zawodowy** (student deklaruje staż/pracę; dane zawodowe, zgoda, tabela
> `placement_events`). #5 = **placement curriculum** (system otwiera moduł drabiny na podstawie
> wyniku diagnozy; brak danych zawodowych, podstawa umowna, tabela `curriculum_placements`).
> Różne cele, różne podstawy prawne, różne retencje, różne tabele. **Nie scalać.**

---

## Wpis #3 — Profilowanie uczenia się (FSRS)

**Czynność.** Automatyczny dobór, jakie koncepty i kiedy wrócą do studenta jako powtórka, na
podstawie historii jego ocen (algorytm FSRS — rozłożone w czasie powtórki). To **profilowanie
w rozumieniu art. 4 pkt 4 RODO** (zautomatyzowana ocena aspektu osoby — tu: postęp i trwałość
wiedzy), realizowane od zapłonu flagi `FLAG_SPACED_REPETITION` (dziś OFF, 0 wierszy).

**Kategorie osób.** Studenci uczelni-partnerów korzystający z platformy.

**Kategorie danych.** Klasa **K-INT** (wewnętrzne nie-PII), tabele `review_states` + `review_logs`
(migracja `0042`):
- parametry pamięci per koncept: `stability`, `difficulty`, `due`, `reps`, `lapses`;
- oceny powtórek: `rating` (1–4) i pochodne silnika (`stability_before/after`, `elapsed/scheduled_days`, `reviewed_at`).
- **Zero treści wolnej, zero PII bezpośredniego.** Powiązanie ze studentem wyłącznie przez `student_id`
  (identyfikacja dopiero po join do `students` — pseudonimizacja na poziomie tabeli).

**Cel.** Funkcja **rdzeniowa** produktu edukacyjnego: rozłożyć powtórki tak, by materiał wracał
w momencie bliskim zapomnienia (istota metody). Wtórnie: kalibracja parametrów silnika FSRS.

**Podstawa prawna: art. 6 ust. 1 lit. b RODO — wykonanie umowy.** Bez profilu powtórek produkt nie
realizuje swojej podstawowej usługi — to nie jest funkcja opcjonalna. Dlatego **bez osobnej zgody**,
w świadomym odróżnieniu od `placement_events` (wpis #4), gdzie dane zawodowe są opcjonalne i oparte
na **zgodzie** (art. 6 ust. 1 lit. a, odwoływalnej, delete-on-revoke). Granica: dane niezbędne do
działania rdzenia usługi = umowa; dane opcjonalne ponad rdzeń = zgoda.

**Art. 22 (zautomatyzowane decyzje) — nie dotyczy.** Werdykt FSRS jest **formujący** („do nauki",
CLAUDE.md §7) — nie wywołuje skutków prawnych ani podobnie istotnych i **nie wychodzi na zewnątrz**
jako dowód kompetencji. Nie trafia do Paszportu (kredencjał wysokiej stawki) ani do panelu
wykładowcy: `review_states` — `app_faculty` bez grantu; `review_logs` — DENY-both (`REVOKE ALL`
app_student+app_faculty). Nikt poza samym studentem (i silnikiem owner-side) nie widzi profilu.

**Odbiorcy zewnętrzni.** Brak. Dane nie opuszczają platformy. Podprocesorzy infrastruktury (Neon,
Vercel) — rejestr sub-procesorów prowadzony osobno, poza zakresem tego wpisu.

**Retencja.** `review_logs` — 12 miesięcy (ślad behawioralny, art. 5 ust. 1 lit. e); `review_states`
— czas trwania konta (stan roboczy). Szczegóły i uzasadnienie: `docs/data/retention.md`.
Art. 17 (usunięcie): `student_id ON DELETE CASCADE` na obu tabelach — kasowanie konta czyści profil
automatycznie.

**Środki bezpieczeństwa** *(sprostowane w v0.2 — patrz changelog; poprzednie brzmienie sugerowało
egzekucję szerszą niż faktyczna)*. Kontrola dostępu do obu tabel opiera się na trzech środkach,
wymienionych w kolejności, w jakiej działają:

1. **Uprawnienia roli (deny-by-default).** `review_states` — `GRANT` wyłącznie na `SELECT` dla
   `app_student`, zapisy po stronie serwera; `review_logs` — **zero grantów** dla ról aplikacyjnych
   (`REVOKE ALL` dla `app_student` i `app_faculty`). `app_faculty` nie ma dostępu do żadnej z tabel.
   To środek najmocniejszy, bo działa niezależnie od poprawności zapytań.
2. **Filtr w zapytaniu (warstwa aplikacji).** Każde zapytanie na danych studenta wyprowadza
   tożsamość z sesji i filtruje jawnym warunkiem `WHERE`. **Na ścieżkach idących połączeniem
   właściciela bazy jest to środek jedyny** — patrz zastrzeżenie niżej.
3. **RLS ENABLE+FORCE + polityka `student_sees_own`** (przez `app.current_user_id`). Egzekwowane
   **dla połączeń rolą wykonawczą `app_runtime`** (`NOBYPASSRLS`), którą aplikacja nawiązuje
   połączenie z bazą — zweryfikowane na produkcji 2026-07-26.

> **Zastrzeżenie co do zasięgu środka 3 (jawnie, bo rejestr nie ma obiecywać więcej, niż daje).**
> `FORCE ROW LEVEL SECURITY` **nie** wiąże połączeń nawiązanych rolą właściciela bazy
> (`neondb_owner`): migracja `0012` zakłada politykę `owner_passthrough … USING (true)`, która
> przepuszcza właściciela bezwarunkowo (decyzja świadoma — ADR-005). Część tras serwerowych łączy
> się właśnie tak (wzorzec „zapis owner-side"). Dla tych ścieżek obowiązują środki 1 i 2, a RLS
> **nie** stanowi dodatkowej siatki. Środek 3 jest realną drugą warstwą tam, gdzie kod przechodzi
> przez `withTenantContext`.

Dodatkowo: ograniczenia `CHECK` na zakresach (rating/difficulty/stability/liczniki) jako kontrola
poprawności danych; flaga funkcji domyślnie wyłączona do świadomego zapłonu.

**Weryfikacja i jej ograniczenie (art. 32 ust. 1 lit. d).** Audyt na kodzie: rls-matrix v0.30
(sign-off Ryana 2026-07-25, 0 KRYTYCZNYCH / 0 WAŻNYCH). Tożsamość roli, którą aplikacja łączy się
z bazą, potwierdzona **jednorazowo** 2026-07-26 (`docs/audyty/2026-07-26-rls-bypassrls-prod.md`).
**Nie mamy dziś kontroli ciągłej tej własności** — strażnik `k3-validate` sprawdza atrybuty roli w
izolacji, nie tożsamość połączenia w czasie żądania. Uzupełnienie (krok D2 wskazanego audytu) jest
**warunkiem przed pierwszą realną rejestracją studenta**, obok klauzuli informacyjnej z art. 13
(E-1).

**Minimalizacja (art. 5 ust. 1 lit. c) — POTWIERDZONA.** Kolumny ograniczone do parametrów silnika
i ocen; **zero treści wolnej**, **zero PII bezpośredniego**, brak wtórnej telemetrii (nie ma `ip`,
`user_agent`, `session_id`, rozdzielczości podsekundowej — ryzyko odcisku behawioralnego, którego
pilnowałem przy hint-reveals, tu nie występuje, bo tabele nie mają takich kolumn). Zbiór pól jest
domknięty schematem tabeli (nie JSONB), więc — inaczej niż `hints_revealed_json` — nie da się go
po cichu poszerzyć bez migracji, która wraca do przeglądu ryzyka.

---

## Wpis #5 — Automatyczne dopasowanie ścieżki nauki (placement curriculum)

**Status:** wpis **wyprzedza wdrożenie** — powstał jako bramka projektowa przed implementacją
plasterka L3 funkcji 1E.7 (migracja `0045`, tabela `curriculum_placements`, flaga
`FLAG_PLACEMENT_DIAGNOSTIC` domyślnie WYŁĄCZONA). W chwili wpisu: zero wierszy, zero ścieżek
zapisu. Wpis podlega weryfikacji na kodzie po landzie L3 — dopiero wtedy opisuje stan, a nie projekt.

**Czynność.** Po domknięciu diagnozy system **automatycznie ustala, które moduły ścieżki nauki
zostają studentowi otwarte** (zdjęty prerekwizyt), na podstawie poziomów zmierzonych diagnozą
i progu konfiguracyjnego. To **profilowanie w rozumieniu art. 4 pkt 4 RODO** (zautomatyzowana ocena
aspektu osoby — tu: stanu wiedzy) połączone z **decyzją o dostępie do materiału**. Reguła jest
deterministyczna i bez udziału modelu językowego (`src/lib/curriculum/placement.ts` — funkcja
czysta, zero LLM, zero losowości).

**Kategorie osób.** Studenci uczelni-partnerów korzystający z platformy.

**Kategorie danych.** Klasa **K-INT** (wewnętrzne nie-PII), tabela `curriculum_placements`
(migracja `0045`), wiersz per student × moduł, **wyłącznie dla modułów faktycznie otwartych**:
- `level` — poziom z diagnozy (1–4) dla konceptu tagującego moduł; `NULL` przy module wciągniętym
  prefiksem (brak własnego pomiaru);
- `threshold` — próg obowiązujący **w chwili zapisu** (nie bieżący);
- `reason` — kod rozłączny: `qualified` (własny pomiar) / `carried_untagged` (wciągnięty prefiksem);
- `support_mode` — `full` / `fading` / `NULL`;
- `concept_slug`, `blocking_hole_slug` — migawki identyfikatorów konceptu i modułu ucinającego prefiks;
- `assessment_session_id`, `unlocked_at` — powiązanie z pomiarem i moment nadania.

**Zero treści wolnej, zero PII bezpośredniego, zero odpowiedzi studenta.** Powiązanie z osobą
wyłącznie przez `student_id` (pseudonimizacja na poziomie tabeli).

**Cel.** Funkcja produktowa: student z częściową wiedzą nie przechodzi materiału, który już zna.
Wtórnie — i to jest cel **jawnie nazwany, nie uboczny** — pomiar trafności progu odblokowania
(DECYZJA 2 w `docs/product/decyzje-1e7-placement-v0.1.md`): bez `level`/`threshold`/`reason`
zapisanych w chwili decyzji nie da się później sprawdzić, czy próg był ustawiony dobrze, bo
interpretacja tego samego `result_json` zmienia się wraz z mapą tagów i progiem.

**Podstawa prawna: art. 6 ust. 1 lit. b RODO — wykonanie umowy.** Dopasowanie ścieżki jest
elementem świadczonej usługi edukacyjnej, nie funkcją opcjonalną ponad rdzeń — jak wpis #3, a
w odróżnieniu od wpisu #4 (dane zawodowe = zgoda).

### Art. 22 RODO (zautomatyzowane decyzje) — ocena wprost: **NIE MA ZASTOSOWANIA**, warunkowo

Element (a) *decyzja* — **zachodzi**: „moduł X zostaje otwarty". Element (b) *wyłącznie
zautomatyzowane przetwarzanie* — **zachodzi**: reguła wykonuje się przy domknięciu diagnozy, żaden
człowiek nie zatwierdza wyniku. Rozstrzyga element (c) — czy decyzja *wywołuje skutki prawne albo
w podobny sposób istotnie wpływa* na osobę. **Oceniam, że nie — z trzech niezależnych powodów,
z których każdy sam wystarcza:**

1. **Decyzja wyłącznie ROZSZERZA dostęp, nigdy go nie odbiera.** Stanem odniesienia jest student
   bez diagnozy: drabina zamknięta poza modułem startowym, otwierana przechodzeniem kolejnych
   modułów. Placement może ten stan wyłącznie **poprawić**. Nie istnieje wynik diagnozy, po którym
   student ma mniej niż bez niej. Odblokowania są dodatkowo **monotoniczne** — druga diagnoza
   dokłada, nigdy nie odbiera (§6b dokumentu produktowego), a tabela jest append-only (bez ścieżki
   UPDATE). Decyzja, która w najgorszym razie nie daje nic, nie może „istotnie wpłynąć" niekorzystnie.
2. **Istnieje pełna, równorzędna i zawsze dostępna droga alternatywna.** Każdy moduł można otworzyć
   przechodząc go normalnie albo zdając jego egzamin („test out", próg ≈90%, na produkcji od
   2026-07-25). Automat jest **skrótem**, nie bramą: niczego nie zamyka i nie jest jedyną drogą do
   żadnego skutku.
3. **Skutek nie opuszcza platformy i nie tworzy kredencjału.** Placement nie zalicza modułu, nie
   trafia do Paszportu, nie widzi go panel wykładowcy (`app_faculty` bez grantu), nie idzie do
   pracodawcy, nie wpływa na ocenę, zaliczenie przedmiotu ani rekrutację. To wyłącznie kolejność
   pracy wewnątrz aplikacji.

**Czego ta ocena NIE mówi.** Nie twierdzę, że „to tylko nauka, więc art. 22 nie dotyczy" — decyzje
o dostępie do kształcenia potrafią przekroczyć próg istotności (wytyczne WP251rev.01 wymieniają
dostęp do usług edukacyjnych wśród przykładów). Ocena stoi na tym, że **ta konkretna decyzja jest
jednostronnie korzystna i obchodzalna**, a nie na tym, że dotyczy nauki. Zdejmij którąkolwiek z
trzech przesłanek i wynik się zmienia.

**Konstytucja §7 nie zastępuje tej oceny.** §7 (ocena formująca kontra kredencjał) to nasza
doktryna produktowa i odpowiada na pytanie „czy maszyna może orzec sama". Art. 22 odpowiada na inne
pytanie — „czy osoba ma prawo nie podlegać tej decyzji". Zgodność z §7 jest tu spełniona
(placement jest formujący, nic nie wychodzi na zewnątrz), ale **została sprawdzona osobno**, a nie
przyjęta jako dowód dla art. 22.

**Trzy warunki nośne — zdjęcie któregokolwiek unieważnia tę ocenę i wymaga ponownej analizy
przed wdrożeniem zmiany:**

| # | Warunek | Co go łamie |
|---|---|---|
| A22-1 | Placement wyłącznie otwiera; nigdy nie zamyka, nie pomija ani nie zalicza materiału | Powrót do wariantu „diagnoza zalicza" (pierwotne ADR-014 D8); ożywienie statusu `skipped_by_placement` jako realnego pominięcia pozycji; jakakolwiek ścieżka UPDATE/DELETE odbierająca odblokowanie |
| A22-2 | Droga alternatywna („test out") realnie dostępna | Wyłączenie `FLAG_MASTERY_GATE`, usunięcie egzaminu modułowego, podniesienie progu egzaminu do poziomu nieosiągalnego. **Uwaga: ocena prawna zależy tu od flagi funkcji** — wyłączenie `FLAG_MASTERY_GATE` przy włączonym `FLAG_PLACEMENT_DIAGNOSTIC` to nie tylko zmiana produktu, ale zmiana przesłanki tej oceny |
| A22-3 | Wynik nie opuszcza ścieżki nauki | Pokazanie placementu wykładowcy (grant dla `app_faculty`, agregat per student), wejście do Paszportu, do rekrutacji, do stypendiów, do rankingu studentów |

**Skutek dla klauzuli informacyjnej (art. 13, artefakt E-1 — zaległy, bramka przed 1. rejestracją).**
Brak zastosowania art. 22 **zdejmuje obowiązek z art. 13 ust. 2 lit. f** (informacja o logice
decyzji), ale **nie zdejmuje art. 5 ust. 1 lit. a** (rzetelność i przejrzystość). Wiążące dla
autora klauzuli:
1. **Nie wolno użyć klauzuli-wzorca ze zdaniem „nie podejmujemy decyzji w sposób zautomatyzowany,
   w tym profilowania".** Byłoby to **nieprawdą** — profilujemy w dwóch czynnościach (#3 FSRS
   i #5 placement). To najczęstszy błąd kopiowanych klauzul i u nas byłby fałszywym oświadczeniem
   wobec podmiotu danych.
2. Do celów przetwarzania dopisać **osobny cel**: „automatyczne dopasowanie ścieżki nauki do wyniku
   diagnozy (otwieranie modułów)".
3. Dodać jeden akapit **dobrowolnie, nie z obowiązku** (i tak to zapisać w uzasadnieniu klauzuli):
   o tym, które moduły się otwierają, decyduje system automatycznie na podstawie wyniku diagnozy
   i progu; decyzja **tylko otwiera materiał, nigdy go nie zamyka**; każdy moduł pozostaje dostępny
   przez przejście albo egzamin; student może poprosić o wyjaśnienie i o sprawdzenie decyzji przez
   człowieka.
4. **Zapisać wprost, że punkt 3 jest zabezpieczeniem dobrowolnym.** Zaoferowanie kontaktu z
   człowiekiem **nie jest** przyznaniem, że art. 22 ust. 1 ma zastosowanie, i nie tworzy takiego
   domniemania na przyszłość. Bez tego zdania sami zbudujemy sobie dowód przeciwko własnej ocenie.
5. Retencja w klauzuli: czas trwania konta, usunięcie kaskadą przy skasowaniu konta.

**Odbiorcy zewnętrzni.** Brak. Dane nie opuszczają platformy.

**Retencja.** Czas trwania konta — uzasadnienie i zastrzeżenie co do `blocking_hole_slug`:
`docs/data/retention.md`. Art. 17 realizowany kaskadą `student_id ON DELETE CASCADE`.
**Uwaga konstrukcyjna:** wiersz jest nośnikiem uprawnienia, więc mechanizm append-only **nie może
blokować DELETE** — inaczej kaskada art. 17 przestaje działać. Zakaz zapisu obejmuje wyłącznie
UPDATE (patrz warunek W-1 w macierzy RLS v0.32).

**Środki bezpieczeństwa** *(opisane tak, jak działają — nie mocniej; wzorem sprostowania z v0.2)*:

1. **Uprawnienia roli (deny-by-default).** `GRANT` wyłącznie na `SELECT` dla `app_student`;
   `REVOKE ALL` dla `app_faculty` (wykładowca nie widzi placementu żadnego studenta, także
   zbiorczo); zapisy wyłącznie po stronie serwera. Środek najmocniejszy — działa niezależnie od
   poprawności zapytań. **Jawnie:** grant dla `app_student` nie ma dziś konsumenta (wszystkie
   odczyty idą połączeniem właściciela) — jest spójnością klasy i rezerwą na trasy przez
   `withTenantContext`, nie działającą kontrolą. Zapisuję to od razu, żeby nie stał się
   uprawnieniem, które trwa, bo nikt nie pamięta, po co powstało.
2. **Filtr w zapytaniu (warstwa aplikacji).** Tożsamość z sesji + jawny `WHERE`. **Na ścieżkach
   idących połączeniem właściciela bazy jest to środek jedyny** — a wszystkie dzisiejsze odczyty
   ekranów drabiny idą właśnie tak (17 z 17 stron renderowanych serwerowo,
   `../../../docs/audyty/2026-07-26-rls-bypassrls-prod.md` §8.2).
3. **RLS ENABLE+FORCE + polityka `student_sees_own`.** Egzekwowane dla połączeń rolą wykonawczą
   `app_runtime`. **Dla ścieżek owner-side nie stanowi dodatkowej siatki** — `owner_passthrough
   … USING (true)` z migracji `0012` przepuszcza właściciela bezwarunkowo (ADR-005). Zapisuję to
   przy zakładaniu tabeli, a nie po fakcie: dla `curriculum_placements` środek 3 jest dziś
   **rezerwą na przyszłe trasy przez `withTenantContext`**, nie działającą kontrolą odczytu.
4. **Niezmienność zapisu.** Wiersz powstaje raz i nie jest przepisywany: `UNIQUE(student_id,
   module_id)` + zapis `ON CONFLICT DO NOTHING` + wyzwalacz odrzucający `UPDATE`. To **maszynowa**
   gwarancja wymogu produktowego „nienadpisywany przy ponownej diagnozie", nie obietnica kodu.
5. Ograniczenia `CHECK` na zakresach i **na kształcie werdyktu** (gałąź `qualified` wymaga
   kompletu `concept_slug`+`level`+`support_mode` i `level >= threshold`; gałąź `carried_untagged`
   wymaga ich braku) — uniemożliwiają ciche zlanie dwóch powodów odblokowania, które miernik ma
   rozróżniać.
6. Flaga `FLAG_PLACEMENT_DIAGNOSTIC` domyślnie wyłączona — zero wierszy do świadomego zapłonu.

**Minimalizacja (art. 5 ust. 1 lit. c).** Zapisujemy wyłącznie moduły **otwarte** — nie zapisujemy
trwale, na czym student wypadł słabo (to zostaje w `assessment_sessions.result_json`, czynność
diagnozy, i nie jest dublowane). Zbiór pól domknięty schematem tabeli (nie JSONB), więc nie da się
go poszerzyć bez migracji wracającej do przeglądu ryzyka. **Jedno pole ponad funkcję:**
`blocking_hole_slug` służy wyłącznie miernikowi progu — nazwane jawnie, z przeglądem po pilotażu
(`docs/data/retention.md`).

---

## Wpis #6 — Ślad rozliczalności i bezpieczeństwa (`audit_log`)

**Status:** wpis **opisuje stan wdrożony** (tabela istnieje od migracji `0003`, wyzwalacze `0008`
i `0010`). Powstał z opóźnieniem — `audit_log` działał od miesięcy bez wpisu w rejestrze i to samo
w sobie było brakiem z art. 30 ust. 1. Odkryte przy rozstrzyganiu taksonomii zdarzeń
(`docs/data/audit-log-taksonomia.md` v0.1), które ten wpis warunkuje.

**Czynność.** Zapis zdarzeń istotnych dla **bezpieczeństwa i rozliczalności**: logowania panelu
wykładowcy i operatora jakości (w tym nieudane), udostępnienie i cofnięcie publicznego Paszportu,
weryfikacja zgłoszenia projektowego i przebieg obrony ustnej, decyzje kolejki recenzenckiej oraz
ślad automatycznego dopasowania ścieżki nauki. **Nie jest to dziennik aplikacji** (logi
uruchomieniowe Vercela) ani telemetria kosztowa (`ai_usage_ledger`, wpis odrębny do zasiania).

**Kategorie osób.** Studenci; wykładowcy kampusów-partnerów; operatorzy jakości.

**Kategorie danych.** `actor_type` (klasa podmiotu), `actor_id` (**identyfikator osoby — dla części
zdarzeń**, patrz dług A-1), `action` (kod zdarzenia z domkniętej taksonomii), `target_type` /
`target_id` (czego dotyczyło), `ip_address`, `user_agent`, `metadata` (JSONB — **wyłącznie kody
i liczby**, zero treści wolnej), `created_at`.

**Zero treści studenta, zero odpowiedzi z diagnozy, zero wyników nauki poza kodami.** Adres IP
i podpis przeglądarki są zapisywane tylko przy zdarzeniach uwierzytelniania i udostępniania — to
najbardziej wrażliwy element tego wpisu i jest świadomy: bez nich ślad logowania nie spełnia swojej
funkcji.

**Cel.** Wykazanie zgodności (art. 5 ust. 2), wykrywanie nadużyć i dochodzenie incydentów
(art. 32 ust. 1 lit. b i d), oraz — dla zdarzeń `curriculum.placement.*` — pomiar trafności
automatycznej reguły odblokowania.

**Podstawa prawna: art. 6 ust. 1 lit. f — prawnie uzasadniony interes administratora**
(bezpieczeństwo systemu i rozliczalność), wsparty obowiązkiem z art. 32. **Nie** lit. b: ślad
audytowy nie jest elementem usługi świadczonej studentowi. Test równowagi: dane ograniczone do
kodów i identyfikatorów technicznych, brak treści, brak odbiorców zewnętrznych, brak profilowania
na tej podstawie — interes osoby nie przeważa.

**Retencja: BEZTERMINOWA, i to jest świadomy kompromis, nie przeoczenie.** Tabela jest
**append-only z wyzwalacza** (`audit_log_no_update_delete`, migracja `0008`; `audit_log_no_truncate`,
`0010`) — wiersza nie usunie ani nie zmieni **nawet właściciel bazy**. To środek bezpieczeństwa
o realnej wartości (ślad, którego nie da się zatrzeć). Konsekwencja jest jednak twarda i musi być
zapisana wprost: **retencji nie da się dziś egzekwować przez usuwanie.** Firmowa reguła „audit log
12 miesięcy" (`agents/ryan.md`) dotyczy audit logu **nordsignal** (`logs/audit/`), nie tej tabeli —
i tego rozróżnienia dotąd nigdzie nie zapisałem.

Dla wierszy **bez `actor_id`** (wzorzec A7: `curriculum.placement.computed`, docelowo `.skipped`)
bezterminowość jest nieszkodliwa: jedyne wiązanie idzie przez `target_id` → `assessment_sessions`,
a ta tabela kaskaduje przy usunięciu konta. Po skasowaniu konta wiersz staje się **sierotą** i
przestaje być danymi osobowymi (motyw 26 RODO).

### Dług A-1 — art. 17 strukturalnie niewykonalny dla zdarzeń z `actor_id`

**Fakt (zweryfikowany na kodzie 2026-08-01):** `actor_id` to zwykły `text` **bez klucza obcego
i bez kaskady** (`drizzle/0003_bumpy_microbe.sql:4`). Skasowanie konta studenta **nie usuwa** jego
wierszy w `audit_log` i **nie zrywa** wiązania — identyfikator zostaje w kolumnie jako napis. Wraz
z wyzwalaczem blokującym `DELETE` znaczy to, że **żądania usunięcia z art. 17 nie da się dziś
spełnić** dla zdarzeń: `passport.share.enable` / `.disable`, `submission.verified`,
`submission.viva.*`, `submission.review.*`.

**Klasa: WAŻNE dla kontroli, INFO dla danych.** Zero prawdziwych studentów; 28 kont testowych
Darka (administrator i podmiot danych to ta sama osoba). Nie ma dziś zagrożonego podmiotu danych.

**Próg naprawy: przed pierwszą prawdziwą rejestracją**, razem z klauzulą informacyjną art. 13.
Po tej dacie żądanie usunięcia stanie się jednocześnie **wykonalne prawnie i niewykonalne
technicznie** — to najgorszy możliwy układ i najgorszy moment, żeby go odkryć.

**Świadomie NIE rekomenduję zdjęcia wyzwalacza append-only.** Kierunki naprawy, do rozstrzygnięcia
osobno: (a) przejście istniejących zdarzeń na wzorzec bez `actor_id`, wiązanie przez kaskadujący
`target_id` — tańsze i preferowane; (b) wąska, jawna ścieżka anonimizacji `UPDATE actor_id = NULL`
przy usunięciu konta, jako **jedyny** wyjątek od wyzwalacza, z własnym śladem. Pełne uzasadnienie
i taksonomia: `docs/data/audit-log-taksonomia.md` §6.

**Środki bezpieczeństwa (art. 30 ust. 1 lit. g).** Zapis wyłącznie połączeniem właściciela
(`recordAudit`, best-effort — awaria zapisu nie blokuje akcji użytkownika); `REVOKE TRUNCATE` dla
ról `app_student` i `app_faculty` (`0010`); wyzwalacze append-only (`0008`, `0010`); `metadata`
ograniczona konwencją do kodów i liczb, z testami pilnującymi, że treść studenta tam nie trafia.
**Ograniczenie nazwane wprost:** ochrona przed odczytem opiera się na grantach ról, nie na izolacji
wierszy — tabela nie ma polityk RLS per podmiot danych (stan zgodny z opisem w
`../../../docs/audyty/2026-07-26-rls-bypassrls-prod.md` v0.3 dla ścieżek owner-side).

---

## Przegląd

**Data przeglądu:** przy pierwszej realnej rejestracji studenta (bramka zdarzeniowa), najpóźniej
**2026-10-25** (kwartał). Przegląd: czy Wendy uzupełniła wpisy 1/2/4 do pełnego art. 30, czy
klauzula informacyjna art. 13 powstała (E-1), czy retencja `review_logs` ma egzekucję (wspólny
skrypt R-1 rejestru retencji), czy wpis #5 został **zweryfikowany na wdrożonym kodzie** (dziś
opisuje projekt, nie stan), czy trzy warunki nośne oceny art. 22 (A22-1…A22-3) nadal zachodzą
oraz — od v0.4 — **czy dług A-1 z wpisu #6 został zamknięty** (art. 17 wykonalny dla zdarzeń
`audit_log` z `actor_id`) i czy taksonomia zdarzeń nie rozjechała się z kodem
(`docs/data/audit-log-taksonomia.md` §5).
