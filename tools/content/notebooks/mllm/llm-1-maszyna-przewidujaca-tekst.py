# %% [markdown]
# # LLM.1 — LLM: maszyna przewidująca tekst (i jak z nią rozmawiać)
#
# **SkillBridge · ścieżka Data Science · moduł M-LLM „LLM: ekstrakcja strukturalna"**
#
# Najpierw kopia: **Plik → Zapisz kopię na Dysku** — dalej pracuj w karcie
# „Kopia…".
#
# Ten notebook towarzyszy atomowi LLM.1: oglądasz tu na ZAPISANYCH odpowiedziach,
# czym LLM (duży model językowy — sieć przewidująca kolejny fragment tekstu, czyli
# token) różni się od `sum()` — losuje kontynuację, więc ten sam prompt (tekst-
# polecenie) potrafi dać różne odpowiedzi. **Ten notebook nie ma pieczątki** —
# atom zaliczasz, odpowiadając na pytania w SkillBridge.
#
# Żadna komórka tego notebooka NIE wywołuje modelu na żywo — pierwsze żywe
# wywołanie robisz dopiero w capstonie. Tu porównujesz UTRWALONE odpowiedzi.

# %%
# Tak wygląda ŻYWE wywołanie modelu — uruchomisz je DOPIERO w capstonie, nie tu.
# Zostawiamy je zakomentowane jako wzór (klucz = hasło do usługi, LLM.6!):
#
# from google import genai
# from google.genai import types
#
# client = genai.Client(api_key=klucz)              # klucz = hasło do usługi (LLM.6!)
# odpowiedz = client.models.generate_content(
#     model="gemini-2.5-flash",                     # który model
#     contents=prompt,                              # Twoje polecenie
#     config=types.GenerateContentConfig(temperature=0),   # losowość: minimum (niżej!)
# )
# print(odpowiedz.text)                             # odpowiedź to TEKST

# %%
# Ten sam prompt wysłany DWA razy przy WYSOKIEJ temperaturze (temperatura =
# pokrętło losowości generacji) — dwie ZAPISANE odpowiedzi. Spreparowane
# dydaktycznie; docelowo utrwalone raz z żywego API przy budowie notebooka.
# Ogłoszenie było BEZ widełek płacowych — patrz, co model z tym zrobił:
odp_wysoka_1 = '{"stanowisko": "tester", "miasto": "Kraków", "widelki_min": null}'
odp_wysoka_2 = '{"stanowisko": "tester", "miasto": "Kraków", "widelki_min": 8000}'
print("wysoka temp — identyczne?", odp_wysoka_1 == odp_wysoka_2)
# False: raz poprawne null (brak widełek), raz ZMYŚLONE 8000 — to halucynacja
# (płynnie zmyślona informacja, której w źródle nie było) na żywo.

# Ten sam prompt przy temperaturze 0 — losowość zjechana do minimum:
odp_zero_1 = '{"stanowisko": "tester", "miasto": "Kraków", "widelki_min": null}'
odp_zero_2 = '{"stanowisko": "tester", "miasto": "Kraków", "widelki_min": null}'
print("temp 0 — identyczne?", odp_zero_1 == odp_zero_2)
# True: (niemal) pełna powtarzalność — dlatego do ekstrakcji danych ustawiasz 0.

# %% [markdown]
# **Przewidź, zanim uruchomisz:** która para wyjdzie identyczna, a która różna?
# I gdzie siedzi halucynacja — w której odpowiedzi z pary „wysoka temperatura"?
# (Temperatura 0 to odpowiednik `random_state` z ML.1: zmniejsza losowość, ale —
# inaczej niż ziarno — nie daje twardej gwarancji, dlatego rubryka każe ją
# RAPORTOWAĆ.)
#
# ## Brudnopis
#
# Komórka poniżej jest Twoja. Obejrzyj różnicę na własne oczy: wypisz pole
# `widelki_min` z obu odpowiedzi „wysoka temperatura" i nazwij, która wartość
# jest halucynacją. Potem sam(a) dopisz trzecią zapisaną odpowiedź, w której
# model zmyśla `miasto` tam, gdzie go w ogłoszeniu nie było.

# %%
# Brudnopis — zajrzyj do pól obu odpowiedzi (json.loads zamieni tekst w słownik):
# import json
# print(json.loads(odp_wysoka_1)["widelki_min"])   # None — brak widełek, poprawnie
# print(json.loads(odp_wysoka_2)["widelki_min"])   # 8000 — HALUCYNACJA (w ogłoszeniu ich nie było)
