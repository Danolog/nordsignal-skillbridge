/**
 * 1E.7 / DŁUG D11 — ODCZYT MIERNIKA PLACEMENTU. Jedyny czytelnik zdarzeń
 * `curriculum.placement.computed` i `curriculum.placement.skipped`.
 *
 * ── PO CO ─────────────────────────────────────────────────────────────────
 * Zdarzenie miernika leci przy KAŻDYM policzeniu placementu (także zerowym,
 * P-1) od L4. Do dziś nie miało ani jednego czytelnika — zbieraliśmy dane,
 * których nikt nie umiał odczytać, a DECYZJA 2 Sophii („próg alarmowy: jeśli
 * odblokowani na poziomie 3 oblewają istotnie częściej, podnoszę próg do 4")
 * była przez to deklaracją, nie decyzją opartą na danych.
 *
 * ── REGUŁA WYŁĄCZENIA — JEDEN NOŚNIK, TUTAJ ───────────────────────────────
 * Reguła wiążąca (Sophia, §6a „Pierwszy wiersz na produkcji jest TECHNICZNY"):
 *
 *   Miernik czyta się wobec IMIENNEJ LISTY uczestników pilotażu. Zdarzenie,
 *   którego nie da się przypisać do sesji diagnozy NAZWANEGO uczestnika, NIE
 *   JEST OBSERWACJĄ — niezależnie od tego, jak sensownie wygląda. Dotyczy to
 *   zarówno mianownika, jak i licznika.
 *
 * Realizacja: lista uczestników jest DANYMI (tabela `pilot_participants`),
 * a jedynym miejscem, które orzeka „obserwacja / nie obserwacja", jest funkcja
 * `klasyfikujZdarzenie` w tym pliku. SQL poniżej celowo NIE FILTRUJE — pobiera
 * WSZYSTKIE zdarzenia razem z faktami atrybucji (czy istnieje sesja, czy jej
 * właściciel jest w rejestrze) i oddaje werdykt klasyfikatorowi. Gdyby filtr
 * siedział też w SQL-u, ta sama reguła miałaby DWA nośniki, które mogą się
 * rozjechać — a ta funkcja ma za sobą cztery osobne wady wyprodukowane dokładnie
 * przez regułę w dwóch kopiach (D0, D4, K1, znalezisko A z 2026-08-01).
 * Niefiltrujący SQL jest tu potrzebny także merytorycznie: bez odrzuconych
 * zdarzeń nie da się pokazać ROZLICZENIA, a liczba obserwacji bez rozliczenia
 * jest nie do odróżnienia od pustego rejestru.
 *
 * ── DLACZEGO REJESTR WŁĄCZAJĄCY, A NIE FILTR WYKLUCZAJĄCY ─────────────────
 * Sophia odrzuciła oba oczywiste rozróżniki (domena `.invalid`, oznaczenie
 * uczelni) jako regułę podstawową: zdarzenie nie niesie `actor_id` (art. 17
 * RODO), więc do konta dociera się wyłącznie złączeniem przez
 * `assessment_sessions`, a to złączenie znika kaskadą przy skasowaniu konta —
 * filtr WYKLUCZAJĄCY przestaje działać dokładnie wtedy, gdy jest potrzebny,
 * i wiersz techniczny wraca do licznika po cichu.
 *
 * Rejestr WŁĄCZAJĄCY używa TEGO SAMEGO kruchego złączenia i pęka tak samo — ale
 * kierunek awarii jest odwrotny: gdy złączenie znika, zdarzenie przestaje być
 * obserwacją. Filtr wyklucza­jący psuje się „na otwarcie" (rośnie licznik),
 * rejestr włączający „na zamknięcie" (rośnie liczba pominiętych, widoczna
 * w rozliczeniu). To jedyna różnica, ale rozstrzygająca.
 *
 * Konsekwencja projektowa, wprost: konto techniczne QA, konto zespołowe (w tym
 * Darek jako pierwszy przechodzący ścieżkę 2026-08-06), demo dla partnera,
 * szkolenie i każda przyszła sesja odegrana przez nas są wyłączone NIE dlatego,
 * że je wymieniono, tylko dlatego, że nikogo z nich nie ma w rejestrze. W tym
 * pliku nie ma i nie może być ani jednego adresu e-mail.
 *
 * ── ROZRÓŻNIK POMOCNICZY (`.invalid`) NIE ORZEKA ──────────────────────────
 * Domenę `.invalid` (zarezerwowaną RFC 6761, więc żaden prawdziwy student jej
 * nie ma) pobieramy WYŁĄCZNIE jako sygnał alarmowy o stanie REJESTRU: konto
 * techniczne wpisane do rejestru to błąd wpisu, do naprawy w rejestrze, a nie
 * do cichego załatania w zapytaniu. Gdyby ten rozróżnik współorzekał
 * o obserwacji, reguła miałaby drugi nośnik — i konto zespołowe bez żadnego
 * technicznego znacznika (Darek) przeciekłoby do licznika, bo jego adres jest
 * najzwyklejszy pod słońcem. Strażnik pilnuje tego wprost.
 */

