import clientPromise from "@/lib/mongodb";
import { ObjectId, type Document } from "mongodb";

export const GITHUB_FEED_COLLECTION = "githubfeeds";

export interface GitHubFeedDoc extends Document {
  _id: ObjectId;
  guildId: string;
  repoUrl: string;
  branch: string;
  channelId: string;
  lastCommitSha?: string;
  lastIssueId?: number;
  lastReleaseId?: number;
}

export type GitHubFeedInput = {
  guildId: string;
  repoUrl: string;
  branch: string;
  channelId: string;
};

export async function listGuildFeeds(
  guildId: string,
): Promise<GitHubFeedDoc[]> {
  const client = await clientPromise;
  return client
    .db()
    .collection<GitHubFeedDoc>(GITHUB_FEED_COLLECTION)
    .find({ guildId })
    .sort({ repoUrl: 1 })
    .toArray();
}

export async function createFeed(input: GitHubFeedInput): Promise<string> {
  const client = await clientPromise;
  const db = client.db();
  // upsert so it matches the bot's findOneAndUpdate behaviour
  const result = await db
    .collection(GITHUB_FEED_COLLECTION)
    .findOneAndUpdate(
      { guildId: input.guildId, repoUrl: input.repoUrl },
      { $set: { channelId: input.channelId, branch: input.branch } },
      { upsert: true, returnDocument: "after" },
    );
  return String(result!._id);
}

export async function deleteFeed(
  guildId: string,
  feedId: string,
): Promise<boolean> {
  if (!ObjectId.isValid(feedId)) return false;
  const client = await clientPromise;
  const result = await client
    .db()
    .collection(GITHUB_FEED_COLLECTION)
    .deleteOne({ _id: new ObjectId(feedId), guildId });
  return result.deletedCount > 0;
}
