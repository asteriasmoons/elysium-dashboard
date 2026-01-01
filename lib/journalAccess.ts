import clientPromise from "@/lib/mongodb";
import { ObjectId, type Document } from "mongodb";

export const JOURNAL_COLLECTION = "journalentries";

// Free-tier limit
export const FREE_JOURNAL_LIMIT = 10;

// Validation limits (adjust whenever)
export const TITLE_MAX = 120;
export const ENTRY_MAX = 8000;

export interface JournalDoc extends Document {
  _id: ObjectId;
  userId: string;
  title?: string;
  entry: string;
  createdAt: Date;
}

function requireUserId(userId: string | null | undefined): string {
  const trimmed = String(userId ?? "").trim();
  if (!trimmed) throw new Error("Missing userId");
  return trimmed;
}

/**
 * Extract the Discord user id from the Auth.js v5 session.
 * Journal entries in your existing database use the Discord numeric id string.
 */
export function getSessionUserId(session: unknown): string {
  if (typeof session !== "object" || session === null) {
    throw new Error("Invalid session object");
  }

  const s = session as Record<string, unknown>;
  const user = s["user"];

  if (typeof user !== "object" || user === null) {
    throw new Error("Session user is missing");
  }

  const u = user as Record<string, unknown>;
  const id = u["id"];

  if (typeof id === "string" && id.trim().length > 0) {
    return id.trim();
  }

  throw new Error("Session user id is missing");
}

export async function listUserEntries(userId: string): Promise<JournalDoc[]> {
  const uid = requireUserId(userId);
  const client = await clientPromise;
  const db = client.db();

  return db
    .collection<JournalDoc>(JOURNAL_COLLECTION)
    .find({ userId: uid })
    .sort({ createdAt: -1 })
    .toArray();
}

export async function countUserEntries(userId: string): Promise<number> {
  const uid = requireUserId(userId);
  const client = await clientPromise;
  const db = client.db();

  return db.collection(JOURNAL_COLLECTION).countDocuments({ userId: uid });
}

/**
 * Fetch entry by id, then verify ownership.
 * This gives us a precise error if the document exists but userId doesn't match.
 */
export async function getUserEntryById(
  userId: string,
  entryId: string
): Promise<JournalDoc | null> {
  const uid = requireUserId(userId);
  const client = await clientPromise;
  const db = client.db();

  const _id = new ObjectId(entryId);

  // Step 1: fetch by _id only (truth check)
  const doc = await db
    .collection<JournalDoc>(JOURNAL_COLLECTION)
    .findOne({ _id });

  if (!doc) return null;

  // Step 2: verify ownership (and make mismatch obvious)
  const docUserId = String(doc.userId ?? "").trim();

  if (docUserId !== uid) {
    throw new Error(
      `Entry ownership mismatch. Session userId=${uid} but entry userId=${docUserId}`
    );
  }

  return doc;
}

export async function createUserEntry(
  userId: string,
  title: string,
  entry: string
): Promise<string> {
  const uid = requireUserId(userId);

  const trimmedTitle = String(title ?? "").trim();
  const trimmedEntry = String(entry ?? "").trim();

  if (!trimmedTitle) throw new Error("Title is required");
  if (!trimmedEntry) throw new Error("Entry is required");
  if (trimmedTitle.length > TITLE_MAX)
    throw new Error(`Title must be <= ${TITLE_MAX} characters`);
  if (trimmedEntry.length > ENTRY_MAX)
    throw new Error(`Entry must be <= ${ENTRY_MAX} characters`);

  const currentCount = await countUserEntries(uid);
  if (currentCount >= FREE_JOURNAL_LIMIT) {
    throw new Error(`Free limit reached (${FREE_JOURNAL_LIMIT} entries)`);
  }

  const client = await clientPromise;
  const db = client.db();

  const result = await db.collection(JOURNAL_COLLECTION).insertOne({
    userId: uid,
    title: trimmedTitle,
    entry: trimmedEntry,
    createdAt: new Date(),
  });

  return result.insertedId.toString();
}

export async function updateUserEntry(
  userId: string,
  entryId: string,
  title: string,
  entry: string
): Promise<boolean> {
  const uid = requireUserId(userId);

  const trimmedTitle = String(title ?? "").trim();
  const trimmedEntry = String(entry ?? "").trim();

  if (!trimmedTitle) throw new Error("Title is required");
  if (!trimmedEntry) throw new Error("Entry is required");
  if (trimmedTitle.length > TITLE_MAX)
    throw new Error(`Title must be <= ${TITLE_MAX} characters`);
  if (trimmedEntry.length > ENTRY_MAX)
    throw new Error(`Entry must be <= ${ENTRY_MAX} characters`);

  const client = await clientPromise;
  const db = client.db();

  const _id = new ObjectId(entryId);
  const result = await db
    .collection(JOURNAL_COLLECTION)
    .updateOne(
      { _id, userId: uid },
      { $set: { title: trimmedTitle, entry: trimmedEntry } }
    );

  return result.matchedCount > 0;
}

export async function deleteUserEntry(
  userId: string,
  entryId: string
): Promise<boolean> {
  const uid = requireUserId(userId);

  const client = await clientPromise;
  const db = client.db();

  const _id = new ObjectId(entryId);
  const result = await db
    .collection(JOURNAL_COLLECTION)
    .deleteOne({ _id, userId: uid });

  return result.deletedCount > 0;
}