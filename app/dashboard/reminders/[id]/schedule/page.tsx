import { revalidatePath } from "next/cache";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getSessionUserId } from "@/lib/journalAccess";
import { listUserReminders, updateReminder } from "@/lib/reminderAccess";
import ScheduleReminderClient from "./ScheduleReminderClient";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ScheduleReminderPage({ params }: PageProps) {
  const session = await auth();

  if (!session) return null;

  const userId = getSessionUserId(session);
  const reminders = await listUserReminders(userId);
  const { id } = await params;

  const reminder = reminders.find((r) => String(r._id) === id);

  if (!reminder) {
    return notFound();
  }

  const safeReminder = {
    _id: String(reminder._id),
    text: reminder.text,
    hour: reminder.hour,
    minute: reminder.minute,
    zone: reminder.zone,
    guildId: reminder.guildId ?? null,
    reminderSentAt: reminder.reminderSentAt
      ? new Date(reminder.reminderSentAt).toISOString()
      : null,
    frequency: reminder.frequency ?? "daily",
    dayOfWeek:
      typeof reminder.dayOfWeek === "number" ? reminder.dayOfWeek : null,
    dayOfMonth:
      typeof reminder.dayOfMonth === "number" ? reminder.dayOfMonth : null,
  };

  async function updateScheduleAction(formData: FormData) {
    "use server";

    const session = await auth();
    if (!session) {
      throw new Error("Unauthorized");
    }

    const currentUserId = getSessionUserId(session);

    const frequency = String(formData.get("frequency") ?? "daily") as
      | "daily"
      | "weekly"
      | "monthly";

    const rawDayOfWeek = String(formData.get("dayOfWeek") ?? "").trim();
    const rawDayOfMonth = String(formData.get("dayOfMonth") ?? "").trim();

    const rawHour = String(formData.get("hour") ?? "").trim();
    const rawMinute = String(formData.get("minute") ?? "").trim();

    const hour = rawHour === "" ? safeReminder.hour : Number(rawHour);
    const minute = rawMinute === "" ? safeReminder.minute : Number(rawMinute);

    const rawDate = String(formData.get("date") ?? "").trim();

    const reminderSentAt = rawDate
      ? new Date(
          `${rawDate}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`,
        )
      : safeReminder.reminderSentAt
        ? new Date(safeReminder.reminderSentAt)
        : null;

    const dayOfWeek =
      frequency === "weekly" && rawDayOfWeek !== ""
        ? Number(rawDayOfWeek)
        : null;

    const dayOfMonth =
      frequency === "monthly" && rawDayOfMonth !== ""
        ? Number(rawDayOfMonth)
        : null;

    await updateReminder(
      currentUserId,
      id,
      safeReminder.text,
      hour,
      minute,
      safeReminder.zone,
      safeReminder.guildId,
      {
        frequency,
        dayOfWeek,
        dayOfMonth,
      },
      reminderSentAt,
    );

    revalidatePath("/dashboard/reminders");
    revalidatePath(`/dashboard/reminders/${id}`);
    revalidatePath(`/dashboard/reminders/${id}/schedule`);
    redirect("/dashboard/reminders");
  }

  return (
    <ScheduleReminderClient
      reminder={safeReminder}
      reminderId={id}
      updateScheduleAction={updateScheduleAction}
    />
  );
}
