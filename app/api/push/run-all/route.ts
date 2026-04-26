import { NextResponse } from "next/server";
import { runReminderPushCron } from "../reminders/route";
import { runHabitPushCron } from "../habits/route";

export async function GET() {
  try {
    const reminders = await runReminderPushCron();
    const habits = await runHabitPushCron();

    return NextResponse.json({
      success: true,
      reminders,
      habits,
    });
  } catch (err) {
    console.error("Run-all cron failed", err);

    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
