# %% [markdown]
# # LLM.3 — Od odpowiedzi do danych: parsuj, waliduj, obsłuż porażkę
#
# **SkillBridge · ścieżka Data Science · moduł M-LLM „LLM: ekstrakcja strukturalna"**
#
# Najpierw kopia: **Plik → Zapisz kopię na Dysku** — dalej pracuj w karcie
# „Kopia…".
#
# Ten notebook towarzyszy atomowi LLM.3: zamieniasz TEKST odpowiedzi w słownik
# (`json.loads` — parsowanie, czyli przejście ze świata znaków do struktur),
# łapiesz porażkę parsowania nową składnią `try`/`except` i sprawdzasz komplet
# pól (walidacja). **Ten notebook nie ma pieczątki** — atom zaliczasz,
# odpowiadając na pytania w SkillBridge.
#
# Uczy na ZAPISANYCH odpowiedziach (bez żywego API) — ten sam zbiór, na którym
# ćwiczysz w labie LLM.4.

# %%
# Komórka „Dane" — 6 utrwalonych odpowiedzi modelu (spreparowane dydaktycznie).
# Ten sam zbiór, którego użyjesz w labie LLM.4 — NIE zmieniaj go.
import json

POLA = ["stanowisko", "miasto", "widelki_min"]
odpowiedzi = [
    '{"stanowisko": "tester", "miasto": "Kraków", "widelki_min": 8000}',                # R1 zgodna
    '```json\n{"stanowisko": "analityk", "miasto": "Radom", "widelki_min": 7000}\n```',  # R2 zgodna (płotek)
    'Oto wynik: {"stanowisko": "kurier", "miasto":',                                     # R3 PARSE-FAIL (ucięta)
    '{"stanowisko": "grafik", "miasto": null, "widelki_min": 5000}',                     # R4 zgodna (miasto=null OK)
    '{"stanowisko": "magazynier", "miasto": "Katowice"}',                                # R5 PARSE-BUT-INVALID (brak widelki_min)
    '{"stanowisko": "kucharz", "miasto": "Wrocław", "widelki_min": 6000}',               # R6 zgodna
]

# %%
# Model zwraca TEKST — nawet gdy wygląda jak JSON. json.loads robi z niego słownik:
odpowiedz = '{"stanowisko": "Analityk danych", "miasto": "Radom", "widelki_min": 8000}'
rekord = json.loads(odpowiedz)        # tekst → słownik (loads = „load string")
print(rekord["stanowisko"])           # dalej: znany świat F3.3 → „Analityk danych"

# A gdy odpowiedź jest ucięta/obudowana prozą? json.loads rzuca JSONDecodeError.
# try/except łapie KONKRETNY błąd, żeby jedna zepsuta nie wywróciła całej pętli:
zepsuta = 'Oto wynik: {"stanowisko": "Analityk"'
try:                                   # SPRÓBUJ wykonać blok...
    rekord2 = json.loads(zepsuta)
except json.JSONDecodeError:           # ...a JEŚLI poleci ten błąd — zrób to:
    rekord2 = None                     # oznacz porażkę, pętla idzie dalej
print(rekord2)                         # None — sparsować się nie dało

# %% [markdown]
# **Przewidź, zanim uruchomisz:** co wypisze pierwszy `print`, a co drugi? I druga
# rzecz: odpowiedź R5 (`{"stanowisko": …, "miasto": …}` bez `widelki_min`) SPARSUJE
# się — ale czy jest ZGODNA ze schematem? (Nie: parsowanie ≠ zgodność ze schematem
# — to dwie osobne bramki. Rekord bez kompletu pól przechodzi `is not None`, lecz
# `rekord["widelki_min"]` rzuci `KeyError`.)
#
# ## Uzupełnij lukę (completion)
#
# W komórce poniżej jest luka `_luka_` w warunku `all(...)`. Wstaw to, CO
# sprawdzasz w rekordzie — pętla po `POLA` już stoi, brakuje operatora obecności
# klucza z F3.3. Uruchomienie bez uzupełnienia da `NameError: name '_luka_' is not
# defined`. Poprawny wynik: **Sparsowane 5/6, Zgodne ze schematem 4/6** (R3 nie
# sparsuje się; R5 sparsuje się, ale wypada ze zgodnych — brak pola).

# %%
sparsowane = 0      # udane parsowania (JSON się wczytał)
zgodne = 0          # zgodne ze schematem (parsowanie ORAZ komplet pól)

for tekst in odpowiedzi:
    czysty = tekst.strip().removeprefix("```json").removesuffix("```").strip()
    try:
        rekord = json.loads(czysty)
    except json.JSONDecodeError:
        rekord = None
    if rekord is not None:
        sparsowane = sparsowane + 1                          # sparsowało się (jeszcze nie „zgodne"!)
    if rekord is not None and all(_luka_ in rekord for pole in POLA):   # luka: co jest w rekordzie?
        zgodne = zgodne + 1

print(f"Sparsowane: {sparsowane}/{len(odpowiedzi)}")
print(f"Zgodne ze schematem: {zgodne}/{len(odpowiedzi)}")
