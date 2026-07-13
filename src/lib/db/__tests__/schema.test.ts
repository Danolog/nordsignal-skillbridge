import { getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import {
	account,
	competencies,
	competenciesRelations,
	competencyStatusEnum,
	gapPriorityEnum,
	gaps,
	gapsRelations,
	jobMarketData,
	passports,
	projectCompetencies,
	projectCompetenciesRelations,
	projectCompetencyRoleEnum,
	projectLevelEnum,
	projectSources,
	projectSourceTypeEnum,
	projectSubmissions,
	projectSubmissionsRelations,
	projects,
	projectsRelations,
	session,
	skillMaps,
	students,
	studentsRelations,
	submissionStatusEnum,
	user,
	verification,
	verifiedCompetencies,
} from "../schema";

describe("DB Schema — Better Auth tables", () => {
	it("exports user table", () => {
		expect(user).toBeDefined();
		expect(getTableName(user)).toBe("user");
	});

	it("exports session table", () => {
		expect(session).toBeDefined();
		expect(getTableName(session)).toBe("session");
	});

	it("exports account table", () => {
		expect(account).toBeDefined();
		expect(getTableName(account)).toBe("account");
	});

	it("exports verification table", () => {
		expect(verification).toBeDefined();
		expect(getTableName(verification)).toBe("verification");
	});
});

describe("DB Schema — Enums", () => {
	it("competencyStatusEnum has correct values", () => {
		const values = competencyStatusEnum.enumValues;
		expect(values).toContain("acquired");
		expect(values).toContain("in_progress");
		expect(values).toContain("missing");
		expect(values).toHaveLength(3);
	});

	it("gapPriorityEnum has correct values", () => {
		const values = gapPriorityEnum.enumValues;
		expect(values).toContain("critical");
		expect(values).toContain("important");
		expect(values).toContain("nice_to_have");
		expect(values).toHaveLength(3);
	});
});

describe("DB Schema — Domain tables", () => {
	it("students table exists with correct SQL name", () => {
		expect(students).toBeDefined();
		expect(getTableName(students)).toBe("students");
	});

	it("competencies table exists with correct SQL name", () => {
		expect(competencies).toBeDefined();
		expect(getTableName(competencies)).toBe("competencies");
	});

	it("gaps table exists with correct SQL name", () => {
		expect(gaps).toBeDefined();
		expect(getTableName(gaps)).toBe("gaps");
	});

	it("skillMaps table exists with correct SQL name", () => {
		expect(skillMaps).toBeDefined();
		expect(getTableName(skillMaps)).toBe("skill_maps");
	});

	it("passports table exists with correct SQL name", () => {
		expect(passports).toBeDefined();
		expect(getTableName(passports)).toBe("passports");
	});

	// Blok C (C1, migracja 0037) — kredencjały „kompetencja zweryfikowana projektem".
	it("verifiedCompetencies table exists with correct SQL name and columns", () => {
		expect(verifiedCompetencies).toBeDefined();
		expect(getTableName(verifiedCompetencies)).toBe("verified_competencies");
		expect(verifiedCompetencies.studentId).toBeDefined();
		expect(verifiedCompetencies.tenantId).toBeDefined();
		expect(verifiedCompetencies.submissionId).toBeDefined();
		expect(verifiedCompetencies.competencyName).toBeDefined();
		expect(verifiedCompetencies.verifiedAt).toBeDefined();
	});

	it("jobMarketData table exists with correct SQL name", () => {
		expect(jobMarketData).toBeDefined();
		expect(getTableName(jobMarketData)).toBe("job_market_data");
	});
});

describe("DB Schema — Column presence", () => {
	it("students has required columns", () => {
		const colNames = Object.keys(students);
		expect(colNames).toContain("id");
		expect(colNames).toContain("userId");
		expect(colNames).toContain("university");
		expect(colNames).toContain("fieldOfStudy");
		expect(colNames).toContain("semester");
		expect(colNames).toContain("careerGoal");
		expect(colNames).toContain("onboardingCompleted");
		// Resume onboarding (migracja 0017): high-water-mark kroku kreatora.
		expect(colNames).toContain("onboardingStep");
	});

	it("gaps has required columns", () => {
		const colNames = Object.keys(gaps);
		expect(colNames).toContain("id");
		expect(colNames).toContain("studentId");
		expect(colNames).toContain("competencyName");
		expect(colNames).toContain("priority");
		expect(colNames).toContain("marketPercentage");
		expect(colNames).toContain("estimatedHours");
		expect(colNames).toContain("whyImportant");
	});

	it("jobMarketData has required columns", () => {
		const colNames = Object.keys(jobMarketData);
		expect(colNames).toContain("id");
		expect(colNames).toContain("careerGoal");
		expect(colNames).toContain("competencyName");
		expect(colNames).toContain("demandPercentage");
		expect(colNames).toContain("category");
		expect(colNames).toContain("salaryRange");
	});

	it("skillMaps has nodes and edges JSON columns", () => {
		const colNames = Object.keys(skillMaps);
		expect(colNames).toContain("nodes");
		expect(colNames).toContain("edges");
	});
});

describe("DB Schema — Relations", () => {
	it("exports studentsRelations", () => {
		expect(studentsRelations).toBeDefined();
	});

	it("exports competenciesRelations", () => {
		expect(competenciesRelations).toBeDefined();
	});

	it("exports gapsRelations", () => {
		expect(gapsRelations).toBeDefined();
	});
});

describe("DB Schema — Project Marketplace enums", () => {
	it("projectLevelEnum has 5 values (L1-L5)", () => {
		const values = projectLevelEnum.enumValues;
		expect(values).toHaveLength(5);
		expect(values).toEqual(["L1", "L2", "L3", "L4", "L5"]);
	});

	it("projectSourceTypeEnum has 5 values", () => {
		const values = projectSourceTypeEnum.enumValues;
		expect(values).toHaveLength(5);
		expect(values).toEqual(["open_data", "oss", "partner", "ngo", "faculty"]);
	});

	it("projectCompetencyRoleEnum has 2 values", () => {
		const values = projectCompetencyRoleEnum.enumValues;
		expect(values).toHaveLength(2);
		expect(values).toEqual(["required", "acquired"]);
	});

	it("submissionStatusEnum has 4 values", () => {
		const values = submissionStatusEnum.enumValues;
		expect(values).toHaveLength(4);
		expect(values).toEqual(["in_progress", "submitted", "verified", "rejected"]);
	});
});

describe("DB Schema — Project Marketplace tables", () => {
	it("projects table exists with correct SQL name", () => {
		expect(projects).toBeDefined();
		expect(getTableName(projects)).toBe("projects");
	});

	it("projectCompetencies table exists with correct SQL name", () => {
		expect(projectCompetencies).toBeDefined();
		expect(getTableName(projectCompetencies)).toBe("project_competencies");
	});

	it("projectSubmissions table exists with correct SQL name", () => {
		expect(projectSubmissions).toBeDefined();
		expect(getTableName(projectSubmissions)).toBe("project_submissions");
	});

	it("projectSources table exists with correct SQL name", () => {
		expect(projectSources).toBeDefined();
		expect(getTableName(projectSources)).toBe("project_sources");
	});
});

describe("DB Schema — Project Marketplace columns", () => {
	it("projects has required columns", () => {
		const colNames = Object.keys(projects);
		expect(colNames).toContain("id");
		expect(colNames).toContain("slug");
		expect(colNames).toContain("title");
		expect(colNames).toContain("description");
		expect(colNames).toContain("level");
		expect(colNames).toContain("estimatedHours");
		expect(colNames).toContain("sourceType");
		expect(colNames).toContain("sourceUrl");
		expect(colNames).toContain("rubricJson");
		expect(colNames).toContain("status");
	});

	it("projectSubmissions has required columns", () => {
		const colNames = Object.keys(projectSubmissions);
		expect(colNames).toContain("id");
		expect(colNames).toContain("studentId");
		expect(colNames).toContain("projectId");
		expect(colNames).toContain("repoUrl");
		expect(colNames).toContain("score");
		expect(colNames).toContain("status");
		expect(colNames).toContain("aiReviewJson");
	});
});

describe("DB Schema — Project Marketplace relations", () => {
	it("exports projectsRelations", () => {
		expect(projectsRelations).toBeDefined();
	});

	it("exports projectCompetenciesRelations", () => {
		expect(projectCompetenciesRelations).toBeDefined();
	});

	it("exports projectSubmissionsRelations", () => {
		expect(projectSubmissionsRelations).toBeDefined();
	});
});
