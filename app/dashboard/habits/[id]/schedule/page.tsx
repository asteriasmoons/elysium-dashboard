import ScheduleHabitClient from "./ScheduleHabitClient";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ScheduleHabitPage({ params }: PageProps) {
  const { id } = await params;

  return <ScheduleHabitClient habitId={id} />;
}
