"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import styles from "./tickets.module.css";
import EmojiPicker, {
  type DiscordEmoji,
} from "@/components/discord/EmojiPicker";
import RenderDiscordText from "@/components/discord/RenderDiscordText";
import {
  insertDiscordEmojiTagIntoEditor,
  serializeDiscordEditorContent,
  syncDiscordEditorContent,
} from "@/lib/discordEmojiEditor";

type Mode = "create" | "edit";

type TicketEmbedData = {
  title: string | null;
  description: string | null;
  color: string | null;
  author: {
    name: string | null;
    icon_url: string | null;
  };
  footer: {
    text: string | null;
    icon_url: string | null;
    timestamp: boolean;
  };
  thumbnail: string | null;
  image: string | null;
};

type TicketPanelData = {
  _id?: string;
  panelName: string;
  emoji: string | null;
  greeting: string;
  postChannelId: string;
  ticketCategoryId: string;
  transcriptsEnabled: boolean;
  transcriptChannelId: string | null;
  roleToPing: string | null;
  embed: TicketEmbedData;
  greetingEmbed: TicketEmbedData | null;
};

type GuildChannel = {
  id: string;
  name: string;
  type?: number;
};

type Props = {
  guildId: string;
  mode: Mode;
  panelId?: string;
  initialPanel?: TicketPanelData | null;
};

const emptyEmbed: TicketEmbedData = {
  title: "",
  description: "",
  color: "#5865F2",
  author: {
    name: "",
    icon_url: "",
  },
  footer: {
    text: "",
    icon_url: "",
    timestamp: false,
  },
  thumbnail: "",
  image: "",
};

