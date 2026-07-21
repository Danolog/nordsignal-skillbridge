# Harness testu parytetu pieczątki (Krok 4 / ADR-015) — wykonuje komórki kodu
# notebooka (albo sam wspólny blok pieczątki) w jednej przestrzeni nazw,
# z zamockowanym input() i przechwyconym stdout. Symuluje sesję Colab studenta.
#
# stdin (JSON):
#   { "mode": "notebook", "notebookPath": "...", "atomCode": "...",
#     "replacements": [["stary", "nowy"], ...], "skipCells": [0, 1],
#     "insertCells": [[1, "print(x)"], ...] }
#     (insertCells: dodatkowe komórki studenta wstawiane pod wskazany indeks
#      PO skip/replacements — symulacja np. komórki diagnostycznej po programie)
#   { "mode": "payload", "stampPath": "...", "atomCode": "...",
#     "payload": {...}, "floatKeys": ["g"] }
#     (floatKeys: JSON nie odróżnia 2 od 2.0 — wymusza pythonowy float,
#      żeby przetestować zrzucanie ".0" w kanonicznej serializacji)
#
# stdout (JSON): { "stdout": "...", "error": "TypBłędu: opis" | null }
import contextlib
import io
import json
import sys

req = json.load(sys.stdin)
captured = io.StringIO()
ns = {"input": lambda prompt="": req.get("atomCode", "")}

if req["mode"] == "payload":
    payload = req["payload"]
    for key in req.get("floatKeys", []):
        payload[key] = float(payload[key])
    ns["_zbierz_wyniki"] = lambda: payload
    with open(req["stampPath"], encoding="utf-8") as f:
        cells = [f.read()]
else:
    with open(req["notebookPath"], encoding="utf-8") as f:
        nb = json.load(f)
    cells = ["".join(c["source"]) for c in nb["cells"] if c["cell_type"] == "code"]
    skip = set(req.get("skipCells", []))
    cells = [c for i, c in enumerate(cells) if i not in skip]
    for old, new in req.get("replacements", []):
        cells = [c.replace(old, new) for c in cells]
    for pos, src in sorted(req.get("insertCells", []), key=lambda x: x[0], reverse=True):
        cells.insert(pos, src)

# Emulacja historii sesji IPython/Colab: `In` to lista źródeł wykonanych
# komórek (In[0] = "", bieżąca komórka jest w liście już w trakcie wykonania).
# Pieczątka F1.7 czyta z niej źródło komórki programu (check `_zrodlo`).
ns["In"] = [""]

error = None
with contextlib.redirect_stdout(captured):
    for cell in cells:
        ns["In"].append(cell)
        try:
            exec(compile(cell, "<komórka>", "exec"), ns)  # noqa: S102 — harness testowy
        except Exception as e:  # noqa: BLE001
            error = f"{type(e).__name__}: {e}"
            break

print(json.dumps({"stdout": captured.getvalue(), "error": error}))
