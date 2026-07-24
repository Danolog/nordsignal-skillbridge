# %% [markdown]
# # LLM.2 — Prompt jako specyfikacja: schemat, reguła null, przykład
#
# **SkillBridge · ścieżka Data Science · moduł M-LLM „LLM: ekstrakcja strukturalna"**
#
# Najpierw kopia: **Plik → Zapisz kopię na Dysku** — dalej pracuj w karcie
# „Kopia…".
#
# Ten notebook towarzyszy atomowi LLM.2: składasz prompt (tekst-polecenie dla
# modelu) jak specyfikację — dokładny schemat JSON, reguła „null zamiast
# zmyślania" i przykład few-shot (przykład pokazujący modelowi oczekiwane
# zachowanie). **Ten notebook nie ma pieczątki** — atom zaliczasz, odpowiadając
# na pytania w SkillBridge.
#
# Prompt tu tylko SKŁADASZ i wypisujesz — nie wysyłasz go do modelu (pierwsze
# żywe wywołanie to capstone).

# %%
# Prompt do ekstrakcji to nie prośba — to SPECYFIKACJA, jak brief dla wykonawcy.
# Trzy obowiązkowe elementy (rubryka rozlicza co czwarty punkt): schemat pól,
# reguła null i przykład few-shot. Oto poprawny prompt:
prompt = '''Wyciągnij z ogłoszenia o pracę dane do JSON o DOKŁADNIE tym schemacie:
{"stanowisko": tekst, "miasto": tekst lub null, "widelki_min": liczba lub null}

Zasady:
- Jeśli informacji NIE MA w tekście, wpisz null. Nie zgaduj, nie uzupełniaj z wiedzy ogólnej.
- Zwróć wyłącznie JSON, bez żadnego tekstu wokół.

Przykład:
Ogłoszenie: "Szukamy testera do zespołu w Krakowie."
Odpowiedź: {"stanowisko": "tester", "miasto": "Kraków", "widelki_min": null}

Ogłoszenie: {tresc_ogloszenia}
Odpowiedź:'''
print(prompt)

# Ostatnia linia — {tresc_ogloszenia} — to miejsce wstawienia właściwego
# ogłoszenia. W capstonie robisz to f-stringiem (F1.3), jedno ogłoszenie na
# wywołanie, pętlą po zbiorze (F2.3).

# %% [markdown]
# **Przewidź, zanim uruchomisz:** czemu przykład w prompcie pokazuje ogłoszenie
# BEZ widełek (odpowiedź z `null`), a nie „pełne" z kompletem danych? (Bo few-shot
# uczy pokazem — a najbardziej trzeba pokazać zachowanie TRUDNE: brak danych →
# `null`. Przykład z kompletem pól uczyłby tylko tego, co model i tak umie.)
#
# ## Brudnopis
#
# Poniżej ten sam prompt z DWIEMA usterkami (hint 2 atomu): (1) brak reguły null;
# (2) przykład ma KOMPLET pól zamiast pokazać `null` w akcji. Znajdź obie i popraw
# wg checklisty — porównaj wynik z poprawnym promptem wyżej.

# %%
# Brudnopis — prompt z dwiema usterkami do naprawy:
prompt_wadliwy = '''Wyciągnij z ogłoszenia dane do JSON o schemacie:
{"stanowisko": tekst, "miasto": tekst lub null, "widelki_min": liczba lub null}

Zwróć wyłącznie JSON, bez tekstu wokół.

Przykład:
Ogłoszenie: "Szukamy testera w Krakowie, widełki od 6000 zł."
Odpowiedź: {"stanowisko": "tester", "miasto": "Kraków", "widelki_min": 6000}

Ogłoszenie: {tresc_ogloszenia}
Odpowiedź:'''
print(prompt_wadliwy)
# Popraw: (1) dopisz regułę null z zakazem uzupełniania „z wiedzy ogólnej";
# (2) podmień przykład na ogłoszenie BEZ którejś informacji, z null w odpowiedzi.
# Test poprawki: czy z samego promptu wynika jednoznacznie, co model MA zwrócić
# dla „Szukamy analityka"? (stanowisko: analityk, miasto: null, widelki_min: null)
