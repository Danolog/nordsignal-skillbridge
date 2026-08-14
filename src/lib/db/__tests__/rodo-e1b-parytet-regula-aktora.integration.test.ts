// @vitest-environment node
//
// STRAŻNIK PARYTETU (D-U8) — czy baza mówi to samo, co nośnik reguły.
//
// DLACZEGO ISTNIEJE. Migracja 0048 dokłada ograniczenie `audit_log_regula_aktora`
// jako DRUGI EGZEKUTOR reguły, której jedynym NOŚNIKIEM jest `REGULA_AKTORA`
// w `src/lib/audit.ts`. CLAUDE.md v1.17 dopuszcza drugiego egzekutora wyłącznie
// z testem, który pada, gdy oba się rozjadą — bez tego strażnika tej migracji
// NIE WOLNO było dokładać, i tak została wyceniona.
//
// Rozjazd jest z definicji bezgłośny: ktoś dopisuje szósty typ działającego do
// nośnika (albo przestawia `faculty` do klasy bez tożsamości — próg (i) Ryana),
// kod się kompiluje, testy są zielone, a baza nadal egzekwuje wczorajszą regułę.
// Wynik: albo ograniczenie odrzuca zapisy, które są już dozwolone (awaria
// głośna, ale w produkcji), albo przepuszcza te, które przestały być (awaria
// cicha i NIEODWRACALNA — `UPDATE` na `audit_log` blokuje wyzwalacz).
//
// ── KSZTAŁT: PARYTET ZACHOWANIA, NIE PORÓWNANIE NAPISÓW ─────────────────────
//
// ŚWIADOMIE ODRZUCONY wariant: pobrać `pg_get_constraintdef` i porównać
// z tekstem wygenerowanym z nośnika. Byłby kruchy na formatowanie (Postgres
// przepisuje `IN (...)` na `= ANY (ARRAY[...])`) i — co gorsze — sprawdzałby
// ZAPIS, a nie SKUTEK. Ograniczenie poprawnie wyglądające, a nieegzekwowane
// (np. `NOT VALID` zdjęte razem z całą regułą), przeszłoby taki test.
//
// Zamiast tego dla KAŻDEGO typu z nośnika i KAŻDEGO z trzech pól próbujemy
// zapisu i patrzymy, co baza robi. Wszystko w transakcji zakończonej
// ROLLBACK — dzięki temu nie zostawiamy ani jednego wiersza (a nie zostawić
// się MUSI: `DELETE` na `audit_log` jest zablokowany wyzwalaczem, więc test,
// który zapisuje na trwałe, zatruwa bazę bez możliwości sprzątnięcia).
//
// Wymaga DATABASE_URL na localhost po `pnpm db:migrate:test`.

import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { REGULA_AKTORA } from "@/lib/audit";

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const isLocalTestDb = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(DATABASE_URL);
const dBack = isLocalTestDb ? describe : describe.skip;

const NAZWA_OGRANICZENIA = "audit_log_regula_aktora";

