"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

// Cel kariery (careerGoal) NIE jest już zbierany w Profilu — przeniesiony do Kroku 0
// (Pomocnik kariery, strumień E / #5, spec §3.2). Stała CAREER_GOALS i opcja „Inne"
// usunięte razem z selektem.

const UNIVERSITIES = [
	"WSB Merito Gdańsk",
	"WSB Merito Gdynia",
	"WSB Merito Wrocław",
	"WSB Merito Poznań",
	"WSB Merito Warszawa",
	"WSB Merito Bydgoszcz",
	"WSB Merito Toruń",
	"WSB Merito Łódź",
	"WSB Merito Szczecin",
	"WSB Merito Opole",
	"WSB Merito Chorzów",
	"WSB Merito Kraków",
	"WSB Merito Rzeszów",
	"WSB Merito Lublin",
];

const SEMESTERS = Array.from({ length: 10 }, (_, i) => String(i + 1));

export interface ProfileData {
	university: string;
	fieldOfStudy: string;
	semester: string;
	/**
	 * Cel kariery — ustalany w Kroku 0 (Pomocnik), NIE w tym formularzu.
	 * Zostaje w typie jako pole stanu wizarda (płynie do POST /api/onboarding),
	 * ale StepProfile go nie renderuje ani nie edytuje (spec §3.2).
	 */
	careerGoal: string;
}

interface StepProfileProps {
	data: ProfileData;
	onChange: (data: ProfileData) => void;
}

export function StepProfile({ data, onChange }: StepProfileProps) {
	return (
		<div className="space-y-5">
			<div className="space-y-1.5">
				<Label>
					Uczelnia <span className="text-destructive">*</span>
				</Label>
				<Select value={data.university} onValueChange={(v) => onChange({ ...data, university: v })}>
					<SelectTrigger className="w-full">
						<SelectValue placeholder="Wybierz uczelnię..." />
					</SelectTrigger>
					<SelectContent>
						{UNIVERSITIES.map((u) => (
							<SelectItem key={u} value={u}>
								{u}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className="space-y-1.5">
				<Label>
					Kierunek studiów <span className="text-destructive">*</span>
				</Label>
				<Input
					value={data.fieldOfStudy}
					onChange={(e) => onChange({ ...data, fieldOfStudy: e.target.value })}
					placeholder="np. Informatyka, Zarządzanie, Finanse..."
				/>
			</div>

			<div className="space-y-1.5">
				<Label>
					Semestr <span className="text-destructive">*</span>
				</Label>
				<Select value={data.semester} onValueChange={(v) => onChange({ ...data, semester: v })}>
					<SelectTrigger className="w-full">
						<SelectValue placeholder="Wybierz..." />
					</SelectTrigger>
					<SelectContent>
						{SEMESTERS.map((s) => (
							<SelectItem key={s} value={s}>
								{s}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
		</div>
	);
}
