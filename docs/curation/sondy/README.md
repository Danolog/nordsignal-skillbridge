# Sondy środowiska Colab (ADR-016 D3)

Tu leżą **pomiary**, nie deklaracje: surowe wyjście notebooka
`notebooks/sonda/sonda-srodowiska.ipynb` uruchomionego ręcznie w Colabie.
Konwencja dokładnie jak przy zrzutach ekranu UI — dowód, nie zapewnienie.

- **Nazwa pliku:** `sonda-srodowiska-RRRRMMDD.txt` (data uruchomienia).
- **Zawartość:** CAŁE wyjście czterech komórek kodu, łącznie z blokiem
  `--- WYNIK MASZYNOWY (JSON) ---` na końcu.
- **Po wklejeniu:** `pnpm srodowisko:zapisz-sonde docs/curation/sondy/<plik>.txt`
  — to przepisuje pomiar do `tools/content/notebooks/srodowisko-colab.json`
  i **wylicza** flagę `rozjazd` (nie ustawia jej człowiek).
- **Instrukcja krok po kroku:** `docs/runbooks/sonda-srodowiska-colab.md`.

Stare sondy zostają — historia dryfu Colaba jest tu jedynym źródłem wiedzy
o tym, jak szybko Google przesuwa wersje pod naszą treścią.