dBack("Parytet: ograniczenie w bazie mowi to samo co REGULA_AKTORA", () => {
	let pool: Pool | undefined;

	beforeAll(() => {
		if (!isLocalTestDb) return;
		pool = new Pool({ connectionString: DATABASE_URL });
	});

	afterAll(async () => {
		await pool?.end();
	});

	/**
	 * Próbuje zapisać wiersz i mówi, czy baza go przyjęła. Zawsze ROLLBACK —
	 * niezależnie od wyniku, także przy sukcesie.
	 */
	async function czyBazaPrzyjmuje(wiersz: {
		actorType: string;
		actorId?: string | null;
		ipAddress?: string | null;
		userAgent?: string | null;
	}): Promise<{ przyjeta: boolean; blad: string | null }> {
		const klient = await pool!.connect();
		try {
			await klient.query("BEGIN");
			await klient.query(
				`INSERT INTO audit_log (actor_type, actor_id, action, target_type, target_id, ip_address, user_agent)
				 VALUES ($1, $2, 'parytet.probny', 'test', 'test', $3, $4)`,
				[
					wiersz.actorType,
					wiersz.actorId ?? null,
					wiersz.ipAddress ?? null,
					wiersz.userAgent ?? null,
				],
			);
			return { przyjeta: true, blad: null };
		} catch (e) {
			return { przyjeta: false, blad: (e as Error).message };
		} finally {
			await klient.query("ROLLBACK").catch(() => {});
			klient.release();
		}
	}

	// ── KONTROLA DWUSTRONNA — najpierw dowód, że mechanizm w ogóle działa ─────

	it("ograniczenie ISTNIEJE w katalogu bazy", async () => {
		const r = await pool!.query(
			`SELECT conname FROM pg_constraint
			  WHERE conrelid = 'audit_log'::regclass AND contype = 'c' AND conname = $1`,
			[NAZWA_OGRANICZENIA],
		);
		expect(
			r.rowCount,
			`Brak ograniczenia ${NAZWA_OGRANICZENIA} w bazie. Albo migracja 0048 nie została ` +
				"zastosowana, albo ktoś ją wycofał. Reguła nadal żyje w typie `AuditEntry`, ale " +
				"zapis z pominięciem `recordAudit` (surowy SQL w tools/, ręczne zdanie w konsoli) " +
				"przestaje być czymkolwiek pilnowany.",
		).toBe(1);
	});

	it("KONTROLA DODATNIA: wiersz zgodny z regula jest przyjmowany dla kazdego typu", async () => {
		// Bez tej kontroli test „odrzuca złe wiersze" byłby zielony także wtedy,
		// gdyby baza odrzucała WSZYSTKO (np. literówka w ograniczeniu). Strażnik
		// musi umieć powiedzieć „to jest poprawne", nie tylko „to jest złe".
		const odrzucone: string[] = [];
		for (const typ of Object.keys(REGULA_AKTORA)) {
			const wynik = await czyBazaPrzyjmuje({ actorType: typ });
			if (!wynik.przyjeta) odrzucone.push(`${typ}: ${wynik.blad}`);
		}
		expect(
			odrzucone,
			"Baza odrzuca wiersz BEZ żadnego pola opcjonalnego — czyli najprostszy poprawny " +
				"wiersz. Ograniczenie jest za ostre i blokuje zapisy zgodne z nośnikiem.",
		).toEqual([]);
	});

	// ── PARYTET WŁAŚCIWY: pole po polu, typ po typie ─────────────────────────

	it("dla kazdego typu i kazdego pola baza zachowuje sie DOKLADNIE jak REGULA_AKTORA", async () => {
		const rozjazdy: string[] = [];

		for (const [typ, regula] of Object.entries(REGULA_AKTORA)) {
			// Pole tożsamości — `actorId`.
			{
				const wynik = await czyBazaPrzyjmuje({ actorType: typ, actorId: "probny-aktor" });
				if (wynik.przyjeta !== regula.actorId) {
					rozjazdy.push(
						`actor_type='${typ}' + actor_id: nośnik mówi ${regula.actorId ? "WOLNO" : "NIE WOLNO"}, ` +
							`baza ${wynik.przyjeta ? "PRZYJMUJE" : "ODRZUCA"}`,
					);
				}
			}

			// Kontekst żądania — dwa pola, sprawdzane OSOBNO. Adres IP jest daną
			// osobową sam z siebie (motyw 30 RODO), więc ograniczenie pilnujące
			// tylko sygnatury przeglądarki nie zamykałoby niczego.
			for (const pole of ["ipAddress", "userAgent"] as const) {
				const wynik = await czyBazaPrzyjmuje({ actorType: typ, [pole]: "probna-wartosc" });
				if (wynik.przyjeta !== regula.kontekstZadania) {
					rozjazdy.push(
						`actor_type='${typ}' + ${pole}: nośnik mówi ` +
							`${regula.kontekstZadania ? "WOLNO" : "NIE WOLNO"}, ` +
							`baza ${wynik.przyjeta ? "PRZYJMUJE" : "ODRZUCA"}`,
					);
				}
			}
		}

		expect(
			rozjazdy,
			"ROZJAZD między nośnikiem `REGULA_AKTORA` (src/lib/audit.ts) a ograniczeniem " +
				`${NAZWA_OGRANICZENIA} w bazie. Zmieniono jedno z dwóch miejsc. Popraw drugie ` +
				"NOWĄ migracją (ograniczenia nie edytuje się w miejscu) albo cofnij zmianę " +
				"nośnika. Wiersz zapisany źle jest zapisany źle NA ZAWSZE — UPDATE na audit_log " +
				"blokuje wyzwalacz append-only.",
		).toEqual([]);
	});

	it("straznik faktycznie cwiczyl kazdy typ z nosnika (nie przeszedl na pustej petli)", () => {
		// Pętla po pustym obiekcie przechodzi tak samo jak pętla po pięciu typach.
		expect(Object.keys(REGULA_AKTORA).length).toBeGreaterThanOrEqual(5);
	});
});
