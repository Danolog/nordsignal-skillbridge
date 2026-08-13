import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

/**
 * R1/O1 — STRAŻNIK PRZEWODU, nie reguły.
 *
 * Znalezisko Leo (przegląd `3c9bc20`): reguła miała sprawdzonego nośnika i pięć
 * mutacji, ale NIC nie pilnowało, czy nośnik jest **podłączony**:
 *
 *   (a) mutacja rozłączająca `main()` od reguły przeżywała suitę 18/18 na zielono
 *       — testy wołały czyste funkcje, więc nie widziały, że przebieg ich nie woła;
 *   (b) `prod-journal-check` występował w całym repozytorium DOKŁADNIE DWA RAZY:
 *       on sam i jego test. Brak w `package.json`, brak w runbookach, `db:migrate`
 *       go nie wołał. Leo: „bramka, której nic nie uruchamia, bramkuje tyle,
 *       ile pamięć operatora pod presją".
 *
 * Te testy pilnują PRZEWODU: że skrypt uruchomiony naprawdę stosuje regułę i że
 * repozytorium ma czym go uruchomić. Świadomie NIE dublują testów reguły —
 * tamte żyją w `prod-journal-check.test.ts` (jeden nośnik, CLAUDE.md §8 v1.17).
 *
 * UWAGA o wartości `DATABASE_URL` poniżej: to celowo NIE jest adres połączenia,
 * tylko napis niepusty. Skrypt wymaga jedynie, żeby zmienna była ustawiona, a
 * bramka zatrzymuje go PRZED próbą połączenia — więc prawdziwy adres jest tu
 * zbędny. (Pierwsza wersja tego pliku niosła atrapę adresu z hasłem i słusznie
 * zablokował ją `guard-secrets`; atrapy adresów też nie trzymamy w repo.)
 */

const REPO = join(__dirname, "..", "..", "..");

/** Uruchamia PRAWDZIWY skrypt. Bez bazy i bez sieci — bramka wyprzedza jedno i drugie. */
function uruchomSkrypt(env: Record<string, string>): { kod: number; wyjscie: string } {
	try {
		const out = execFileSync("pnpm", ["exec", "tsx", "tools/prod-journal-check.ts"], {
			cwd: REPO,
			encoding: "utf8",
			stdio: ["ignore", "pipe", "pipe"],
			env: { ...process.env, ...env },
		});
		return { kod: 0, wyjscie: out };
	} catch (e) {
		const err = e as { status?: number; stdout?: string; stderr?: string };
		return { kod: err.status ?? -1, wyjscie: `${err.stdout ?? ""}${err.stderr ?? ""}` };
	}
}

/** Niepusty napis, świadomie NIE będący adresem połączenia — patrz nagłówek. */
const ZMIENNA_USTAWIONA = "ustawione-lecz-nieuzywane-bramka-wyprzedza-polaczenie";

/**
 * WYNIK LICZONY RAZ — lekcja Ryana z `#298` (trzecia odmiana atrapy).
 *
 * Tam strażnik transpilował całe drzewo przy KAŻDYM wywołaniu: pojedynczo mieścił
 * się w limicie czasu, w pełnej suicie padał na limicie, nie dochodząc do asercji.
 * Kłamał nie o regule, tylko o tym, CZY ZDĄŻYŁ JĄ SPRAWDZIĆ — a diagnoza
 * pojedynczym plikiem dawała zieleń i zamykała sprawę.
 *
 * Ten plik ma tę samą wrażliwość: każdy przebieg to osobny start `tsx`. Trzy
 * wywołania przy rywalizacji o procesor zbliżały się do limitu. Naprawiamy
 * PRZYCZYNĘ (dwa scenariusze zamiast trzech wywołań, wynik policzony raz),
 * NIE podnosimy limitu — podniesienie zamieniłoby wadę na dług o tym samym objawie.
 */
let bezFetch: { kod: number; wyjscie: string };
let refLokalna: { kod: number; wyjscie: string };

beforeAll(() => {
	bezFetch = uruchomSkrypt({
		DATABASE_URL: ZMIENNA_USTAWIONA,
		PROD_JOURNAL_SKIP_FETCH: "1",
	});
	refLokalna = uruchomSkrypt({
		DATABASE_URL: ZMIENNA_USTAWIONA,
		PROD_JOURNAL_SKIP_FETCH: "1",
		PROD_JOURNAL_REF: "HEAD",
	});
});

describe("R1: przewód od main() do reguły — skrypt naprawdę stosuje bramkę", () => {
	it("pominięty fetch => kod wyjścia 2 i NIEROZSTRZYGNIĘTY (nie „spójny”)", () => {
		expect(bezFetch.kod).toBe(2);
		expect(bezFetch.wyjscie).toContain("NIEROZSTRZYGNIĘTY");
		// Najważniejsza asercja całego pliku: słowo „spójny" NIE PADA bez potwierdzenia.
		expect(bezFetch.wyjscie).not.toContain("WYNIK: SPÓJNY");
	});

	it("referencja lokalna (HEAD) => kod wyjścia 2, bazy nie dotyka", () => {
		expect(refLokalna.kod).toBe(2);
		expect(refLokalna.wyjscie).toContain("Bazy NIE odpytywano");
	});

	it("komunikat błędu NIE reklamuje obejścia (regresja z przeglądu Leo)", () => {
		// Skrypt na własnej ścieżce błędu podsuwał operatorowi drogi do zieleni.
		expect(bezFetch.wyjscie).not.toMatch(/Offline:\s*PROD_JOURNAL_SKIP_FETCH=1/);
		expect(bezFetch.wyjscie).not.toMatch(/wskaż właściwą referencję/i);
	});
});

describe("O1: przewód od repozytorium do narzędzia — jest czym uruchomić bramkę", () => {
	it("`package.json` ma skrypt `db:preflight` wskazujący na to narzędzie", () => {
		const pkg = JSON.parse(readFileSync(join(REPO, "package.json"), "utf8")) as {
			scripts: Record<string, string>;
		};
		expect(pkg.scripts["db:preflight"]).toBeDefined();
		expect(pkg.scripts["db:preflight"]).toContain("tools/prod-journal-check.ts");
	});

	it("runbook ceremonii woła bramkę i niesie umowę kodów wyjścia", () => {
		const runbook = readFileSync(join(REPO, "docs/runbooks/ceremonia-migracji-prod.md"), "utf8");
		expect(runbook).toContain("pnpm db:preflight");
		// Umowa ma być zapisana, nie pamiętana — wszystkie trzy kody nazwane.
		expect(runbook).toContain("SPÓJNY");
		expect(runbook).toContain("NIESPÓJNY");
		expect(runbook).toContain("NIEROZSTRZYGNIĘTY");
	});
});
