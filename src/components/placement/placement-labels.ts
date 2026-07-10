/**
 * 1.17 — wspólne etykiety PL dla UI placementu (karta zgody w Wnioskach +
 * sekcja profilu). Jedno źródło — kopie w dwóch komponentach by dryfowały.
 */

export const EMPLOYMENT_STATUS_LABEL: Record<string, string> = {
	studying: "Studiuję, nie pracuję w branży",
	working_in_field: "Pracuję w branży zgodnej ze ścieżką",
	working_outside: "Pracuję poza branżą",
	seeking: "Szukam pracy / stażu",
};

export const EVENT_KIND_LABEL: Record<string, string> = {
	baseline: "Status na start",
	internship: "Staż / praktyki",
	job: "Praca",
	job_change: "Zmiana pracy",
	job_lost: "Koniec pracy / stażu",
};

export const PLACEMENT_CONSENT_COPY =
	"Zgadzam się, by SkillBridge przetwarzał deklarowane przeze mnie informacje o moim " +
	"statusie zawodowym (np. staż, praca) w celu mierzenia skuteczności platformy. " +
	"Zgoda jest dobrowolna i odwoływalna w profilu — wycofanie usuwa zebrane dane.";
