#!/usr/bin/env python3
"""
guard-secrets.py — PreToolUse hook, repo produktu SkillBridge.

KOPIA. Nośnik kanoniczny tej reguły: repo operating system,
Danolog/nordsignal-operating-system -> hooks/guard-secrets.py.
Zmiany merytoryczne robi się TAM i przenosi tutaj (dług nośnika opisany
jawnie w CLAUDE.md operating systemu, v1.20 — próg konsolidacji: przy
pierwszej kolejnej zmianie tego pliku kopie muszą zostać zrównane).

Wersja: v1.3 · 2026-08-27 · owner: Ryan (CRCO). Wykonanie: sesja Darka.
Edycja tego pliku jest czerwoną linią (sign-off Darka — jest, 2026-08-27).

UWAGA NAJWAŻNIEJSZA — OD v1.3 TEN HOOK NICZEGO NIE BLOKUJE.
Do v1.2 zwracał `deny` (sekret w pliku / w komendzie) i `ask` (zdalny DSN).
Od v1.3 wszystkie trzy ścieżki emitują SYGNAŁ nieblokujący: `systemMessage`
+ `additionalContext`, BEZ klucza `permissionDecision`. Hook nie dotyka
przepływu uprawnień — ostrzega i nic więcej.

Powód (decyzja Darka 2026-08-27, CLAUDE.md operating systemu, v1.19/v1.20):
cel „plan implementowany przez agenty bez udziału człowieka". Bramka `deny`
zatrzymywała przebieg na ATRAPACH kluczy w danych testowych i dokumentacji —
dwa trafienia w ciągu godziny 2026-08-27, oba na wartościach zmyślonych.
`deny` nie daje operatorowi wyboru „przepuść", tylko zabija operację, więc
w trybie autonomicznym kosztuje cały przebieg.

CO PRZEZ TO PRZESTAŁO DZIAŁAĆ (v1.18 §8, „co przestanie działać"):
prawdziwy sekret zapisany do pliku w repo NIE zostanie zatrzymany. Warstwy,
które zostają: ten sygnał (widoczny w transkrypcie), audit log (PostToolUse)
i skan `gitleaks` w CI. Uwaga — gitleaks skanuje COMMITY, nie dysk: plik
w .gitignore (np. .env.local) nie jest przez niego sprawdzany w ogóle.

Co skanuje (bez zmian od v1.2): klucze API, AWS, PEM, GitHub/Slack/Google,
DSN z hasłem, generyczne API_KEY/SECRET/TOKEN/PASSWORD z wartością.

  - Write/Edit -> tool_input.content / tool_input.new_string. KAŻDY sekret,
    łącznie z DSN niezależnie od hosta -> sygnał.
  - Bash -> tool_input.command. Twarde sekrety (bez DSN) -> sygnał. DSN
    z hasłem rozróżnia po HOŚCIE: host zdalny -> sygnał; host loopback
    (lokalny test) -> CISZA, hook nie odzywa się w ogóle.

Rozróżnienie host-aware zostaje, bo dalej niesie informację: w realnym ruchu
firmy DSN w komendzie to prawie wyłącznie lokalny DSN testowy (62 trafienia
w oknie ~24h, 59 loopback, 0 zdalnych — operating system:
docs/audyty/2026-06-05-finding-guard-secrets-bash-dsn-ryan.md). Ostrzeganie o każdym z nich byłoby szumem,
który uczy ignorować sygnał.

W treści sygnału podajemy WYŁĄCZNIE etykietę typu sekretu i co najwyżej sam
host (host nie jest sekretem) — NIGDY wartości/hasła. Sygnał trafia do
transkryptu i logów; wyciek wartości tam = ten sam problem, przed którym
ostrzegamy.

Wzór wzorców: hooks/audit-log.py `_PII_PATTERNS` (lista (regex, label) +
kompilacja). Struktura hooka: hooks/guard-bash.py (json.load(stdin), tool_name,
hookSpecificOutput).

Wersja: v1.3 · 2026-06-18 · owner: Ryan (CRCO). Współwłaściciel techniczny:
Ethan (CTO). Edycja tego pliku jest czerwoną linią — chroni ją
guard-red-lines.py (hooks/**).

CHANGELOG
  v1.3 · 2026-06-18 — relaksacja heurystyki GENERIC dla ścieżek testowych
        (__tests__/**, *.test.*, *.spec.*): nazwy identyfikatorów/kluczy mocka
        kończące się na ...SECRET/TOKEN/PASSWORD dawały false-positive blokujący
        zapis legalnych testów (finding zespołu PR-0). Dla plików testowych
        pomijamy WYŁĄCZNIE GENERIC; HARD_PATTERNS (sk-/AKIA/PEM/gh_/xox/AIza)
        i DSN zostają aktywne — realny klucz w teście dalej deny. Ścieżki
        nietestowe i Bash bez zmian. Finding: docs/audyty/
        2026-06-18-guard-secrets-false-positives-testy.md; sign-off Darka
        w Plan Mode 2026-06-18 (czerwona linia hooks/).
  v1.2 · 2026-06-06 — hardening ścieżki Bash po findingu parser-differential
        z automated security-review (obejście białej listy loopback). Trzy
        wektory obejścia domknięte do `ask`: (1) override hosta w query DSN
        (parametr host=/hostaddr=) — libpq łączy się z hostem z query, nie z
        authority po małpie; klasa znaków hosta w DSN_WITH_HOST wyklucza teraz
        `?` i `#`, a obecność _HOST_OVERRIDE w komendzie wymusza `ask`
        niezależnie od authority; (2) wiele `@` w userinfo — niejednoznaczne
        wyznaczenie hosta -> `ask`; (3) domyślnie `ask` na nierozpoznanym
        kształcie hosta — loopback przepuszczamy TYLKO gdy host jednoznacznie
        w _LOOPBACK i ZERO override/ambiguity. Ścieżka Write/Edit bez zmian
        (deny). Fail-open skanera bez zmian. Finding + sign-off: automated
        security-review 2026-06-06, sign-off Darka w Plan Mode (czerwona linia
        hooks/).
  v1.1 · 2026-06-05 — dodana ścieżka `Bash`: skan tool_input.command;
        host-aware DSN (loopback -> przepuść, zdalny -> `ask`); twarde
        sekrety w komendzie -> `deny`. Ścieżka Write/Edit bez zmian
        (deny, host-agnostyczna). Wzorzec DSN scalony do JEDNEJ definicji
        (DSN_WITH_HOST) użytej w obu ścieżkach — zero duplikacji regexu
        (Wariant A z findingu). Finding + sign-off: finding Ryana
        2026-06-05, GO-ze-zmianami Ethana, sign-off Darka w Plan Mode na
        obie czerwone linie (ten plik + .claude/settings.json).
  v1.0 · 2026-06-04 — pierwsza wersja: skan Write/Edit, deny na każdy sekret.
        Warunek wstępny 1a planu „automatyzacja śnienia Coacha".

OGRANICZENIE v1: skaner dopasowuje wzorce do tekstu (zapisu lub komendy). Nie
wykryje sekretu zakodowanego (base64), pociętego między linie ani zaciemnionego.
Wzorce świadomie zachowawcze (niski false-positive) — łapie sekrety w postaci
surowej i przypadkowe wklejenia, nie jest sandboxem. Generyczny wzorzec wyklucza
oczywiste placeholdery, więc może przepuścić sekret „udający" placeholder —
akceptowalny koszt za brak fałszywych blokad zwykłej pracy.

ZNANE LIMITY ścieżki Bash (do akceptacji w Plan Mode, do rozszerzenia później):
  - Biała lista loopback pokrywa formy realnie widziane w audit logu (nazwa
    localhost, IPv4, IPv6 goły i w nawiasach, IPv4-mapped). NIE pokrywa
    `host.docker.internal` ani bezgołych nazw serwisów z plików compose —
    takie hosty wpadną w `ask`. Do rozszerzenia białej listy, gdy ruszy
    dockerized-e2e (dziś zero takiego ruchu).
  - DSN sklejany z kawałków (konkatenacja zmiennych, host przez `$DB_HOST`,
    budowanie łańcucha w runtime) NIE jest łapany — spójne z ograniczeniem
    v1.0 „łapiemy surowe, nie zaciemnione". Nie pogarszamy, tylko nie
    domykamy w 100%.
  - Override hosta w DSN (parametr query host=/hostaddr=) — POKRYTE od v1.2.
    libpq honoruje host z query i łączy się z nim, nie z authority po małpie
    (parser differential): DSN z loopback w authority + zdalnym host= w query
    przechodził w v1.1 w ciszy. Teraz klasa hosta wyklucza `?`/`#`, a sama
    obecność host=/hostaddr= w komendzie wymusza `ask` niezależnie od
    authority. Wiele `@` w userinfo (próba zmylenia, który `@` wyznacza host)
    — również `ask`. Zasada ogólna v1.2: loopback przepuszczamy bez akcji
    TYLKO gdy host jednoznacznie loopback i ZERO override/niejednoznaczności;
    każdy nierozpoznany/niejednoznaczny kształt hosta -> `ask` (bramka pyta,
    nie blokuje — akceptowalny mały false-positive).

Błąd parsowania / wyjątek -> exit 0 bez decyzji (fail-open): zepsuty hook nie
blokuje pracy. Sekret to zdarzenie wykrywane, nie egzekwowane integralnością
hooka — fail-open spójny z resztą guardów (guard-bash, guard-red-lines).
"""
import json
import re
import sys

