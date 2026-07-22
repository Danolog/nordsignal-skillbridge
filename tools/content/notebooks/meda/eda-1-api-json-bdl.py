# %% [markdown]
# # EDA.1 — API: program pyta inny komputer o dane
#
# **SkillBridge · ścieżka Data Science · moduł M-EDA „EDA: od API do repozytorium"**
#
# Najpierw kopia: **Plik → Zapisz kopię na Dysku** — dalej pracuj w karcie
# „Kopia…".
#
# Notebook towarzyszy atomowi EDA.1. **Bez pieczątki** — atom zaliczasz
# pytaniami w SkillBridge.
#
# ⚠ Ten notebook naprawdę wychodzi do internetu (API GUS BDL). Jeśli
# któraś komórka zwróci status `429`, odczekaj chwilę i uruchom ją
# jeszcze raz — BDL limituje anonimowe zapytania (100 na 15 minut).

# %%
import requests

url = "https://bdl.stat.gov.pl/api/v1/data/by-variable/60270"
parametry = {"unit-level": 2, "year": 2023, "format": "json", "page-size": 20}
odpowiedz = requests.get(url, params=parametry)   # zapytanie GET: "poproszę dane"
print(odpowiedz.status_code)                      # jak poszło?

# %% [markdown]
# **Przewidź, zanim uruchomisz:** co wypisze ostatnia linia, jeśli
# wszystko poszło dobrze?
#
# `200` — kod „OK" umowy, którą zna cały internet. Status to pierwsza
# rzecz, którą sprawdzasz po KAŻDYM zapytaniu: `200` = dostałeś(-aś)
# dane, `404` = zły adres, `429` = za dużo zapytań, `5xx` = serwer ma
# problem (nie Ty).
#
# ## `.json()` — z odpowiedzi do struktur Pythona

# %%
dane = odpowiedz.json()
print(type(dane))                # słownik — nie tekst do cięcia
print(list(dane.keys()))         # jakie klucze ma odpowiedź BDL?

# %% [markdown]
# Słownik z kluczami `totalRecords`, `variableId`, `measureUnitId`,
# `aggregateId`, `lastUpdate` i `results`. Pod `results` siedzi **lista
# słowników-województw** — dokładnie ta struktura, którą ćwiczysz od F3.
#
# Dwie liczby, które zawsze porównujesz: `totalRecords` mówi, ile danych
# JEST, a `len(dane["results"])` — ile dostałeś(-aś) NA TEJ stronie.

# %%
print(dane["totalRecords"])        # ile rekordów JEST
print(len(dane["results"]))        # ile dostałem NA TEJ stronie
print(dane["results"][0]["name"])  # łańcuszek z F3.5: rekord 0, pole name

# %% [markdown]
# ## Paginacja na własne oczy
#
# Komórka poniżej to TO SAMO zapytanie, tylko bez `page-size`.
#
# **Przewidź, zanim uruchomisz:** ile rekordów wróci tym razem?

# %%
bez_strony = requests.get(
    url,
    params={"unit-level": 2, "year": 2023, "format": "json"},   # brak page-size!
).json()
print(bez_strony["totalRecords"], len(bez_strony["results"]))

# %% [markdown]
# `16 10` — rekordów JEST szesnaście, a dostałeś(-aś) dziesięć: to
# pierwsza strona. Rozjazd „mam mniej wierszy, niż powinno być" jest
# klasykiem pierwszej pracy z API — i właśnie zobaczyłeś(-aś), gdzie
# patrzeć. Lekarstwo: podnieś `page-size` (albo pobierz kolejne strony).
#
# ## Rytuał czytania błędu — status mówi wszystko
#
# Komórka poniżej CELOWO pyta o zły adres (literówka: `by-variabl`
# zamiast `by-variable`).

# %%
zly = requests.get(
    "https://bdl.stat.gov.pl/api/v1/data/by-variabl/60270",   # celowa literówka
    params=parametry,
)
print(zly.status_code)
print(list(zly.json().keys()))     # co przyszło zamiast danych?

# %% [markdown]
# `404` i klucz `errors` zamiast `results`. Dwie lekcje w jednej komórce:
#
# 1. **`404` to ODPOWIEDŹ serwera** — połączenie zadziałało, serwer po
#    prostu nie zna takiego adresu. Porównaj url z dokumentacją znak po
#    znaku.
# 2. **BDL nawet błędy oddaje jako JSON** (po polsku!). Gdybyś od razu
#    sięgnął(-ęła) po `zly.json()["results"]`, dostałbyś(-abyś)
#    `KeyError: 'results'` — mylący, bo sugeruje problem ze strukturą,
#    a naprawdę problem jest z ADRESEM. Dlatego: NAJPIERW status, potem
#    dane.
#
# ## Twoja kolej
#
# W komórce poniżej wypisz nazwę **trzeciego** rekordu z odpowiedzi
# (pamiętaj: liczymy od zera — F3.1) i sprawdź, ile pomiarów ma
# w środku pierwszy rekord.
#
# Nie zgaduj nazw pól — OBEJRZYJ jeden rekord: `dane["results"][0]`.

# %%
dane["results"][0]        # obejrzyj rekord: jakie ma klucze?

# %%
# Twoja kolej — uzupełnij dwie linie i uruchom:
# print(dane["results"][?]["name"])      # nazwa TRZECIEGO rekordu (liczymy od zera!)
# print(len(dane["results"][0]["values"]))   # ile pomiarów ma pierwszy rekord?


# %% [markdown]
# Dwa nawyki dobrego obywatela API na koniec: nie strzelaj zapytaniami
# w pętli (status `429` = „zwolnij") i pamiętaj o licencji — dane BDL są
# na CC BY 4.0, więc uznanie autorstwa GUS wpisujesz do README
# (EDA.2).
