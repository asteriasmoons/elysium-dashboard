export type FeatureKey =
  | "journal"
  | "habit-tracker"
  | "mood-tracker"
  | "reading"
  | "embeds"
  | "reminders"
  | "prompts"
  | "sprints"
  | "buddy-reads";

export type FeatureStatus = "planned" | "in-progress" | "ready";

export type FeatureHref = string | ((guildId: string) => string);

export interface FeatureItem {
  key: FeatureKey;
  title: string;
  description: string;
  href: FeatureHref;
  scope?: "user" | "guild";
  status?: FeatureStatus;
}

export const FEATURES: FeatureItem[] = [
  {
    key: "journal",
    title: "Journal",
    description: "Prompts, entries, and templates for your account.",
    href: "/dashboard/journal",
    scope: "user",
    status: "ready",
  },
  {
    key: "habit-tracker",
    title: "Habit Tracker",
    description: "Habits, streaks, and accountability tools.",
    href: "/dashboard/habits",
    scope: "user",
    status: "ready",
  },
  {
    key: "mood-tracker",
    title: "Mood Tracker",
    description: "Mood logs, trends, and reflections.",
    href: "/dashboard/mood",
    scope: "user",
    status: "ready",
  },
  {
    key: "reading",
    title: "Reading",
    description: "Buddy reads, sprints, and reading stats.",
    href: (guildId) => `/dashboard/${guildId}/reading`,
    scope: "guild",
    status: "planned",
  },
  {
    key: "embeds",
    title: "Embed Creator",
    description: "Create, edit and send embeds to discord",
    href: (guildId) => `/dashboard/${guildId}/embeds`,
    scope: "guild",
    status: "planned",
  },
  {
    key: "sprints",
    title: "Sprints",
    description: "Run timed reading sessions with others.",
    href: (guildId) => `/dashboard/${guildId}/sprints`,
    scope: "guild",
    status: "planned",
  },
  {
    key: "buddy-reads",
    title: "Buddy Reads",
    description: "Track shared reading progress with others.",
    href: (guildId) => `/dashboard/${guildId}/buddy-reads`,
    scope: "guild",
    status: "planned",
  },
  {
    key: "reminders",
    title: "Reminders",
    description: "Create, edit, and audit scheduled reminders.",
    href: "/dashboard/reminders",
    scope: "user",
    status: "ready",
  },
];