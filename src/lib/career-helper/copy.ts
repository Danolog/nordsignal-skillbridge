/**
 * B0 — microcopy statyczne (spec §7). Wszystkie stringi w kodzie aplikacji,
 * NIE generowane przez LLM. Brand voice CLAUDE.md §3.
 *
 * UWAGA HITL: disclaimer „To NIE są rekomendacje" jest dodatkowo zhardkodowany
 * wprost w komponencie DisclaimerBanner (audytowalność — jedno miejsce prawdy
 * w kodzie). Tu trzymamy go również dla testu E2E i spójności, ale komponent
 * nie przyjmuje go propsem (spec §6.5 — brak propsów).
 */

export const COPY = {
	// Ekran 1 — ankieta (spec §7.1)
	survey: {
		title: "Pomocnik Wyboru Kariery — krok 1 z 3: ankieta",
		lead: "4 pytania, zajmie Ci to ok. 3 minuty. Twoje odpowiedzi pomogą mi (AI) zadawać Ci lepsze pytania w rozmowie.",
		counter: (n: number) => `${n} z 4 pytań wypełnionych`,
		ctaDefault: "Idź dalej",
		ctaLoading: "Zapisuję…",
		ctaBack: "Wróć",
		saveError: "Nie udało się zapisać. Twoje odpowiedzi są bezpieczne — spróbuj ponownie.",
		multiHint: (n: number, max: number) => `Zaznacz max ${max} odpowiedzi — wybrane: ${n}/${max}`,
		textareaCounter: (left: number, min: number) => `Zostało ${left} znaków · min. ${min}`,
		textareaError: (min: number) => `Min. ${min} znaków`,
		questionLabel: (n: number, total: number) => `Pytanie ${n} z ${total}`,
	},
	// Ekran 2 — rozmowa (spec §7.2)
	chat: {
		title: "Pomocnik Wyboru Kariery — krok 2 z 3: rozmowa",
		subtitle:
			"Pomocnik naprowadza pytaniami. Ty decydujesz, co dla Ciebie ważne. AI nie wybiera za Ciebie zawodu.",
		turnCounter: (n: number, max: number) => `Tura ${n} z ${max}`,
		aiLabel: "Pomocnik",
		inputPlaceholderDefault: "Napisz, co myślisz…",
		inputPlaceholderDisabled: "Pomocnik pisze odpowiedź…",
		inputHint: "Naciśnij Enter, aby wysłać · Shift+Enter, aby zrobić nowy wiersz",
		inputLimitPlaceholder: "Limit tur osiągnięty — kliknij „Pokaż podsumowanie”",
		sendLabel: "Wyślij wiadomość",
		streamError: {
			title: "Coś poszło nie tak",
			desc: "Spróbuję jeszcze raz.",
			action: "Ponów",
		},
		turnLimit: {
			aiMessage: "Mam już dobry obraz tego, kim jesteś. Przejdźmy do podsumowania.",
			cta: "Pokaż podsumowanie",
		},
		summaryPending: {
			title: "Przygotowuję podsumowanie naszej rozmowy",
			desc: "To chwila — czytam, co powiedziałeś, i układam podsumowanie własnymi słowami. Potem pokażę 1–3 obszary zawodowe, które rezonują z Twoimi preferencjami.\n\nJedna rzecz, którą warto wiedzieć: to NIE są rekomendacje. Decyzja należy do Ciebie po rozmowie z opiekunem.",
		},
		// Komunikat kryzysowy — STATYCZNY, zatwierdzony przez uczelnię, NIE z LLM (spec §7.2).
		// {crisis_support_message} jest per-tenant (Phase 1); w Becie placeholder neutralny.
		crisis: {
			title: "Daj sobie chwilę. Tu nie chodzi o testy ani wyniki.",
			desc: (crisisSupportMessage: string) =>
				`Twoje samopoczucie jest ważniejsze niż każda rozmowa o karierze. Jeśli to dla Ciebie trudny moment, skontaktuj się z osobą, która Cię wesprze:\n\nWsparcie psychologiczne uczelni: ${crisisSupportMessage}\nLub zadzwoń pod 116 123 (Telefon Zaufania dla dorosłych w kryzysie).`,
			buttonGhost: "Wrócę później",
			buttonPrimary: "Kontakt do wsparcia",
			footnote:
				"Ten komunikat jest stały, zatwierdzony przez uczelnię — Pomocnik (AI) nie generuje go i nie ocenia Twojej sytuacji.",
		},
		// Domyślny komunikat per-tenant (Beta v0.1) — neutralny (spec §8.1 rekomendacja Mili).
		defaultCrisisSupportMessage:
			"Skontaktuj się z pomocą psychologiczną swojej uczelni (info na stronie uczelni).",
		interrupted: {
			title: "Pomocnik czeka na Ciebie",
			desc: "Poprzednio rozmawialiście — Pomocnik zapamiętał, gdzie skończyliście. Możesz kontynuować od miejsca, w którym zatrzymał się, albo zacząć rozmowę od nowa.",
			buttonGhost: "Zacznij od nowa",
			buttonPrimary: "Kontynuuj rozmowę",
			restartError: "Nie udało się zacząć od nowa. Spróbuj ponownie.",
		},
	},
	// Ekran 3 — podsumowanie (spec §7.3)
	summary: {
		pageLabel: "Pomocnik Wyboru Kariery — krok 3 z 3: podsumowanie",
		// Disclaimer — JEDYNE miejsce prawdy jest w DisclaimerBanner (zhardkodowane);
		// tu dla spójności i testu. Komponent nie przyjmuje propsa.
		disclaimerTitle: "To NIE są rekomendacje",
		disclaimerDesc:
			"Finalna decyzja jest Twoja po rozmowie z opiekunem. Możesz wracać i zmieniać ścieżkę — to nie jest test, który zdajesz raz na zawsze.",
		summaryHeading: "Co rozumiem z naszej rozmowy",
		pathsLabel: "Obszary zawodowe, które rezonują z tym, co usłyszałem",
		whyLabel: "Dlaczego ten obszar rezonuje z Tobą",
		cardCtaDefault: "Wybieram tę ścieżkę",
		cardCtaSelected: "Wybrana ścieżka",
		changeHint: "Możesz zmienić wybór klikając inną kartę",
		footerGhost: "Nic z tego — wracam do rozmowy",
		footerPrimary: "Idź dalej do samooceny",
		restarting: {
			title: "Zacznij rozmowę od początku?",
			desc: "Twoja obecna rozmowa zostanie zapisana, ale nie wrócisz do niej. Pomocnik zacznie z czystej kartki — wykorzysta ankietę, ale nie wcześniejsze odpowiedzi.",
			buttonGhost: "Anuluj",
			buttonPrimary: "Tak, zacznij od nowa",
		},
		judgeFailed: {
			title: "Przygotuję to za chwilę",
			desc: "Czy chcesz teraz zobaczyć same obszary, które rezonują? Twoja rozmowa zostanie sprawdzona przez opiekuna.",
		},
		error: {
			title: "Coś poszło nie tak z podsumowaniem",
			desc: "Spróbuję jeszcze raz — Twoja rozmowa jest zapisana, nic nie zginęło.",
			button: "Spróbuj ponownie",
		},
	},
} as const;