/** Akcje dziennika, które składają się na miernik. Poza nimi nic nie czytamy. */
export const AKCJE_MIERNIKA = [
	"curriculum.placement.computed",
	"curriculum.placement.skipped",
] as const;

export type AkcjaMiernika = (typeof AKCJE_MIERNIKA)[number];

/**
 * Wiersz-kandydat: jedno zdarzenie miernika + FAKTY atrybucji. Same fakty,
 * zero werdyktu — orzeka wyłącznie `klasyfikujZdarzenie`.
 */
export type WierszKandydat = {
	zdarzenieId: string;
	akcja: string;
	utworzono: Date;
	/** `null` = brak sesji o tym identyfikatorze (skasowane konto → sierota). */
	sesjaId: string | null;
	/** `null` gdy sesji nie ma; inaczej właściciel sesji. */
	studentId: string | null;
	/** `null` = właściciela sesji NIE MA w rejestrze uczestników. */
	kohorta: string | null;
	/** Rozróżnik POMOCNICZY — alarm o stanie rejestru, nigdy podstawa werdyktu. */
	kontoWygladaTechnicznie: boolean;
	metadata: Record<string, unknown> | null;
};

export type KlasaZdarzenia = "obserwacja" | "sierota" | "spoza_rejestru";

/**
 * ⚠ TO JEST CAŁA REGUŁA WYŁĄCZENIA. Jedyne miejsce w repozytorium, które
 * orzeka, czy zdarzenie miernika jest obserwacją.
 *
 * Kolejność warunków jest znacząca: najpierw pytamy, czy zdarzenie w ogóle ma
 * czym dosięgnąć osoby (sesja), potem czy ta osoba jest w rejestrze. Domyślną
 * odpowiedzią jest „nie jest obserwacją" — nowy, nieprzewidziany kształt danych
 * wypada z licznika, zamiast do niego wpaść.
 *
 * `kontoWygladaTechnicznie` NIE JEST tu użyte i użyte być nie może (patrz
 * nagłówek pliku, „rozróżnik pomocniczy nie orzeka").
 */
export function klasyfikujZdarzenie(w: WierszKandydat): KlasaZdarzenia {
	if (w.sesjaId === null || w.studentId === null) return "sierota";
	if (w.kohorta === null) return "spoza_rejestru";
	return "obserwacja";
}

/**
 * Zapytanie po kandydatów — CELOWO BEZ FILTRA po rejestrze (patrz nagłówek).
 *
 * Złączenie `s.id::text = a.target_id`, a nie `a.target_id::uuid = s.id`:
 * `audit_log.target_id` jest kolumną tekstową wspólną dla wszystkich akcji,
 * więc rzutowanie jej na uuid wywala całe zapytanie na pierwszym wierszu
 * innej akcji o nie-uuid-owym celu. Rzutujemy stronę, o której wiemy, że jest
 * uuid-em. Tabele są rzędu setek wierszy — koszt skanu nieistotny.
 *
 * $1 = kohorta albo NULL (NULL = wszystkie kohorty; obie postacie są
 * fail-closed, bo liczą wyłącznie osoby wpisane do rejestru).
 */
