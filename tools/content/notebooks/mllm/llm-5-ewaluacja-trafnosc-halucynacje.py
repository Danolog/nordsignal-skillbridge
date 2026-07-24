# %% [markdown]
# # LLM.5 — Ewaluacja: ground truth, trafność pól i wskaźnik halucynacji
#
# **SkillBridge · ścieżka Data Science · moduł M-LLM „LLM: ekstrakcja strukturalna"**
#
# Najpierw kopia: **Plik → Zapisz kopię na Dysku** — dalej pracuj w karcie
# „Kopia…".
#
# Ten notebook towarzyszy atomowi LLM.5: mierzysz jakość ekstrakcji jak w ML.5 —
# porównując odpowiedzi modelu z ground truth (ręcznie oznaczoną prawdą) pole po
# polu i licząc osobno trafność per pole oraz wskaźnik halucynacji (odsetek pól-
# braków, które model wypełnił). **Ten notebook nie ma pieczątki** — atom
# zaliczasz, odpowiadając na pytania w SkillBridge.
#
# Pracuje na ZAPISANYCH przypadkach (bez żywego API) — ten sam zbiór, który
# składasz samodzielnie w labie LLM.7.

# %%
# Komórka „Dane" — 8 trójek (odpowiedź modelu jako TEKST, ground truth jako
# słownik). Ten sam zbiór, którego użyjesz w labie LLM.7 — NIE zmieniaj go.
# Prawda zawiera DOKŁADNIE 4 pola-braki (null), WSZYSTKIE w przypadkach zgodnych
# ze schematem — dlatego wskaźnik halucynacji jest tu jednoznaczny.
import json

POLA = ["stanowisko", "miasto", "widelki_min"]
przypadki = [
    # C1: prawda miasto=null, widelki=null; model HALUCYNUJE miasto, widelki poprawnie null
    ('{"stanowisko": "tester oprogramowania", "miasto": "Warszawa", "widelki_min": null}',
     {"stanowisko": "tester oprogramowania", "miasto": None, "widelki_min": None}),
    # C2: prawda miasto=null; model miasto=null (trafienie), widelki trafia
    ('{"stanowisko": "kurier", "miasto": null, "widelki_min": 8000}',
     {"stanowisko": "kurier", "miasto": None, "widelki_min": 8000}),
    # C3: prawda widelki=null; model HALUCYNUJE widelki 8000
    ('{"stanowisko": "analityk danych", "miasto": "Kraków", "widelki_min": 8000}',
     {"stanowisko": "analityk danych", "miasto": "Kraków", "widelki_min": None}),
    # C4: model myli miasto (Gdańsk vs Kraków) i widelki (5000 vs 6000) — wartości, nie null
    ('{"stanowisko": "grafik", "miasto": "Gdańsk", "widelki_min": 5000}',
     {"stanowisko": "grafik", "miasto": "Kraków", "widelki_min": 6000}),
    # C5: pełne trafienie (odpowiedź w płotku markdown)
    ('```json\n{"stanowisko": "kucharz", "miasto": "Wrocław", "widelki_min": 12000}\n```',
     {"stanowisko": "kucharz", "miasto": "Wrocław", "widelki_min": 12000}),
    # C6: model gubi seniority (stanowisko) i myli widelki (7000 vs 9000)
    ('{"stanowisko": "programista", "miasto": "Poznań", "widelki_min": 7000}',
     {"stanowisko": "starszy programista", "miasto": "Poznań", "widelki_min": 9000}),
    # C7: PARSE-FAIL (ucięta, obudowana prozą)
    ('Oto dane: {"stanowisko": "recepcjonista", "miasto": "Łódź"',
     {"stanowisko": "recepcjonista", "miasto": "Łódź", "widelki_min": 5000}),
    # C8: PARSE-BUT-INVALID (brak pola widelki_min) — TU siedzi mina KeyError
    ('{"stanowisko": "magazynier", "miasto": "Katowice"}',
     {"stanowisko": "magazynier", "miasto": "Katowice", "widelki_min": 4500}),
]

