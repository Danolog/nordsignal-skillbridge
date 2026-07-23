#!/usr/bin/env python3
"""
audit-log.py — PostToolUse / SubagentStart / SubagentStop hook, nordsignal.

Dopisuje audytowalny, hash-łańcuchowany zapis każdego wywołania narzędzia i
każdego zdarzenia subagenta do logs/audit/YYYY-MM.jsonl (append-only JSONL).

Każdy wpis ma `seq` (numer kolejny), `prev_hash` (hash wpisu poprzedniego) i
`hash` (SHA-256 wpisu). Łańcuch jest globalny — ciągły przez wszystkie pliki
miesięczne. Edycja, usunięcie lub przestawienie wpisu rwie łańcuch i jest
wykrywalne przez hooks/audit-verify.py.

Wersja: v2.4 · 2026-06-23 · owner: Ryan (CRCO).
Changelog v2.3->v2.4: atrybucja ról nordsignal — pole `agent` bierze NORDSIGNAL_ROLE
  (zmienna środowiskowa) gdy ustawiona, inaczej dotychczasowy fallback (typ subagenta
  harnessu -> "main"); NOWE pole `agent_type_raw` ZAWSZE trzyma surowy typ harnessu
  (pełny ślad: i KTO=rola, i JAK=typ subagenta). Powód: audit log atrybuował tylko typ
  subagenta (general-purpose/main), nie rolę nordsignal -> dzienny cykl uczenia Coacha
  bez danych per-pilot (cały czerwiec 0 wpisów ethan/leo/sophia/mila). Hash-chain spójny:
  każdy wpis hashowany własnym kształtem, wpisy historyczne nietknięte, re-genesis zbędny
  (audit-verify.py l.79 liczy z rec.items(), schemat-agnostyczny). Weryfikacja prod:
  2914 wpisów exit 0. Test: tools/test/test-audit-role-attribution.py 6/6 zielone (w tym
  twarda bramka hash-chain stary<->nowy kształt). Propozycja Ethana (CTO) + recenzja GO
  Ryana (CRCO, owner) -> sign-off Darka 2026-06-23 (Plan Mode, sesja Oliver).
Changelog v2.2->v2.3: twarda serializacja zapisu — Windows msvcrt LK_NBLCK +
  exponential backoff/jitter (budżet 5 s) zamiast cichego best-effort `pass`;
  _lock() zwraca bool, fail-open = POMIŃ wpis (luka seq), nigdy zapis bez
  blokady. Usuwa przeplot współbieżnych appendów subagentów (urwane linie,
  re-genesis 2026-05-23). Test: tools/test/concurrent-audit.py 10/10 zielone.
  Sign-off Darka 2026-05-23. chain_hash/kontrakt wpisu bez zmian.
Changelog v1->v2: hash-chaining (tamper-evidence), append pod blokadą flock.
Changelog v2->v2.1: przenośna blokada (fcntl/msvcrt) — fcntl uniksowy wywracał
  hook na Windows przed try/except (audit log nie pisał). Sign-off Darka 2026-05-23.
Changelog v2.1->v2.2: redakcja PII (email/IBAN/PESEL/tel/karta -> <PII:typ:sha8>)
  w stringach params przed zapisem — minimalizacja danych w trwałym logu (F5,
  re-audyt KB 2026-05-23). Redakcja w truncate dzieje się PRZED chain_hash ->
  łańcuch spójny; wpisy historyczne nietknięte. Sign-off Darka 2026-05-23.
Edycja tego pliku jest czerwoną linią.

GRANICE: tamper-EVIDENT, nie tamper-proof — patrz policies/audit-log.md.

Hook nigdy nie blokuje i nigdy nie wywraca narzędzia — każdy błąd jest
połykany, zawsze exit 0. Awaria logu nie może zatrzymać pracy firmy.
"""
import hashlib
import json
import os
import random
import re
import sys
import time
from datetime import datetime, timezone

LOCK_BUDGET_S = 5.0   # twardy budżet czekania na blokadę (Windows backoff)

