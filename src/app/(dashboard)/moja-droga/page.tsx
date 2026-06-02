import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { MyRoadView } from "@/components/skillbridge/b5/MyRoadView";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { students } from "@/lib/db/schema";

export const metadata = {
	title: "Moja droga — SkillBridge",
};

export default async function MojaDrogaPage() {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) redirect("/login");

	const student = await db.query.students.findFirst({
		where: eq(students.userId, session.user.id),
	});
	if (!student) redirect("/onboarding");

	return <MyRoadView />;
}