export default function TicketPanelForm({
  guildId,
  mode,
  panelId,
  initialPanel,
}: Props) {
  const router = useRouter();

  const [channels, setChannels] = useState<GuildChannel[]>([]);
  const [emojis, setEmojis] = useState<DiscordEmoji[]>([]);
  const [activeEditor, setActiveEditor] = useState<
    | "emoji"
    | "greeting"
    | "embedTitle"
    | "embedDescription"
    | "greetingTitle"
    | "greetingDescription"
    | null
  >(null);

  const [panelName, setPanelName] = useState(initialPanel?.panelName ?? "");
  const [emoji, setEmoji] = useState(initialPanel?.emoji ?? "");
  const [greeting, setGreeting] = useState(initialPanel?.greeting ?? "");
  const [postChannelId, setPostChannelId] = useState(
    initialPanel?.postChannelId ?? "",
  );
  const [ticketCategoryId, setTicketCategoryId] = useState(
    initialPanel?.ticketCategoryId ?? "",
  );
  const [transcriptsEnabled, setTranscriptsEnabled] = useState(
    Boolean(initialPanel?.transcriptsEnabled),
  );
  const [transcriptChannelId, setTranscriptChannelId] = useState(
    initialPanel?.transcriptChannelId ?? "",
  );
  const [roleToPing, setRoleToPing] = useState(initialPanel?.roleToPing ?? "");

  const [embed, setEmbed] = useState<TicketEmbedData>(
    initialPanel?.embed ?? emptyEmbed,
  );
  const [greetingEmbed, setGreetingEmbed] = useState<TicketEmbedData>(
    initialPanel?.greetingEmbed ?? emptyEmbed,
  );

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const greetingRef = useRef<HTMLDivElement | null>(null);
  const embedTitleRef = useRef<HTMLDivElement | null>(null);
  const embedDescriptionRef = useRef<HTMLDivElement | null>(null);
  const greetingTitleRef = useRef<HTMLDivElement | null>(null);
  const greetingDescriptionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    async function loadData() {
      const [channelsRes, emojiRes] = await Promise.all([
        fetch(`/api/guilds/${guildId}/channels`),
        fetch("/api/emojis"),
      ]);

      const channelsData = await channelsRes.json();
      const emojiData = await emojiRes.json();

      const nextChannels = Array.isArray(channelsData.channels)
        ? channelsData.channels
        : [];

      setChannels(nextChannels);
      setEmojis(Array.isArray(emojiData.emojis) ? emojiData.emojis : []);

      if (!postChannelId && nextChannels[0]?.id) {
        setPostChannelId(nextChannels[0].id);
      }

      if (!ticketCategoryId && nextChannels[0]?.id) {
        setTicketCategoryId(nextChannels[0].id);
      }
    }

    loadData();
  }, [guildId, postChannelId, ticketCategoryId]);

  useEffect(() => {
    syncDiscordEditorContent(greetingRef.current, greeting);
  }, [greeting]);

  useEffect(() => {
    syncDiscordEditorContent(embedTitleRef.current, embed.title ?? "");
  }, [embed.title]);

  useEffect(() => {
    syncDiscordEditorContent(
      embedDescriptionRef.current,
      embed.description ?? "",
    );
  }, [embed.description]);

  useEffect(() => {
    syncDiscordEditorContent(
      greetingTitleRef.current,
      greetingEmbed.title ?? "",
    );
  }, [greetingEmbed.title]);

  useEffect(() => {
    syncDiscordEditorContent(
      greetingDescriptionRef.current,
      greetingEmbed.description ?? "",
    );
  }, [greetingEmbed.description]);

  function updateEmbedField<K extends keyof TicketEmbedData>(
    key: K,
    value: TicketEmbedData[K],
  ) {
    setEmbed((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateGreetingEmbedField<K extends keyof TicketEmbedData>(
    key: K,
    value: TicketEmbedData[K],
  ) {
    setGreetingEmbed((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function insertEmojiTag(tag: string) {
    if (activeEditor === "emoji") {
      setEmoji(tag);
      setShowEmojiPicker(false);
      return;
    }

    if (activeEditor === "greeting") {
      insertDiscordEmojiTagIntoEditor(
        greetingRef.current,
        greeting,
        setGreeting,
        tag,
        () => setShowEmojiPicker(false),
      );
      return;
    }

    if (activeEditor === "embedTitle") {
      insertDiscordEmojiTagIntoEditor(
        embedTitleRef.current,
        embed.title ?? "",
        (value) => updateEmbedField("title", value),
        tag,
        () => setShowEmojiPicker(false),
      );
      return;
    }

    if (activeEditor === "embedDescription") {
      insertDiscordEmojiTagIntoEditor(
        embedDescriptionRef.current,
        embed.description ?? "",
        (value) => updateEmbedField("description", value),
        tag,
        () => setShowEmojiPicker(false),
      );
      return;
    }

    if (activeEditor === "greetingTitle") {
      insertDiscordEmojiTagIntoEditor(
        greetingTitleRef.current,
        greetingEmbed.title ?? "",
        (value) => updateGreetingEmbedField("title", value),
        tag,
        () => setShowEmojiPicker(false),
      );
      return;
    }

    if (activeEditor === "greetingDescription") {
      insertDiscordEmojiTagIntoEditor(
        greetingDescriptionRef.current,
        greetingEmbed.description ?? "",
        (value) => updateGreetingEmbedField("description", value),
        tag,
        () => setShowEmojiPicker(false),
      );
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const payload = {
        guildId,
        panelName,
        emoji: emoji || null,
        greeting,
        postChannelId,
        ticketCategoryId,
        transcriptsEnabled,
        transcriptChannelId: transcriptChannelId || null,
        roleToPing: roleToPing || null,
        embed,
        greetingEmbed,
      };

      const res = await fetch(
        mode === "edit" && panelId
          ? `/api/tickets/${panelId}?guildId=${guildId}`
          : "/api/tickets",
        {
          method: mode === "edit" ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to save ticket panel");
      }

      router.push(`/dashboard/${guildId}/tickets`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save panel");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>
              {mode === "edit" ? "Edit Ticket Panel" : "New Ticket Panel"}
            </h1>
            <p className={styles.subtitle}>
              Configure the panel, ticket greeting, embeds, channels, and
              transcript settings.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className={styles.formStack}>
          <div className={styles.card}>
            <div className={styles.formStack}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Panel Name</label>
                <input
                  className={styles.input}
                  value={panelName}
                  onChange={(e) => setPanelName(e.target.value)}
                  placeholder="help"
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>Panel Emoji</label>
                <div className={styles.editorWrap}>
                  <input
                    className={styles.input}
                    value={emoji}
                    onChange={(e) => setEmoji(e.target.value)}
                    placeholder="<:help:123456789>"
                  />
                  <button
                    type="button"
                    className={styles.emojiButton}
                    onClick={() => {
                      setActiveEditor("emoji");
                      setShowEmojiPicker((current) => !current);
                    }}
                  >
                    <Image
                      src="/img/icons/face.svg"
                      alt=""
                      width={20}
                      height={20}
                      unoptimized
                    />
                  </button>
                </div>
              </div>

              <div className={styles.rowFields}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Post Channel</label>
                  <select
                    className={styles.glassSelect}
                    value={postChannelId}
                    onChange={(e) => setPostChannelId(e.target.value)}
                  >
                    {channels.map((channel) => (
                      <option key={channel.id} value={channel.id}>
                        #{channel.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Ticket Category</label>
                  <select
                    className={styles.glassSelect}
                    value={ticketCategoryId}
                    onChange={(e) => setTicketCategoryId(e.target.value)}
                  >
                    {channels.map((channel) => (
                      <option key={channel.id} value={channel.id}>
                        #{channel.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.rowFields}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Role To Ping</label>
                  <input
                    className={styles.input}
                    value={roleToPing}
                    onChange={(e) => setRoleToPing(e.target.value)}
                    placeholder="Role ID"
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Transcript Channel</label>
                  <input
                    className={styles.input}
                    value={transcriptChannelId}
                    onChange={(e) => setTranscriptChannelId(e.target.value)}
                    placeholder="Channel ID"
                  />
                </div>
              </div>

              <label className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={transcriptsEnabled}
                  onChange={(e) => setTranscriptsEnabled(e.target.checked)}
                />
                Enable transcripts
              </label>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>Opening Greeting Message</label>
                <div className={styles.editorWrap}>
                  <div
                    ref={greetingRef}
                    className={styles.textarea}
                    contentEditable
                    suppressContentEditableWarning
                    onFocus={() => setActiveEditor("greeting")}
                    onInput={(e) =>
                      setGreeting(
                        serializeDiscordEditorContent(e.currentTarget),
                      )
                    }
                    onBlur={(e) =>
                      setGreeting(
                        serializeDiscordEditorContent(e.currentTarget),
                      )
                    }
                  />
                  <button
                    type="button"
                    className={styles.emojiButton}
                    onClick={() => {
                      setActiveEditor("greeting");
                      setShowEmojiPicker((current) => !current);
                    }}
                  >
                    <Image
                      src="/img/icons/face.svg"
                      alt=""
                      width={20}
                      height={20}
                      unoptimized
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <EmbedEditor
            title="Panel Embed"
            embed={embed}
            setEmbed={setEmbed}
            titleRef={embedTitleRef}
            descriptionRef={embedDescriptionRef}
            setActiveEditor={setActiveEditor}
            setShowEmojiPicker={setShowEmojiPicker}
            titleEditorKey="embedTitle"
            descriptionEditorKey="embedDescription"
          />

          <EmbedEditor
            title="Ticket Greeting Embed"
            embed={greetingEmbed}
            setEmbed={setGreetingEmbed}
            titleRef={greetingTitleRef}
            descriptionRef={greetingDescriptionRef}
            setActiveEditor={setActiveEditor}
            setShowEmojiPicker={setShowEmojiPicker}
            titleEditorKey="greetingTitle"
            descriptionEditorKey="greetingDescription"
          />

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Preview</h2>

            <div className={styles.discordPreviewShell}>
              <div
                className={styles.discordEmbed}
                style={{ borderLeftColor: embed.color || "#5865F2" }}
              >
                <div className={styles.discordEmbedInner}>
                  {embed.title ? (
                    <p className={styles.previewTitle}>
                      <RenderDiscordText text={embed.title} />
                    </p>
                  ) : null}

                  {embed.description ? (
                    <p className={styles.previewDescription}>
                      <RenderDiscordText text={embed.description} />
                    </p>
                  ) : (
                    <p className={styles.previewMuted}>No embed description</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {showEmojiPicker ? (
            <EmojiPicker
              emojis={emojis}
              onPick={insertEmojiTag}
              className={styles.emojiPopover}
              itemClassName={styles.emojiItem}
            />
          ) : null}

          {error ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyText}>{error}</p>
            </div>
          ) : null}

          <div className={styles.formActions}>
            <button type="submit" className={styles.editLink} disabled={saving}>
              {saving
                ? "Saving..."
                : mode === "edit"
                  ? "Save Changes"
                  : "Create Panel"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

type EmbedEditorProps = {
  title: string;
  embed: TicketEmbedData;
  setEmbed: React.Dispatch<React.SetStateAction<TicketEmbedData>>;
  titleRef: React.RefObject<HTMLDivElement | null>;
  descriptionRef: React.RefObject<HTMLDivElement | null>;
  setActiveEditor: React.Dispatch<
    React.SetStateAction<
      | "emoji"
      | "greeting"
      | "embedTitle"
      | "embedDescription"
      | "greetingTitle"
      | "greetingDescription"
      | null
    >
  >;
  setShowEmojiPicker: React.Dispatch<React.SetStateAction<boolean>>;
  titleEditorKey: "embedTitle" | "greetingTitle";
  descriptionEditorKey: "embedDescription" | "greetingDescription";
};

function EmbedEditor({
  title,
  embed,
  setEmbed,
  titleRef,
  descriptionRef,
  setActiveEditor,
  setShowEmojiPicker,
  titleEditorKey,
  descriptionEditorKey,
}: EmbedEditorProps) {
  function updateEmbed<K extends keyof TicketEmbedData>(
    key: K,
    value: TicketEmbedData[K],
  ) {
    setEmbed((current) => ({
      ...current,
      [key]: value,
    }));
  }

  return (
    <div className={styles.card}>
      <div className={styles.formStack}>
        <h2 className={styles.cardTitle}>{title}</h2>

        <div className={styles.fieldGroup}>
          <label className={styles.label}>Title</label>
          <div className={styles.editorWrap}>
            <div
              ref={titleRef}
              className={styles.textareaSmall}
              contentEditable
              suppressContentEditableWarning
              onFocus={() => setActiveEditor(titleEditorKey)}
              onInput={(e) =>
                updateEmbed(
                  "title",
                  serializeDiscordEditorContent(e.currentTarget),
                )
              }
              onBlur={(e) =>
                updateEmbed(
                  "title",
                  serializeDiscordEditorContent(e.currentTarget),
                )
              }
            />

            <button
              type="button"
              className={styles.emojiButton}
              onClick={() => {
                setActiveEditor(titleEditorKey);
                setShowEmojiPicker((current) => !current);
              }}
            >
              <Image
                src="/img/icons/face.svg"
                alt=""
                width={20}
                height={20}
                unoptimized
              />
            </button>
          </div>
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label}>Description</label>
          <div className={styles.editorWrap}>
            <div
              ref={descriptionRef}
              className={styles.textarea}
              contentEditable
              suppressContentEditableWarning
              onFocus={() => setActiveEditor(descriptionEditorKey)}
              onInput={(e) =>
                updateEmbed(
                  "description",
                  serializeDiscordEditorContent(e.currentTarget),
                )
              }
              onBlur={(e) =>
                updateEmbed(
                  "description",
                  serializeDiscordEditorContent(e.currentTarget),
                )
              }
            />

            <button
              type="button"
              className={styles.emojiButton}
              onClick={() => {
                setActiveEditor(descriptionEditorKey);
                setShowEmojiPicker((current) => !current);
              }}
            >
              <Image
                src="/img/icons/face.svg"
                alt=""
                width={20}
                height={20}
                unoptimized
              />
            </button>
          </div>
        </div>

        <div className={styles.rowFields}>
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Color</label>
            <input
              className={styles.input}
              value={embed.color ?? ""}
              onChange={(e) => updateEmbed("color", e.target.value)}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Thumbnail URL</label>
            <input
              className={styles.input}
              value={embed.thumbnail ?? ""}
              onChange={(e) => updateEmbed("thumbnail", e.target.value)}
            />
          </div>
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label}>Image URL</label>
          <input
            className={styles.input}
            value={embed.image ?? ""}
            onChange={(e) => updateEmbed("image", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
