import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import styles from "./guild.module.css";
import Link from "next/link";
import { FEATURES } from "@/lib/features";
import { FeatureGrid } from "@/components/FeatureGrid";

export default async function GuildHomePage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { guildId } = await params;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.topRow}>
          <div>
            <h1 className={styles.title}>Server Dashboard</h1>
            <p className={styles.subtitle}>
              Configure features and manage modules for this server.
            </p>
          </div>

          <div>
            <Link href="/dashboard" className={styles.backLink}>
              Back to servers
            </Link>
          </div>
        </div>

        <div className={styles.panel}>
          <FeatureGrid features={FEATURES} guildId={guildId} />
        </div>
      </div>
    </div>
  );
}