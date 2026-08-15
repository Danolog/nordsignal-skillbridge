import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import {
	afterDeleteAccount,
	beforeDeleteAccount,
	FLAGA_USUWANIA_KONTA,
} from "@/lib/auth/account-deletion";
import { czyAdresDozwolony, KOMUNIKAT_ODMOWY } from "@/lib/auth/lista-dostepu";
import { db } from "@/lib/db";
import { isFeatureEnabled } from "@/lib/flags";
import {
	type AkceptacjaRegulaminu,
	sprawdzAkceptacjeRegulaminu,
	wersjaRegulaminuPilotazu,
} from "@/lib/tresc/akceptacja-regulaminu";

/** Ścieżka rejestracji mailem — bramkowana akceptacją regulaminu i listą dostępu. */
const SCIEZKA_REJESTRACJI = "/sign-up/email";

/**
 * Ścieżki, na których znamy adres z ciała żądania i możemy sprawdzić listę
 * dostępu PRZED wykonaniem czynności. Logowanie Google nie niesie tu adresu —
 * jego pierwsze wejście łapie `databaseHooks.user.create.before` niżej.
 */
const SCIEZKI_Z_ADRESEM_W_CIELE = [SCIEZKA_REJESTRACJI, "/sign-in/email"] as const;

export const auth = betterAuth({
	baseURL: process.env.BETTER_AUTH_URL,
	database: drizzleAdapter(db, {
		provider: "pg",
	}),
	// Adresy podglądów Vercel: ufamy WYŁĄCZNIE wdrożeniom zakotwiczonym na slugu
	// zespołu `dareks-projects-da398fc0` (slug nadaje Vercel — nie da się go podrobić).
	// Prefiks `skill-bridge-` to faktyczna baza adresu projektu na Vercel (zweryfikowane
	// na żywym podglądzie: skill-bridge-<hash>-dareks-projects-da398fc0.vercel.app).
	// Fail-closed: po przemianowaniu zespołu regex przestaje pasować i podglądy tracą
	// zaufanie (świadomie — zamknięte zamiast dziurawego). Prod i localhost dokłada sam
	// Better Auth z origin baseURL/BETTER_AUTH_URL, więc ich tu nie powtarzamy.
	// Better Auth woła tę funkcję też przy starcie z request === undefined — wtedy
	// zwracamy [] (bez tego `request.headers` rzuca TypeError i wywala init auth).
	trustedOrigins: async (request) => {
		if (!request) return [];
		const raw = request.headers.get("origin") ?? request.headers.get("referer") ?? "";
		let origin: string;
		try {
			origin = new URL(raw).origin;
		} catch {
			return [];
		}
		return /^https:\/\/skill-bridge-[a-z0-9-]+-dareks-projects-da398fc0\.vercel\.app$/i.test(origin)
			? [origin]
			: [];
	},
	emailAndPassword: {
		enabled: true,
	},
	socialProviders: {
		google: {
			clientId: process.env.GOOGLE_CLIENT_ID ?? "",
			clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
		},
	},
	// E1b (RODO art. 17, D-U1) — WŁĄCZAMY gotową ścieżkę biblioteki zamiast pisać
	// własną trasę. Trasa zbiorcza `/api/auth/[...path]` już ją oddaje, więc nie
	// dokładamy ani jednego pliku trasy. Szczegóły i uzasadnienie kształtu:
	// `src/lib/auth/account-deletion.ts`.
	//
	// Potwierdzenie tożsamości robi biblioteka sama (D-U2): hasło, gdy konto je
	// ma, w przeciwnym razie wymóg ŚWIEŻEJ SESJI. To nie jest wygoda — 18 z 33
	// kont produkcyjnych nie ma żadnego hasła (3 logowanie Google + 15 zasianych),
	// więc ścieżka oparta wyłącznie na haśle odebrałaby prawo z art. 17 ponad
	// połowie populacji.
	//
	// `sendDeleteAccountVerification` ŚWIADOMIE NIEUSTAWIONE — tryb pocztowy
	// zapisuje do tabeli `verification` wiersz o wartości równej identyfikatorowi
	// usuwanego konta, a ta tabela nie kaskaduje (E1b §3.5). Pilnuje tego
	// strażnik konfiguracji, nie ten komentarz.
	user: {
		deleteUser: {
			// Odczyt PRZY STARCIE — kierunek awarii zamkniętej. Bramką
			// ROZSTRZYGAJĄCĄ jest `beforeDelete` (odczyt przy każdym żądaniu),
			// bo zmienna środowiskowa przestawia się bez wdrożenia.
			enabled: isFeatureEnabled(FLAGA_USUWANIA_KONTA),
			beforeDelete: beforeDeleteAccount,
			afterDelete: afterDeleteAccount,
		},
	},
	// FALA 2 (C, zamówienie Sophii R-6 pkt 1) — AKCEPTACJA REGULAMINU PILOTAŻU.
	//
	// Bramka stoi TUTAJ, po stronie serwera, a nie tylko na atrybucie `required`
	// w formularzu: atrybut w przeglądarce zdejmuje się narzędziami dewelopera
	// w dwie sekundy, a rejestracja idzie prosto do trasy biblioteki — więc
	// walidacja wyłącznie w kliencie nie broni przed niczym i nie jest dowodem
	// świadomej czynności. Ten sam argument, co przy sprzężeniu flag: sprawdzenie
	// wykonane nie po tej stronie, po której zapada skutek, nie chroni przed niczym.
	//
	// FAIL-CLOSED, ale WYŁĄCZNIE przy zapalonej fladze: zgaszona flaga = rejestracja
	// jak dziś (pole się nie renderuje, więc egzekwowanie go byłoby zablokowaniem
	// rejestracji dla wszystkich). Odczyt flagi jest PER ŻĄDANIE — zmienna
	// środowiskowa przestawia się bez wdrożenia.
	//
	// Odczyt wersji z dokumentu może rzucić wyjątkiem (dokument bez oznaczenia
	// wersji). To celowe: brak pewności, na co ktoś się zgadza, ma zatrzymać
	// rejestrację, a nie przepuścić ją z wersją „nie wiem".
	// KONTROLA DOSTĘPU — pierwsze wejście kontem Google.
	//
	// Zaczep na ciele żądania (niżej) nie widzi adresu przy logowaniu społecznym:
	// Google podaje go dopiero w wywołaniu zwrotnym. Tworzenie użytkownika jest
	// natomiast wspólnym wąskim gardłem dla KAŻDEJ drogi rejestracji, więc tu
	// odcinamy nowe konta spoza listy. Reguła mieszka w `lista-dostepu.ts` —
	// tu jest tylko jej wywołanie.
	databaseHooks: {
		user: {
			create: {
				before: async (user) => {
					if (czyAdresDozwolony(user.email)) return;
					throw new APIError("FORBIDDEN", { message: KOMUNIKAT_ODMOWY });
				},
			},
		},
	},
	hooks: {
		before: createAuthMiddleware(async (ctx) => {
			// KONTROLA DOSTĘPU przed czymkolwiek innym: rejestracja i logowanie
			// mailem. Sprawdzenie stoi PO STRONIE SERWERA, na trasie biblioteki —
			// ten sam argument, co przy akceptacji regulaminu niżej.
			if ((SCIEZKI_Z_ADRESEM_W_CIELE as readonly string[]).includes(ctx.path)) {
				const adres = (ctx.body as { email?: unknown } | undefined)?.email;
				if (!czyAdresDozwolony(typeof adres === "string" ? adres : null)) {
					throw new APIError("FORBIDDEN", { message: KOMUNIKAT_ODMOWY });
				}
			}

			if (ctx.path !== SCIEZKA_REJESTRACJI) return;
			if (!isFeatureEnabled("pilotTerms")) return;

			const wynik = sprawdzAkceptacjeRegulaminu(
				ctx.body as AkceptacjaRegulaminu | undefined,
				wersjaRegulaminuPilotazu(),
			);
			if (!wynik.ok) {
				throw new APIError("BAD_REQUEST", { message: wynik.powod });
			}
		}),
	},
	plugins: [nextCookies()],
});
