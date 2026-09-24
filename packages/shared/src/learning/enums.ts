// Closed value sets for learner and curriculum data, shared by the DB enums and the API.

export const testaments = ["NT"] as const;
export type Testament = (typeof testaments)[number];

export const experienceLevels = ["none", "beginner", "intermediate"] as const;
export type ExperienceLevel = (typeof experienceLevels)[number];

/** How much detail the reader's lookup panel shows; remembered per user. */
export const disclosureLevels = ["beginner", "expanded", "advanced"] as const;
export type DisclosureLevel = (typeof disclosureLevels)[number];

export const reviewGrades = ["again", "hard", "good", "easy"] as const;
export type ReviewGrade = (typeof reviewGrades)[number];

/** Where a review event came from. */
export const reviewContexts = ["review", "lesson"] as const;
export type ReviewContext = (typeof reviewContexts)[number];

export const lessonItemKinds = ["vocab", "grammar", "reading", "review"] as const;
export type LessonItemKind = (typeof lessonItemKinds)[number];

export const grammarProgressStatuses = ["introduced", "studied"] as const;
export type GrammarProgressStatus = (typeof grammarProgressStatuses)[number];