export const SQL_KANDYDACI = `
	SELECT
		a.id                                    AS zdarzenie_id,
		a.action                                AS akcja,
		a.created_at                            AS utworzono,
		s.id                                    AS sesja_id,
		s.student_id                            AS student_id,
		pp.cohort                               AS kohorta,
		coalesce(u.email LIKE '%.invalid', false) AS konto_wyglada_technicznie,
		a.metadata                              AS metadata
	FROM audit_log a
	LEFT JOIN assessment_sessions s ON s.id::text = a.target_id
	LEFT JOIN pilot_participants pp
	       ON pp.student_id = s.student_id
	      AND ($1::text IS NULL OR pp.cohort = $1::text)
	LEFT JOIN students st ON st.id = s.student_id
	LEFT JOIN "user" u ON u.id = st.user_id
	WHERE a.action = ANY($2::text[])
	ORDER BY a.created_at ASC
`;

/** Mianownik — liczony z REJESTRU, nie z dziennika (§6a, wymóg Sophii). */
export const SQL_REJESTR = `
	SELECT pp.student_id, pp.cohort, pp.enrolled_at,
	       coalesce(u.email LIKE '%.invalid', false) AS konto_wyglada_technicznie
	FROM pilot_participants pp
	JOIN students st ON st.id = pp.student_id
	JOIN "user" u ON u.id = st.user_id
	WHERE ($1::text IS NULL OR pp.cohort = $1::text)
	ORDER BY pp.enrolled_at ASC
`;

export type ObserwacjaPoliczenia = {
	zdarzenieId: string;
	utworzono: Date;
	threshold: number | null;
	unlockedCount: number | null;
	alreadyCompletedCount: number | null;
	blockingHoleSlug: string | null;
	blockingHoleReason: string | null;
	blockingHoleLevel: number | null;
};

export type ObserwacjaPominiecia = {
	zdarzenieId: string;
	utworzono: Date;
	/** `missing_career_goal` = DEFEKT liczenia; `unmapped_career_goal` = poprawne. */
	reason: string | null;
	goalSource: string | null;
};

export type Miernik = {
	kohorta: string | null;
	odczytano: Date;
	/** Mianownik z rejestru: ilu uczestników wpisano. */
	uczestnicyWRejestrze: number;
	/** Uczestnicy z rejestru, którzy nie zostawili ŻADNEGO zdarzenia miernika. */
	uczestnicyBezZdarzenia: number;
	/** Wiersze rejestru wskazujące konto o adresie technicznym — błąd wpisu. */
	rejestrPodejrzany: number;
	policzenia: ObserwacjaPoliczenia[];
	pominieciaLiczenia: ObserwacjaPominiecia[];
	/** Rozliczenie zdarzeń ODRZUCONYCH — bez niego liczba obserwacji kłamie. */
	odrzucone: {
		sierota: number;
		spozaRejestru: number;
		/** Podzbiór `spozaRejestru` o adresie technicznym — informacyjnie. */
		spozaRejestruTechniczne: number;
	};
};

type Wykonawca = (sql: string, params: unknown[]) => Promise<Record<string, unknown>[]>;

function liczbaAlbNull(v: unknown): number | null {
	return typeof v === "number" ? v : null;
}

function napisAlbNull(v: unknown): string | null {
	return typeof v === "string" ? v : null;
}

/** Mapowanie wiersza SQL → fakt atrybucji. Bez orzekania. */
export function zWierszaSql(r: Record<string, unknown>): WierszKandydat {
	return {
		zdarzenieId: String(r.zdarzenie_id),
		akcja: String(r.akcja),
		utworzono: r.utworzono instanceof Date ? r.utworzono : new Date(String(r.utworzono)),
		sesjaId: napisAlbNull(r.sesja_id),
		studentId: napisAlbNull(r.student_id),
		kohorta: napisAlbNull(r.kohorta),
		kontoWygladaTechnicznie: r.konto_wyglada_technicznie === true,
		metadata: (r.metadata as Record<string, unknown> | null) ?? null,
	};
}

/**
 * Zbierz miernik. `kohorta === null` = wszystkie kohorty.
 *
 * Klasyfikacja idzie przez `klasyfikujZdarzenie` dla KAŻDEGO zdarzenia — także
 * po to, żeby rozliczenie było wyczerpujące: suma obserwacji i odrzuconych musi
 * równać się liczbie zdarzeń w dzienniku.
 */