# Lista (regex, label) twardych sekretów — BEZ DSN (DSN ma osobną, host-aware
# ścieżkę). Każdy regex zachowawczy — wymaga charakterystycznego prefiksu /
# struktury, by nie łapać zwykłego tekstu. Kolejność bez znaczenia: zwracamy
# zbiór trafionych etykiet, pierwsze trafienie i tak daje `deny`.
HARD_PATTERNS = [
    # Klucze sk- / sk-ant- / sk-proj- (OpenAI, Anthropic).
    (re.compile(r"\bsk-[A-Za-z0-9_-]{20,}\b"), "klucz API typu sk-"),
    # AWS access key id (long-term AKIA / temporary ASIA).
    (re.compile(r"\b(AKIA|ASIA)[0-9A-Z]{16}\b"), "AWS access key id"),
    # Klucz prywatny PEM (RSA/EC/OPENSSH/DSA/PGP albo bez podtypu).
    (re.compile(r"-----BEGIN (RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----"),
     "klucz prywatny PEM"),
    # GitHub token (ghp_/gho_/ghu_/ghs_/ghr_).
    (re.compile(r"\bgh[pousr]_[A-Za-z0-9]{36,}\b"), "GitHub token"),
    # Slack token (xoxb-/xoxa-/xoxp-/xoxr-/xoxs-).
    (re.compile(r"\bxox[baprs]-[A-Za-z0-9-]{10,}\b"), "Slack token"),
    # Google API key.
    (re.compile(r"\bAIza[0-9A-Za-z_-]{35}\b"), "Google API key"),
]

