/**
 * 1E.6a — polskie etykiety statusów i typów pozycji drabiny curriculum.
 * Jedno miejsce nazewnictwa (drabina, widok modułu, widok pozycji, testy).
 */

import type { LadderItem, ModuleStatus } from "@/lib/curriculum/ladder";

export const MODULE_STATUS_LABEL: Record<ModuleStatus, string> = {
	locked: "Zablokowany",
	available: "Dostępny",
	in_progress: "W trakcie",
	completed: "Zaliczony",
	// Moduł bez treści — drabina mówi prawdę, nie udaje „dostępny" (ADR-014 D3).
	coming_soon: "Treść w drodze",
};

/**
 * 1E.7 L6 · POWIERZCHNIA B — odznaka modułu otwartego diagnozą (§8, cytat 1:1).
 *
 * Stała, nie funkcja: tekst nie zależy od żadnego parametru (Mila §4.2). To jedyny
 * TRWAŁY nośnik zdania „otwarte ≠ zaliczone" — powierzchnia A (krok 4 kreatora)
 * znika po jednym przejściu i student może jej nie zobaczyć ani razu (§12.7 pkt 6).
 */
export const PLACEMENT_BADGE_LABEL = "Otwarty na podstawie diagnozy · niezaliczony";

/**
 * Nagłówek `/curriculum` — dwa brzmienia, wybór po fladze (dług D7, §12.9 pkt 1).
 *
 * Stare zdanie („bez skrótów") KŁAMIE, gdy mechanizm skrótu istnieje w produkcie:
 * student zobaczyłby je i tuż pod nim odznakę „Otwarty na podstawie diagnozy" na
 * module, którego nie zaliczył — sprzeczność w dwóch sąsiadujących liniach, do
 * obalenia jednym spojrzeniem.
 *
 * Bramkujemy po FLADZE, nie po tym, czy TEN student ma coś odblokowane: zdanie
 * o braku skrótów jest fałszywe, odkąd skrót jest możliwy, a nie dopiero odkąd
 * komuś zadziałał (Mila §4.5). Teksty tutaj, nie w JSX, bo są mikrocopy Sophii
 * i podlegają cytatowi 1:1 tak samo jak zdania narracji (§12.3).
 */
export const CURRICULUM_INTRO =
	"Moduły od podstaw do projektu. Kolejny moduł otwiera się dopiero po zaliczeniu poprzedniego — bez skrótów.";

export const CURRICULUM_INTRO_WITH_PLACEMENT =
	"Moduły od podstaw do projektu. Kolejny moduł otwiera się po zaliczeniu poprzedniego — albo od razu, jeśli diagnoza pokazała, że znasz wcześniejszy materiał. Otwarty moduł to nie zaliczony moduł.";

export const ITEM_STATUS_LABEL: Record<LadderItem["status"], string> = {
	locked: "Zablokowana",
	available: "Dostępna",
	in_progress: "W trakcie",
	completed: "Zaliczona",
	skipped_by_placement: "Pominięta (diagnoza)",
};

/**
 * kind pozycji — lista miękka w bazie, więc fallback na surową wartość.
 *
 * JEDYNY NOŚNIK nazw rodzajów lekcji w interfejsie (CLAUDE.md v1.17). Słownictwo
 * wewnętrzne („atom", „lab", „capstone") żyje w kodzie, w nazwach tabel i w ADR-ach —
 * do studenta NIE wychodzi (decyzja Sophii 2026-08-10, sygnał Darka: „użytkownik nie
 * będzie wiedział, co oznacza atom L0.1"). „lab" → „Zadanie praktyczne", bo student
 * ma wiedzieć, co robi, a nie jak my to nazywamy wewnętrznie.
 *
 * „JEDYNY" jest tu od 2026-08-12 twierdzeniem zmierzonym, nie deklaracją. Wcześniej
 * nośniki były trzy i JEDEN JUŻ SIĘ ROZJECHAŁ: `atomKindLabel` w `lib/curriculum/
 * atom-href.ts` zwracał dla „lab" surowe „Lab", pod komentarzem twierdzącym, że jest
 * „spójna z labels.itemKindLabel". Studenta chronił wyłącznie filtr z innego modułu
 * (`CORRECTIVES_ATOM_KINDS = ["theory","exercise"]`), niepowiązany z tą decyzją.
 * Funkcja została skasowana, a jej wywołania wskazane tutaj (przegląd #291).
 */