export async function zbierzMiernik(
	wykonaj: Wykonawca,
	opcje: { kohorta?: string | null } = {},
): Promise<Miernik> {
	const kohorta = opcje.kohorta ?? null;

	const rejestr = await wykonaj(SQL_REJESTR, [kohorta]);
	const kandydaci = (await wykonaj(SQL_KANDYDACI, [kohorta, [...AKCJE_MIERNIKA]])).map(zWierszaSql);

	const policzenia: ObserwacjaPoliczenia[] = [];
	const pominieciaLiczenia: ObserwacjaPominiecia[] = [];
	const odrzucone = { sierota: 0, spozaRejestru: 0, spozaRejestruTechniczne: 0 };
	const studenciZeZdarzeniem = new Set<string>();

	for (const k of kandydaci) {
		const klasa = klasyfikujZdarzenie(k);
		if (klasa === "sierota") {
			odrzucone.sierota += 1;
			continue;
		}
		if (klasa === "spoza_rejestru") {
			odrzucone.spozaRejestru += 1;
			if (k.kontoWygladaTechnicznie) odrzucone.spozaRejestruTechniczne += 1;
			continue;
		}
		if (k.studentId) studenciZeZdarzeniem.add(k.studentId);
		const m = k.metadata ?? {};
		if (k.akcja === "curriculum.placement.computed") {
			policzenia.push({
				zdarzenieId: k.zdarzenieId,
				utworzono: k.utworzono,
				threshold: liczbaAlbNull(m.threshold),
				unlockedCount: liczbaAlbNull(m.unlockedCount),
				alreadyCompletedCount: liczbaAlbNull(m.alreadyCompletedCount),
				blockingHoleSlug: napisAlbNull(m.blockingHoleSlug),
				blockingHoleReason: napisAlbNull(m.blockingHoleReason),
				blockingHoleLevel: liczbaAlbNull(m.blockingHoleLevel),
			});
		} else {
			pominieciaLiczenia.push({
				zdarzenieId: k.zdarzenieId,
				utworzono: k.utworzono,
				reason: napisAlbNull(m.reason),
				goalSource: napisAlbNull(m.goalSource),
			});
		}
	}

	const wRejestrze = rejestr.map((r) => ({
		studentId: String(r.student_id),
		techniczne: r.konto_wyglada_technicznie === true,
	}));

	return {
		kohorta,
		odczytano: new Date(),
		uczestnicyWRejestrze: wRejestrze.length,
		uczestnicyBezZdarzenia: wRejestrze.filter((u) => !studenciZeZdarzeniem.has(u.studentId)).length,
		rejestrPodejrzany: wRejestrze.filter((u) => u.techniczne).length,
		policzenia,
		pominieciaLiczenia,
		odrzucone,
	};
}

/**
 * D5b — OGRANICZENIA WNIOSKOWANIA. Stoją TUTAJ, przy zapytaniu, a nie w osobnym
 * dokumencie, bo czytelnik dziennika i czytelnik §6a to nie ta sama osoba w tej
 * samej chwili (rozstrzygnięcie Sophii, §13 / D5 punkt b).
 *
 * Ta stała jest częścią kontraktu raportu: `raportTekstowy` nie umie wypisać
 * ani jednej liczby bez niej, a strażnik `placement-metric-rule.test.ts` czerwieni
 * się, gdy ktoś rozłączy jedno od drugiego.
 */