# Generyczny wzorzec: NAZWA_KLUCZA = "wartosc" / : 'wartosc'. Wartość (grupa
# `val`) sprawdzamy osobno przeciw placeholderom — wykluczanie ich w jednym
# regeksie byłoby kruche i trudne do utrzymania.
GENERIC = re.compile(
    r"\b([A-Z_]*(API[_-]?KEY|SECRET|TOKEN|PASSWORD|PRIVATE[_-]?KEY))\b"
    r"\s*[=:]\s*"
    r"['\"]?(?P<val>[^\s'\"#]{8,})",
    re.I,
)

# Wartości będące placeholderami — NIE traktujemy ich jako sekretu. Dopasowanie
# na całej wartości (fullmatch) albo prefiksowo dla wzorców typu xxx+/${...}.
_PLACEHOLDER_FULL = re.compile(
    r"(your[-_a-z0-9]*"
    r"|x{3,}"
    r"|placeholder"
    r"|changeme"
    r"|change[-_]?me"
    r"|example[-_a-z0-9]*"
    r"|redacted"
    r"|<[^>]*>"          # <your-key>, <...>
    r"|\$\{[^}]*\}"      # ${ENV_VAR}
    r")",
    re.I,
)

# JEDNA definicja wzorca DSN z hasłem, użyta w OBU ścieżkach (Write/Edit i Bash)
# — zero duplikacji regexu (sedno Wariantu A). Łapie schemat://user, dwukropek,
# haslo, małpa, host. Grupa `host` (IPv6 w nawiasach [..] albo zwykły token)
# służy ścieżce Bash do rozróżnienia loopback/zdalny. Ścieżka Write/Edit ignoruje
# host i traktuje samo trafienie jako sekret (deny, jak v1.0). Para user/haslo to
# [^\s:@/]+ dwukropek [^\s@/]+ małpa — kluczowe jest hasło przed małpą, nie samo
# `://`.
DSN_WITH_HOST = re.compile(
    r"\b(?:postgres|postgresql|mysql|mongodb(?:\+srv)?|redis|amqp)://"
    r"[^\s:@/]+:[^\s@/]+@"
    r"(?P<host>\[[^\]]+\]|[^\s:@/?#]+)"
)

