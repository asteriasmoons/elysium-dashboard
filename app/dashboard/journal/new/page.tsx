import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import EntryClient from "../[entryId]/EntryClient";

export default async function NewJournalEntryPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <EntryClient
      entryId="new"
      initialTitle=""
      initialEntry=""
      createdAt={new Date().toISOString()}
      isNew
    />
  );
}