#!/usr/bin/env bash
# Zaciąg TREŚCI PRYWATNEJ do drzewa roboczego — `pnpm tresc:sync`.
#
# Klucze odpowiedzi (bank diagnozy, atomy curriculum, bank egzaminu F1) mieszkają
# w prywatnym repo Danolog/nordsignal-skillbridge-content, bo repo kodu jest
# publiczne. Ścieżki po obu stronach są IDENTYCZNE, więc zaciąg to zwykłe
# nałożenie drzewa — żaden kod nie zna innej ścieżki.
#
# Pliki lądują jako IGNOROWANE przez gita (.gitignore) — nie da się ich przez
# przypadek wcommitować z powrotem do publicznego repo.
#
# Użycie:
#   pnpm tresc:sync                 # klon płytki przez git (HTTPS/SSH wg konfiguracji)
#   CONTENT_REF=jakas-galaz pnpm tresc:sync
set -euo pipefail

REPO="${CONTENT_REPO:-Danolog/nordsignal-skillbridge-content}"
REF="${CONTENT_REF:-main}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "Zaciąg treści prywatnej: ${REPO}@${REF}"
if [ -n "${CONTENT_LOCAL_PATH:-}" ]; then
  # Ścieżka awaryjna: gotowy checkout obok (używa jej krok CI po actions/checkout).
  SRC="$CONTENT_LOCAL_PATH"
else
  git clone --quiet --depth 1 --branch "$REF" "git@github.com:${REPO}.git" "$TMP/tresc" 2>/dev/null \
    || git clone --quiet --depth 1 --branch "$REF" "https://github.com/${REPO}.git" "$TMP/tresc"
  SRC="$TMP/tresc"
fi

# Kopiujemy WYŁĄCZNIE drzewa treści — nigdy .git ani README repo treści.
for d in tools/content docs/curation; do
  if [ -d "$SRC/$d" ]; then
    mkdir -p "$ROOT/$d"
    # -a zachowuje strukturę; kropka na końcu = zawartość katalogu, nie katalog.
    cp -a "$SRC/$d/." "$ROOT/$d/"
  fi
done

echo "Nałożono drzewo. Weryfikacja manifestu:"
exec pnpm exec tsx "$ROOT/tools/sprawdz-tresc.ts"
