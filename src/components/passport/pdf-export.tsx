"use client";

import { Download, Loader2 } from "lucide-react";
import { type RefObject, useState } from "react";

export function PdfExportButton({
	passportRef,
}: {
	passportRef: RefObject<HTMLDivElement | null>;
}) {
	const [generating, setGenerating] = useState(false);

	const handleExport = async () => {
		if (!passportRef.current) return;
		setGenerating(true);
		try {
			const html2canvas = (await import("html2canvas")).default;
			const jsPDF = (await import("jspdf")).default;

			const canvas = await html2canvas(passportRef.current, {
				scale: 2,
				useCORS: true,
				backgroundColor: "#ffffff",
			});
			const imgData = canvas.toDataURL("image/png");
			const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
			const pdfWidth = pdf.internal.pageSize.getWidth();
			const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
			pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
			pdf.save("paszport-kompetencji.pdf");
		} finally {
			setGenerating(false);
		}
	};

	return (
		<button
			type="button"
			onClick={handleExport}
			disabled={generating}
			style={{
				display: "inline-flex",
				alignItems: "center",
				gap: "7px",
				padding: "9px 16px",
				borderRadius: "7px",
				border: "none",
				background: "var(--ed-ink)",
				color: "var(--ed-cream)",
				fontFamily: "inherit",
				fontSize: "13px",
				fontWeight: 600,
				cursor: generating ? "default" : "pointer",
				opacity: generating ? 0.7 : 1,
				whiteSpace: "nowrap",
			}}
		>
			{generating ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
			{generating ? "Generowanie..." : "Eksportuj PDF"}
		</button>
	);
}