# %%
# Krok 1 (z LLM.3): parsuj-z-ochroną i przepuść TYLKO rekordy zgodne ze schematem
# (nie-None ORAZ komplet pól). Bez tego filtra C8 (bez `widelki_min`) wywali
# KeyError w środku ewaluacji, a C7 (parse-fail) doda None do mianownika.
zgodne_przypadki = []
for tekst, prawda in przypadki:
    czysty = tekst.strip().removeprefix("```json").removesuffix("```").strip()
    try:
        rekord = json.loads(czysty)
    except json.JSONDecodeError:
        rekord = None
    if rekord is not None and all(pole in rekord for pole in POLA):
        zgodne_przypadki.append({"model": rekord, "prawda": prawda})

zgodnosc = len(zgodne_przypadki) / len(przypadki)
print(f"Zgodne ze schematem: {len(zgodne_przypadki)}/{len(przypadki)} → zgodnosc = {zgodnosc}")
# 6/8 → 0.75 (C7 parse-fail, C8 bez pola wypadają)

# %% [markdown]
# **Przewidź, zanim uruchomisz:** na 6 zgodnych przypadkach trafność `stanowisko`
# wyjdzie 5/6, `miasto` 4/6, `widelki_min` 3/6 — a wskaźnik halucynacji 2/4. Które
# pole kuleje najmocniej? (Widełki — model najczęściej myli lub zmyśla liczbę.)
#
# ## Uzupełnij luki w środku
#
# W pętli poniżej są DWIE luki `_luka_` w warunku halucynacji. Obie strony
# dotyczą TEGO SAMEGO pola z bieżącego obrotu pętli: prawda mówi „brak" (`is
# None`), a model mimo to coś wpisał (`is not None`). Wstaw w obie luki zmienną
# pętli. Uruchomienie bez uzupełnienia da `NameError: name '_luka_' is not
# defined`. Poprawny wynik: trafność 5/6·4/6·3/6, wskaźnik 2/4 = 0.5.

# %%
trafienia = {pole: 0 for pole in POLA}     # skrócony zapis budowy słownika (pełna pętla F3.3 = to samo)
halucynacje = 0
pola_braki = 0

for przypadek in zgodne_przypadki:         # przypadek = {"model": …, "prawda": …}
    for pole in POLA:
        if przypadek["model"][pole] == przypadek["prawda"][pole]:
            trafienia[pole] = trafienia[pole] + 1
        if przypadek["prawda"][_luka_] is None:        # luka A: prawda mówi „brak"?
            pola_braki = pola_braki + 1
            if przypadek["model"][_luka_] is not None:  # luka B: a model to wypełnił?
                halucynacje = halucynacje + 1

trafnosc = {pole: round(trafienia[pole] / len(zgodne_przypadki), 3) for pole in POLA}
halucynacje_wskaznik = halucynacje / pola_braki
print("trafnosc per pole:", trafnosc)                  # {'stanowisko': 0.833, 'miasto': 0.667, 'widelki_min': 0.5}
print(f"halucynacje {halucynacje}/{pola_braki} → wskaznik {halucynacje_wskaznik}")   # 2/4 → 0.5

# %% [markdown]
# ## Brudnopis
#
# Samokontrola z hintu 3: suma pól-braków w prawdzie policzona RĘCZNIE musi zgadzać
# się z mianownikiem wskaźnika (4). Jeśli nie — licznik zlicza złe pola (wcięcia! —
# piętra pętli jak w F3.2-P2). Poniżej policz pola-braki „na piechotę" i porównaj.

# %%
# Brudnopis — policz pola-braki ręcznie i porównaj z pola_braki wyżej:
# reczne_braki = 0
# for tekst, prawda in przypadki:
#     for pole in POLA:
#         if prawda[pole] is None:
#             reczne_braki = reczne_braki + 1
# print(reczne_braki)   # UWAGA: tu liczysz po WSZYSTKICH 8 — ile wyjdzie i czemu?
