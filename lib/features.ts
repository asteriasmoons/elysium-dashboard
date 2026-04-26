export type FeatureKey =
  | "journal"
  | "habit-tracker"
  | "mood-tracker"
  | "reading"
  | "embeds"
  | "tickets"
  | "role-panels"
  | "reminders"
  | "prompts"
  | "sprints"
  | "buddy-reads"
  | "afk";

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
    status: "ready",
  },
  {
    key: "tickets",
    title: "Ticket Panels",
    description: "Create, edit and send ticket panels to your discord channels.",
    href: (guildId) => `/dashboard/${guildId}/tickets`,
    scope: "guild",
    status: "ready",
  }, 
  {
    key: "role-panels",
    title: "Role Panels",
    description: "Create, edit and send role panels to your Discord channels.",
    href: (guildId) => `/dashboard/${guildId}/role-panels`,
    scope: "guild",
    status: "ready",
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
  {
    key: "afk",
    title: "AFK",
    description: "Configure AFK behavior and messages for your server.",
    href: (guildId) => `/dashboard/${guildId}/afk`,
    scope: "guild",
    status: "ready",
  },
];