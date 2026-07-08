import Link from "next/link";
import type { CSSProperties, ReactNode, RefObject } from "react";
import { shortenRepoUrl } from "@/lib/passport-format";
import type { PassportData } from "./passport-view";

// Wspólny komponent dokumentu Paszportu Kompetencji (#2).
// Jedno źródło markupu dla trzech miejsc: widok właściciela (passport-view),
// widok publiczny (passport-public) i eksport PDF (html2canvas obejmuje doc-shell).
// Wygląd 1:1 ze wzorca Claude Design (układ oficjalnego dokumentu): inline-style
// + lokalne zmienne CSS zmapowane na tokeny editorial (--ed-*).

export interface PassportMentor {
	name: string;
	role: string;
	org: string;
}

interface PassportDocumentProps {
	data: PassportData;
	variant: "owner" | "public";
	// Schema nie ma pola mentora → domyślnie brak (renderujemy wariant „bez mentora").
	mentor?: PassportMentor | null;
	// Widok właściciela wstrzykuje tu pasek akcji (Udostępnij / Pobierz PDF).
	actions?: ReactNode;
	// Ref obejmujący sekcję dokumentu (z podpisami) dla eksportu PDF.
	documentRef?: RefObject<HTMLDivElement | null>;
}

// Lokalne zmienne wzorca → tokeny editorial. `--ok` (zieleń sukcesu) nie ma
// odpowiednika w palecie editorial, więc bierzemy wartość ze wzorca.
const tokenVars: CSSProperties = {
	"--cream": "var(--ed-cream)",
	"--card": "var(--ed-card)",
	"--ink": "var(--ed-ink)",
	"--muted": "var(--ed-muted)",
	"--amber": "var(--ed-amber)",
	"--amber-text": "var(--ed-amber-text)",
	"--border": "var(--ed-border)",
	"--badge-bg": "var(--ed-badge-bg)",
	"--danger": "var(--ed-danger)",
	"--warn": "var(--ed-warn)",
	"--ok": "#16A34A",
	fontFamily: "var(--font-dm-sans), sans-serif",
} as CSSProperties;

const serif: CSSProperties = { fontFamily: "var(--font-playfair), serif" };

function fmtDateLong(iso: string): string {
	return new Date(iso).toLocaleDateString("pl-PL", {
		day: "numeric",
		month: "long",
		year: "numeric",
	});
}

function CompetencyRow({
	comp,
	tone,
}: {
	comp: PassportData["competencies"][number];
	tone: "acquired" | "learning";
}) {
	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				padding: "11px 0",
				borderBottom: "1px solid var(--border)",
				gap: "12px",
			}}
		>
			<div style={{ display: "flex", alignItems: "center", gap: "9px", minWidth: 0 }}>
				{tone === "acquired" ? (
					<svg
						width="15"
						height="15"
						viewBox="0 0 24 24"
						style={{ flexShrink: 0 }}
						aria-hidden="true"
					>
						<circle cx="12" cy="12" r="11" fill="none" stroke="var(--ok)" strokeWidth="1.6" />
						<path
							d="M7 12.5l3 3 7-7.5"
							fill="none"
							stroke="var(--ok)"
							strokeWidth="1.8"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
				) : (
					<svg
						width="15"
						height="15"
						viewBox="0 0 24 24"
						style={{ flexShrink: 0 }}
						aria-hidden="true"
					>
						<circle
							cx="12"
							cy="12"
							r="11"
							fill="none"
							stroke="var(--amber-text)"
							strokeWidth="1.6"
						/>
						<path
							d="M12 7v5l3.5 2"
							fill="none"
							stroke="var(--amber-text)"
							strokeWidth="1.8"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
				)}
				<span style={{ fontSize: "14.5px", color: "var(--ink)", fontWeight: 500 }}>
					{comp.name}
				</span>
			</div>
			{comp.marketPercentage != null && (
				<div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
					<span style={{ fontSize: "11.5px", color: "var(--muted)", whiteSpace: "nowrap" }}>
						popyt {comp.marketPercentage}%
					</span>
					<div
						style={{
							width: "60px",
							height: "4px",
							background: "var(--border)",
							borderRadius: "2px",
							overflow: "hidden",
						}}
					>
						<div
							style={{
								height: "100%",
								width: `${comp.marketPercentage}%`,
								background: "var(--amber)",
								borderRadius: "2px",
							}}
						/>
					</div>
				</div>
			)}
		</div>
	);
}

