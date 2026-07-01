import { PassportDocument, type PassportMentor } from "./passport-document";
import type { PassportData } from "./passport-view";

export function PassportPublic({
	data,
	mentor = null,
}: {
	data: PassportData;
	mentor?: PassportMentor | null;
}) {
	return <PassportDocument data={data} variant="public" mentor={mentor} />;
}
