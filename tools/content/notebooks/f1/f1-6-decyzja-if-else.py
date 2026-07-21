# %% [markdown]
# # F1.6 — Decyzja: if / else
#
# **SkillBridge · ścieżka Data Science · moduł F1 „Python I — podstawy języka"**
#
# Najpierw kopia: **Plik → Zapisz kopię na Dysku** — dalej pracuj w karcie
# „Kopia…".
#
# Notebook towarzyszy atomowi F1.6. **Bez pieczątki** — atom zaliczasz
# pytaniami w SkillBridge.

# %%
budzet = 50
cena = 65
if cena <= budzet:                       # warunek + DWUKROPEK
    print("Kupuję!")                     # gałąź na True — WCIĘTA
else:                                    # else też z dwukropkiem
    print(f"Brakuje {cena - budzet} zł") # gałąź na False — WCIĘTA
print("Koniec zakupów")                  # bez wcięcia — wykona się ZAWSZE

# %% [markdown]
# **Przewidź, zanim uruchomisz:** które linie się wypiszą przy tych
# wartościach? Potem zmień `cena = 40` i uruchom ponownie — nigdy nie wypisują
# się obie gałęzie naraz.
#
# ## Twoje zadanie — dopisz POCZĄTEK (backward completion)
#
# Komórka poniżej ma gotowy KONIEC — dwie wcięte linie. Dopisz PRZED nimi dwie
# linie-nagłówki: warunek „temperatura poniżej zera?" z dwukropkiem oraz
# `else` z dwukropkiem. Twoje linie mają stać na początku wiersza, BEZ
# wcięcia — to one otwierają gałęzie. (Uruchomienie bez poprawki zatrzyma się
# na `IndentationError` — przeczytaj komunikat metodą z L0.3.)
#
# Gdy zadziała, sprawdź krzyżowo: zmień `temperatura` na `-5` i uruchom
# ponownie — która wiadomość ma się teraz wypisać?

# %%
temperatura = 3
# dopisz tu dwie linie: warunek "poniżej zera?" z dwukropkiem
# oraz else z dwukropkiem — tak, żeby całość działała
    print("Weź czapkę, mróz!")
    print("Kurtka wystarczy.")
