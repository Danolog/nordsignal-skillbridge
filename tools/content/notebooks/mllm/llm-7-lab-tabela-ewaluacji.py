# %% [markdown]
# # LLM.7 — LAB „Tabela ewaluacji" (samodzielny finał drabiny)
#
# **SkillBridge · ścieżka Data Science · moduł M-LLM „LLM: ekstrakcja strukturalna"**
#
# Najpierw kopia: **Plik → Zapisz kopię na Dysku** — dalej pracuj w karcie
# „Kopia…".
#
# Ostatni lab całej ścieżki: z 8 zapisanych trójek (tekst ogłoszenia, odpowiedź
# modelu, ground truth) zbudujesz kompletną **tabelę ewaluacji** — dokładnie
# artefakt, którego rubryka capstone'u żąda za 30%. Tu nie ma luk — **piszesz
# sam(a)**, tak jak napiszesz na capstonie.

# %%
import json

# Komórka „Dane" — 8 trójek (odpowiedź modelu jako TEKST, ground truth jako
# słownik). Spreparowane dydaktycznie; zafiksowane treścią — NIE zmieniaj, bo
# z nich liczona jest pieczątka. Prawda zawiera DOKŁADNIE 4 pola-braki (null),
# wszystkie w przypadkach zgodnych ze schematem — to część kontraktu pieczątki.
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

# %% [markdown]
# ## Twoja ewaluacja — napisz cały przepływ
#
# Kolejność: **parsuj-z-ochroną → filtr schema-valid → licz TYLKO na zgodnych →
# tabela → słowa**. Zapisz wyniki pod nazwami — są częścią specyfikacji,
# pieczątka po nich patrzy:
#
# 1. Parsowanie z ochroną (LLM.3/LLM.4): odpowiedzi → `rekordy`; odsetek
#    ZGODNYCH ZE SCHEMATEM (sparsowane ORAZ z kompletem pól) jako ułamek 0–1 →
#    **`zgodnosc`** (rekord sparsowany, ale bez kompletu pól, NIE liczy się).
# 2. Trafność per pole (LLM.5) na przypadkach ZGODNYCH ZE SCHEMATEM — filtr
#    `rekord is not None and all(pole in rekord for pole in POLA)`, NIE samo
#    „nie-None" (inaczej rekord bez pola wywali `KeyError`) → słownik
#    **`trafnosc`** (pole → ułamek).
# 3. Wskaźnik halucynacji (LLM.5) liczony TYLKO na zgodnych: mianownik
#    **`pola_braki`** (pola `null` w prawdzie), licznik **`halucynacje`** (te
#    braki, które model wypełnił), a z nich **`halucynacje_wskaznik`** = ułamek.
# 4. Tabela wyników: DataFrame (PD.2!) z wierszami per pole + wydruk — to Twoja
#    „tabela ewaluacji w repozytorium".
# 5. Komórka tekstowa niżej: 2 zdania wniosków (które pole kuleje? co byś
#    zmienił(a) w prompcie?) + 1 zdanie Ograniczeń — tego pieczątka nie
#    sprawdza, oceni rubryka capstone'u.

# %%
# Twoja ewaluacja — caly przeplyw (napisz od parsowania po wskaznik):
# ...

# %% [markdown]
# **Komórka tekstowa** (poza pieczątką — ćwiczysz formę na capstone):
# (a) które pole kuleje najmocniej i co byś zmienił(a) w prompcie; (b) 1 zdanie
# Ograniczeń (ML.6: „8 przykładów to za mało, by…").
#
# *Tu wpisz swoje zdania.*

# %% [markdown]
# ## Pieczątka — zalicz ten lab w SkillBridge
#
# Uruchom komórkę poniżej, przepisz **kod atomu** z SkillBridge i przenieś
# wypisany **token** do pola „Pieczątka".
#
# Pieczątka NIE ufa Twoim liczbom: sama przelicza cały zbiór **tym samym
# filtrem schema-valid**, którego uczy treść, i porównuje z Twoim `zgodnosc`,
# `trafnosc`, `pola_braki`, `halucynacje`, `halucynacje_wskaznik`. Łapie tym
# cztery klasyczne pomyłki finału: policzenie parsowania zamiast zgodności ze
# schematem, trafność liczoną poza zgodnymi, błąd wcięcia w pętli halucynacji
# i pomylony licznik/mianownik. Czego NIE sprawdza: zdań w komórce tekstowej
# ani samodzielności kodu — lab bramkuje postęp, nie wystawia kredencjału.