# Blokada plikowa serializująca append-y łańcucha. fcntl jest uniksowy
# (LOCK_EX blokuje do zwolnienia); na Windows msvcrt.LK_LOCK ma tylko ~10 prób
# po 1 s i rzuca OSError — pod współbieżnością subagentów to prowadziło do
# zapisu BEZ blokady (przeplot → urwany append → zerwany hash-chain). Teraz
# oba kontrakty zwracają bool: _lock() == False ⇒ wołający POMIJA wpis
# (fail-open = wykrywalna luka seq), NIGDY nie pisze bez blokady.
try:
    import fcntl

    def _lock(lockf):
        fcntl.flock(lockf, fcntl.LOCK_EX)  # blokujący — czeka do zwolnienia
        return True

    def _unlock(lockf):
        try:
            fcntl.flock(lockf, fcntl.LOCK_UN)
        except OSError:
            pass
except ImportError:  # Windows
    import msvcrt

    def _lock(lockf):
        # Nieblokujący lock w pętli z exponential backoff + jitter. My kontrolujemy
        # liczbę prób i czas, zamiast polegać na nieprzejrzystym LK_LOCK.
        # Plik .lock otwierany w trybie "a" (NIE "w") — truncate na pliku z
        # aktywnym byte-lockiem rzuca ERROR_LOCK_VIOLATION i gubił wpisy.
        # msvcrt blokuje 1 bajt od pozycji 0 (region może być poza EOF).
        lockf.seek(0)
        deadline = time.monotonic() + LOCK_BUDGET_S
        delay = 0.002
        while time.monotonic() < deadline:
            try:
                msvcrt.locking(lockf.fileno(), msvcrt.LK_NBLCK, 1)
                return True
            except OSError:
                # Gęste próby (cap 20 ms) — hold sekcji krytycznej ~10 ms, więc
                # rzadszy polling głodził pechowe procesy (drop pod kontencją).
                time.sleep(delay + random.uniform(0, delay))
                delay = min(delay * 2, 0.02)
        return False  # budżet wyczerpany — wołający pomija zapis

    def _unlock(lockf):
        try:
            lockf.seek(0)
            msvcrt.locking(lockf.fileno(), msvcrt.LK_UNLCK, 1)
        except OSError:
            pass

MAXLEN = 500          # truncacja długich stringów — log to ślad, nie kopia danych
GENESIS = "0" * 64    # prev_hash pierwszego wpisu łańcucha
TAIL_WINDOW = 131072  # bajtów czytanych z końca pliku, by znaleźć ostatni wpis


# Redakcja PII w params przed zapisem do trwałego logu (retencja 12 m-cy).
# Hook PostToolUse nie widzi werdyktu pii_guard serwera MCP — redagujemy
# wzorce zawsze, dla każdego wywołania. Hash (8 hex) pozwala skorelować
# powtórzenia bez ujawniania treści. Wzorce świadomie zachowawcze:
# email / IBAN / PESEL / telefon PL / karta — te same klasy co pii_guard.py.
_PII_PATTERNS = [
    (re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}"), "email"),
    (re.compile(r"\b[A-Z]{2}\d{2}[A-Za-z0-9]{11,30}\b"), "iban"),
    (re.compile(r"(?<!\d)\d{11}(?!\d)"), "pesel"),
    (re.compile(r"(?<!\d)(?:\+48\s?)?(?:\d[ -]?){9}(?!\d)"), "tel"),
    (re.compile(r"(?<!\d)(?:\d[ -]?){13,19}(?!\d)"), "card"),
]


def redact_pii(text):
    """Zastępuje wykryte PII tokenem <PII:typ:sha8>. Kolejność wzorców ma
    znaczenie — email i IBAN przed czysto-cyfrowymi, by nie pociąć ich
    fragmentów. Idempotentne na własnym wyjściu (token nie pasuje do wzorców)."""
    def repl(typ):
        def _r(m):
            h = hashlib.sha256(m.group(0).encode("utf-8")).hexdigest()[:8]
            return f"<PII:{typ}:{h}>"
        return _r
    for rx, typ in _PII_PATTERNS:
        text = rx.sub(repl(typ), text)
    return text


