"use client";

import { Eye, Globe, Link as LinkIcon } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { PASSPORT_SHARE_CONSENT_VERSION } from "@/lib/consent";
import type { ProjectReceipt } from "@/lib/passport-utils";
import { PassportDocument, type PassportMentor } from "./passport-document";
import { PdfExportButton } from "./pdf-export";

export interface PassportData {
	id: string;
	student: {
		name: string;
		university: string;
		fieldOfStudy: string;
		semester: number;
		careerGoal: string;
	};
	marketCoveragePercent: number;
	competencies: Array<{
		name: string;
		status: "acquired" | "in_progress" | "missing";
		marketPercentage?: number | null;
	}>;
	gapCount: number;
	generatedAt: string;
	projectReceipts?: ProjectReceipt[];
	// B1: udostępnianie publiczne = opt-in studenta. Ustawiane tylko w widoku
	// właściciela (dashboard); widok publiczny ich nie potrzebuje.
	shareToken?: string | null;
	publicEnabled?: boolean;
}

export function PassportView({
	data,
	mentor = null,
}: {
	data: PassportData;
	mentor?: PassportMentor | null;
}) {
	const passportRef = useRef<HTMLDivElement>(null);

	// B1: udostępnianie po świadomym kliknięciu. Token i status z serwera.
	const [shareToken, setShareToken] = useState<string | null>(data.shareToken ?? null);
	const [publicEnabled, setPublicEnabled] = useState<boolean>(data.publicEnabled ?? false);
	// A1/RODO: pierwsze udostępnienie wymaga ekranu zgody poinformowanej.
	const [consentOpen, setConsentOpen] = useState(false);

	const copyTokenLink = async (token: string) => {
		await navigator.clipboard.writeText(`${window.location.origin}/passport/${token}`);
	};

	const handleShareClick = async () => {
		// Już publiczny → tylko kopiuj istniejący link, bez ponownej zgody.
		if (publicEnabled && shareToken) {
			try {
				await copyTokenLink(shareToken);
				toast.success("Link skopiowany!");
			} catch {
				toast.error("Nie udało się skopiować linku");
			}
			return;
		}
		// A1: zanim cokolwiek stanie się publiczne, pokaż ekran zgody.
		setConsentOpen(true);
	};

	// A1: wywoływane dopiero po świadomej akceptacji w oknie zgody.
	const confirmShare = async () => {
		try {
			// A1: wysyłamy wersję zgody, którą student właśnie zobaczył w dialogu.
			const res = await fetch("/api/passport/share", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ consentVersion: PASSPORT_SHARE_CONSENT_VERSION }),
			});
			if (!res.ok) throw new Error("share failed");
			const { shareToken: token } = (await res.json()) as { shareToken: string };
			setShareToken(token);
			setPublicEnabled(true);
			setConsentOpen(false);
			await copyTokenLink(token);
			toast.success("Paszport jest teraz publiczny — link skopiowany");
		} catch {
			toast.error("Nie udało się udostępnić paszportu");
		}
	};

	const disableSharing = async () => {
		try {
			const res = await fetch("/api/passport/share", { method: "DELETE" });
			if (!res.ok) throw new Error("disable failed");
			// §8 #5: backend rotuje shareToken (NULL). Lokalny stan czyścimy,
			// żeby UI nie pokazał starego linku po re-enable — POST wygeneruje
			// nowy token i ustawimy go w `confirmShare`.
			setPublicEnabled(false);
			setShareToken(null);
			toast.success("Udostępnianie wyłączone — link unieważniony na stałe");
		} catch {
			toast.error("Nie udało się wyłączyć udostępniania");
		}
	};

	const hasReceipts = (data.projectReceipts?.length ?? 0) > 0;

	return (
		<>
			{/* A1/RODO: ekran zgody poinformowanej przed pierwszym udostępnieniem */}
			<Dialog open={consentOpen} onOpenChange={setConsentOpen}>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Globe size={18} />
							Twój paszport stanie się publiczny
						</DialogTitle>
						<DialogDescription>
							Po włączeniu wygenerujemy publiczny link do Twojego paszportu.
						</DialogDescription>
					</DialogHeader>

					<div className="text-sm">
						<p className="mb-2 font-medium">Publicznie widoczne będą:</p>
						<ul className="list-disc space-y-1 pl-5 text-muted-foreground">
							<li>Imię i nazwisko</li>
							<li>Uczelnia, kierunek i semestr</li>
							<li>Twój cel zawodowy</li>
							<li>Lista Twoich kompetencji — tych opanowanych i tych w trakcie nauki</li>
							{hasReceipts && (
								<li>Zweryfikowane projekty: ocena, linki do kodu i opinia sprawdzającego</li>
							)}
						</ul>
					</div>

					{/* A1/UX: konsekwencja udostępnienia wyróżniona jako callout, nie zwykły tekst */}
					<div className="flex gap-2.5 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
						<Eye size={18} className="mt-0.5 shrink-0" />
						<p>
							Każdy, kto pozna ten link, zobaczy te dane —{" "}
							<strong>bez logowania i bez Twojej wiedzy</strong>. Link możesz w każdej chwili
							wyłączyć; <strong>wyłączenie unieważnia link na stałe</strong> — ponowne udostępnienie
							wygeneruje nowy adres.
						</p>
					</div>

					<DialogFooter>
						<button
							type="button"
							className="pp-btn pp-btn-secondary"
							onClick={() => setConsentOpen(false)}
						>
							Anuluj
						</button>
						<button type="button" className="pp-btn pp-btn-primary" onClick={confirmShare}>
							Rozumiem, udostępnij publicznie
						</button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<PassportDocument
				data={data}
				variant="owner"
				mentor={mentor}
				documentRef={passportRef}
				actions={
					<>
						<button type="button" className="pp-btn pp-btn-secondary" onClick={handleShareClick}>
							<LinkIcon size={16} />
							{publicEnabled ? "Kopiuj link" : "Udostępnij publicznie"}
						</button>
						{publicEnabled && (
							<button type="button" className="pp-btn pp-btn-secondary" onClick={disableSharing}>
								Wyłącz udostępnianie
							</button>
						)}
						<PdfExportButton passportRef={passportRef} />
					</>
				}
			/>
		</>
	);
}
