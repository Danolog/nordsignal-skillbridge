# Kontrakt JSON: treść teorii B3 (`tools/content-b3-theory.ts`)

Ten dokument jest **kanonicznym kształtem pliku wejściowego** dla narzędzia
`tools/content-b3-theory.ts`. Sophia (PO) wypełnia ten plik treścią; Leo (Tech
Lead) odpowiada za narzędzie i kontrakt.

Status: v0.1 (2026-06-03, Leo). Wzorzec wypełniony: `tools/content/b3-theory.sample.json`.

---

## Po co to jest

Narzędzie wprowadza do bazy **treść teorii (wiedzy)** dla projektów B3:

- `projects.theory_md` — treść teorii jako Markdown (kolumna z migracji 0016),
- `project_learning_resources` — lista materiałów do nauki (wideo / dokumentacja
  / kurs) podpiętych do projektu (tabela z migracji 0016).

Projekty są identyfikowane po **`slug`** (np. `analiza-wynagrodzen-gus`) — nigdy
po `id`, bo `id` jest losowe i zmienia się przy każdym reseedzie bazy.

Narzędzie jest **idempotentne** (wielokrotne uruchomienie daje ten sam stan,
nie duplikuje) i działa **per projekt transakcyjnie** (zapis jednego projektu
albo wchodzi w całości, albo wcale).

---

## Kształt pliku — tablica obiektów (jeden obiekt = jeden projekt)

```jsonc
[
  {
    "slug": "analiza-wynagrodzen-gus",          // WYMAGANE — musi istnieć w katalogu projektów (seed-projects.ts)
    "theory_md": "# Teoria...\n\n...",          // WYMAGANE — treść teorii w Markdown (string). Pusty string = wyczyść teorię.
    "learning_resources": [                       // OPCJONALNE — tablica materiałów. Pominięta lub [] = projekt bez materiałów.
      {
        "title": "Dokumentacja pandas",          // WYMAGANE — tytuł materiału (string niepusty)
        "url": "https://pandas.pydata.org/...",  // WYMAGANE — adres http(s):// (walidowany)
        "type": "docs",                           // WYMAGANE — DOKŁADNIE jedna z: "video" | "docs" | "course"
        "position": 1                             // OPCJONALNE — kolejność wyświetlania (liczba całkowita ≥ 0, domyślnie 0)
      }
    ]
  }
]
```

### Mapowanie pól na realne kolumny bazy (migracja 0016)

| Pole JSON                       | Tabela.kolumna                         | Typ / ograniczenie                                  |
|---------------------------------|----------------------------------------|-----------------------------------------------------|
| `slug`                          | `projects.slug`                        | klucz wyszukania (UPDATE WHERE slug = …)            |
| `theory_md`                     | `projects.theory_md`                   | `text` (NULL dozwolony; patrz niżej)                |
| `learning_resources[].title`    | `project_learning_resources.title`     | `text NOT NULL`                                     |
| `learning_resources[].url`      | `project_learning_resources.url`       | `text NOT NULL` (walidacja http/https po stronie narzędzia) |
| `learning_resources[].type`     | `project_learning_resources.type`      | `text NOT NULL` + CHECK IN ('video','docs','course') |
| `learning_resources[].position` | `project_learning_resources.position`  | `integer NOT NULL DEFAULT 0`                        |

Kolumny `project_learning_resources` ustawiane przez bazę automatycznie (NIE
podawaj ich w JSON): `id` (UUID generowany), `project_id` (klucz obcy ustawiany
przez narzędzie na podstawie `slug`), `created_at` (znacznik czasu).

---

## Reguły zachowania narzędzia

1. **Identyfikacja po `slug`.** Slug nieistniejący w katalogu (`seed-projects.ts`)
   → projekt jest **pomijany z ostrzeżeniem** (reszta pliku przechodzi).
2. **`theory_md`** — UPDATE `projects.theory_md` dla danego sluga.
   - Wartość `null` (JSON `null`) → kolumna ustawiana na `NULL` (front pokaże stan „brak teorii").
   - Pominięcie pola `theory_md` → narzędzie zgłasza błąd walidacji (pole jest wymagane; jeśli chcesz wyczyścić, podaj `null` lub `""` świadomie).
3. **`learning_resources` — replace-per-projekt.** Narzędzie **usuwa wszystkie**
   istniejące materiały tego projektu i wstawia podane na nowo. Dzięki temu
   ponowne uruchomienie nie duplikuje (idempotencja) i jednocześnie pozwala
   skasować materiał — wystarczy usunąć go z pliku.
4. **Transakcja per projekt.** Jeden projekt = jedna transakcja. Błąd w jednym
   projekcie nie psuje już zapisanych.
5. **Walidacja `url`.** Akceptowane tylko `http://` i `https://`. Inny schemat → błąd projektu (projekt pomijany, raport na końcu).
6. **Walidacja `type`.** Tylko `video` / `docs` / `course`. Inna wartość → błąd projektu.

---

## Jak uruchomić (tylko BAZA TESTOWA)

```powershell
# 1. Skonfiguruj .env.test (host MUSI być localhost/127.0.0.1 — guard z PR #60)
#    Wzorzec: .env.test.example

# 2. Zmigruj schemat na bazę testową (raz po zmianach schematu)
pnpm db:migrate:test

# 3. Wprowadź treść (ścieżka do pliku JSON jako argument)
pnpm exec tsx tools/content-b3-theory.ts tools/content/b3-theory.sample.json
```

Narzędzie przechodzi przez ten sam guard co reszta tooli bazy
(`tools/assert-test-db.ts`, PR #60): host zdalny bez `CONFIRM_PROD_DB=1` → ABORT,
fragment `skill-bridge-ai` (baza produkcyjna) → ABORT bezwarunkowo. Wprowadzanie
treści na produkcję to **czerwona linia Darka** — nie robi tego to narzędzie.
