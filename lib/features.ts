export type FeatureKey =
  | "journal"
  | "habit-tracker"
  | "mood-tracker"
  | "reading"
  | "reminders"
  | "prompts"
  | "tags"
  | "logs"
  | "automation"
  | "guild-settings"
  | "permissions"
  | "integrations";

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
    href: (guildId) => `/dashboard/${guildId}/habits`,
    scope: "guild",
    status: "planned",
  },
  {
    key: "mood-tracker",
    title: "Mood Tracker",
    description: "Mood logs, trends, and reflections.",
    href: (guildId) => `/dashboard/${guildId}/moods`,
    scope: "guild",
    status: "planned",
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
    key: "reminders",
    title: "Reminders",
    description: "Create, edit, and audit scheduled reminders.",
    href: (guildId) => `/dashboard/${guildId}/reminders`,
    scope: "guild",
    status: "planned",
  },
  {
    key: "logs",
    title: "Activity Log",
    description: "See what the bot has been doing recently.",
    href: (guildId) => `/dashboard/${guildId}/logs`,
    scope: "guild",
    status: "planned",
  },
  {
    key: "automation",
    title: "Automation",
    description: "Rules, triggers, and optional automations.",
    href: (guildId) => `/dashboard/${guildId}/automation`,
    scope: "guild",
    status: "planned",
  },
  {
    key: "integrations",
    title: "Integrations",
    description: "GitHub feeds and other external links.",
    href: (guildId) => `/dashboard/${guildId}/integrations`,
    scope: "guild",
    status: "planned",
  },
  {
    key: "guild-settings",
    title: "Guild Settings",
    description: "Core configuration for channels and features.",
    href: (guildId) => `/dashboard/${guildId}/settings`,
    scope: "guild",
    status: "planned",
  },
  {
    key: "permissions",
    title: "Permissions",
    description: "Who can use what, role rules, and access control.",
    href: (guildId) => `/dashboard/${guildId}/permissions`,
    scope: "guild",
    status: "planned",
  },
];