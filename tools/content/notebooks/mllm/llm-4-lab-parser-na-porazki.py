# %% [markdown]
# # LLM.4 — LAB „Parser na porażki" (6 odpowiedzi → parsowanie vs schemat)
#
# **SkillBridge · ścieżka Data Science · moduł M-LLM „LLM: ekstrakcja strukturalna"**
#
# Najpierw kopia: **Plik → Zapisz kopię na Dysku** — dalej pracuj w karcie
# „Kopia…".
#
# Przepuścisz przez parser 6 zapisanych odpowiedzi modelu — w tym jedną
# złamaną, jedną w płotku markdown i jedną, która się SPARSUJE, ale nie ma
# kompletu pól — i policzysz **DWIE różne liczby**: ile odpowiedzi w ogóle się
# sparsowało (`sparsowane`) i ile jest zgodnych ze schematem (`zgodne`). To nie
# to samo — a rozróżnienie decyduje o kryterium rubryki za 25%. Nazwy zmiennych
# są częścią specyfikacji: pieczątka musi wiedzieć, gdzie patrzeć.

# %%
import json

# Komórka „Dane" — 6 utrwalonych odpowiedzi modelu (spreparowane dydaktycznie).
# Zafiksowane treścią; NIE zmieniaj — z nich liczona jest pieczątka.
POLA = ["stanowisko", "miasto", "widelki_min"]
odpowiedzi = [
    '{"stanowisko": "tester", "miasto": "Kraków", "widelki_min": 8000}',                # R1 zgodna
    '```json\n{"stanowisko": "analityk", "miasto": "Radom", "widelki_min": 7000}\n```',  # R2 zgodna (płotek)
    'Oto wynik: {"stanowisko": "kurier", "miasto":',                                     # R3 PARSE-FAIL (ucięta)
    '{"stanowisko": "grafik", "miasto": null, "widelki_min": 5000}',                     # R4 zgodna (miasto=null OK)
    '{"stanowisko": "magazynier", "miasto": "Katowice"}',                                # R5 PARSE-BUT-INVALID (brak widelki_min)
    '{"stanowisko": "kucharz", "miasto": "Wrocław", "widelki_min": 6000}',               # R6 zgodna
]

# %% [markdown]
# ## Twój parser — uzupełnij trzy luki
#
# Trzy luki to trzy atomy w pigułce: parsujesz tekst PO zdjęciu płotka (linia
# `czysty` robi to za Ciebie), łapiesz KONKRETNY błąd (LLM.3), a liczysz DWIE
# rzeczy osobno — udane parsowania i zgodne ze schematem — bo rekord potrafi
# się sparsować i mimo to nie mieć kompletu pól (LLM.3: parsowanie ≠ zgodność).

# %%
rekordy = []
sparsowane = 0      # udane parsowania (JSON sie wczytal)
zgodne = 0          # zgodne ze schematem (parsowanie ORAZ komplet pol)

for tekst in odpowiedzi:
    czysty = tekst.strip().removeprefix("```json").removesuffix("```").strip()
    try:
        rekord = json.loads(______)                      # luka 1: co parsujesz?
    except ______:                                       # luka 2: ktory blad lapiesz?
        rekord = None
    if rekord is not None:
        sparsowane = sparsowane + 1                      # sparsowalo sie (jeszcze nie „zgodne"!)
    if rekord is not None and all(pole in rekord for pole in POLA):
        zgodne = ______                                  # luka 3: licznik zgodnych (F3.2!)
    rekordy.append(rekord)

print(f"Sparsowane: {sparsowane}/{len(odpowiedzi)}")
print(f"Zgodne ze schematem: {zgodne}/{len(odpowiedzi)}")

# %% [markdown]
# ## Pieczątka — zalicz ten lab w SkillBridge
#
# Uruchom komórkę poniżej, przepisz **kod atomu** z SkillBridge i przenieś
# wypisany **token** do pola „Pieczątka".
#
# Pieczątka bierze Twoje `sparsowane`, `zgodne` i `rekordy`, sama przelicza
# zbiór **tym samym filtrem schema-valid** (`rekord is not None and all(pole in
# rekord for pole in POLA)`) i sprawdza, czy rozdzieliłeś(-aś) parsowanie od
# zgodności ze schematem. Łapie tym dwie klasyczne pomyłki: niezdjęty płotek
# i policzenie rekordu bez kompletu pól jako zgodnego. Czego NIE sprawdza:
# samodzielności kodu — lab bramkuje postęp, nie wystawia kredencjału.

# %% [pieczatka]
def _zbierz_wyniki():
    g = globals()
    wymagane = ("odpowiedzi", "POLA", "rekordy", "sparsowane", "zgodne")
    brak = [n for n in wymagane if n not in g]
    if brak:
        raise RuntimeError(
            "Nie widze w tej sesji: " + ", ".join(brak) + ". "
            "Uzupelnij trzy luki w komorce 'Twoj parser' i uruchom komorki od gory."
        )
    odpowiedzi = g["odpowiedzi"]
    pola = list(g["POLA"])
    if len(odpowiedzi) != 6 or pola != ["stanowisko", "miasto", "widelki_min"]:
        raise RuntimeError(
            "Komorka 'Dane' jest zmieniona (ma byc 6 odpowiedzi i POLA = "
            "[stanowisko, miasto, widelki_min]) — przywroc ja, bo z niej liczona "
            "jest pieczatka."
        )

    # Recompute pieczatki — TEN SAM filtr schema-valid co uczy tresc (LLM.3).
    parsowalne_ref = 0
    zgodne_ref = 0
    for tekst in odpowiedzi:
        czysty = tekst.strip().removeprefix("```json").removesuffix("```").strip()
        try:
            rekord = json.loads(czysty)
        except json.JSONDecodeError:
            rekord = None
        if rekord is not None:
            parsowalne_ref = parsowalne_ref + 1
        if rekord is not None and all(pole in rekord for pole in pola):
            zgodne_ref = zgodne_ref + 1
    if parsowalne_ref != 5 or zgodne_ref != 4:
        raise RuntimeError(
            "Zbior 'odpowiedzi' jest zmieniony (ma dac sparsowane 5/6, zgodne 4/6) — "
            "przywroc komorke 'Dane'."
        )

    sparsowane = int(g["sparsowane"])
    zgodne = int(g["zgodne"])

    if sparsowane != parsowalne_ref:
        raise RuntimeError(
            "Twoje `sparsowane` = " + str(sparsowane) + ", a jedyny poprawny wynik to 5/6. "
            "Najczesciej to NIEZDJETY PLOTEK markdown: parsujesz `tekst` zamiast `czysty` "
            "(luka 1), wiec odpowiedz R2 w plotku ```json nie wczytuje sie. Parsuj `czysty` — "
            "linia nad `try` zdjela juz plotek za Ciebie."
        )

    if zgodne != zgodne_ref:
        raise RuntimeError(
            "Twoje `zgodne` = " + str(zgodne) + ", a jedyny poprawny wynik to 4/6. "
            "Najczesciej policzyles(-as) rekord bez kompletu pol jako zgodny: odpowiedz R5 "
            "(`{stanowisko, miasto}` bez `widelki_min`) SPARSUJE sie, ale NIE jest zgodna ze "
            "schematem. Do `zgodne` wchodzi tylko rekord z KOMPLETEM pol — nie pomijaj warunku "
            "`all(pole in rekord for pole in POLA)` (LLM.3: parsowanie != zgodnosc)."
        )

    return {
        "rekordy": [rekord is not None for rekord in g["rekordy"]],
        "sparsowane": sparsowane,
        "zgodne": zgodne,
    }
