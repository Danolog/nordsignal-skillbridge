# %% [markdown]
# # L0.3 — Sesja ma pamięć: zmienne, kolejność, restart
#
# **SkillBridge · ścieżka Data Science · moduł L0 „Start"**
#
# Najpierw kopia: **Plik → Zapisz kopię na Dysku** (jak w L0.2) — dalej
# pracuj w karcie, której nazwa zaczyna się od „Kopia".
#
# W tym labie celowo wywołasz błąd `NameError` — żeby zobaczyć go w
# kontrolowanych warunkach, zanim kiedyś zaskoczy Cię naprawdę.

# %%
# komórka 1
kawa = 12        # zapamiętaj liczbę 12 pod nazwą: kawa

# %%
# komórka 2
print(kawa * 30) # wypisz: zawartość pudełka kawa razy 30

# %% [markdown]
# ## Przebieg (krok po kroku)
#
# 1. Uruchom **komórkę 1**, potem **komórkę 2** — pod drugą pojawi się `360`.
# 2. Zrestartuj sesję: menu **Środowisko wykonawcze → Uruchom ponownie
#    sesję** (potwierdź w okienku). Kod zostaje — znika tylko pamięć
#    zmiennych.
# 3. Uruchom teraz **SAMĄ komórkę 2**. Zobaczysz czerwony komunikat:
#    `NameError: name 'kawa' is not defined`. **Tak ma być** — Python mówi:
#    „nie znam nazwy `kawa`", bo komórka, która ją tworzy, nie wykonała się
#    w tej (świeżej) sesji. Czytaj zawsze OSTATNIĄ linię komunikatu: przed
#    dwukropkiem rodzaj problemu, po dwukropku — konkret.
# 4. Napraw: **Środowisko wykonawcze → Uruchom wszystkie** — komórki wykonają
#    się od góry do dołu i `360` wróci.
#
# Gdy „Uruchom wszystkie" dojdzie do komórki-pieczątki na dole, zatrzyma się
# i poprosi o kod atomu — to normalne, wpisz go wtedy.
#
# ## Pieczątka — zalicz ten lab w SkillBridge
#
# Uruchom komórkę poniżej, podaj **kod atomu** z SkillBridge i przenieś token.
# Pieczątka sprawdza, że komórki notebooka wykonały się w bieżącej sesji;
# sam przebieg restartu (kroki 2–4) jest instruktażowy.

# %% [pieczatka]
def _zbierz_wyniki():
    if "kawa" not in globals():
        raise RuntimeError(
            "Zmienna `kawa` nie istnieje w tej sesji — dokładnie ten stan "
            "daje NameError z kroku 3. Napraw tak samo: Środowisko "
            "wykonawcze → Uruchom wszystkie."
        )
    return {"_wykonano": True}