export const OGRANICZENIA_WNIOSKOWANIA = `
OGRANICZENIA WNIOSKOWANIA (1E.7 / D5b — czytaj PRZED liczbami)
Źródło: docs/product/decyzje-1e7-placement-v0.1.md §6a. Poniższe NIE jest
ostrożnościową formułką — to zakres, poza którym te liczby znaczą co innego,
niż się wydaje.

N JEST RZĘDU JEDNOSTEK (1–3 osoby). Przy tej liczebności nie istnieje różnica
między „wynikiem" a „przypadkiem": jedna osoba to cała populacja i cały błąd
pomiaru naraz. Każda liczba niżej jest OPISEM TEGO, CO SIĘ WYDARZYŁO, a nie
oszacowaniem czegokolwiek — nie ma odsetka, nie ma trendu, nie ma istotności.

WOLNO:
  • ocenić próg ≥3 WYŁĄCZNIE dla 'ds-python' i 'ds-pandas' — tylko te dwa
    pomiary mogą dziś cokolwiek otworzyć (sufit strukturalny, dług D1);
  • policzyć, jak często placement nic nie otwiera, W ROZBICIU NA PRZYCZYNĘ:
    blockingHoleReason='below_threshold' (zmierzyliśmy, wypadło słabo) kontra
    'no_measurement' (nie badaliśmy tej kompetencji w ogóle);
  • odróżnić sufit strukturalny od zachowania studenta: dziura na 'm-eda'/'m-ml'
    = sufit, dziura na 'f1-python-1'/'m-pandas' = wybór studenta;
  • czytać 'missing_career_goal' jako DEFEKT liczenia, a 'unmapped_career_goal'
    jako zachowanie POPRAWNE (cel spoza pilotażu DS) — to dwie różne rzeczy
    i dlatego stoją w raporcie osobno;
  • użyć każdej z tych liczb jako POWODU DO ROZMOWY z konkretnym uczestnikiem.

NIE WOLNO:
  • wyciągać żadnych wniosków o progu dla 'ds-sql', 'ds-eda',
    'ds-uczenie-maszynowe', 'ds-llm' — zero obserwacji, bo te moduły nie mogą
    się dziś otworzyć;
  • czytać unlockedCount=0 jako „próg za wysoki" bez sprawdzenia
    blockingHoleReason: przy 'no_measurement' próg nie miał nic do roboty,
    a obniżenie go zwiększy fałszywe odblokowania, nie naprawiając niczego;
  • czytać BRAKU zdarzeń jako „placement nie działa" — student, który nie
    zaznaczy żadnej kompetencji, nie odbywa testu, więc nie ma czego liczyć
    (jedyna jawna dziura w pomiarze; patrz „uczestnicy bez zdarzenia");
  • oceniać wartości funkcji po tym, ilu uczestników coś dostało: przy profilu
    „zaczynam od zera" BRAK odblokowań jest wynikiem OCZEKIWANYM i nie jest
    przesłanką ani za wyłączeniem placementu, ani za obniżeniem progu;
  • zmieniać progu w którąkolwiek stronę na tych danych. Jeden uczestnik
    odblokowany na poziomie 3, który oblewa pierwszy egzamin, jest SYGNAŁEM
    DO ZBADANIA, nie dowodem. Próg rewiduje się przy kohorcie, w której da się
    policzyć różnicę w oblewalności (DECYZJA 2);
  • liczyć czegokolwiek na zdarzeniach ODRZUCONYCH — ani jako obserwacji, ani
    jako „prawie obserwacji". Sesje odegrane przez zespół (konto QA, przejście
    Darka 2026-08-06, demo, szkolenie) mają wejścia wybrane przez człowieka,
    który wiedział, co chce zobaczyć. To dowód, że MECHANIZM DZIAŁA, i zerowy
    dowód o tym, jak zachowa się student;
  • traktować liczby z tego raportu jako wyniku pilotażu wobec kogokolwiek na
    zewnątrz (uczelnia, partner, inwestor) — to odczyt roboczy, nie wynik;
  • traktować tych liczb jako TRWAŁYCH W CZASIE. Uczestnik może skorzystać
    z prawa do usunięcia danych (art. 17 RODO); jego wiersz rejestru znika
    kaskadą, a wraz z nim jego zdarzenia przestają być obserwacjami — WSTECZ.
    Odczyt z innego dnia może dać MNIEJ obserwacji przy identycznym kodzie
    i zerze defektów; naturalny odruch („coś się zepsuło") będzie wtedy błędny.
    Dlatego każda liczba cytowana dalej MUSI nieść DATĘ ODCZYTU (nagłówek tego
    raportu ją podaje) — liczba bez daty jest nie do odtworzenia i nie wolno
    jej cytować jako faktu ustalonego.
`.trim();

/**
 * Raport tekstowy. Ograniczenia idą PRZED liczbami i nie da się ich pominąć —
 * to jedyna droga, żeby liczba opuściła ten moduł.
 */
