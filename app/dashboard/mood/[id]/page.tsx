import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import DetailClient from "./DetailClient";

export default async function MoodDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { guildId?: string };
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }

  const { id } = await params;
  const { guildId } = await searchParams;

  return <DetailClient id={id} guildId={guildId} />;
}
