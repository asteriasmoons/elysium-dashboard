import type { ObjectId } from "mongodb";

export const JOURNAL_COLLECTION = "journalEntries";

export interface JournalEntry {
  _id: ObjectId;
  guildId: string;

  title: string;
  content: string;

  createdAt: Date;
  updatedAt?: Date;

  // Optional fields you may want later
  authorId?: string;
  tags?: string[];
}
