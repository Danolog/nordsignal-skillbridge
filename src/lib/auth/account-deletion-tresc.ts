// ============================================================================
// E1b — TREŚĆ ŚCIEŻKI USUNIĘCIA KONTA: JEDEN NOŚNIK.
//
// Autorką treści jest Sophia (PO) — `scratchpad/nosnik-podpisu-i-zasada-
// pracodawcy-sophia.md` §3. Ten plik jej NIE WYMYŚLA i nie parafrazuje: przenosi
// ją co do zdania. Ekran (`/profil`, okno potwierdzenia, ekran po usunięciu)
// należy do warstwy interfejsu — ma ten nośnik WOŁAĆ, nigdy przepisywać.
//
// Dlaczego to jest reguła, a nie zbiór napisów (CLAUDE.md v1.17): treść okna
// jest WARUNKIEM rozstrzygnięcia D-U3 („usunięcie natychmiastowe, bez
// karencji”), nie jego ozdobą. Ethan zapisał to wprost: „bez tego
// natychmiastowość jest pułapką, a nie decyzją użytkownika”. Zdanie skrócone
// przy przepisywaniu do komponentu przewraca decyzję, której nikt nie
// podejmował ponownie — i nikt tego nie zauważy, bo interfejs będzie działał.
//
// Trzy rzeczy, których w tej treści NIE MA i mieć nie może (Sophia §3.5):
//   • „usunęliśmy wszystko, wszędzie” — nieprawda w chwili wypowiadania (kopie),
//   • „możesz odzyskać konto w ciągu 30 dni” — karencji nie ma (D-U3),
//   • perswazja zatrzymująca użytkownika — art. 17 nie jest miejscem na
//     retencję klienta.
// ============================================================================

/**
 * Fraza potwierdzająca wpisywana ręcznie w oknie.
 *
 * BEZ POLSKICH ZNAKÓW DIAKRYTYCZNYCH — decyzja produktowa Sophii, nie
 * kosmetyka: „USUŃ KONTO” wymaga `Ń`, co na telefonie i na klawiaturze
 * nie-polskiej zamienia środek przeciw pomyłce w BARIERĘ WYKONANIA PRAWA.
 */
export const FRAZA_POTWIERDZENIA = "USUWAM KONTO";

/**
 * Reguła dopasowania frazy — jedyny nośnik.
 *
 * „Ignoruje wielkość liter i spacje na brzegach; NIE IGNORUJE NICZEGO WIĘCEJ”
 * (Sophia §3.2). Reguła ma konsekwencję zewnętrzną w obie strony: zbyt ostra
 * blokuje wykonanie prawa, zbyt luźna przepuszcza pomyłkę. Dlatego mieszka
 * tutaj, a nie w warunku `if` wewnątrz komponentu — strażnik
 * `account-deletion-tresc.test.ts` pilnuje obu kierunków.
 */
export function czyFrazaPotwierdzenia(wpisane: string): boolean {
	return wpisane.trim().toUpperCase() === FRAZA_POTWIERDZENIA;
}

/** Sekcja na stronie `/profil` (Sophia §3.1). */
export const SEKCJA_PROFIL = {
	naglowek: "Usunięcie konta",
	akapity: [
		"Usuniemy Twoje konto i wszystko, co na nim zbudowałeś. Tej decyzji nie da się cofnąć — nie mamy kopii do przywrócenia i nie odtworzymy konta na prośbę.",
		"Zanim usuniesz: pobierz swój paszport (Paszport → Eksportuj PDF). Po usunięciu nie będzie skąd go pobrać.",
	],
	przycisk: "Usuń konto",
} as const;

