# Dług: drop kolumny `projects.source_url` (po #7 odporność linków)

**Założony:** 2026-06-26 · **Autor:** Max (Backend, Engineering) · **Owner inicjujący:** Ethan (CTO)
**Status:** OTWARTY — zablokowany progiem (patrz warunek wejścia)
**Powiązane:** #7 (odporność linków), migracja `0018` (tabela `project_source_links`), `feat/partia-2-odpornosc-linkow`

## Kontekst

Partia 2 (#7) wprowadziła tabelę `project_source_links` (2–3 linki źródła danych na projekt)
jako następcę pojedynczej kolumny `projects.source_url`. Migracja `0018` **świadomie NIE
usuwa** `projects.source_url`:

1. **Odwracalność** — drop kolumny to operacja nieodwracalna na prod (czerwona linia, CLAUDE.md §4).
2. **Kompatybilność wsteczna** — widok (`project-detail.tsx`) degraduje do `project.sourceUrl`,
   gdy projekt nie ma jeszcze żadnego wiersza w `project_source_links`. Dopóki istnieje choć
   jeden taki projekt, kolumna jest jedynym źródłem linku dla tego projektu.

W efekcie po `0018` mamy chwilowo **dwa źródła prawdy** dla linku źródła danych. To celowy,
kontrolowany stan przejściowy — nie do utrzymania na stałe.

## Co trzeba zrobić

Osobna, **bramkowana** migracja (`00XX`), która:

1. `ALTER TABLE projects DROP COLUMN source_url;`
2. Usuwa fallback do `project.sourceUrl` w `project-detail.tsx` (gałąź `else`) — po dropie
   lista `sourceLinks` jest jedynym źródłem.
3. Usuwa pole `sourceUrl` z propsów `ProjectDetailProps` i z kontraktu (jeśli nieużywane gdzie indziej).

## Warunek wejścia (PRÓG — bez tego NIE ruszać)

**Na produkcji każdy projekt musi mieć ≥ 1 wiersz w `project_source_links`.** Weryfikacja przed migracją:

```sql
-- Musi zwrócić 0. Każdy wiersz = projekt, który po dropie straciłby link.
SELECT p.id, p.slug
FROM projects p
WHERE NOT EXISTS (
  SELECT 1 FROM project_source_links l WHERE l.project_id = p.id
);
```

Backfill z `0018` przenosi istniejące `source_url` do wiersza `position 0`, więc po wgraniu
`0018` na prod próg powinien być spełniony dla wszystkich projektów z niepustym `source_url`.
Projekty z `source_url IS NULL` nie dostaną wiersza — dla nich decyzja produktowa (Sophia):
albo dodać link, albo zaakceptować brak linku (widok i tak renderuje wtedy pustkę).

## Klasyfikacja / ścieżka

- **Drop kolumny na prod = czerwona linia** (CLAUDE.md §4: „migracja schemy produkcyjnej").
  **Ethan inicjuje** (ADR/Plan Mode), **sign-off Darka**. Max tylko zakłada ten ślad — nie wykonuje.
- Niezablokujący dla #7: stan przejściowy z fallbackiem jest bezpieczny i poprawny.

## Trigger

Po weryfikacji na prod (po wgraniu `0018` i ewentualnym uzupełnieniu linków przez Sophię),
że zapytanie progu zwraca 0 wierszy.
