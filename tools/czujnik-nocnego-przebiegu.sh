#!/usr/bin/env bash
#
# czujnik-nocnego-przebiegu.sh — pilnuje, czy nocny przebieg CI W OGÓLE SIĘ ODBYŁ.
#
# ═══ CO PILNUJE (i czego świadomie NIE pilnuje) ═══
#
# Pilnuje ISTNIENIA przebiegu, nie jego koloru. Kolorem zajmuje się zadanie
# `nocny-alarm` w .github/workflows/pr.yml — ono otwiera zgłoszenie, gdy tor
# nocny jest CZERWONY. Ten czujnik odpowiada na inne pytanie: „a jeśli przebiegu
# nie było w ogóle?".
#
# ═══ MECHANIZM AWARII, KTÓRY TO ZAMYKA ═══
#
# Brak sygnału wygląda dokładnie jak sygnał pomyślny. Kiedy cron GitHuba nie
# odpali (awaria platformy — 2026-08-06; GitHub wygasza też cron w repozytorium
# bez aktywności przez 60 dni), NIE MA przebiegu. Nie ma przebiegu — nie ma czego
# zaczerwienić — `nocny-alarm` milczy. Milczy też wtedy, gdy wszystko jest dobrze.
# Te dwa stany są z zewnątrz nieodróżnialne, a różnią się tym, że w jednym z nich
# nie mamy żadnych bramek i o tym nie wiemy.
#
# ═══ DLACZEGO NIE W GITHUB ACTIONS ═══
#
# Czujnik wiszący w tym samym mechanizmie, który ma pilnować, dziedziczy jego
# awarie. Gdyby ten skrypt był zadaniem Actions, awaria Actions wyłączyłaby
# JEDNOCZEŚNIE nocny przebieg i czujnik — i znowu byłaby cisza. Dlatego HARMONOGRAM
# stoi poza Actions (usługa `launchd` na maszynie operatora, patrz runbook).
#
# Uwaga uczciwa: czujnik CZYTA odpowiedź przez API GitHuba, więc od GitHuba jest
# zależny. Kluczowa różnica: nie zależy od GITHUBOWEGO HARMONOGRAMU, tylko od
# odczytu. A gdy odczyt się nie uda — patrz niżej, to też jest alarm.
#
# ═══ REGUŁA NACZELNA: NIEPEWNOŚĆ TO ALARM ═══
#
# Każdy stan, w którym czujnik NIE JEST W STANIE STWIERDZIĆ, że przebieg był,
# kończy się alarmem — brak sieci, błąd API, brak `gh`, wygasłe uwierzytelnienie.
# Odwrotne zachowanie („nie wiem, więc milczę") odtworzyłoby dokładnie tę awarię,
# którą czujnik ma zamykać.
#
# WYJŚCIE: 0 = przebieg był w oknie (cisza) · 1 = ALARM · 2 = błąd konfiguracji
set -uo pipefail

REPO="${CZUJNIK_REPO:-Danolog/nordsignal-skillbridge}"
WORKFLOW="${CZUJNIK_WORKFLOW:-pr.yml}"
# 26 h, nie 24 h: cron GitHuba bywa opóźniony o kilkadziesiąt minut przy dużym
# obciążeniu kolejki, a czujnik ma łapać BRAK przebiegu, nie jego spóźnienie.
OKNO_H="${CZUJNIK_OKNO_H:-26}"
ETYKIETA="${CZUJNIK_ETYKIETA:-czujnik-nocny}"
STAN="${CZUJNIK_STAN:-$HOME/.nordsignal/czujnik-nocnego-przebiegu}"

mkdir -p "$STAN" 2>/dev/null || true
PLIK_TETNA="$STAN/ostatni-odczyt.txt"
PLIK_LOG="$STAN/historia.log"

TERAZ_ISO="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
TERAZ_EPOCH="$(date -u +%s)"

# Konwersja znacznika ISO 8601 na sekundy — BSD (macOS) i GNU (Linux).
na_epoch() {
  local ts="$1"
  if date -u -d "$ts" +%s >/dev/null 2>&1; then
    date -u -d "$ts" +%s
  else
    TZ=UTC date -j -f "%Y-%m-%dT%H:%M:%SZ" "$ts" +%s 2>/dev/null
  fi
}

zapisz_stan() { # $1=werdykt $2=szczegol
  printf 'odczyt=%s\nwerdykt=%s\nszczegol=%s\nokno_h=%s\nrepo=%s\n' \
    "$TERAZ_ISO" "$1" "$2" "$OKNO_H" "$REPO" > "$PLIK_TETNA" 2>/dev/null || true
  printf '%s\t%s\t%s\n' "$TERAZ_ISO" "$1" "$2" >> "$PLIK_LOG" 2>/dev/null || true
}