/** Okno potwierdzenia (Sophia §3.2). */
export const OKNO_POTWIERDZENIA = {
	tytul: "Usuń konto — na stałe",
	zdanieWiodace:
		"Usunięcie jest natychmiastowe. Nie ma okresu na rozmyślenie się i nie da się go odwrócić.",

	/**
	 * Blok 1 — „Co zniknie”. Lista jest REKOMPENSATĄ za brak karencji (D-U3),
	 * więc skracanie jej jest zmianą decyzji, nie zmianą tekstu.
	 */
	coZnikniNaglowek: "Co zniknie",
	coZnikni: [
		"Paszport Kompetencji i publiczny link do niego — link przestanie działać dla każdego, kto go ma",
		"Zgłoszenia projektów, ich oceny i potwierdzone kompetencje",
		"Postęp w ścieżce nauki: rozwiązane zadania, sprawdziany, powtórki",
		"Mapa umiejętności, analiza luk i cel kariery",
		"Historia rozmów z Pomocnikiem kariery i z korepetytorem",
		"Zapis obron ustnych",
		"Samo konto i sposób logowania (hasło albo Google)",
	],

	/**
	 * Blok 2 — „Czego usunięcie nie cofnie”. BLOKU NIE WOLNO POMINĄĆ: powstał
	 * z obalenia przesłanki Ethana („student, który usuwa konto, wycofuje
	 * kredencjał z obiegu” — nieprawda, paszport ma eksport do PDF wykonywany
	 * w przeglądarce studenta i plik zostaje u odbiorcy).
	 */
	czegoNieCofnieNaglowek: "Czego usunięcie nie cofnie",
	czegoNieCofnie: [
		"Plików, które ktoś już ma. Jeśli pobrałeś paszport jako PDF albo wysłałeś komuś link, ten plik — i każdy jego zrzut ekranu — zostaje u odbiorcy. Nie mamy do niego dostępu i nie możemy go wycofać. Zniknie tylko link: od tej chwili nie prowadzi do niczego.",
		"Kopii zapasowych. Z działającego systemu usuwamy Twoje dane natychmiast. Kopie zapasowe bazy wygasają w ciągu do 30 dni; służą wyłącznie odtworzeniu po awarii. Gdybyśmy musieli odtworzyć bazę z takiej kopii, usunięcie powtarzamy.",
		"Zapisu samego faktu. Zostaje jedna beznamiętna linia w naszym dzienniku rozliczalności: że konto o danym identyfikatorze zostało usunięte i kiedy. Nie ma w niej Twojego imienia, adresu ani żadnej Twojej treści.",
	],

	/** Blok 3 — zasada odpowiedzi dla pracodawcy (Sophia §2.2). */
	zasadaWobecPracodawcy:
		"Po usunięciu nikomu — także pracodawcy, który ma Twój PDF — nie potwierdzimy ani nie zaprzeczymy, że miałeś u nas konto.",

	/** Blok 4 — potwierdzenie. */
	prosbaOFraze: `Wpisz ${FRAZA_POTWIERDZENIA}, żeby potwierdzić.`,
	podpowiedzWPolu: FRAZA_POTWIERDZENIA,

	etykietaHasla: "Podaj hasło, żeby potwierdzić, że to Ty",
	komunikatBezHasla:
		"Zaloguj się jeszcze raz, żeby potwierdzić, że to Ty. Wrócisz tutaj i dokończysz usuwanie.",

	przyciskPotwierdz: "Usuń konto na stałe",
	przyciskAnuluj: "Anuluj",
} as const;

/**
 * Mikrocopy odmów i awarii (Sophia §3.3).
 *
 * ⚠ WARUNEK WYKONANIA przy `awaria`, postawiony przez Sophię i przyjęty przeze
 * mnie: zdania „konto zostało bez zmian” wolno użyć WYŁĄCZNIE wtedy, gdy
 * nieudane usunięcie faktycznie nie zostawia stanu połowicznego. Dziś warunek
 * jest spełniony i jest to twierdzenie SPRAWDZALNE, nie założone: bramka flagi
 * rzuca PRZED `internalAdapter.deleteUser`, a samo kasowanie idzie kaskadą
 * bazy z jednego `DELETE` na wierszu `user` — nie ma etapu pośredniego, po
 * którym konto istnieje „w połowie”. Strażnikiem jest przypadek „flaga
 * zgaszona ⇒ 404 ⇒ konto i wszystkie jego dane bez zmian”
 * (`rodo-e1b-usuniecie-konta-petla.integration.test.ts`).
 * PRÓG PRZEGLĄDU: pierwszy krok usuwania wykonywany POZA tą jedną transakcją
 * bazy (np. kasowanie pliku w magazynie zewnętrznym) — wtedy zdanie przestaje
 * być prawdziwe i musi zniknąć razem z tym progiem.
 */
export const MIKROCOPY = {
	zlaFraza: `Wpisz dokładnie ${FRAZA_POTWIERDZENIA}.`,
	zleHaslo: "Hasło się nie zgadza.",
	sesjaNieswieza: "Ze względów bezpieczeństwa zaloguj się ponownie, zanim usuniesz konto.",
	awaria:
		"Nie udało się usunąć konta — konto zostało bez zmian. Spróbuj za chwilę. Jeśli problem wróci, napisz na kontakt@nordsignal.cc.",
} as const;

/** Ekran po usunięciu — użytkownik jest już wylogowany (Sophia §3.4). */
export const EKRAN_PO_USUNIECIU = {
	naglowek: "Konto usunięte",
	akapity: [
		"Twoje dane zniknęły z SkillBridge. Kopie zapasowe bazy wygasają w ciągu do 30 dni.",
		"Pliki, które ktoś już od Ciebie dostał, zostają u niego — tego nie cofniemy. Udostępniony link do paszportu już nie działa.",
		"Możesz kiedyś założyć nowe konto na ten sam adres, ale nic z poprzedniego nie wróci.",
	],
	przycisk: "Strona główna",
} as const;
