import { revalidatePath } from "next/cache";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getSessionUserId } from "@/lib/journalAccess";
import { getHabitById, updateHabit } from "@/lib/habitAccess";
import ScheduleHabitClient from "./ScheduleHabitClient";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ScheduleHabitPage({ params }: PageProps) {
  const session = await auth();

  if (!session) return null;

  const userId = getSessionUserId(session);
  const { id } = await params;

  const habit = await getHabitById(userId, id);

  if (!habit) {
    return notFound();
  }

  const safeHabit = {
    _id: String(habit._id),
    title: habit.title,
    description: habit.description,
    hour: habit.hour,
    minute: habit.minute,
    zone: habit.zone,
    frequency: habit.frequency ?? "daily",
    dayOfWeek:
      typeof habit.dayOfWeek === "number" ? habit.dayOfWeek : null,
    streak: typeof habit.streak === "number" ? habit.streak : 0,
    lastCompletedAt: habit.lastCompletedAt
      ? new Date(habit.lastCompletedAt).toISOString()
      : null,
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
      | "weekly";

    const rawDayOfWeek = String(formData.get("dayOfWeek") ?? "").trim();
    const rawHour = String(formData.get("hour") ?? "").trim();
    const rawMinute = String(formData.get("minute") ?? "").trim();

    const hour = rawHour === "" ? safeHabit.hour : Number(rawHour);
    const minute = rawMinute === "" ? safeHabit.minute : Number(rawMinute);

    const dayOfWeek =
      frequency === "weekly" && rawDayOfWeek !== ""
        ? Number(rawDayOfWeek)
        : null;

    await updateHabit(
      currentUserId,
      id,
      safeHabit.title,
      safeHabit.description,
      hour,
      minute,
      safeHabit.zone,
      {
        frequency,
        dayOfWeek,
      },
    );

    revalidatePath("/dashboard/habits");
    revalidatePath(`/dashboard/habits/${id}`);
    revalidatePath(`/dashboard/habits/${id}/schedule`);
    redirect("/dashboard/habits");
  }

  return (
    <ScheduleHabitClient
      habit={safeHabit}
      habitId={id}
      updateScheduleAction={updateScheduleAction}
    />
  );
}