# Alarm idzie KILKOMA kanałami naraz, bo najgroźniejszy przypadek to ten,
# w którym GitHub jest niedostępny — wtedy kanał „zgłoszenie na GitHubie"
# nie zadziała i musi zostać coś, co widać lokalnie.
alarm() { # $1=powod
  local powod="$1"
  zapisz_stan "ALARM" "$powod"

  echo "=========================================================" >&2
  echo "ALARM CZUJNIKA: nie potwierdzono nocnego przebiegu CI." >&2
  echo "Powod : $powod" >&2
  echo "Repo  : $REPO   okno: ${OKNO_H} h   odczyt: $TERAZ_ISO" >&2
  echo "=========================================================" >&2

  # Kanał lokalny — niezależny od GitHuba.
  if command -v osascript >/dev/null 2>&1; then
    osascript -e "display notification \"$powod\" with title \"nordsignal: brak nocnego przebiegu CI\"" \
      >/dev/null 2>&1 || true
  fi

  # Kanał zdalny — najlepszy wysiłek. Jeśli GitHub leży, to i tak nie przejdzie;
  # dlatego NIE jest jedynym kanałem i jego porażka nie wycisza alarmu.
  if command -v gh >/dev/null 2>&1; then
    gh label create "$ETYKIETA" --repo "$REPO" --color B60205 \
      --description "Czujnik: nocny przebieg CI sie nie odbyl" >/dev/null 2>&1 || true
    local numer
    numer="$(gh issue list --repo "$REPO" --label "$ETYKIETA" --state open \
      --limit 1 --json number --jq '.[0].number // empty' 2>/dev/null || true)"
    local tresc
    tresc="$(printf '**Nie potwierdzono nocnego przebiegu CI.**\n\n| | |\n|---|---|\n| Odczyt | %s |\n| Powod | %s |\n| Okno | %s h |\n| Zrodlo sygnalu | czujnik lokalny (poza GitHub Actions) |\n' \
      "$TERAZ_ISO" "$powod" "$OKNO_H")"
    if [ -n "${numer:-}" ]; then
      gh issue comment "$numer" --repo "$REPO" --body "$tresc" >/dev/null 2>&1 || true
    else
      gh issue create --repo "$REPO" --title "Nocny przebieg CI sie nie odbyl" \
        --label "$ETYKIETA" --assignee Danolog \
        --body "$tresc

Zgloszenie otwarte przez czujnik \`tools/czujnik-nocnego-przebiegu.sh\`, ktorego
harmonogram stoi POZA GitHub Actions. Zamkniecie jest reczne — jest potwierdzeniem,
ze ktos to widzial. Runbook: \`docs/runbooks/czujnik-nocnego-przebiegu.md\`." \
        >/dev/null 2>&1 || true
    fi
  fi
  exit 1
}

# ─── Warunki wstępne. Brak narzędzia = alarm, nie ciche wyjście. ───
command -v gh >/dev/null 2>&1 || alarm "brak narzedzia 'gh' — czujnik nie moze zapytac o stan"

# Wybór NAJNOWSZEGO znacznika robi `jq` (`max`), nie kolejność zwrócona przez API
# ani ręczne parsowanie tekstu. Pierwsza wersja tego skryptu czytała JSON wyrażeniem
# regularnym z zachłannym `.*` — brało to OSTATNI `createdAt` w odpowiedzi, czyli
# przebieg NAJSTARSZY z dziesięciu, i czujnik krzyczał „219 h" przy przebiegu sprzed
# pięciu godzin. Fałszywy alarm zabija czujnik równie skutecznie jak milczenie:
# operator uczy się go ignorować. Stąd `--jq` zamiast tekstu.
OSTATNI_TS="$(gh run list --repo "$REPO" --workflow "$WORKFLOW" --event schedule \
        --limit 20 --json createdAt --jq '[.[].createdAt] | max // empty' 2>/dev/null)" || \
  alarm "zapytanie do API GitHuba nie powiodlo sie (siec? uwierzytelnienie?)"

# Rozróżnienie ważne: „zapytanie się udało, ale nie ma ANI JEDNEGO przebiegu"
# to nie błąd techniczny, tylko dokładnie ten stan, którego szukamy.
[ -n "${OSTATNI_TS:-}" ] || alarm "brak JAKIEGOKOLWIEK przebiegu 'schedule' w historii workflow $WORKFLOW"

OSTATNI_EPOCH="$(na_epoch "$OSTATNI_TS")"
[ -n "${OSTATNI_EPOCH:-}" ] || alarm "nie umiem odczytac znacznika czasu '$OSTATNI_TS'"

WIEK_S=$(( TERAZ_EPOCH - OSTATNI_EPOCH ))
WIEK_H=$(( WIEK_S / 3600 ))
LIMIT_S=$(( OKNO_H * 3600 ))

if [ "$WIEK_S" -gt "$LIMIT_S" ]; then
  alarm "ostatni nocny przebieg ma ${WIEK_H} h (limit ${OKNO_H} h) — przebieg sie NIE ODBYL"
fi

zapisz_stan "OK" "ostatni przebieg sprzed ${WIEK_H} h (${OSTATNI_TS})"
echo "Czujnik: nocny przebieg potwierdzony — sprzed ${WIEK_H} h (${OSTATNI_TS}), limit ${OKNO_H} h."
exit 0
