# ADR-011 — B8/1.2: kto ocenia zgłoszenia w Becie

**Status:** zaakceptowany · **Data:** 2026-07-08 · **Decyzja:** Darek (sign-off w sesji, zadanie 1.2 roadmapy)
**Powiązania:** ADR-008 (rozdział wagi oceny), migracja 0019 (`submission_reviews`, `needs_human_review`), flaga `humanReviewQueue` (1.1), roadmapa §3 Blok B8

## Kontekst

ADR-008 ustala: werdykt maszyny jest samowystarczalny do nauki; **człowiek ma
ostatnie słowo przy kredencjale wysokiej stawki** (dowód pokazywany na
zewnątrz). Struktura danych jest gotowa od migracji 0019 — `submission_reviews`
z `reviewer_type IN ('faculty','quality_operator','auto_no_human')` i flaga
`needs_human_review` na zgłoszeniu. Zadanie 1.2 wymaga decyzji, **kto realnie
recenzuje w Becie** — blokuje API kolejki (1.3), akcje approve/reject (1.4)
i UI (1.5).

Rozważone opcje: (a) operator jakości od dnia 1 + wykładowcy dołączają później,
(b) wyłącznie operator, (c) wyłącznie wykładowcy wydziałów partnerskich.
Opcja (c) odpada dziś: kolejka staje, gdy żaden wykładowca nie jest dostępny,
a podpisanych partnerów recenzujących jeszcze nie ma.

## Decyzja

**W Becie recenzuje operator jakości (Darek) od dnia 1; wykładowcy dołączają
per wydział, gdy partner będzie gotowy.**

1. **Operator jakości** (`reviewer_type='quality_operator'`) — domyślny
   recenzent Bety. Raport maszyny (cytaty z pracy, testy twarde, sygnały
   ryzyka) jest projektowany tak, by recenzent **nie musiał być specjalistą
   domenowym** (ADR-008) — dlatego jeden operator wystarcza na skalę Bety.
   Operator widzi kolejkę WSZYSTKICH tenantów.
2. **Wykładowca** (`reviewer_type='faculty'`) — architektura per-tenant gotowa
   od razu (istniejący `faculty_session` wiąże sesję z kampusem); wykładowca
   widzi wyłącznie kolejkę swojego tenanta. Włączenie wydziału = wydanie mu
   hasła kampusu, zero zmian w kodzie.
3. **`auto_no_human`** — pozostaje wartością dla receiptów, które nie
   przechodziły przez człowieka (tryb bez recenzji); UI nigdy nie nazywa ich
   „zweryfikowane przez człowieka" (ADR-008).

Uwierzytelnienie operatora: osobny sekret środowiskowy (wzorzec
`faculty-auth` — hasło → sesja HttpOnly), NIE konto Better Auth studenta;
szczegóły techniczne w implementacji 1.3. Całość za flagą `humanReviewQueue`
(deploy ≠ release).

## Konsekwencje

- 1.3 (API kolejki): dwa konteksty autoryzacji — operator (cross-tenant)
  i faculty (swój tenant); poza tym wspólny kontrakt.
- 1.4 (approve/reject): `reviewer_type` wynika z kontekstu logowania, nie
  z inputu klienta; `reviewer_id` = slug operatora / identyfikator sesji
  faculty.
- 1.6 (plakietka na receipcie): „Oceniał człowiek" przy `faculty` LUB
  `quality_operator`; brak plakietki przy `auto_no_human` — etykieta nigdy
  nie kłamie.
- Skalowanie poza Betę (więcej operatorów, panel zarządzania recenzentami)
  = osobna decyzja, poza zakresem.