export function itemKindLabel(kind: string): string {
	switch (kind) {
		case "theory":
			return "Teoria";
		case "exercise":
			return "Ćwiczenie";
		case "lab":
			return "Zadanie praktyczne";
		case "project":
			return "Projekt";
		case "review":
			return "Powtórka";
		default:
			return kind;
	}
}

/**
 * ── ZDANIA WIDOKU, KTÓRE ZACZYNAJĄ SIĘ NAZWĄ ──────────────────────────────────
 *
 * Widok kilka razy pisze zdanie objaśniające tuż pod plakietką: „<nazwa> — co
 * z tym zrobić". Nazwa w takim zdaniu to TA SAMA decyzja nazewnicza, co
 * w plakietce — więc nie wolno jej przepisać literałem w JSX, tylko wstawić
 * z nośnika (CLAUDE.md v1.17: „pozostałe miejsca ją WOŁAJĄ, nie POWTARZAJĄ").
 *
 * Bez tego przemianowanie naprawia plakietkę i test, a akapit zostaje stary —
 * i produkt pokazuje studentowi dwie różne nazwy tej samej rzeczy w dwóch
 * sąsiadujących liniach (warunek 1 Leo, przegląd #291).
 *
 * Zdania są tu także dlatego, że są mikrocopy Sophii i podlegają cytatowi 1:1
 * jak `CURRICULUM_INTRO` wyżej. Strażnik A3 (`jezyk-produktu.contract.test.ts`)
 * pilnuje, że w `src/components/curriculum/**` nie ma drugiej kopii żadnej z tych
 * nazw — ani w JSX, ani w komentarzu.
 */

/**
 * Podpis pozycji typu `lab` w widoku modułu.
 *
 * Celowo BEZ zaimka („rozwiązujesz w notatniku", nie „rozwiązujesz je"): zaimek
 * uzgadniałby rodzaj z nazwą, więc przemianowanie „Zadanie praktyczne" (nijaki)
 * na cokolwiek innego rodzaju psułoby gramatykę zdania złożonego z nośnika.
 * Druga część („a zaliczasz kodem") i tak dopełnienie pomija — zdanie jest
 * spójne stylistycznie i odporne na przemianowanie.
 */
export const LAB_ITEM_HINT = `${itemKindLabel("lab")} — rozwiązujesz w notatniku, a zaliczasz kodem, który ten notatnik wypisze.`;

/**
 * Wyjaśnienie w widoku pozycji, gdy zadanie praktyczne nie ma jeszcze sprawdzenia.
 *
 * Interpolacja jest tu bezpieczna gramatycznie: „zalicza się" nie uzgadnia rodzaju
 * z podmiotem, więc zdanie zniesie każdą przyszłą nazwę rodzaju pozycji.
 */
export const LAB_AUTOCHECK_NOTICE = `${itemKindLabel("lab")} zalicza się automatycznym sprawdzeniem wykonanej pracy (bez samodeklaracji). Dla tej pozycji sprawdzenie nie jest jeszcze skonfigurowane — możesz przeczytać instrukcję i wykonać ją u siebie, ale drabina nie zapisze zaliczenia.`;

/** Podpis pozycji zablokowanej („ją" = pozycję, nie nazwę statusu — bez sprzężenia). */
export const ITEM_LOCKED_HINT = `${ITEM_STATUS_LABEL.locked} — zalicz poprzednią pozycję, żeby ją otworzyć.`;

/** Podpis modułu zablokowanego („go" = moduł, nie nazwę statusu — bez sprzężenia). */
export const MODULE_LOCKED_HINT = `${MODULE_STATUS_LABEL.locked} — zalicz wcześniejszy moduł, żeby go otworzyć.`;

/** Klasy odznaki statusu — spójne dla modułów i pozycji. */
export function statusBadgeClass(status: string): string {
	switch (status) {
		case "completed":
		case "skipped_by_placement":
			return "border-emerald-200 bg-emerald-50 text-emerald-800";
		case "in_progress":
			return "border-amber-200 bg-amber-50 text-amber-800";
		case "locked":
			return "border-border bg-muted text-muted-foreground";
		case "coming_soon":
			return "border-border bg-muted text-muted-foreground";
		default:
			return "border-sky-200 bg-sky-50 text-sky-800";
	}
}
