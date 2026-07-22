# %% [markdown]
# # EDA.2 — Git i GitHub: historia Twojej pracy (bez terminala)
#
# **SkillBridge · ścieżka Data Science · moduł M-EDA „EDA: od API do repozytorium"**
#
# Najpierw kopia: **Plik → Zapisz kopię na Dysku** — dalej pracuj w karcie
# „Kopia…".
#
# Notebook towarzyszy atomowi EDA.2. **Bez pieczątki** — atom zaliczasz
# pytaniami w SkillBridge. Ale ten notebook ma drugie zadanie: to na NIM
# przećwiczysz wysyłkę do repozytorium, więc trzymaj go otwartego przy
# klikaniu.
#
# ## Trzy ruchy, wszystkie klikane
#
# 1. **Repo na GitHubie** (raz).
# 2. **Commit z Colab** (wielokrotnie — po każdym domkniętym etapie).
# 3. **README i requirements w GitHubie** (raz).
#
# Zgubisz się w klikaniu — wróć do pytania „który z trzech ruchów robię?".

# %% [markdown]
# ## Ruch 0 — sprawdź, kim jesteś na GitHubie
#
# Wejdź na github.com i spójrz na awatar w prawym górnym rogu. Nie
# jesteś zalogowany(-a) → zaloguj się teraz; połowa problemów „Colab nie
# widzi mojego repo" to repo założone na innym koncie.
#
# ## Ruch 1 — załóż repozytorium
#
# Zielony przycisk **„New"** otwiera formularz **„Create a new
# repository"**. Wypełniasz dwie sekcje:
#
# - **„1 General"**: „Owner \*" (Twoje konto) / **„Repository name \*"** —
#   np. `eda-bdl-bezrobocie`; „Description" — opis jednym zdaniem.
# - **„2 Configuration"**: **„Choose visibility \*"** ustaw na **„Public"**
#   (Passport linkuje do publicznych prac). „Add README", „Add .gitignore"
#   i „Add license" zostaw na wartościach domyślnych — README dodasz sam(a)
#   w ruchu 3, żeby zobaczyć, że to też commit.
#
# Na dole zielony **„Create repository"**. GitHub mówi wyłącznie po
# angielsku — etykiety podajemy dosłownie, z polskim opisem, co robią.

# %% [markdown]
# ## Ruch 2 — wyślij TEN notebook do repo
#
# W Colab: menu **Plik** → pozycja zaczynająca się od **„Zapisz kopię
# w usłudze GitHub"**.
#
# ⚠ **Uważaj na sąsiada z menu.** Jest tam też pozycja **„Zapisz kopię
# w usłudze GitHub jako plik Gist"** — to NIE jest to samo. *Gist* to
# pojedyncza notatka z plikiem, nie repozytorium: nie zmieścisz w nim
# README i `requirements.txt` w formie, której żąda rubryka. Wybieraj
# pozycję **bez dopisku „jako plik Gist"**. Jeśli w menu widzisz
# wyłącznie wariant z Gistem — jesteś w podglądzie CUDZEGO notebooka;
# zrób najpierw własną kopię (L0.2).
#
# Colab poprosi (raz) o połączenie kont, a potem otworzy okno **„Kopiuj
# do GitHuba"**:
#
# - **„Repozytorium"** — wybierz to z ruchu 1;
# - **„Gałąź"** — `main`;
# - **„Ścieżka pliku\*"** — nazwa pliku w repo (zostaw domyślną);
# - **„Komunikat zatwierdzenia"** — TU wpisujesz opis commita;
# - **„Podaj link do Colab"** — zostaw zaznaczone (w repo pojawi się
#   przycisk otwierający notebook w Colab);
# - zatwierdza **„OK"**, wycofuje **„Anuluj"**.
#
# ⚠⚠ **Najważniejsze pole na tym ekranie.** Colab wstawia do
# „Komunikat zatwierdzenia" domyślne **„Utworzono za pomocą Colab"**.
# Zostawisz je — zbudujesz historię identycznych zdań, które nie mówią
# NIC, czyli dokładnie to, co oblewa kryterium rubryki „sensowna historia
# commitów". **Nadpisz je za każdym razem.**
#
# Reguła opisu: odpowiada na pytanie „co dokłada ta migawka?".
# Uruchom komórkę poniżej — to Twoja ściągawka na trzy pierwsze commity
# capstone'u.

# %%
opisy = [
    "pobranie danych z BDL (zmienna 60270, lata 2019-2023)",
    "czyszczenie brakow z uzasadnieniem w komorce tekstowej",
    "wykres trendu bezrobocia + opis osi",
]
for i, opis in enumerate(opisy, start=1):
    print(str(i) + ". " + opis)

print()
print("Zle opisy (rubryka ich nie kupi): update / final / final2 / poprawki")

# %% [markdown]
# ## Ruch 3 — README i requirements
#
# W repo: **„Add file"** → **„Create new file"** (sąsiednia pozycja
# „Upload files" wysyła gotowy plik z dysku — teraz jej nie potrzebujesz).
# Wpisz nazwę pliku, wklej treść i zatwierdź zielonym przyciskiem
# zatwierdzenia zmian na dole formularza — **to też jest commit**, więc
# i on chce sensownego opisu.
#
# Dwa pliki, obie treści masz w komórce poniżej: uruchom ją, skopiuj
# wynik i uzupełnij fragmenty w nawiasach ostrokątnych.

# %%
readme = """# <nazwa projektu>

## O co pytam w tych danych
<1-2 zdania: pytanie badawcze>

## Dane
Zrodlo: Bank Danych Lokalnych GUS (API BDL), zmienna <numer> - <opis>.
Licencja: CC BY 4.0 - dane pochodza z Glownego Urzedu Statystycznego.

## Jak uruchomic
1. Otworz notebook w Colab (przycisk na gorze pliku .ipynb).
2. Srodowisko wykonawcze -> Uruchom wszystko.
3. Pakiety: patrz requirements.txt.

## Uwagi
Analiza bez elementow losowych - seed nie dotyczy.
"""

requirements = """pandas
requests
matplotlib
"""

print(readme)
print("--- requirements.txt ---")
print(requirements)

# %% [markdown]
# **Uznanie autorstwa GUS nie jest ozdobnikiem** — licencja CC BY 4.0
# pozwala na wszystko POZA pominięciem autora. README bez atrybucji nie
# spełnia ani rubryki, ani licencji.
#
# Ostatnie zdanie o seedzie zostaw tylko wtedy, gdy w Twojej analizie
# faktycznie nie ma losowości; jeśli jest (np. próbkowanie wierszy),
# ustaw ziarno i napisz w README, gdzie.
#
# ## Sprawdź się
#
# Wejdź na stronę swojego repozytorium i policz. Zaliczone, gdy widzisz:
#
# 1. plik `.ipynb` z tym notebookiem,
# 2. `README.md` i `requirements.txt`,
# 3. w historii repo **co najmniej dwie** migawki z opisami — i żadnej
#    o treści „Utworzono za pomocą Colab".
#
# Punkt 3 to miniatura tego, co przy capstonie sprawdzi kamień „Repo
# wypchnięte". Zrób te trzy ruchy TERAZ, żeby przy capstonie repo już
# czekało.
