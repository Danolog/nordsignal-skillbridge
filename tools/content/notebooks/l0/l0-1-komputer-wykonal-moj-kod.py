# %% [markdown]
# # L0.1 — Komputer wykonał mój kod
#
# **SkillBridge · ścieżka Data Science · moduł L0 „Start"**
#
# Za chwilę uruchomisz prawdziwy kod — w przeglądarce, bez instalowania
# czegokolwiek. Upewnij się tylko, że jesteś zalogowany(-a) na konto Google
# (inaczej Colab pokaże stronę logowania zamiast uruchomić kod). Dalej
# wystarczą dwa kliknięcia:
#
# 1. Najedź kursorem na komórkę z kodem poniżej i kliknij przycisk **▶**
#    po jej lewej stronie (albo kliknij w komórkę i wciśnij **Ctrl+Enter**).
# 2. Jeśli Colab zapyta o notatnik spoza Google — kliknij **„Uruchom mimo to"**.
#    To standardowe ostrzeżenie przy każdym cudzym notebooku; ten zawiera
#    wyłącznie kod, który widzisz.
#
# Przy pierwszym uruchomieniu Colab łączy się z komputerem Google — obok
# przycisku kręci się `[*]`, czasem do minuty. Gdy `[*]` zmieni się w liczbę
# (np. `[1]`), wynik będzie czekał pod komórką.

# %%
print("Witaj w SkillBridge!")   # print(...) = „wypisz na ekran"
                                # tekst w cudzysłowie = dokładnie to, co ma być wypisane

# %% [markdown]
# ## Co właśnie się stało
#
# Twój kod pojechał na komputer Google, wykonał się tam, a wynik wrócił pod
# komórkę. Liczba w nawiasie (np. `[1]`) to licznik uruchomień — możesz
# klikać ▶ do woli, licznik po prostu rośnie i niczego tym nie zepsujesz.
#
# ## Pieczątka — zalicz ten lab w SkillBridge
#
# 1. Uruchom komórkę poniżej (tak samo: ▶).
# 2. Pod komórką pojawi się **pole tekstowe** — a `[*]` będzie się kręcić,
#    dopóki nie odpowiesz; tym razem to normalne, komórka czeka na Ciebie.
#    Przepisz w pole **kod atomu** widoczny w SkillBridge przy tej pozycji
#    i wciśnij Enter.
# 3. Skopiuj wypisany **token** i wklej go w SkillBridge w polu „Pieczątka".

# %% [pieczatka]
def _zbierz_wyniki():
    # L0.1 nie zostawia stanu do sprawdzenia (jedyna komórka to print) —
    # pieczątka potwierdza wykonanie w żywej sesji. To świadomie najsłabszy
    # check ścieżki: atom „hello world".
    return {"_wykonano": True}
