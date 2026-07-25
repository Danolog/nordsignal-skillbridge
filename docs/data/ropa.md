# Rejestr czynności przetwarzania (RoPA) — SkillBridge

> **RoPA** (Records of Processing Activities) = rejestr czynności przetwarzania z **art. 30 RODO**:
> wewnętrzny wykaz „co, po co, na jakiej podstawie, jak długo i jak chronimy" — dokument
> **rozliczalności** (art. 5 ust. 2), nie tekst pokazywany osobie (tym jest klauzula informacyjna
> z art. 13 — osobny artefakt, którego jeszcze nie ma; patrz E-1 w
> `docs/security/hint-reveals-retencja-signoff.md` §7).

**Wersja:** v0.1 · 2026-07-25 · **Owner:** Ryan (CRCO nordsignal) → Wendy (Legal) od Fazy 3.
**Administrator danych:** nordsignal (podmiot w rejestracji — NIP TBD, trigger A/B/C, CLAUDE.md §9).
**Status:** **rejestr minimalny, zasiany** — założony przy sign-offie FSRS (1E.4, rls-matrix v0.30).
Kompletny przegląd wszystkich czynności przetwarzania w produkcie = **Wendy, Faza 3**, przed pierwszą
realną rejestracją studenta. Poniższe wpisy to stan wiedzy zweryfikowany na kodzie na dziś.

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
| 4 | Zdarzenia zawodowe / placement (deklarowane) | art. 6 ust. 1 lit. a (zgoda) | **tak** — odwoływalna, delete-on-revoke | do odwołania zgody | brak *(wpis skrócony)* |

Pełny opis niżej ma **wpis #3** (przedmiot sign-offu 1E.4). Wpisy 1/2/4 są zasiane skrótowo —
Wendy uzupełnia je w Fazie 3 do pełnego formatu art. 30.

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

**Środki bezpieczeństwa.** RLS ENABLE+FORCE na obu tabelach; `review_states` grant TYLKO SELECT dla
studenta (`student_sees_own` przez `app.current_user_id`), zapisy owner-side; `review_logs` bez
grantów ról aplikacyjnych; CHECK defense-in-depth (zakresy rating/difficulty/stability/liczniki);
flaga OFF do świadomego zapłonu. Audyt na kodzie: rls-matrix v0.30 (sign-off Ryana 2026-07-25,
0 KRYTYCZNYCH / 0 WAŻNYCH).

**Minimalizacja (art. 5 ust. 1 lit. c) — POTWIERDZONA.** Kolumny ograniczone do parametrów silnika
i ocen; **zero treści wolnej**, **zero PII bezpośredniego**, brak wtórnej telemetrii (nie ma `ip`,
`user_agent`, `session_id`, rozdzielczości podsekundowej — ryzyko odcisku behawioralnego, którego
pilnowałem przy hint-reveals, tu nie występuje, bo tabele nie mają takich kolumn). Zbiór pól jest
domknięty schematem tabeli (nie JSONB), więc — inaczej niż `hints_revealed_json` — nie da się go
po cichu poszerzyć bez migracji, która wraca do przeglądu ryzyka.

---

## Przegląd

**Data przeglądu:** przy pierwszej realnej rejestracji studenta (bramka zdarzeniowa), najpóźniej
**2026-10-25** (kwartał). Przegląd: czy Wendy uzupełniła wpisy 1/2/4 do pełnego art. 30, czy
klauzula informacyjna art. 13 powstała (E-1), czy retencja `review_logs` ma egzekucję (wspólny
skrypt R-1 rejestru retencji).
