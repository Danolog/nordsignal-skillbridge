// MIS.7 — kontrakt etykiet statusu zgłoszenia dla studenta:
// żaden surowy status EN nie wychodzi do UI dla znanych stanów,
// a "rejected" mówi „jeszcze nie" + następny krok (ADR-014 R17, D6 pkt 8).
import { describe, expect, it } from "vitest";
import { SUBMISSION_STATUS_LABELS, submissionStatusLabel } from "../submission-status";

describe("submissionStatusLabel (MIS.7)", () => {
	it("mapuje wszystkie końcowe statusy zgłoszenia na polskie etykiety", () => {
		for (const status of ["submitted", "verified", "rejected"]) {
			const label = SUBMISSION_STATUS_LABELS[status];
			expect(label, `brak etykiety dla "${status}"`).toBeTruthy();
			expect(label).not.toBe(status);
		}
	});

	it("rejected niesie ton „jeszcze nie” i następny krok, nie wyrok", () => {
		const label = submissionStatusLabel("rejected");
		expect(label).toMatch(/jeszcze nie/i);
		expect(label).toMatch(/wyślij ponownie/i);
		expect(label).not.toMatch(/odrzucon/i);
	});

	it("nieznany status wraca surowy (nic nie ukrywamy)", () => {
		expect(submissionStatusLabel("in_progress")).toBe("in_progress");
	});
});
