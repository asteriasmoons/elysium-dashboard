import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import NewEntryClient from "./NewEntryClient";

export default async function NewEntryPage({
  params,
}: {
  params: { guildId: string };
}) {
  const session = await auth();
  if (!session) redirect("/login");

  return <NewEntryClient guildId={params.guildId} />;
}
