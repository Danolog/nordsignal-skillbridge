# ADR-008 — HITL: rozdział wagi oceny (formująca ↔ kredencjał)

**Status:** zaakceptowany · **Data:** 2026-06-29 · **Decyzja:** Darek (sign-off Plan Mode, sesja Oliver)
**Źródła nadrzędne:** `nordsignal-operating-system/CLAUDE.md` §7 (v1.13) · `nordsignal-operating-system/docs/product/Decyzje produktowe.md` Element 2 / Luka 4
**Powiązania:** `docs/design/skillbridge-weryfikacja-zgloszen-redesign-v0.1.md` (§II.5, §IV.7)

## Kontekst

Reguła HITL (*human-in-the-loop* — człowiek w pętli decyzyjnej) „człowiek ma ostatnie słowo w każdej istotnej ocenie" żyła dotąd w CLAUDE.md §7 i w Decyzjach produktowych, ale **nie miała kanonicznego ADR** w repo produktu. Kod (`disclaimer-banner.tsx`, `career-path-card.tsx`, `career-helper.ts`) cytował nieistniejące „ADR-004 §4.3" oraz `golden-adr.md` — odwołania w próżnię (realny ADR-004 dotyczy izolacji kolumn RLS, bez §4.3). Ten ADR domyka dług i ustala kanon.

Decyzja Darka 2026-06-29: ocena zgłoszeń opiera się na **faktycznej treści** pracy (redesign weryfikacji); **werdykt maszyny obowiązuje samodzielnie — platforma samowystarczalna od dnia 1**, ocena człowieka = opcjonalne potwierdzenie premium. To wymagało pogodzenia z §7.

## Decyzja

Rozdzielamy **wagę oceny**, a nie „AI kontra człowiek":

- **Ocena formująca / edukacyjna** (nauka, feedback, postęp): **werdykt maszyny jest finalny i samowystarczalny.** AI pełni rolę mentora domenowego, którego wielu użytkowników nie ma. Werdykt jawnie oznaczony „ocena automatyczna". Nic nie opuszcza platformy jako dowód wobec osoby trzeciej → to NIE jest „istotna ocena" w rozumieniu §7.
- **Kredencjał wysokiej stawki** (dowód kompetencji pokazywany pracodawcy / na rynek): **człowiek ma ostatnie słowo.** Potwierdzenie człowieka (wykładowcy lub operatora jakości) to warstwa **premium** — akceptuje/zmienia/odrzuca werdykt maszyny. Raport maszyny samowystarczalny dowodowo (cytaty z pracy, wynik testów twardych, sygnały ryzyka), tak by człowiek **nie musiał być specjalistą domenowym**.

Granica: **„do nauki" vs „na zewnątrz jako dowód"** — test obiektywny: czy artefakt opuszcza platformę jako dowód wobec osoby trzeciej.

## Konsekwencje

- UI nazywa werdykt maszyny uczciwie „ocena automatyczna" — nigdy „zweryfikowane przez człowieka", dopóki realnie nie przeszedł przez człowieka.
- Trasa wykładowcy = warstwa premium, nie domyślna brama (odwraca założenie „dopiero po walidacji produktu").
- Etykiety „człowiek"/„maszyna" włączamy dopiero wraz z realną weryfikacją człowieka (żeby etykieta nie kłamała).
- Implementacja: redesign weryfikacji (Faza 1 — ocena treści bez uruchamiania; Faza 2 — piaskownica; Faza 3 — ekran człowieka).

## Naprawa długu cytatów

Kod cytujący „ADR-004 §4.3" i `golden-adr.md` dla reguły HITL wskazuje teraz na ten ADR-008 (reguła architektoniczna oceny) lub CLAUDE.md §7 (zasada konstytucyjna). ADR-004 (`004-faculty-update-column-isolation-r2.md`) zostaje nietknięty — jest poprawny w swojej domenie (izolacja kolumn RLS); kolizja numeru była przypadkowa.
