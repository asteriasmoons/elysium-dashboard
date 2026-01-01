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

export interface FeatureItem {
  key: FeatureKey;
  title: string;
  description: string;
  href: (guildId: string) => string;
  status?: "planned" | "in-progress" | "ready";
}

export const FEATURES: FeatureItem[] = [
  {
    key: "journal",
    title: "Journal",
    description: "Prompts, entries, and templates for your server.",
    href: (id) => `/dashboard/journal/${id}`,
    status: "planned",
  },
  {
    key: "habit-tracker",
    title: "Habit Tracker",
    description: "Habits, streaks, and accountability tools.",
    href: (id) => `/dashboard/${id}/habits`,
    status: "planned",
  },
  {
    key: "mood-tracker",
    title: "Mood Tracker",
    description: "Mood logs, trends, and reflections.",
    href: (id) => `/dashboard/${id}/moods`,
    status: "planned",
  },
  {
    key: "reading",
    title: "Reading",
    description: "Buddy reads, sprints, and reading stats.",
    href: (id) => `/dashboard/${id}/reading`,
    status: "planned",
  },
  {
    key: "reminders",
    title: "Reminders",
    description: "Create, edit, and audit scheduled reminders.",
    href: (id) => `/dashboard/${id}/reminders`,
    status: "planned",
  },
  {
    key: "logs",
    title: "Activity Log",
    description: "See what the bot has been doing recently.",
    href: (id) => `/dashboard/${id}/logs`,
    status: "planned",
  },
  {
    key: "automation",
    title: "Automation",
    description: "Rules, triggers, and optional automations.",
    href: (id) => `/dashboard/${id}/automation`,
    status: "planned",
  },
  {
    key: "integrations",
    title: "Integrations",
    description: "GitHub feeds and other external links.",
    href: (id) => `/dashboard/${id}/integrations`,
    status: "planned",
  },
  {
    key: "guild-settings",
    title: "Guild Settings",
    description: "Core configuration for channels and features.",
    href: (id) => `/dashboard/${id}/settings`,
    status: "planned",
  },
  {
    key: "permissions",
    title: "Permissions",
    description: "Who can use what, role rules, and access control.",
    href: (id) => `/dashboard/${id}/permissions`,
    status: "planned",
  },
];
