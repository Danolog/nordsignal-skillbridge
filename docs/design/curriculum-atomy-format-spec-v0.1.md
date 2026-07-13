# Spec v0.1→v0.2 — format treści atomów curriculum (wejście 1E.2, dla Sophii)

**Status:** v0.2 (zaktualizowane przy realizacji 1E.2, 2026-07-11 — sekcja
„Odchylenia v0.2" na końcu; reszta dokumentu = v0.1 bez zmian). **Konsument:**
ingest treści 1E.2 (rozszerzenie `tools/ingest-curriculum.ts`). **Źródła wiążące:**
ADR-014 D1 (parametry atomu), D5 (hinty/WE), D6.5 (reguły redakcyjne QG-5+),
decyzje Darka pkt 6/13.

## Zasada

Sophia pisze treść MERYTORYCZNIE (markdown per atom — jak dotychczasowe
partie); pakowanie do JSON-a poniżej to mechanika (Oliver/skrypt). Struktura
drabiny (moduły, kolejność, capstone'y) już żyje w
`tools/content/curriculum-ds-drabina.json` — treść DOKŁADA pozycje do modułów.

## Format pozycji (docelowy JSON per moduł)

```jsonc
{
	"moduleSlug": "f1-python-1",
	"items": [
		{
			"position": 10, // krok 10 — zostawia miejsce na wstawki bez renumeracji
			"kind": "theory", // theory | exercise | lab (project/exam — poza 1E.2)
			"title": "Czym jest zmienna",
			// Teoria 300–600 słów (pkt 6): cel → teoria → WORKED EXAMPLE przed
			// pytaniami (C1/C2) → mikro-generacja („przewidź wynik"). Reguły
			// D6.5: objaśnienie przy kroku kodu, zero dygresji (C10), 2–4
			// śródtytuły + numerowane kroki (C11), 1 koncept = 1 atom (C12),
			// jedna forma objaśnienia na krok (C13). PL; terminy EN jawnie.
			"contentMd": "## Cel\n...",
			"concepts": ["py-zmienne"], // slugi z banku A5 (questionConcepts)
			"questions": [
				{
					"conceptSlug": "py-zmienne",
					"type": "single_choice", // single_choice|multi_choice|numeric|short_text
					"difficulty": 1,
					"stem": "Co wypisze poniższy kod? ...",
					"options": ["10", "x", "błąd", "nic"], // tylko typy choice
					"answer": { "correct": 0 }, // klucz per typ (spec A5 §2.3)
					// Feedback NATYCHMIAST, także przy błędzie (R13/R5) — obowiązkowy:
					"explanationMd": "Zmienna x przechowuje...",
					// Drabinka hintów 3-STOPNIOWA WSZĘDZIE (decyzja Darka pkt 13):
					"hints": [
						"Przypomnij sobie krok 2 z przykładu — co robi znak =?",
						"x = 10 zapisuje liczbę; print(x) odczytuje. Co trafi na ekran?",
						"Pełne rozwiązanie: print(x) wypisuje wartość zmiennej, czyli 10 — bo ..."
					]
				}
				// 3 pytania per atom (pkt 6); dystraktory DIAGNOSTYCZNE
				// (mapowane na misconception), nie „podchwytliwe".
			]
		},
		{
			"position": 20,
			"kind": "lab",
			"title": "Uruchom swój pierwszy skrypt",
			"contentMd": "Szkielet Colab: ... (student wypełnia i URUCHAMIA)",
			"concepts": ["py-zmienne"],
			// Hak automatycznego checku (implementacja 1E.6, decyzja pkt 11):
			"config": { "checks": [{ "type": "notebook_output", "expect": "…" }] }
		}
	]
}
```

## Twarde reguły (z decyzji — nie do negocjacji w treści)

1. **Atom:** teoria 300–600 słów + WE przed pytaniami + 3 pytania MC
   (bez wariantów na atomie — warianty tylko w banku egzaminacyjnym, cap 2).
2. **Hinty:** 3 stopnie przy KAŻDYM pytaniu ćwiczeniowym (pkt 13):
   koncepcyjny → szkielet → pełne rozwiązanie z objaśnieniem.
3. **explanationMd obowiązkowy** — błąd nigdy nie jest stanem końcowym (R13).
4. **1 koncept = 1 atom**; koncept musi istnieć w banku A5 (`questionConcepts`,
   trunk 'foundations') — nowe koncepty zgłaszamy do banku razem z treścią.
5. **Pytania spiralne:** przy autoringu modułu N tagujemy koncepty-kandydaci
   do powtórek w N+1..k (checklist QG — D6.3); 1–2 pytania spiralne per
   koncept kluczowy (≤4 koncepty kluczowe/moduł).
6. **Zasoby zewnętrzne** (jeśli atom jakieś ma): licencja + język + flaga
   rejestracji + data weryfikacji — od dnia 1 (`curriculum_item_resources`).
7. **L0:** 4 atomy-checklisty, kind `lab`-podobne (zaliczenie przez wykonanie,
   pkt 10); atom 1–2 kończy się uruchomioną komórką ≤15 min od wejścia;
   BEZ Gita/terminala (just-in-time — pkt 9, wchodzą w M-EDA).

## Czego NIE pisać w 1E.2 (poza zakresem treści)

Egzaminy modułowe (bank wariantów — 1E.3), pozycje `review` (FSRS — 1E.4),
mostki do źródeł (1E.5), definicje checków automatycznych (1E.6 — zostaw hak
`config.checks` pusty lub opisowy).

## Odchylenia v0.2 (ustalone przy pakowaniu treści Sophii, 2026-07-11)

Treść L0+F1+F2+F3 (ZATWIERDZONA) rozstrzygnęła kilka punktów inaczej niż
szkic v0.1 — poniższe jest odtąd wiążące (format faktyczny plików
`tools/content/curriculum-atoms/*.json`, walidacja:
`tools/content-curriculum-atoms.ts`, generacja: `pnpm content:pack-curriculum`):

1. **Sophia NIE pisze JSON-a.** Źródłem jest jej markdown
   (`docs/curation/sophia-1e2-*-atomy.md`, jednolita struktura QG); packer
   (`tools/pack-curriculum-atoms.ts`) przepakowuje deterministycznie —
   kontrakt-test pilnuje, że commitowane JSON-y = wynik packera 1:1.
2. **Drabinka hintów jest PER ATOM** (jedna 3-stopniowa na atom, obsługuje
   pytania i pracę w notebooku) — nie per pytanie jak w szkicu. Ląduje w
   `configJson.hints` pozycji, nie w pytaniu.
3. **Tożsamość pozycji = `slug`** (ustalenie wiążące z przeglądu Ethana);
   `position` wyłącznie sortuje (krok 10). Refy pytań globalne: `f1-5-p2`.
4. **Feedback per OPCJA** (`optionFeedback[]`, wyrównany z `options`) +
   `diagnosis` na dystraktorach → `question_items.option_feedback_json`
   (edytowalny w miejscu jak `explanationMd`, poza hashem niemutowalności);
   `explanationMd` pytania = feedback opcji poprawnej.
5. **`difficulty` atomowych pytań = 1** (kalibracja przy WE — D3); markdown
   nie niesie trudności, warianty trudniejsze wejdą z egzaminami (1E.3).
6. **Przegląd przed egzaminem** = pozycja `exercise` z `questionRefs`
   (czysty reuse pytań, także między modułami) — bez własnej treści i hintów.
7. **Mini-projekt F3.7 = `kind: lab`** + 3 kamienie w `configJson.checks`
   (decyzja Darka 2026-07-11: pkt 12b bez wiersza w projects i pipeline'u
   marketplace; `kind: project` zostaje dla capstone'ów M-*).
8. **Zasoby modułowe** (tabela „Zasoby opcjonalne modułu") wchodzą do
   `curriculum_item_resources` przy PIERWSZYM atomie modułu; rozdział na
   pozycje = kuracja przy 1E.5 (mostki do źródeł).
9. **Pozycje `lab` przyjmują odpowiedzi** na pytania retrieval (uczą, nie
   zaliczają — zaliczenie labu wyłącznie przez check `/complete`, 1E.6).
10. Egzaminy modułowe (sekcje „Egzamin modułu…" w dokumentach) świadomie
    POZA pakowaniem 1E.2 → bank wariantów przy 1E.3, w TYCH SAMYCH plikach
    treści (inaczej retire-sync ingestu wygasi pytania drugiego toru).
    „Pierwsza pomoc" i słowniczki EN — poza DB do czasu decyzji o nośniku
    (D5a: strona statyczna per moduł).
