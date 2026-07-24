# %% [markdown]
# # LLM.6 — Klucz, limity, dane osobowe: higiena pracy z API
#
# **SkillBridge · ścieżka Data Science · moduł M-LLM „LLM: ekstrakcja strukturalna"**
#
# Najpierw kopia: **Plik → Zapisz kopię na Dysku** — dalej pracuj w karcie
# „Kopia…".
#
# Ten notebook towarzyszy atomowi LLM.6: chowasz klucz API (hasło do usługi
# wystawione na Twoje konto) tam, gdzie jego miejsce — panel sekretów lub zmienna
# środowiskowa, nigdy w kodzie i repo — planujesz pracę w darmowym tierze i
# czyścisz dane osobowe PRZED wysłaniem do modelu (pseudonimizacja).
# **Ten notebook nie ma pieczątki** — atom zaliczasz, odpowiadając na pytania
# w SkillBridge.

# %%
import os

# W Colab klucz pobierasz z panelu sekretów (ikona klucza w lewym pasku), NIE
# z kodu — zostawiamy to zakomentowane jako wzór:
#   from google.colab import userdata
#   klucz = userdata.get("GEMINI_API_KEY")    # wartość mieszka w panelu, nie w kodzie
#
# Poza Colab tę samą rolę pełni ZMIENNA ŚRODOWISKOWA — mechanizm inny, zasada
# identyczna: kod zna tylko NAZWĘ sekretu, nigdy jego wartość.
klucz = os.environ.get("GEMINI_API_KEY")      # None, jeśli nie ustawiona — i dobrze
print("Klucz wczytany ze środowiska?", klucz is not None)
# False tutaj: wartości nie ma ani w kodzie, ani w repo — dokładnie tak ma być.

# %% [markdown]
# **Przewidź, zanim uruchomisz:** co wypisze `print` — i co zobaczy osoba, która
# otworzy Twój notebook w publicznym repo: klucz czy tylko nazwę sekretu? (Tylko
# nazwę — wartość żyje w panelu/środowisku i nie jedzie z plikiem.)
#
# ## Twoje zadanie — dopisz regułę (backward completion)
#
# Poniżej checklista bezpieczeństwa capstone'u z JEDNĄ pustą pozycją: „Gdy klucz
# trafił do repo: ______". Dopisz regułę — DWA kroki, oba z teorii. Myśl o
# WARTOŚCI klucza (gdzie żyje? jak przestaje działać?), nie o pliku: sama edycja
# pliku NIE wystarcza, bo historia Gita pamięta każdą migawkę (EDA.2!).

# %%
# Checklista bezpieczeństwa — uruchom, przeczytaj, a potem dopisz brakującą regułę
# w miejsce wielokropka (patrz wzorzec w komentarzu pod spodem):
checklista = [
    "Klucz nigdy nie stoi w kodzie ani w repo — mieszka w panelu sekretów / środowisku.",
    "Dane osobowe (nazwiska, telefony rekruterów) usuwam lub pseudonimizuję PRZED wysłaniem do modelu.",
    "Każdy przykład wysyłam RAZ i zapisuję odpowiedź — limity darmowego tieru (rzędu 10/min, błąd 429).",
    "Gdy klucz trafił do repo: ...",   # <- TU dopisz regułę (dwa kroki)
]
for pozycja in checklista:
    print("-", pozycja)

# Wzorzec do luki (dwa kroki, w tej kolejności):
#   (1) natychmiast UNIEWAŻNIJ (revoke) stary klucz w panelu usługi — od tej
#       chwili wyciek jest bezzębny;
#   (2) wygeneruj NOWY klucz i umieść go w panelu sekretów / zmiennej środowiskowej.
# Edycja pliku może być krokiem TRZECIM (porządki), nigdy pierwszym — kolejność
# odwrotna zostawia działający klucz w wiecznej historii Gita.