# Override hosta w query DSN: libpq honoruje host=/hostaddr= z parametrów,
# nadpisując authority po @ (parser differential). Obecność takiego parametru
# czyni faktyczny host niejednoznacznym -> klasyfikujemy jako zdalny/ask
# niezależnie od tego, co stoi po @.
_HOST_OVERRIDE = re.compile(r"[?&](?:host|hostaddr)=", re.I)

# Wielokrotne `@` w userinfo (między schematem a pierwszym `/`): nie wiadomo,
# który `@` wyznacza host -> niejednoznaczne, traktujemy jak zdalny/ask.
_DSN_SCHEME_TO_PATH = re.compile(
    r"\b(?:postgres|postgresql|mysql|mongodb(?:\+srv)?|redis|amqp)://"
    r"(?P<authority>[^/]*)"
)

# Hosty loopback — DSN z takim hostem to lokalny testowy, NIE sekret do ochrony.
# Pokrywa formy realnie widziane w audit logu (nazwa, IPv4, IPv6 goły i w
# nawiasach, IPv4-mapped). Limit białej listy opisany w docstringu.
_LOOPBACK = {
    "localhost",
    "127.0.0.1",
    "::1",
    "[::1]",
    "[::ffff:127.0.0.1]",
}

_DSN_LABEL = "DSN bazy z hasłem"

# Ścieżki testowe — w nich GENERIC (heurystyka nazw ...SECRET/TOKEN/PASSWORD =
# wartość) daje false-positive na nazwach identyfikatorów/kluczy mocka. Dla tych
# ścieżek pomijamy WYŁĄCZNIE GENERIC; HARD_PATTERNS (realne klucze) i DSN zostają.
_TEST_PATH = re.compile(r"(^|/)__tests__/|\.(test|spec)\.[jt]sx?$", re.I)


def _is_placeholder(val):
    """True, jeśli wartość to oczywisty placeholder (nie realny sekret)."""
    return bool(_PLACEHOLDER_FULL.fullmatch(val))


def _detect_hard_secrets(blob, include_generic=True):
    """Etykiety twardych sekretów (klucze/tokeny/generyczny). BEZ DSN.
    Zachowuje kolejność pierwszego trafienia, deduplikuje.

    include_generic=False pomija WYŁĄCZNIE heurystykę nazw GENERIC (false-positive
    na identyfikatorach testowych) — HARD_PATTERNS (realne klucze) zawsze aktywne."""
    hits = []
    for rx, label in HARD_PATTERNS:
        if rx.search(blob):
            hits.append(label)
    if include_generic:
        for m in GENERIC.finditer(blob):
            if not _is_placeholder(m.group("val")):
                hits.append("zmienna z sekretem (API_KEY/SECRET/TOKEN/PASSWORD)")
                break
    return _dedup(hits)


