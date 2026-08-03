#!/usr/bin/env bash
#
# scan-local-secrets.sh — skan sekretów w LOKALNYCH plikach środowiskowych,
# których gitleaks w CI nigdy nie zobaczy.
#
# DLACZEGO ISTNIEJE
# Job `secret-scan (gitleaks)` w .github/workflows/pr.yml skanuje COMMITY.
# `.env.test` jest w .gitignore i nigdy nie wszedł do gita, więc dla CI jest
# strukturalnie niewidoczny — a to właśnie w nim 2026-07-26 (zapłon 1E.4)
# leżał realny produkcyjny ANTHROPIC_API_KEY jawnym tekstem (CLAUDE.md §10:
# sekrety do magazynu sekretów, nigdy jawnym tekstem w środowisku).
# Ta bramka domyka lukę po stronie maszyny dewelopera (hook pre-commit).
#
# CO SKANUJE — pliki, które Z KONTRAKTU mają być wolne od sekretów:
#   .env.test            — konfiguracja lokalnej bazy testowej (Docker :5433)
#   .env.example         — szablon śledzony przez gita
#   .env.test.example    — szablon śledzony przez gita (wzorzec: commit 01f9f22)
#
# CZEGO ŚWIADOMIE NIE SKANUJE
#   .env.local, .env.prod — to jest lokalny magazyn poświadczeń dewelopera;
#   z definicji trzymają realne wartości, więc skan zawsze byłby czerwony,
#   a czerwona-zawsze bramka to bramka wyłączona. Migracja tych dwóch do
#   magazynu sekretów jest osobnym, otwartym zadaniem (właściciel: Ethan/CTO).
#   Ich obrona to prawa dostępu 0600 + .gitignore + gitleaks w CI na commitach.
#
# DWIE WARSTWY DETEKCJI
#   1) gitleaks (reguły + entropia) — szeroka, ale zależna od zestawu reguł.
#   2) lista zakazanych prefiksów — deterministyczna, łapie kształty kluczy,
#      które reguła entropijna może przepuścić (np. krótki token).
#
# UŻYCIE
#   pnpm secrets:scan-local        # ręcznie
#   .githooks/pre-commit           # automatycznie przed każdym commitem
#
# WYJŚCIE: 0 = czysto · 1 = znaleziono sekret · 2 = brak skanera / błąd konfiguracji
#
# UWAGA: skan biegnie z --redact; wartość sekretu NIGDY nie trafia na wyjście.

set -uo pipefail

# Katalog główny repozytorium (działa też z worktree).
ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || {
  echo "BŁĄD: nie jestem w repozytorium git." >&2
  exit 2
}
cd "$ROOT" || exit 2

PLIKI_KONTRAKTOWE=(".env.test" ".env.example" ".env.test.example")

# Prefiksy poświadczeń, które w powyższych plikach nie mają prawa wystąpić.
# (klucz Anthropic, klucz OpenAI, hasło roli Neona, tokeny GitHuba, klucz Stripe'a)
ZAKAZANE_PREFIKSY=("sk-ant-" "sk-proj-" "npg_" "github_pat_" "ghp_" "gho_" "sk_live_" "rk_live_")

if ! command -v gitleaks >/dev/null 2>&1; then
  cat >&2 <<'EOF'
BŁĄD: brak binarki `gitleaks` — bramka skanu sekretów nie może działać.
      Bramka bez skanera jest atrapą, więc kończę błędem zamiast przepuścić.
      Instalacja: brew install gitleaks
EOF
  exit 2
fi

status=0
zeskanowane=0

for plik in "${PLIKI_KONTRAKTOWE[@]}"; do
  # Plik nieobecny to nie błąd: w CI nie ma .env.test, u dewelopera bywa brak szablonu.
  [ -f "$plik" ] || continue
  zeskanowane=$((zeskanowane + 1))

  # Warstwa 1 — gitleaks.
  wyjscie="$(gitleaks dir "$plik" --no-banner --redact --log-level warn 2>&1)"
  rc=$?
  if [ "$rc" -ne 0 ]; then
    echo "SEKRET w $plik (gitleaks):" >&2
    echo "$wyjscie" >&2
    status=1
  fi

  # Warstwa 2 — zakazane prefiksy. Szukamy prefiksu W DOWOLNYM MIEJSCU linii,
  # nie tylko zaraz po znaku równości: hasło roli bazy siedzi w środku adresu
  # połączenia (schemat, rola, dwukropek, hasło, małpa, host), więc dopasowanie
  # „znak równości + prefiks" przepuszczało je bezszelestnie — sprawdzone
  # mutacją 2026-08-03. Wypisujemy numer linii i nazwę zmiennej, nigdy wartość.
  for prefiks in "${ZAKAZANE_PREFIKSY[@]}"; do
    trafienia="$(grep -nF "$prefiks" "$plik" 2>/dev/null \
      | awk -F: '$2 ~ /^[[:space:]]*#/ { next }                        # komentarz nie jest sekretem
                 { pos = index($0, "="); nazwa = "<bez nazwy zmiennej>";
                   if (pos > 0) { przed = substr($0, index($0,":")+1, pos - index($0,":") - 1);
                                  if (przed ~ /^[A-Za-z_][A-Za-z0-9_]*$/) nazwa = przed }
                   print $1 ":" nazwa }')"
    if [ -n "$trafienia" ]; then
      echo "SEKRET w $plik — zakazany prefiks '${prefiks}' przy (linia:zmienna):" >&2
      echo "$trafienia" | sed 's/^/    /' >&2
      status=1
    fi
  done
  # Warstwa 3 — tylko dla .env.test: każdy adres bazy musi wskazywać maszynę
  # lokalną. Poświadczenie produkcyjne wklejone tu w całości nie musi mieć
  # żadnego rozpoznawalnego prefiksu ani wysokiej entropii — ale ZAWSZE ma
  # zdalny host. To jest siatka na tę klasę, niezależna od reguł skanera.
  if [ "$plik" = ".env.test" ]; then
    obce="$(grep -nE '^[A-Za-z_][A-Za-z0-9_]*=.*://' "$plik" 2>/dev/null \
      | grep -vE '@(localhost|127\.0\.0\.1)' \
      | grep -E '(DATABASE|POSTGRES|DB)_URL' \
      | sed -E 's/^([0-9]+):([A-Za-z_][A-Za-z0-9_]*)=.*$/\1:\2/')"
    if [ -n "$obce" ]; then
      echo "SEKRET/POMYŁKA w $plik — adres bazy spoza maszyny lokalnej (linia:zmienna):" >&2
      echo "$obce" | sed 's/^/    /' >&2
      echo "    .env.test wolno wskazywać wyłącznie localhost:5433 (baza w Dockerze)." >&2
      status=1
    fi
  fi
done

if [ "$status" -ne 0 ]; then
  cat >&2 <<'EOF'

Bramka skanu sekretów: CZERWONA.
Te pliki mają być wolne od realnych poświadczeń (CLAUDE.md §10).
Napraw tak, jak dokumentuje .env.test.example:
    export ANTHROPIC_API_KEY=<klucz z twojego magazynu sekretów>
zamiast wpisywać wartość do pliku (dotenv nie nadpisuje zmiennej z powłoki).
EOF
  exit 1
fi

echo "Bramka skanu sekretów: zielona (plików zeskanowanych: ${zeskanowane})."
exit 0
