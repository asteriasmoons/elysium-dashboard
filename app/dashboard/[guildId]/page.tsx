import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import styles from "./guild.module.css";
import FeatureGrid from "@/components/FeatureGrid";
import { FeatureGrid } from "@/components/FeatureGrid";
import Link from "next/link";

export default async function GuildHomePage({
  params,
}: {
  params: { guildId: string };
}) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.topRow}>
          <div>
            <h1 className={styles.title}>Server Dashboard</h1>
            <p className={styles.subtitle}>Guild ID: {params.guildId}</p>
          </div>

          <Link href="/dashboard" className={styles.backLink}>
            Back to servers
          </Link>
        </div>

        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Modules</h2>
          <p className={styles.panelSubtitle}>
            This is your build map. Every card here represents a module you can
            implement over time.
          </p>

          <FeatureGrid features={FEATURES} guildId={params.guildId} />
        </div>
      </div>
    </div>
  );
}
