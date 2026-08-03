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
# TRZY WARSTWY DETEKCJI
#   1) gitleaks (reguły + entropia) — szeroka, ale zależna od zestawu reguł.
#      Zmierzone 2026-08-03: reguła `anthropic-api-key` łapie wyłącznie kształt
#      kanoniczny (prefiks z członem api03 + 93 znaki + końcówka AA), 10/10
#      losowań. Milczy na wariantach: bez końcówki, krótszym, ze starszym
#      członem api02, bez członu api03. Na te warianty jedyną siatką jest
#      warstwa 2 — nie ma tu redundancji, którą łatwo założyć.
#   2) lista zakazanych prefiksów — deterministyczna, łapie kształty kluczy,
#      które reguła entropijna przepuszcza (krótki token, niska entropia).
#   3) host w .env.test musi być lokalny — poświadczenie produkcyjne wklejone
#      w całości nie musi mieć rozpoznawalnego prefiksu ani wysokiej entropii,
#      ale zawsze ma zdalny host. Host jest WYODRĘBNIANY z adresu i porównywany
#      z listą dozwolonych na równość — dopasowanie podciągu przepuszczało
#      nazwę typu `localhost.cos-tam.example.com` (N1) i jednocześnie czerwieniło
#      poprawny adres bez poświadczeń, który nie ma znaku małpy (B1).
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

# Warstwa 3 — program pomocniczy. Wyodrębnia HOST z adresu i porównuje go
# z listą dozwolonych NA RÓWNOŚĆ. Trzy pułapki, które ta wersja zamyka:
#   B1 — adres bez poświadczeń nie ma znaku małpy, więc szukanie podciągu
#        „małpa + localhost" czerwieniło poprawną konfigurację lokalną
#        (uwierzytelnianie zaufaniem w kontenerze to standard).
#   N1 — dopasowanie podciągu uznawało zdalną nazwę zaczynającą się od
#        „localhost." za lokalną; równość na wyodrębnionym hoście — nie.
#   N2 — brak filtra po nazwie zmiennej: warstwa patrzy na KAŻDĄ zmienną
#        z adresem, bo wystarczyło nazwać ją inaczej, żeby ją ominąć.
#   N3 — obsługa przedrostka `export ` — to jest zapis, który zaleca runbook,
#        więc warstwa, która go nie widzi, uczy wzorca omijającego samą siebie.
AWK_HOSTY='
function host_z_adresu(w,   p, reszta, autor, i, c, at, h, zamk, dwu) {
  p = index(w, "://"); if (p == 0) return ""
  reszta = substr(w, p + 3)
  autor = reszta
  for (i = 1; i <= length(reszta); i++) {
    c = substr(reszta, i, 1)
    if (c == "/" || c == "?" || c == "#") { autor = substr(reszta, 1, i - 1); break }
  }
  at = 0
  for (i = 1; i <= length(autor); i++) if (substr(autor, i, 1) == "@") at = i
  h = (at > 0) ? substr(autor, at + 1) : autor
  if (substr(h, 1, 1) == "[") { zamk = index(h, "]"); if (zamk > 0) h = substr(h, 2, zamk - 2) }
  else { dwu = index(h, ":"); if (dwu > 0) h = substr(h, 1, dwu - 1) }
  return tolower(h)
}
/^[[:space:]]*#/ { next }
{
  linia = $0
  sub(/^[[:space:]]*export[[:space:]]+/, "", linia)
  if (linia !~ /^[A-Za-z_][A-Za-z0-9_]*=/) next
  rowna = index(linia, "=")
  nazwa = substr(linia, 1, rowna - 1)
  wartosc = substr(linia, rowna + 1)
  cudz = substr(wartosc, 1, 1)
  if (cudz == "\"" || cudz == sprintf("%c", 39)) wartosc = substr(wartosc, 2, length(wartosc) - 2)
  host = host_z_adresu(wartosc)
  if (host == "") next
  if (host == "localhost" || host == "127.0.0.1" || host == "::1" ||
      host == "0.0.0.0" || host == "host.docker.internal") next
  if (host ~ /^127\.[0-9]+\.[0-9]+\.[0-9]+$/) next
  print NR ":" nazwa ":" host
}'

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
                                  sub(/^[[:space:]]*export[[:space:]]+/, "", przed);
                                  if (przed ~ /^[A-Za-z_][A-Za-z0-9_]*$/) nazwa = przed }
                   print $1 ":" nazwa }')"
    if [ -n "$trafienia" ]; then
      echo "SEKRET w $plik — zakazany prefiks '${prefiks}' przy (linia:zmienna):" >&2
      echo "$trafienia" | sed 's/^/    /' >&2
      status=1
    fi
  done
  # Warstwa 3 — tylko dla .env.test: KAŻDY adres (dowolnej zmiennej, nie tylko
  # o nazwie kończącej się na _URL) musi wskazywać maszynę lokalną.
  if [ "$plik" = ".env.test" ]; then
    obce="$(awk "$AWK_HOSTY" "$plik" 2>/dev/null)"
    if [ -n "$obce" ]; then
      echo "SEKRET/POMYŁKA w $plik — adres spoza maszyny lokalnej (linia:zmienna:host):" >&2
      echo "$obce" | sed 's/^/    /' >&2
      echo "    .env.test wolno wskazywać wyłącznie maszynę lokalną (baza w Dockerze, port 5433)." >&2
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
