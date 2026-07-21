# %% [markdown]
# # PD.1 — Pakiety: import, alias i terminal w komórce
#
# **SkillBridge · ścieżka Data Science · moduł M-PD „Pandas: dane w tabelach"**
#
# Najpierw kopia: **Plik → Zapisz kopię na Dysku** — dalej pracuj w karcie
# „Kopia…".
#
# Notebook towarzyszy atomowi PD.1. **Bez pieczątki** — atom zaliczasz
# pytaniami w SkillBridge.
#
# **Przewidź, zanim uruchomisz:** co zrobi komórka poniżej przy pierwszym
# uruchomieniu w Colab?

# %%
import pandas as pd      # wpuść pakiet pandas pod skrótem: pd
print(pd.__version__)    # dowód życia: wersja pakietu

# %% [markdown]
# Wypisała numer wersji (sam numer jest nieistotny — istotne, że JEST:
# pandas w Colab jest preinstalowany). Dwie rzeczy w tej składni:
#
# - `import pandas` wpuszcza skrzynkę z narzędziami do PAMIĘCI SESJI
#   (L0.3): po restarcie sesji import trzeba wykonać PONOWNIE — dlatego
#   stoi zawsze w pierwszej komórce notebooka;
# - `as pd` nadaje **alias** — od tej pory piszesz `pd.` zamiast
#   `pandas.`. To konwencja całej społeczności — trzymaj się jej.
#
# ## Terminal: linia z `!` mówi do SYSTEMU, nie do Pythona
#
# Gdy pakietu brak, lekarstwem jest instalator `pip` — wywołany linią
# zaczynającą się od **`!`** (polecenie idzie wprost do komputera,
# na którym działa sesja): `!pip install nazwa_pakietu`.
# Komórka poniżej nie instaluje nic nowego — prosi tylko pip
# o potwierdzenie, że zna pandas (skąd wziął się na maszynie).

# %%
!pip show pandas

# %% [markdown]
# ## Przeczytaj błąd: `ModuleNotFoundError`
#
# Komórka poniżej CELOWO się wywali — pakiet `mapy_swiata` jest zmyślony
# na potrzeby ćwiczenia. Uruchom ją i przeczytaj komunikat: to dokładnie
# ten błąd, który zobaczysz przy każdym brakującym pakiecie. Lekarstwo
# w prawdziwym przypadku: `!pip install nazwa_pakietu` (z prawdziwą
# nazwą z archiwum pakietów), potem PONOWNY import.

# %%
import mapy_swiata       # celowy błąd: tego pakietu nie ma w środowisku

# %% [markdown]
# Zapamiętaj podział ról: `!` mówi do SYSTEMU (instalacje, pliki), reszta
# komórki mówi do PYTHONA. Importy projektu stoją w PIERWSZEJ komórce —
# czytelnik od razu widzi, jakich narzędzi analiza używa; listę pakietów
# zapiszesz w `requirements.txt` przy repozytorium w M-EDA.
