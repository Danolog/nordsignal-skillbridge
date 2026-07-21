// MIS.7 — polskie etykiety statusu zgłoszenia widziane przez STUDENTA.
// Ton growth-mindset (ADR-014 R17, D6 pkt 8): „jeszcze nie" + konkretny
// następny krok zamiast surowego "rejected"; bez mitów i bez zawstydzania.
// Surowy status zostaje w klasach CSS (proj-status-*) — to kontrakt stylów.

export const SUBMISSION_STATUS_LABELS: Record<string, string> = {
	submitted: "Wysłane — czeka na weryfikację",
	verified: "Zweryfikowane — receipt przyznany",
	rejected: "Jeszcze nie zaliczone — sprawdź feedback, popraw i wyślij ponownie",
};

/** Etykieta PL dla studenta; nieznany status wraca surowy (nic nie ukrywamy). */
export function submissionStatusLabel(status: string): string {
	return SUBMISSION_STATUS_LABELS[status] ?? status;
}
