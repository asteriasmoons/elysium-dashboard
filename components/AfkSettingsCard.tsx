"use client";

import { useEffect, useState } from "react";

type AfkConfig = {
  guildId: string;
  enabled: boolean;
  noticeTitle: string;
  noticeColor: string;
  defaultMessage: string;
};

export default function AfkSettingsCard({ guildId }: { guildId: string }) {
  const [config, setConfig] = useState<AfkConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/guilds/${guildId}/afk`);
      const data = await res.json();

      if (res.ok) setConfig(data.config);
      setLoading(false);
    }

    load();
  }, [guildId]);

  async function update<K extends keyof AfkConfig>(field: K, value: AfkConfig[K]) {
    if (!config) return;

    const updated = { ...config, [field]: value };
    setConfig(updated);
    setSaving(true);

    try {
      const res = await fetch(`/api/guilds/${guildId}/afk`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });

      const data = await res.json();
      if (res.ok) setConfig(data.config);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p>Loading AFK settings...</p>;
  if (!config) return <p>Failed to load AFK settings.</p>;

  return (
    <div className="dashboard-card">
      <h2>AFK Settings</h2>

      <label>
        <input
          type="checkbox"
          checked={config.enabled}
          onChange={(e) => update("enabled", e.target.checked)}
        />
        Enable AFK System
      </label>

      <label>
        Notice Title
        <input
          value={config.noticeTitle}
          onChange={(e) => update("noticeTitle", e.target.value)}
        />
      </label>

      <label>
        Notice Color
        <input
          value={config.noticeColor}
          onChange={(e) => update("noticeColor", e.target.value)}
        />
      </label>

      <label>
        Default AFK Message
        <textarea
          value={config.defaultMessage}
          onChange={(e) => update("defaultMessage", e.target.value)}
        />
      </label>

      {saving && <p>Saving...</p>}
    </div>
  );
}