def _dedup(hits):
    seen, out = set(), []
    for h in hits:
        if h not in seen:
            seen.add(h)
            out.append(h)
    return out


def _detect_file(blob, is_test=False):
    """Pełny katalog sekretów dla Write/Edit: twarde + DSN (host-agnostyczny).
    DSN to samo trafienie wzorca — host ignorowany (deny jak v1.0).

    is_test=True (ścieżka __tests__/**, *.test.*, *.spec.*) pomija GENERIC;
    HARD_PATTERNS i DSN zostają — realny klucz w teście dalej blokowany."""
    hits = _detect_hard_secrets(blob, include_generic=not is_test)
    if DSN_WITH_HOST.search(blob):
        hits.append(_DSN_LABEL)
    return _dedup(hits)


def _has_multi_at_userinfo(command):
    """True, jeśli authority DSN (od schematu do pierwszego `/`) zawiera więcej
    niż jeden `@` — userinfo z dodatkową małpą. Wtedy nie wiadomo, który `@`
    wyznacza host: niejednoznaczne, traktujemy jak zdalny/ask."""
    for m in _DSN_SCHEME_TO_PATH.finditer(command):
        if m.group("authority").count("@") > 1:
            return True
    return False


def _dsn_ask_host(command):
    """Etykieta hosta dla ścieżki Bash, gdy DSN ma być potraktowany jak
    zdalny/niejednoznaczny (-> `ask`), albo None gdy nic do pytania.

    Zwraca:
      - host pierwszego DSN o jednoznacznie zdalnym hoście, LUB
      - znacznik niejednoznaczności (override host=/hostaddr= w query, wiele `@`
        w userinfo, albo nierozpoznany kształt hosta), LUB
      - None, gdy KAŻDY trafiony DSN ma host jednoznacznie w _LOOPBACK i ZERO
        override/ambiguity (jedyny przypadek przepuszczany bez akcji).

    Domyślnie `ask`: jeśli wzorzec DSN pasuje, ale host nie jest jednoznacznie
    loopback ani czytelnym zdalnym -> pytamy (mały wzrost false-positive na
    bramce `ask` jest akceptowalny; nie zawiesza, pyta)."""
    # Niejednoznaczność na poziomie całej komendy — override hosta w query
    # nadpisuje authority (libpq), wiele `@` psuje wyznaczenie hosta.
    if _HOST_OVERRIDE.search(command):
        return "niejednoznaczny (override host=/hostaddr= w query)"
    if _has_multi_at_userinfo(command):
        return "niejednoznaczny (wiele @ w userinfo)"
    for m in DSN_WITH_HOST.finditer(command):
        host = m.group("host")
        if host.lower() not in _LOOPBACK:
            return host
    return None


def _extract_blob(tool_input):
    """Łączy skanowane pola w jeden blob: Write->content, Edit->new_string.
    Skanujemy oba pola niezależnie od tool_name (tani backstop, gdy schemat
    się zmieni). Niestringowe wartości pomijamy."""
    parts = []
    for key in ("content", "new_string"):
        v = tool_input.get(key)
        if isinstance(v, str):
            parts.append(v)
    return "\n".join(parts)


def _signal(message):
    """Sygnał NIEBLOKUJĄCY — świadomie BEZ `permissionDecision`: hook nie dotyka
    przepływu uprawnień, nie blokuje i nie zwalnia. Zostawia ostrzeżenie dla
    Darka (systemMessage) i dla agenta (additionalContext). Ten sam kształt
    wyjścia co sygnał E-2 w hooks/guard-bash.py (v1.2). Dodane w v1.2 tego
    hooka — decyzja Darka 2026-08-27 (zdjęcie bramek `ask`, CLAUDE.md v1.19)."""
    print(json.dumps({
        "systemMessage": message,
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "additionalContext": message,
        }
    }, ensure_ascii=False))