export function raportTekstowy(m: Miernik): string {
	const zdarzeniaRazem =
		m.policzenia.length +
		m.pominieciaLiczenia.length +
		m.odrzucone.sierota +
		m.odrzucone.spozaRejestru;

	const wiersze: string[] = [];
	wiersze.push("=== MIERNIK PLACEMENTU 1E.7 (dług D11) ===");
	wiersze.push(`Kohorta: ${m.kohorta ?? "(wszystkie)"} · odczyt: ${m.odczytano.toISOString()}`);
	wiersze.push("");
	wiersze.push(OGRANICZENIA_WNIOSKOWANIA);
	wiersze.push("");

	if (m.uczestnicyWRejestrze === 0) {
		wiersze.push(
			"⚠ REJESTR UCZESTNIKÓW JEST PUSTY — zero obserwacji z definicji, niezależnie",
			"  od tego, ile zdarzeń jest w dzienniku. To NIE znaczy, że placement nie działa —",
			"  to znaczy, że nikogo jeszcze nie wpisano. Wpis: pnpm tsx tools/pilot-enroll.ts.",
			"",
		);
	}

	wiersze.push("--- MIANOWNIK (z rejestru uczestników, nie z dziennika) ---");
	wiersze.push(`uczestnicy w rejestrze:            ${m.uczestnicyWRejestrze}`);
	wiersze.push(`w tym bez ŻADNEGO zdarzenia:       ${m.uczestnicyBezZdarzenia}`);
	if (m.rejestrPodejrzany > 0) {
		wiersze.push(
			`⚠ WPISY PODEJRZANE W REJESTRZE:     ${m.rejestrPodejrzany} (adres w domenie .invalid,`,
			"  czyli konto techniczne wpisane jak uczestnik). Naprawa NALEŻY DO REJESTRU —",
			"  nie do zapytania. Do czasu naprawy liczby niżej są zanieczyszczone.",
		);
	}
	wiersze.push("");

	wiersze.push("--- ROZLICZENIE ZDARZEŃ (suma musi się zgadzać z dziennikiem) ---");
	wiersze.push(`zdarzeń miernika w dzienniku:      ${zdarzeniaRazem}`);
	wiersze.push(`  obserwacje (policzenia):         ${m.policzenia.length}`);
	wiersze.push(`  obserwacje (pominięcia liczenia):${m.pominieciaLiczenia.length}`);
	wiersze.push(`  ODRZUCONE — sierota:             ${m.odrzucone.sierota}`);
	wiersze.push(
		`  ODRZUCONE — spoza rejestru:      ${m.odrzucone.spozaRejestru}` +
			` (w tym adres techniczny: ${m.odrzucone.spozaRejestruTechniczne})`,
	);
	wiersze.push("");

	wiersze.push("--- POLICZENIA PLACEMENTU (obserwacje) ---");
	if (m.policzenia.length === 0) {
		wiersze.push("(brak)");
	} else {
		for (const p of m.policzenia) {
			wiersze.push(
				`${p.utworzono.toISOString()} · próg=${p.threshold} · odblokowane=${p.unlockedCount}` +
					` · już zaliczone=${p.alreadyCompletedCount} · dziura=${p.blockingHoleSlug ?? "-"}` +
					` (powód=${p.blockingHoleReason ?? "-"}, poziom=${p.blockingHoleLevel ?? "-"})`,
			);
		}
	}
	wiersze.push("");

	wiersze.push("--- POMINIĘCIA LICZENIA (D0 — defekt kontra zachowanie poprawne) ---");
	if (m.pominieciaLiczenia.length === 0) {
		wiersze.push("(brak)");
	} else {
		for (const p of m.pominieciaLiczenia) {
			const etykieta =
				p.reason === "missing_career_goal"
					? "DEFEKT liczenia (cel pusty)"
					: p.reason === "unmapped_career_goal"
						? "poprawne (cel spoza pilotażu DS)"
						: "powód nieznany — sprawdź kod";
			wiersze.push(
				`${p.utworzono.toISOString()} · ${p.reason ?? "-"} · źródło celu=${p.goalSource ?? "-"} · ${etykieta}`,
			);
		}
	}

	return wiersze.join("\n");
}