export function PassportDocument({
	data,
	variant,
	mentor = null,
	actions,
	documentRef,
}: PassportDocumentProps) {
	const isPublic = variant === "public";

	const acquired = data.competencies.filter((c) => c.status === "acquired");
	const learning = data.competencies.filter((c) => c.status === "in_progress");
	const masteredCount = acquired.length;
	const learningCount = learning.length;
	const missingCount = data.gapCount;
	const total = masteredCount + learningCount + missingCount;
	const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

	const coverage = data.marketCoveragePercent;
	const docNumber = `SB-2026-${data.id.slice(0, 8).toUpperCase()}`;
	const issueDate = fmtDateLong(data.generatedAt);

	const projects = data.projectReceipts ?? [];

	return (
		<div
			data-screen-label="Paszport Kompetencji"
			className="pp2-page-wrap"
			style={{
				...tokenVars,
				background: "var(--cream)",
				minHeight: "100vh",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				padding: "32px 16px 56px",
				boxSizing: "border-box",
			}}
		>
			{/* PASEK AKCJI — tylko widok właściciela, poza wydrukiem */}
			{!isPublic && actions && (
				<div
					data-no-print
					style={{
						width: "min(210mm, 100%)",
						boxSizing: "border-box",
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						gap: "16px",
						padding: "14px 20px",
						marginBottom: "18px",
						background: "var(--card)",
						border: "1px solid var(--border)",
						borderRadius: "10px",
						boxShadow: "0 1px 3px rgba(27,25,23,0.06)",
					}}
				>
					<div style={{ fontSize: "12.5px", color: "var(--muted)", fontWeight: 500 }}>
						Podgląd dokumentu — widok zalogowany
					</div>
					<div style={{ display: "flex", gap: "10px" }}>{actions}</div>
				</div>
			)}

			{/* RAMKA DOKUMENTU */}
			<div
				ref={documentRef}
				data-doc-shell
				className="pp2-doc-shell"
				style={{
					...tokenVars,
					width: "min(210mm, 100%)",
					boxSizing: "border-box",
					border: "1.5px solid var(--amber)",
					padding: "6px",
					background: "var(--cream)",
					boxShadow: "0 10px 34px rgba(27,25,23,0.12)",
				}}
			>
				<div
					style={{
						border: "1px solid var(--border)",
						background: "var(--card)",
						padding: "16mm 15mm 14mm",
						boxSizing: "border-box",
						position: "relative",
						display: "grid",
					}}
				>
					{/* HERB — znak wodny */}
					<div
						style={{
							gridColumn: 1,
							gridRow: 1,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							pointerEvents: "none",
						}}
					>
						<svg
							width="640"
							height="640"
							viewBox="0 0 100 100"
							style={{ opacity: 0.05 }}
							aria-hidden="true"
						>
							<circle cx="50" cy="50" r="46" fill="none" stroke="#1B1917" strokeWidth="0.9" />
							<circle
								cx="50"
								cy="50"
								r="40.5"
								fill="none"
								stroke="#1B1917"
								strokeWidth="1.2"
								strokeDasharray="1 3"
							/>
							<path
								d="M32,85 Q19,70 18,50 Q18,42 22,35"
								fill="none"
								stroke="#1B1917"
								strokeWidth="0.9"
							/>
							<ellipse
								cx="30"
								cy="81"
								rx="3.6"
								ry="1.7"
								fill="#1B1917"
								transform="rotate(-75 30 81)"
							/>
							<ellipse
								cx="24"
								cy="73"
								rx="3.6"
								ry="1.7"
								fill="#1B1917"
								transform="rotate(-60 24 73)"
							/>
							<ellipse
								cx="20"
								cy="64"
								rx="3.5"
								ry="1.65"
								fill="#1B1917"
								transform="rotate(-42 20 64)"
							/>
							<ellipse
								cx="18"
								cy="55"
								rx="3.4"
								ry="1.6"
								fill="#1B1917"
								transform="rotate(-22 18 55)"
							/>
							<ellipse
								cx="18"
								cy="47"
								rx="3.3"
								ry="1.55"
								fill="#1B1917"
								transform="rotate(-6 18 47)"
							/>
							<ellipse
								cx="19.5"
								cy="39.5"
								rx="3.2"
								ry="1.5"
								fill="#1B1917"
								transform="rotate(10 19.5 39.5)"
							/>
							<ellipse
								cx="22"
								cy="34"
								rx="3"
								ry="1.4"
								fill="#1B1917"
								transform="rotate(24 22 34)"
							/>
							<path
								d="M68,85 Q81,70 82,50 Q82,42 78,35"
								fill="none"
								stroke="#1B1917"
								strokeWidth="0.9"
							/>
							<ellipse
								cx="70"
								cy="81"
								rx="3.6"
								ry="1.7"
								fill="#1B1917"
								transform="rotate(75 70 81)"
							/>
							<ellipse
								cx="76"
								cy="73"
								rx="3.6"
								ry="1.7"
								fill="#1B1917"
								transform="rotate(60 76 73)"
							/>
							<ellipse
								cx="80"
								cy="64"
								rx="3.5"
								ry="1.65"
								fill="#1B1917"
								transform="rotate(42 80 64)"
							/>
							<ellipse
								cx="82"
								cy="55"
								rx="3.4"
								ry="1.6"
								fill="#1B1917"
								transform="rotate(22 82 55)"
							/>
							<ellipse
								cx="82"
								cy="47"
								rx="3.3"
								ry="1.55"
								fill="#1B1917"
								transform="rotate(6 82 47)"
							/>
							<ellipse
								cx="80.5"
								cy="39.5"
								rx="3.2"
								ry="1.5"
								fill="#1B1917"
								transform="rotate(-10 80.5 39.5)"
							/>
							<ellipse
								cx="78"
								cy="34"
								rx="3"
								ry="1.4"
								fill="#1B1917"
								transform="rotate(-24 78 34)"
							/>
							<circle cx="50" cy="87" r="2.6" fill="#1B1917" />
							<path d="M47,88.5 L38,96 L45,93.5 Z" fill="#1B1917" />
							<path d="M53,88.5 L62,96 L55,93.5 Z" fill="#1B1917" />
							<path
								d="M23,21 L14,17.5 L14,32 L23,28.5 Q50,20 77,28.5 L86,32 L86,17.5 L77,21 Q50,11.5 23,21 Z"
								fill="#1B1917"
							/>
							<text
								x="50"
								y="24"
								textAnchor="middle"
								fontFamily="var(--font-dm-sans), sans-serif"
								fontWeight="700"
								fontSize="6"
								letterSpacing="1"
								fill="#FAF6F1"
							>
								SKILLBRIDGE
							</text>
							<path
								d="M36,34 L64,34 L64,52 Q64,64 50,71.5 Q36,64 36,52 Z"
								fill="none"
								stroke="#1B1917"
								strokeWidth="1.1"
							/>
							<text
								x="50"
								y="57"
								textAnchor="middle"
								fontFamily="var(--font-playfair), serif"
								fontWeight="700"
								fontSize="17"
								fill="#1B1917"
							>
								SB
							</text>
							<text
								x="50"
								y="79.5"
								textAnchor="middle"
								fontFamily="var(--font-dm-sans), sans-serif"
								fontWeight="600"
								fontSize="6"
								letterSpacing="1"
								fill="#1B1917"
							>
								2026
							</text>
						</svg>
					</div>

					<div style={{ gridColumn: 1, gridRow: 1, position: "relative" }}>
						{/* NAGŁÓWEK INSTYTUCJI */}
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "flex-start",
								gap: "20px",
								paddingBottom: "20px",
								borderBottom: "1px solid var(--border)",
								marginBottom: "26px",
							}}
						>
							<div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
								<svg
									width="66"
									height="66"
									viewBox="0 0 100 100"
									style={{ flexShrink: 0 }}
									aria-hidden="true"
								>
									<circle
										cx="50"
										cy="50"
										r="46"
										fill="none"
										stroke="var(--amber)"
										strokeWidth="1.1"
									/>
									<circle
										cx="50"
										cy="50"
										r="40.5"
										fill="none"
										stroke="var(--amber)"
										strokeWidth="1.5"
										strokeDasharray="1 3"
									/>
									<path
										d="M32,85 Q19,70 18,50 Q18,42 22,35"
										fill="none"
										stroke="var(--amber)"
										strokeWidth="1.1"
									/>
									<ellipse
										cx="30"
										cy="81"
										rx="3.6"
										ry="1.7"
										fill="var(--amber)"
										transform="rotate(-75 30 81)"
									/>
									<ellipse
										cx="24"
										cy="73"
										rx="3.6"
										ry="1.7"
										fill="var(--amber)"
										transform="rotate(-60 24 73)"
									/>
									<ellipse
										cx="20"
										cy="64"
										rx="3.5"
										ry="1.65"
										fill="var(--amber)"
										transform="rotate(-42 20 64)"
									/>
									<ellipse
										cx="18"
										cy="55"
										rx="3.4"
										ry="1.6"
										fill="var(--amber)"
										transform="rotate(-22 18 55)"
									/>
									<ellipse
										cx="18"
										cy="47"
										rx="3.3"
										ry="1.55"
										fill="var(--amber)"
										transform="rotate(-6 18 47)"
									/>
									<ellipse
										cx="19.5"
										cy="39.5"
										rx="3.2"
										ry="1.5"
										fill="var(--amber)"
										transform="rotate(10 19.5 39.5)"
									/>
									<ellipse
										cx="22"
										cy="34"
										rx="3"
										ry="1.4"
										fill="var(--amber)"
										transform="rotate(24 22 34)"
									/>
									<path
										d="M68,85 Q81,70 82,50 Q82,42 78,35"
										fill="none"
										stroke="var(--amber)"
										strokeWidth="1.1"
									/>
									<ellipse
										cx="70"
										cy="81"
										rx="3.6"
										ry="1.7"
										fill="var(--amber)"
										transform="rotate(75 70 81)"
									/>
									<ellipse
										cx="76"
										cy="73"
										rx="3.6"
										ry="1.7"
										fill="var(--amber)"
										transform="rotate(60 76 73)"
									/>
									<ellipse
										cx="80"
										cy="64"
										rx="3.5"
										ry="1.65"
										fill="var(--amber)"
										transform="rotate(42 80 64)"
									/>
									<ellipse
										cx="82"
										cy="55"
										rx="3.4"
										ry="1.6"
										fill="var(--amber)"
										transform="rotate(22 82 55)"
									/>
									<ellipse
										cx="82"
										cy="47"
										rx="3.3"
										ry="1.55"
										fill="var(--amber)"
										transform="rotate(6 82 47)"
									/>
									<ellipse
										cx="80.5"
										cy="39.5"
										rx="3.2"
										ry="1.5"
										fill="var(--amber)"
										transform="rotate(-10 80.5 39.5)"
									/>
									<ellipse
										cx="78"
										cy="34"
										rx="3"
										ry="1.4"
										fill="var(--amber)"
										transform="rotate(-24 78 34)"
									/>
									<circle cx="50" cy="87" r="2.6" fill="var(--amber)" />
									<path d="M47,88.5 L38,96 L45,93.5 Z" fill="var(--amber)" />
									<path d="M53,88.5 L62,96 L55,93.5 Z" fill="var(--amber)" />
									<path
										d="M23,21 L14,17.5 L14,32 L23,28.5 Q50,20 77,28.5 L86,32 L86,17.5 L77,21 Q50,11.5 23,21 Z"
										fill="var(--ink)"
									/>
									<text
										x="50"
										y="24"
										textAnchor="middle"
										fontFamily="var(--font-dm-sans), sans-serif"
										fontWeight="700"
										fontSize="6"
										letterSpacing="1"
										fill="var(--card)"
									>
										SKILLBRIDGE
									</text>
									<path
										d="M36,34 L64,34 L64,52 Q64,64 50,71.5 Q36,64 36,52 Z"
										fill="var(--badge-bg)"
										stroke="var(--amber)"
										strokeWidth="1.3"
									/>
									<text
										x="50"
										y="57"
										textAnchor="middle"
										fontFamily="var(--font-playfair), serif"
										fontWeight="700"
										fontSize="17"
										fill="var(--ink)"
									>
										SB
									</text>
									<text
										x="50"
										y="79.5"
										textAnchor="middle"
										fontFamily="var(--font-dm-sans), sans-serif"
										fontWeight="600"
										fontSize="6"
										letterSpacing="1"
										fill="var(--amber-text)"
									>
										2026
									</text>
								</svg>
								<div>
									<h1
										style={{
											...serif,
											fontWeight: 700,
											fontSize: "31px",
											color: "var(--ink)",
											margin: 0,
											lineHeight: 1.15,
										}}
									>
										Paszport Kompetencji
									</h1>
								</div>
							</div>
							<div
								style={{
									textAlign: "right",
									fontSize: "12.5px",
									color: "var(--muted)",
									lineHeight: 1.8,
									minWidth: "240px",
									flexShrink: 0,
								}}
							>
								<div style={{ whiteSpace: "nowrap" }}>
									Nr dokumentu:{" "}
									<span
										style={{
											fontFamily: "ui-monospace, Menlo, monospace",
											letterSpacing: "0.01em",
											color: "var(--ink)",
											fontWeight: 600,
										}}
									>
										{docNumber}
									</span>
								</div>
								<div style={{ whiteSpace: "nowrap" }}>
									Data wystawienia:{" "}
									<span style={{ color: "var(--ink)", fontWeight: 500 }}>{issueDate}</span>
								</div>
								{isPublic && (
									<div
										style={{
											display: "flex",
											justifyContent: "flex-end",
											alignItems: "center",
											gap: "8px",
											marginTop: "12px",
										}}
									>
										<svg
											width="34"
											height="34"
											viewBox="0 0 40 40"
											style={{ flexShrink: 0 }}
											aria-hidden="true"
										>
											<circle
												cx="20"
												cy="20"
												r="18"
												fill="var(--badge-bg)"
												stroke="var(--amber)"
												strokeWidth="2"
											/>
											<path
												d="M12.5 20.5l4.5 4.5 10.5-11"
												stroke="var(--amber-text)"
												strokeWidth="2.4"
												strokeLinecap="round"
												strokeLinejoin="round"
												fill="none"
											/>
										</svg>
										<div style={{ textAlign: "left" }}>
											<div style={{ fontSize: "12.5px", fontWeight: 700, color: "var(--ink)" }}>
												Zweryfikowany
											</div>
											<div style={{ fontSize: "10px", color: "var(--muted)" }}>
												Potwierdzony cyfrowo
											</div>
										</div>
									</div>
								)}
							</div>
						</div>

						{/* DANE POSIADACZA */}
						<div
							style={{
								paddingBottom: "22px",
								borderBottom: "1px solid var(--border)",
								marginBottom: "22px",
							}}
						>
							<div
								style={{
									fontSize: "11px",
									letterSpacing: "0.08em",
									textTransform: "uppercase",
									color: "var(--muted)",
									fontWeight: 600,
								}}
							>
								Wystawiony dla:
							</div>
							<h2
								style={{
									...serif,
									fontWeight: 700,
									fontSize: "25px",
									color: "var(--ink)",
									margin: "6px 0 6px",
								}}
							>
								{data.student.name}
							</h2>
							<div style={{ fontSize: "13.5px", color: "var(--muted)" }}>
								<span>{data.student.university}</span>
								{" · "}
								<span>{data.student.fieldOfStudy}</span>
								{" · semestr "}
								<span>{data.student.semester}</span>
							</div>
							<div
								style={{ marginTop: "12px", display: "flex", alignItems: "baseline", gap: "8px" }}
							>
								<span
									style={{
										fontSize: "11px",
										letterSpacing: "0.06em",
										textTransform: "uppercase",
										color: "var(--muted)",
										fontWeight: 600,
										whiteSpace: "nowrap",
										flexShrink: 0,
									}}
								>
									Cel zawodowy:
								</span>
								<span
									style={{
										display: "inline-block",
										padding: "4px 13px",
										background: "var(--badge-bg)",
										border: "1px solid var(--border)",
										borderRadius: "4px",
										color: "var(--amber-text)",
										fontWeight: 700,
										fontSize: "14px",
										whiteSpace: "nowrap",
									}}
								>
									{data.student.careerGoal}
								</span>
							</div>
						</div>

						{/* POKRYCIE RYNKU */}
						<div
							style={{
								paddingBottom: "22px",
								borderBottom: "1px solid var(--border)",
								marginBottom: "22px",
							}}
						>
							<div style={{ fontSize: "15px", color: "var(--ink)", marginBottom: "12px" }}>
								Pokrycie wymagań rynkowych dla roli <strong>{data.student.careerGoal}</strong>:{" "}
								<span
									className="pp2-coverage-value"
									style={{ fontSize: "23px", fontWeight: 700, color: "var(--amber-text)" }}
								>
									{coverage}%
								</span>
							</div>
							<div
								style={{
									height: "8px",
									background: "var(--border)",
									borderRadius: "4px",
									overflow: "hidden",
								}}
							>
								<div
									className="pp2-coverage-fill"
									style={{
										height: "100%",
										width: `${coverage}%`,
										background: "var(--amber)",
										borderRadius: "4px",
									}}
								/>
							</div>
							<div
								className="pp2-progress-markers"
								style={{
									display: "flex",
									justifyContent: "space-between",
									fontSize: "10.5px",
									color: "var(--muted)",
									marginTop: "6px",
								}}
							>
								<span>0%</span>
								<span>25%</span>
								<span>50%</span>
								<span>75%</span>
								<span>100%</span>
							</div>
							<div style={{ display: "flex", gap: "32px", marginTop: "22px", flexWrap: "wrap" }}>
								<div style={{ flexShrink: 0 }}>
									<div style={{ ...serif, fontWeight: 700, fontSize: "26px", color: "var(--ink)" }}>
										{masteredCount}
									</div>
									<div
										style={{
											fontSize: "11.5px",
											textTransform: "uppercase",
											letterSpacing: "0.05em",
											color: "var(--muted)",
											fontWeight: 600,
											marginTop: "2px",
											whiteSpace: "nowrap",
										}}
									>
										Opanowane
									</div>
									<div
										style={{
											fontSize: "10.5px",
											color: "var(--muted)",
											marginTop: "2px",
											whiteSpace: "nowrap",
										}}
									>
										{pct(masteredCount)}% wymagań rynku
									</div>
								</div>
								<div style={{ flexShrink: 0 }}>
									<div style={{ ...serif, fontWeight: 700, fontSize: "26px", color: "var(--ink)" }}>
										{learningCount}
									</div>
									<div
										style={{
											fontSize: "11.5px",
											textTransform: "uppercase",
											letterSpacing: "0.05em",
											color: "var(--muted)",
											fontWeight: 600,
											marginTop: "2px",
											whiteSpace: "nowrap",
										}}
									>
										W trakcie nauki
									</div>
									<div
										style={{
											fontSize: "10.5px",
											color: "var(--muted)",
											marginTop: "2px",
											whiteSpace: "nowrap",
										}}
									>
										{pct(learningCount)}% wymagań rynku
									</div>
								</div>
								<div style={{ flexShrink: 0 }}>
									<div style={{ ...serif, fontWeight: 700, fontSize: "26px", color: "var(--ink)" }}>
										{missingCount}
									</div>
									<div
										style={{
											fontSize: "11.5px",
											textTransform: "uppercase",
											letterSpacing: "0.05em",
											color: "var(--muted)",
											fontWeight: 600,
											marginTop: "2px",
											whiteSpace: "nowrap",
										}}
									>
										Brakuje
									</div>
									<div
										style={{
											fontSize: "10.5px",
											color: "var(--muted)",
											marginTop: "2px",
											whiteSpace: "nowrap",
										}}
									>
										{pct(missingCount)}% wymagań rynku
									</div>
								</div>
							</div>
						</div>

						{/* KOMPETENCJE */}
						<div
							style={{
								paddingBottom: "22px",
								borderBottom: "1px solid var(--border)",
								marginBottom: "22px",
							}}
						>
							<h3
								style={{
									...serif,
									fontWeight: 700,
									fontSize: "20px",
									color: "var(--ink)",
									margin: "0 0 14px",
								}}
							>
								Kompetencje
							</h3>

							{acquired.length > 0 && (
								<>
									<div
										style={{
											fontSize: "11px",
											textTransform: "uppercase",
											letterSpacing: "0.06em",
											color: "var(--muted)",
											fontWeight: 600,
											marginBottom: "4px",
										}}
									>
										Opanowane
									</div>
									{acquired.map((c) => (
										<CompetencyRow key={c.name} comp={c} tone="acquired" />
									))}
								</>
							)}

							{learning.length > 0 && (
								<>
									<div
										style={{
											fontSize: "11px",
											textTransform: "uppercase",
											letterSpacing: "0.06em",
											color: "var(--muted)",
											fontWeight: 600,
											margin: "18px 0 4px",
										}}
									>
										W trakcie nauki
									</div>
									{learning.map((c) => (
										<CompetencyRow key={c.name} comp={c} tone="learning" />
									))}
								</>
							)}

							<div
								style={{
									fontSize: "11px",
									color: "var(--muted)",
									fontStyle: "italic",
									marginTop: "10px",
								}}
							>
								Powyżej pozycje reprezentatywne wybrane z pełnego wykazu kompetencji prowadzonego na
								koncie studenta.
							</div>
						</div>

						{/* ZWERYFIKOWANE PROJEKTY */}
						{projects.length > 0 && (
							<div style={{ paddingBottom: "6px", marginBottom: "22px" }}>
								<h3
									style={{
										...serif,
										fontWeight: 700,
										fontSize: "20px",
										color: "var(--ink)",
										margin: "0 0 6px",
									}}
								>
									Zweryfikowane projekty
								</h3>
								{projects.map((p) => (
									<div
										key={`${p.projectTitle}-${p.verifiedAt}`}
										style={{ padding: "16px 0", borderBottom: "1px solid var(--border)" }}
									>
										<div
											style={{
												display: "flex",
												justifyContent: "space-between",
												alignItems: "baseline",
												gap: "12px",
											}}
										>
											<div style={{ fontSize: "15.5px", fontWeight: 600, color: "var(--ink)" }}>
												{p.projectTitle}
											</div>
											<div
												style={{
													fontSize: "15px",
													fontWeight: 700,
													color: "var(--amber-text)",
													whiteSpace: "nowrap",
												}}
											>
												{p.score}/100
											</div>
										</div>
										<div
											style={{
												display: "flex",
												flexWrap: "wrap",
												alignItems: "center",
												gap: "6px",
												marginTop: "6px",
												fontSize: "12.5px",
												color: "var(--muted)",
											}}
										>
											<span>Poziom: {p.projectLevel}</span>
											<span>·</span>
											<span>Zweryfikowano: {fmtDateLong(p.verifiedAt)}</span>
											<span>·</span>
											{/* B8/1.6 (ADR-008/ADR-011): etykieta nigdy nie kłamie —
											    „Oceniał człowiek" TYLKO przy realnej decyzji człowieka;
											    bez niej uczciwe „ocena automatyczna". */}
											{p.humanReviewerType ? (
												<span
													style={{
														display: "inline-flex",
														alignItems: "center",
														gap: "4px",
														color: "var(--ok)",
														fontWeight: 600,
													}}
												>
													<svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
														<circle
															cx="12"
															cy="12"
															r="11"
															fill="none"
															stroke="var(--ok)"
															strokeWidth="2"
														/>
														<path
															d="M7 12.5l3 3 7-7.5"
															fill="none"
															stroke="var(--ok)"
															strokeWidth="2"
															strokeLinecap="round"
															strokeLinejoin="round"
														/>
													</svg>
													Oceniał człowiek:{" "}
													{p.humanReviewerType === "faculty" ? "wykładowca" : "operator jakości"}
												</span>
											) : (
												<span style={{ color: "var(--muted)" }}>ocena automatyczna</span>
											)}
										</div>
										{(p.repoUrl || p.notebookUrl) && (
											<div
												style={{
													display: "flex",
													flexWrap: "wrap",
													gap: "18px",
													marginTop: "8px",
													fontSize: "12.5px",
												}}
											>
												{p.repoUrl && (
													<span style={{ color: "var(--amber-text)" }}>
														Repozytorium (GitHub):{" "}
														<a
															href={p.repoUrl}
															target="_blank"
															rel="noopener noreferrer"
															style={{ color: "var(--amber-text)", fontWeight: 600 }}
														>
															{shortenRepoUrl(p.repoUrl)}
														</a>
													</span>
												)}
												{p.notebookUrl && (
													<a
														href={p.notebookUrl}
														target="_blank"
														rel="noopener noreferrer"
														style={{ color: "var(--amber-text)", fontWeight: 600 }}
													>
														Notatnik (notatnik obliczeniowy)
													</a>
												)}
											</div>
										)}
										{p.feedback && p.feedback.trim() !== "" && (
											<div
												style={{
													marginTop: "10px",
													paddingLeft: "14px",
													borderLeft: "2px solid var(--border)",
												}}
											>
												<div
													style={{
														fontSize: "10.5px",
														textTransform: "uppercase",
														letterSpacing: "0.06em",
														color: "var(--muted)",
														fontWeight: 600,
														marginBottom: "4px",
													}}
												>
													Ocena sprawdzającego
												</div>
												<div
													style={{
														fontSize: "13px",
														fontStyle: "italic",
														color: "var(--ink)",
														lineHeight: 1.6,
													}}
												>
													„{p.feedback}”
												</div>
											</div>
										)}
									</div>
								))}
							</div>
						)}

						{/* BLOK PODPISÓW */}
						<div
							className="pp2-signatures"
							style={{
								pageBreakInside: "avoid",
								breakInside: "avoid",
								display: "grid",
								gridTemplateColumns: "1fr 1fr",
								gap: "44px",
								paddingTop: "22px",
								borderTop: "1px solid var(--border)",
								marginBottom: "22px",
							}}
						>
							<div>
								<div
									style={{
										fontSize: "11px",
										textTransform: "uppercase",
										letterSpacing: "0.06em",
										color: "var(--muted)",
										fontWeight: 600,
									}}
								>
									Podpis posiadacza
								</div>
								<div
									style={{
										height: "44px",
										borderBottom: "1px solid var(--ink)",
										margin: "22px 0 8px",
									}}
								/>
								<div style={{ fontSize: "14px", fontWeight: 600, color: "var(--ink)" }}>
									{data.student.name}
								</div>
								<div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "1px" }}>
									Student
								</div>
								<div
									style={{
										display: "flex",
										justifyContent: "space-between",
										alignItems: "center",
										marginTop: "14px",
									}}
								>
									<div style={{ fontSize: "11.5px", color: "var(--muted)" }}>Data: {issueDate}</div>
									<div
										style={{
											width: "46px",
											height: "46px",
											borderRadius: "50%",
											border: "1px dashed var(--border)",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											fontSize: "8.5px",
											letterSpacing: "0.04em",
											color: "var(--muted)",
										}}
									>
										m.p.
									</div>
								</div>
							</div>
							<div>
								<div
									style={{
										fontSize: "11px",
										textTransform: "uppercase",
										letterSpacing: "0.06em",
										color: "var(--muted)",
										fontWeight: 600,
									}}
								>
									Podpis wykładowcy / mentora
								</div>
								<div
									style={{
										height: "44px",
										borderBottom: "1px solid var(--ink)",
										margin: "22px 0 8px",
									}}
								/>
								{mentor ? (
									<>
										<div style={{ fontSize: "14px", fontWeight: 600, color: "var(--ink)" }}>
											{mentor.name}
										</div>
										<div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "1px" }}>
											{mentor.role}, {mentor.org}
										</div>
										<div
											style={{
												display: "flex",
												justifyContent: "space-between",
												alignItems: "center",
												marginTop: "14px",
											}}
										>
											<div style={{ fontSize: "11.5px", color: "var(--muted)" }}>
												Data: {issueDate}
											</div>
											<div
												style={{
													width: "46px",
													height: "46px",
													borderRadius: "50%",
													border: "1px dashed var(--border)",
													display: "flex",
													alignItems: "center",
													justifyContent: "center",
													fontSize: "8.5px",
													letterSpacing: "0.04em",
													color: "var(--muted)",
												}}
											>
												m.p.
											</div>
										</div>
									</>
								) : (
									<>
										<div style={{ fontSize: "11.5px", fontStyle: "italic", color: "var(--muted)" }}>
											(opcjonalnie — do uzupełnienia, jeśli masz opiekuna)
										</div>
										<div
											style={{
												display: "flex",
												justifyContent: "space-between",
												alignItems: "center",
												marginTop: "14px",
											}}
										>
											<div style={{ fontSize: "11.5px", color: "var(--muted)" }}>Data: —</div>
											<div
												style={{
													width: "46px",
													height: "46px",
													borderRadius: "50%",
													border: "1px dashed var(--border)",
													display: "flex",
													alignItems: "center",
													justifyContent: "center",
													fontSize: "8.5px",
													letterSpacing: "0.04em",
													color: "var(--muted)",
													opacity: 0.6,
												}}
											>
												m.p.
											</div>
										</div>
									</>
								)}
							</div>
						</div>

						{/* STOPKA */}
						<div
							style={{
								textAlign: "center",
								paddingTop: "16px",
								borderTop: "1px solid var(--border)",
								fontSize: "11px",
								color: "var(--muted)",
							}}
						>
							Dokument wygenerowany przez SkillBridge · nordsignal · zweryfikuj autentyczność pod
							adresem linku publicznego
						</div>
					</div>
				</div>
			</div>

			{/* KARTA CTA — tylko widok publiczny, poza wydrukiem */}
			{isPublic && (
				<div
					data-no-print
					style={{
						width: "min(210mm, 100%)",
						boxSizing: "border-box",
						marginTop: "22px",
						padding: "20px 24px",
						background: "var(--card)",
						border: "1px solid var(--border)",
						borderRadius: "12px",
						textAlign: "center",
					}}
				>
					<div style={{ fontSize: "15px", fontWeight: 600, color: "var(--ink)" }}>
						Stwórz swój Paszport Kompetencji
					</div>
					<div
						style={{ fontSize: "12.5px", color: "var(--muted)", marginTop: "6px", lineHeight: 1.6 }}
					>
						Zbuduj taki sam dokument dla siebie i pokaż pracodawcy, co potrafisz — konkretem, nie
						deklaracją.
					</div>
					<Link
						href="/"
						style={{
							display: "inline-block",
							marginTop: "14px",
							padding: "10px 20px",
							borderRadius: "7px",
							background: "var(--ink)",
							color: "var(--card)",
							fontSize: "13px",
							fontWeight: 600,
							textDecoration: "none",
						}}
					>
						Załóż konto SkillBridge
					</Link>
				</div>
			)}
		</div>
	);
}
