import { relations } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

// Better Auth tables
export const user = pgTable("user", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: boolean("email_verified").notNull(),
	image: text("image"),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const session = pgTable("session", {
	id: text("id").primaryKey(),
	expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
	token: text("token").notNull().unique(),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
	id: text("id").primaryKey(),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	idToken: text("id_token"),
	accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
	refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
	scope: text("scope"),
	password: text("password"),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const verification = pgTable("verification", {
	id: text("id").primaryKey(),
	identifier: text("identifier").notNull(),
	value: text("value").notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }),
	updatedAt: timestamp("updated_at", { withTimezone: true }),
});

// SkillBridge AI domain tables

export const competencyStatusEnum = pgEnum("competency_status", [
	"acquired",
	"in_progress",
	"missing",
]);

export const gapPriorityEnum = pgEnum("gap_priority", ["critical", "important", "nice_to_have"]);

// Project Marketplace enums

export const projectLevelEnum = pgEnum("project_level", ["L1", "L2", "L3", "L4", "L5"]);

export const projectSourceTypeEnum = pgEnum("project_source_type", [
	"open_data",
	"oss",
	"partner",
	"ngo",
	"faculty",
]);

export const projectCompetencyRoleEnum = pgEnum("project_competency_role", [
	"required",
	"acquired",
]);

export const submissionStatusEnum = pgEnum("submission_status", [
	"in_progress",
	"submitted",
	"verified",
	"rejected",
]);

export const students = pgTable(
	"students",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		userId: text("user_id")
			.notNull()
			.unique()
			.references(() => user.id, { onDelete: "cascade" }),
		university: text("university").notNull(),
		fieldOfStudy: text("field_of_study").notNull(),
		semester: integer("semester").notNull(),
		careerGoal: text("career_goal").notNull(),
		syllabusText: text("syllabus_text"),
		onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [index("idx_students_user_id").on(table.userId)],
);

export const competencies = pgTable(
	"competencies",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		studentId: uuid("student_id")
			.notNull()
			.references(() => students.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		status: competencyStatusEnum("status").notNull().default("acquired"),
		marketPercentage: integer("market_percentage"),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [index("idx_competencies_student_id").on(table.studentId)],
);

export const gaps = pgTable(
	"gaps",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		studentId: uuid("student_id")
			.notNull()
			.references(() => students.id, { onDelete: "cascade" }),
		competencyName: text("competency_name").notNull(),
		priority: gapPriorityEnum("priority").notNull().default("important"),
		marketPercentage: integer("market_percentage").notNull().default(0),
		estimatedHours: integer("estimated_hours").notNull().default(5),
		whyImportant: text("why_important"),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [index("idx_gaps_student_id").on(table.studentId)],
);

export const skillMaps = pgTable("skill_maps", {
	id: uuid("id").defaultRandom().primaryKey(),
	studentId: uuid("student_id")
		.notNull()
		.unique()
		.references(() => students.id, { onDelete: "cascade" }),
	nodes: jsonb("nodes").notNull().default([]),
	edges: jsonb("edges").notNull().default([]),
	generatedAt: timestamp("generated_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const passports = pgTable("passports", {
	id: uuid("id").defaultRandom().primaryKey(),
	studentId: uuid("student_id")
		.notNull()
		.unique()
		.references(() => students.id, { onDelete: "cascade" }),
	marketCoveragePercent: integer("market_coverage_percent").notNull().default(0),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const jobMarketData = pgTable(
	"job_market_data",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		careerGoal: text("career_goal").notNull(),
		competencyName: text("competency_name").notNull(),
		demandPercentage: integer("demand_percentage").notNull(),
		category: text("category").notNull(),
		salaryRange: text("salary_range"),
	},
	(table) => [index("idx_job_market_career_goal").on(table.careerGoal)],
);

// Project Marketplace tables

export const projects = pgTable(
	"projects",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		slug: text("slug").notNull().unique(),
		title: text("title").notNull(),
		description: text("description").notNull(),
		level: projectLevelEnum("level").notNull(),
		estimatedHours: integer("estimated_hours").notNull(),
		sourceType: projectSourceTypeEnum("source_type").notNull(),
		sourceUrl: text("source_url"),
		partnerId: text("partner_id"),
		exclusivity: boolean("exclusivity").notNull().default(false),
		briefTemplate: text("brief_template"),
		rubricJson: jsonb("rubric_json").notNull().default([]),
		status: text("status").notNull().default("active"),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [index("idx_projects_slug").on(table.slug)],
);

export const projectCompetencies = pgTable(
	"project_competencies",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		projectId: uuid("project_id")
			.notNull()
			.references(() => projects.id, { onDelete: "cascade" }),
		competencyName: text("competency_name").notNull(),
		role: projectCompetencyRoleEnum("role").notNull().default("required"),
	},
	(table) => [index("idx_project_competencies_project_id").on(table.projectId)],
);

export const projectSubmissions = pgTable(
	"project_submissions",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		studentId: uuid("student_id")
			.notNull()
			.references(() => students.id, { onDelete: "cascade" }),
		projectId: uuid("project_id")
			.notNull()
			.references(() => projects.id, { onDelete: "cascade" }),
		repoUrl: text("repo_url"),
		notebookUrl: text("notebook_url"),
		additionalUrls: jsonb("additional_urls").notNull().default([]),
		submittedAt: timestamp("submitted_at", { withTimezone: true }),
		aiReviewJson: jsonb("ai_review_json"),
		score: integer("score"),
		status: submissionStatusEnum("status").notNull().default("in_progress"),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("idx_project_submissions_student").on(table.studentId),
		index("idx_project_submissions_project").on(table.projectId),
	],
);

export const projectSources = pgTable("project_sources", {
	id: uuid("id").defaultRandom().primaryKey(),
	type: projectSourceTypeEnum("type").notNull(),
	url: text("url").notNull(),
	lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
});

// Faculty sessions — DB-backed, replaces static cookie value.
// Cookie carries random 256-bit token; DB stores its SHA-256 hash for lookup.
export const facultySessions = pgTable(
	"faculty_sessions",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		tokenHash: text("token_hash").notNull().unique(),
		expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
		ipAddress: text("ip_address"),
		userAgent: text("user_agent"),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [index("idx_faculty_sessions_expires_at").on(table.expiresAt)],
);

// Audit log — privileged actions and security-relevant events.
export const auditLog = pgTable(
	"audit_log",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		actorType: text("actor_type", {
			enum: ["student", "faculty", "system", "anonymous"],
		}).notNull(),
		actorId: text("actor_id"),
		action: text("action").notNull(),
		targetType: text("target_type"),
		targetId: text("target_id"),
		ipAddress: text("ip_address"),
		userAgent: text("user_agent"),
		metadata: jsonb("metadata"),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("idx_audit_log_created_at").on(table.createdAt),
		index("idx_audit_log_action").on(table.action),
	],
);

// Relations

export const studentsRelations = relations(students, ({ one, many }) => ({
	user: one(user, { fields: [students.userId], references: [user.id] }),
	competencies: many(competencies),
	gaps: many(gaps),
	skillMap: one(skillMaps, { fields: [students.id], references: [skillMaps.studentId] }),
	passport: one(passports, { fields: [students.id], references: [passports.studentId] }),
	projectSubmissions: many(projectSubmissions),
}));

export const competenciesRelations = relations(competencies, ({ one }) => ({
	student: one(students, { fields: [competencies.studentId], references: [students.id] }),
}));

export const gapsRelations = relations(gaps, ({ one, many }) => ({
	student: one(students, { fields: [gaps.studentId], references: [students.id] }),
}));

export const passportsRelations = relations(passports, ({ one }) => ({
	student: one(students, { fields: [passports.studentId], references: [students.id] }),
}));

// Project Marketplace relations

export const projectsRelations = relations(projects, ({ many }) => ({
	competencies: many(projectCompetencies),
	submissions: many(projectSubmissions),
}));

export const projectCompetenciesRelations = relations(projectCompetencies, ({ one }) => ({
	project: one(projects, {
		fields: [projectCompetencies.projectId],
		references: [projects.id],
	}),
}));

export const projectSubmissionsRelations = relations(projectSubmissions, ({ one }) => ({
	student: one(students, {
		fields: [projectSubmissions.studentId],
		references: [students.id],
	}),
	project: one(projects, {
		fields: [projectSubmissions.projectId],
		references: [projects.id],
	}),
}));