def truncate(obj, depth=0):
    if depth > 6:
        return "<...>"
    if isinstance(obj, str):
        obj = redact_pii(obj)
        if len(obj) <= MAXLEN:
            return obj
        return obj[:MAXLEN] + f"<+{len(obj) - MAXLEN} znaków>"
    if isinstance(obj, dict):
        return {k: truncate(v, depth + 1) for k, v in list(obj.items())[:50]}
    if isinstance(obj, list):
        return [truncate(v, depth + 1) for v in obj[:50]]
    return obj


def chain_hash(record):
    """SHA-256 kanonicznej formy wpisu (bez pola `hash`).
    Musi być identyczne z hooks/audit-verify.py."""
    canonical = json.dumps(record, sort_keys=True, ensure_ascii=False,
                           separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def last_record(log_dir):
    """Ostatni wpis łańcucha — szuka w plikach miesięcznych od najnowszego."""
    try:
        files = sorted(f for f in os.listdir(log_dir) if f.endswith(".jsonl"))
    except Exception:
        return None
    for name in reversed(files):
        try:
            with open(os.path.join(log_dir, name), "rb") as f:
                f.seek(0, os.SEEK_END)
                size = f.tell()
                f.seek(max(0, size - TAIL_WINDOW))
                tail = f.read().decode("utf-8", errors="replace")
            lines = [ln for ln in tail.splitlines() if ln.strip()]
            if lines:
                return json.loads(lines[-1])
        except Exception:
            continue
    return None


def build_record(data):
    event = data.get("hook_event_name", "?")
    # Atrybucja: rola nordsignal z NORDSIGNAL_ROLE wygrywa, gdy ustawiona; brak
    # roli -> dotychczasowe zachowanie (typ subagenta harnessu -> "main"). Surowy
    # typ harnessu ZAWSZE zachowany w agent_type_raw, by ślad audytowy pokazywał
    # i KTO (rola), i JAK (typ subagenta). Decyzja Darka 2026-06-23 (Plan Mode,
    # propozycja Ethana + recenzja GO Ryana). Hash-chain spójny: każdy wpis
    # hashowany własnym kształtem, wpisy historyczne nietknięte.
    subagent_type = data.get("agent_type") or "main"
    role = os.environ.get("NORDSIGNAL_ROLE")
    record = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "event": event,
        "session": data.get("session_id"),
        "agent": role or subagent_type,
        "agent_type_raw": subagent_type,
        "agent_id": data.get("agent_id"),
    }
    if event in ("SubagentStart", "SubagentStop"):
        record["model"] = data.get("model")
    else:
        record["tool"] = data.get("tool_name")
        record["params"] = truncate(data.get("tool_input") or {})
        result = data.get("tool_result")
        if isinstance(result, dict):
            record["result_exit"] = result.get("exitCode")
            record["result_duration_ms"] = result.get("duration_ms")
    return record


def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        return

    project_dir = (os.environ.get("CLAUDE_PROJECT_DIR")
                   or data.get("cwd") or os.getcwd())
    log_dir = os.path.join(project_dir, "logs", "audit")

    try:
        os.makedirs(log_dir, exist_ok=True)
        with open(os.path.join(log_dir, ".lock"), "a") as lockf:
            if not _lock(lockf):
                return  # fail-open: nie udało się zserializować — pomiń wpis,
                        # NIGDY nie pisz bez blokady (urwany append rwie łańcuch)
            try:
                prev = last_record(log_dir)
                record = build_record(data)
                record["seq"] = (prev["seq"] + 1) if prev else 1
                record["prev_hash"] = prev["hash"] if prev else GENESIS
                record["hash"] = chain_hash(record)

                month = datetime.now(timezone.utc).strftime("%Y-%m")
                with open(os.path.join(log_dir, f"{month}.jsonl"), "a",
                          encoding="utf-8") as f:
                    f.write(json.dumps(record, ensure_ascii=False) + "\n")
                    f.flush()  # wpis na dysku przed zwolnieniem blokady
            finally:
                _unlock(lockf)
    except Exception:
        pass  # awaria logu nie może wywrócić pracy


if __name__ == "__main__":
    main()