# %% [pieczatka]
def _zbierz_wyniki():
    g = globals()
    wymagane = (
        "przypadki", "POLA", "zgodnosc", "trafnosc",
        "pola_braki", "halucynacje", "halucynacje_wskaznik",
    )
    brak = [n for n in wymagane if n not in g]
    if brak:
        raise RuntimeError(
            "Nie widze w tej sesji: " + ", ".join(brak) + ". "
            "Napisz pelny przeplyw (parsowanie -> filtr schema-valid -> trafnosc -> "
            "pola_braki/halucynacje -> wskaznik) w komorce 'Twoja ewaluacja' i uruchom "
            "komorki od gory."
        )
    przypadki = g["przypadki"]
    pola = list(g["POLA"])
    if len(przypadki) != 8 or pola != ["stanowisko", "miasto", "widelki_min"]:
        raise RuntimeError(
            "Komorka 'Dane' jest zmieniona (ma byc 8 trojek i POLA = "
            "[stanowisko, miasto, widelki_min]) — przywroc ja, bo z niej liczona "
            "jest pieczatka."
        )

    # Recompute pieczatki — DOKLADNIE ten sam filtr schema-valid co uczy tresc
    # (LLM.3/LLM.5): rekord is not None AND komplet pol. Bez `all(...)` odpowiedz
    # C8 (sparsowana bez `widelki_min`) rzucilaby KeyError tu, w pieczatce.
    parsowalne_ref = 0
    zgodne_ref = 0
    trafienia = {p: 0 for p in pola}
    pola_braki_ref = 0
    halucynacje_ref = 0
    for tekst, prawda in przypadki:
        czysty = tekst.strip().removeprefix("```json").removesuffix("```").strip()
        try:
            rekord = json.loads(czysty)
        except json.JSONDecodeError:
            rekord = None
        if rekord is not None:
            parsowalne_ref = parsowalne_ref + 1
        if not (rekord is not None and all(pole in rekord for pole in pola)):
            continue
        zgodne_ref = zgodne_ref + 1
        for pole in pola:
            if rekord[pole] == prawda[pole]:
                trafienia[pole] = trafienia[pole] + 1
            if prawda[pole] is None:
                pola_braki_ref = pola_braki_ref + 1
                if rekord[pole] is not None:
                    halucynacje_ref = halucynacje_ref + 1

    zgodnosc_ref = zgodne_ref / len(przypadki)
    trafnosc_ref = {p: trafienia[p] / zgodne_ref for p in pola}
    wskaznik_ref = halucynacje_ref / pola_braki_ref

    def _blisko(a, b, tol=1e-6):
        return abs(float(a) - float(b)) <= tol

    # Straznik danych: recompute MUSI dac kanoniczny rozklad (kontrakt zbioru).
    if not (
        _blisko(zgodnosc_ref, 0.75)
        and pola_braki_ref == 4
        and halucynacje_ref == 2
        and _blisko(trafnosc_ref["stanowisko"], 5 / 6)
        and _blisko(trafnosc_ref["miasto"], 4 / 6)
        and _blisko(trafnosc_ref["widelki_min"], 3 / 6)
    ):
        raise RuntimeError(
            "Zbior 'przypadki' jest zmieniony (ma dac zgodnosc 0.75, 4 pola-braki, "
            "2 halucynacje) — przywroc komorke 'Dane', bo z niej liczona jest pieczatka."
        )

    s_zgodnosc = float(g["zgodnosc"])
    s_trafnosc = g["trafnosc"]
    s_pola_braki = int(g["pola_braki"])
    s_halucynacje = int(g["halucynacje"])
    s_wskaznik = float(g["halucynacje_wskaznik"])

    # Diagnoza 3 — parsowanie pomylone ze schematem.
    if not _blisko(s_zgodnosc, zgodnosc_ref):
        parse_ratio = parsowalne_ref / len(przypadki)   # 7/8 = 0.875
        if _blisko(s_zgodnosc, parse_ratio):
            raise RuntimeError(
                "Twoja `zgodnosc` wyszla " + str(round(s_zgodnosc, 4)) + ", a jedyny poprawny "
                "wynik to 0.75 (6 z 8). Policzyles(-as) SPARSOWANE (7 — w tym odpowiedz, ktora "
                "sie wczytala, ale NIE ma pola `widelki_min`) zamiast ZGODNYCH ZE SCHEMATEM (6). "
                "To dwie bramki (LLM.4): do `zgodnosc` wchodzi tylko rekord z KOMPLETEM pol — "
                "dolóz `all(pole in rekord for pole in POLA)`."
            )
        raise RuntimeError(
            "Twoja `zgodnosc` = " + str(round(s_zgodnosc, 4)) + ", a poprawnie 0.75 (6 z 8 "
            "zgodnych ze schematem). Licz zgodne jako rekordy z KOMPLETEM pol (`rekord is not "
            "None and all(pole in rekord for pole in POLA)`) przez WSZYSTKIE 8 odpowiedzi."
        )

    # Diagnoza 2 — trafnosc liczona poza zgodnymi (filtr).
    for pole in pola:
        if pole not in s_trafnosc or not _blisko(s_trafnosc[pole], trafnosc_ref[pole]):
            raise RuntimeError(
                "Twoja `trafnosc` nie zgadza sie ze wzorcem (stanowisko ~0.83, miasto ~0.67, "
                "widelki_min 0.50). Najczestsza przyczyna: liczysz ja na WSZYSTKICH 8 "
                "przypadkach zamiast na 6 zgodnych ze schematem — zlamany (None) i sparsowany-"
                "bez-pola wchodza do mianownika i psuja ulamek. Odfiltruj przed liczeniem: "
                "`rekord is not None and all(pole in rekord for pole in POLA)`."
            )

    # Diagnoza 4 — wskaznik != 0.5: pomylony licznik/mianownik.
    if not _blisko(s_wskaznik, wskaznik_ref):
        raise RuntimeError(
            "Twoj `halucynacje_wskaznik` = " + str(round(s_wskaznik, 4)) + " != 0.5 (2 z 4). "
            "Sprawdz OBIE liczby osobno: mianownik to pola-braki w PRAWDZIE (`prawda[pole] is "
            "None`) liczone TYLKO na zgodnych = 4; licznik to te braki, ktore model WYPELNIL "
            "(`model[pole] is not None`) = 2. Mianownik != 4 -> liczysz braki takze na zlamanym/"
            "niezgodnym przypadku (filtruj wejscie); licznik != 2 -> mylisz »model wypelnil« "
            "z »model trafil« (halucynacja to prawda=null ORAZ model!=null)."
        )

    # Diagnoza 1 — wskaznik zgadza sie (0.5), ale skladniki NIE: blad wciecia.
    if s_pola_braki != pola_braki_ref or s_halucynacje != halucynacje_ref:
        raise RuntimeError(
            "Twoj `halucynacje_wskaznik` = 0.5 zgadza sie z wynikiem, ale SKLADNIKI NIE: masz "
            "pola-braki=" + str(s_pola_braki) + " i halucynacje=" + str(s_halucynacje) + ", "
            "a jedyny poprawny rozklad to 4 pola-braki i 2 halucynacje. To klasyczne WCIECIE: "
            "instrukcja zliczajaca `prawda[pole] is None` stoi o pietro wyzej/nizej niz trzeba "
            "— nalezy do petli po POLA i ma dotyczyc TEGO pola z biezacego obrotu (pietra petli "
            "jak w F3.2-P2). Sprawdz, na ktorym wcieciu rosnie licznik."
        )

    return {
        "przypadki_liczba": len(przypadki),
        "zgodnosc": s_zgodnosc,
        "trafnosc_wartosci": [float(s_trafnosc[p]) for p in pola],
        "trafnosc_stanowisko": float(s_trafnosc["stanowisko"]),
        "trafnosc_miasto": float(s_trafnosc["miasto"]),
        "trafnosc_widelki_min": float(s_trafnosc["widelki_min"]),
        "pola_braki_liczba": s_pola_braki,
        "halucynacje_liczba": s_halucynacje,
        "halucynacje_wskaznik": s_wskaznik,
    }