def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        return  # fail-open

    tool = data.get("tool_name")
    tool_input = data.get("tool_input") or {}
    if not isinstance(tool_input, dict):
        return

    # --- Ścieżka Write/Edit: zachowanie v1.0 (deny na każdy sekret + DSN). ---
    if tool in ("Write", "Edit"):
        blob = _extract_blob(tool_input)
        if not blob:
            return
        file_path = tool_input.get("file_path", "") or ""
        is_test = bool(_TEST_PATH.search(file_path)) if isinstance(file_path, str) else False
        try:
            hits = _detect_file(blob, is_test=is_test)
        except Exception:
            return  # fail-open na błędzie skanera
        if hits:
            # v1.3 (2026-08-27): było `deny`, jest sygnał. Decyzja Darka —
            # bramka blokowała autonomiczny przebieg na ATRAPACH kluczy
            # (dane testowe, dokumentacja). Hook ostrzega, nie zatrzymuje.
            _signal(
                "SYGNAŁ — NIE BLOKUJĘ, ostrzegam. Zapis sekretu do pliku "
                "(guard-secrets): wykryto " + ", ".join(hits) + ". Jeśli to "
                "prawdziwa wartość — NIE zapisuj jej w repo: użyj odwołania do "
                "menedżera sekretów (Doppler/env), nie literału, a wartość, "
                "która już poszła, traktuj jak spaloną (rotacja u dostawcy). "
                "Jeśli to atrapa na potrzeby testu — pomiń to ostrzeżenie. "
                "Uwaga: skan sekretów w CI czyta commity, nie dysk — plik "
                "w .gitignore nie zostanie przez niego sprawdzony."
            )
        return

    # --- Ścieżka Bash (od v1.1): twarde sekrety -> deny; DSN host-aware. ---
    if tool == "Bash":
        command = tool_input.get("command", "")
        if not isinstance(command, str) or not command:
            return
        try:
            hard = _detect_hard_secrets(command)
            if hard:
                # v1.3 (2026-08-27): było `deny`, jest sygnał (jak wyżej).
                _signal(
                    "SYGNAŁ — NIE BLOKUJĘ, ostrzegam. Sekret w treści komendy "
                    "(guard-secrets): wykryto " + ", ".join(hard) + ". Klucz "
                    "w komendzie trafia do transkryptu i do audit logu i "
                    "zostaje tam po operacji — użyj zmiennej środowiskowej "
                    "z menedżera sekretów. Jeśli to atrapa testowa — pomiń."
                )
                return
            ask_host = _dsn_ask_host(command)
            if ask_host:
                # v1.2 (2026-08-27): było `ask`, jest sygnał nieblokujący.
                # Zdjęcie wszystkich bramek `ask` — decyzja Darka, CLAUDE.md v1.19.
                # Ostrzeżenie zostaje widoczne, przepływ uprawnień nietknięty.
                _signal(
                    "SYGNAŁ — NIE BLOKUJĘ, ostrzegam. DSN bazy z hasłem do "
                    "ZDALNEGO lub NIEJEDNOZNACZNEGO hosta w komendzie "
                    "(guard-secrets). Host: " + ask_host +
                    ". Hasło w treści komendy trafia do transkryptu i do audit "
                    "logu — zostaje tam po zakończeniu operacji. Preferuj DSN "
                    "ze zmiennej środowiskowej z menedżera sekretów. Jeśli to "
                    "hasło już poszło w komendzie — traktuj je jak spalone: "
                    "rotacja w konsoli dostawcy, potem ponowne wdrożenie."
                )
        except Exception:
            return  # fail-open
        return

    return  # inne narzędzia: brak akcji


if __name__ == "__main__":
    main()
