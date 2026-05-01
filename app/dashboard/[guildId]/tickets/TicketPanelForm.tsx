"use client";

import { useEffect, useRef, useState } from "react";
import RoleMentionPicker from "@/components/discord/RoleMentionPicker";
import Image from "next/image";
import { useRouter } from "next/navigation";
import styles from "./tickets.module.css";
import EmojiPicker, {
  type DiscordEmoji,
} from "@/components/discord/EmojiPicker";
import RenderDiscordText from "@/components/discord/RenderDiscordText";
import {
  getDiscordEmojiSrc,
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

type GuildRole = {
  id: string;
  name: string;
  color?: string;
  position?: number;
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


function createEmojiNode(tag: string): HTMLSpanElement | null {
  const match = tag.match(/^<(a)?:([a-zA-Z0-9_]+):(\d+)>$/);
  if (!match) return null;

  const [, animatedFlag, name, id] = match;
  const span = document.createElement("span");
  const img = document.createElement("img");

  span.contentEditable = "false";
  span.setAttribute("data-emoji-tag", tag);
  span.style.display = "inline-flex";
  span.style.alignItems = "center";
  span.style.verticalAlign = "-0.2em";

  img.src = getDiscordEmojiSrc(id, Boolean(animatedFlag));
  img.alt = `:${name}:`;
  img.title = `:${name}:`;
  img.width = 22;
  img.height = 22;
  img.style.display = "block";

  span.appendChild(img);
  return span;
}

function createRoleMentionNode(role: GuildRole): HTMLSpanElement {
  const span = document.createElement("span");

  span.contentEditable = "false";
  span.setAttribute("data-role-mention", role.id);
  span.textContent = `@${role.name}`;
  span.className = styles.roleMentionChip;

  return span;
}

function renderRoleMentionsInsideEditor(
  editor: HTMLDivElement,
  roles: GuildRole[],
) {
  const rolesById = new Map(roles.map((role) => [role.id, role]));
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];

  while (walker.nextNode()) {
    textNodes.push(walker.currentNode as Text);
  }

  textNodes.forEach((textNode) => {
    const parent = textNode.parentElement;
    if (parent?.closest("[data-role-mention]")) return;

    const value = textNode.nodeValue ?? "";
    const parts = value.split(/(<@&\d+>)/g);
    if (parts.length === 1) return;

    const fragment = document.createDocumentFragment();

    parts.forEach((part) => {
      const match = part.match(/^<@&(\d+)>$/);

      if (!match) {
        fragment.append(document.createTextNode(part));
        return;
      }

      const role = rolesById.get(match[1]);
      if (!role) {
        fragment.append(document.createTextNode(part));
        return;
      }

      fragment.append(createRoleMentionNode(role));
    });

    textNode.replaceWith(fragment);
  });
}


function cleanEditorValue(value: string) {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[\u200B\u200C\u200D\uFEFF]/g, "")
    .replace(/\n{3,}/g, "\n\n");
}

function serializeTicketEditorContent(editor: HTMLDivElement) {
  const blockTags = new Set(["DIV", "P"]);

  function walk(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent ?? "";
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return "";
    }

    const element = node as HTMLElement;

    if (element.dataset?.emojiTag) {
      return element.dataset.emojiTag;
    }

    if (element.dataset?.roleMention) {
      return `<@&${element.dataset.roleMention}>`;
    }

    if (element.tagName === "BR") {
      return "\n";
    }

    return Array.from(element.childNodes).map(walk).join("");
  }

  let output = "";

  for (const node of Array.from(editor.childNodes)) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;

      if (blockTags.has(element.tagName)) {
        const content = walk(element);

        if (output && !output.endsWith("\n")) {
          output += "\n";
        }

        output += content;

        if (!output.endsWith("\n")) {
          output += "\n";
        }

        continue;
      }
    }

    output += walk(node);
  }

  return cleanEditorValue(output);
}

function renderRoleMentionsForPreview(text: string | null, roles: GuildRole[]) {
  if (!text) return "";

  return text.replace(/<@&(\d+)>/g, (_match, roleId) => {
    const role = roles.find((r) => r.id === roleId);
    return role ? `@${role.name}` : "@unknown-role";
  });
}

function insertEmojiNodeAtCursor(
  editor: HTMLDivElement | null,
  tag: string,
  setValue: (value: string) => void,
  savedRangeRef?: React.RefObject<Range | null>,
) {
  if (!editor) return;

  editor.focus();

  const selection = window.getSelection();
  const range: Range | null = savedRangeRef?.current ?? null;
  const emojiNode = createEmojiNode(tag);
  if (!emojiNode) return;

  const spacer = document.createTextNode("\u200B");

  if (range && editor.contains(range.commonAncestorContainer)) {
    range.deleteContents();
    range.insertNode(spacer);
    range.insertNode(emojiNode);
    range.setStartAfter(spacer);
    range.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(range);
    if (savedRangeRef) savedRangeRef.current = range.cloneRange();
  } else if (selection && selection.rangeCount > 0) {
    const liveRange = selection.getRangeAt(0);

    if (editor.contains(liveRange.commonAncestorContainer)) {
      liveRange.deleteContents();
      liveRange.insertNode(spacer);
      liveRange.insertNode(emojiNode);
      liveRange.setStartAfter(spacer);
      liveRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(liveRange);
      if (savedRangeRef) savedRangeRef.current = liveRange.cloneRange();
    } else {
      editor.appendChild(emojiNode);
      editor.appendChild(spacer);
    }
  } else {
    editor.appendChild(emojiNode);
    editor.appendChild(spacer);
  }

  setValue(serializeTicketEditorContent(editor));
}

export default function TicketPanelForm({
  guildId,
  mode,
  panelId,
  initialPanel,
}: Props) {
  const router = useRouter();

  const [channels, setChannels] = useState<GuildChannel[]>([]);
  const [roles, setRoles] = useState<GuildRole[]>([]);
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
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [roleSearch, setRoleSearch] = useState("");
  function insertRoleMentionAtCursor(role: GuildRole) {
    const editorMap = {
      greeting: greetingRef.current,
      embedTitle: embedTitleRef.current,
      embedDescription: embedDescriptionRef.current,
      greetingTitle: greetingTitleRef.current,
      greetingDescription: greetingDescriptionRef.current,
    } as const;

    const editor = activeEditor
      ? editorMap[activeEditor as keyof typeof editorMap]
      : null;
    if (!editor) return;

    editor.focus();

    const selection = window.getSelection();
    const range = savedRangeRef.current;
    const mentionNode = createRoleMentionNode(role);
    const spacer = document.createTextNode("\u200B");

    function trimTypedMention(rangeToTrim: Range) {
      const startContainer = rangeToTrim.startContainer;
      if (startContainer.nodeType !== Node.TEXT_NODE) return;

      const text = startContainer.textContent ?? "";
      const beforeCursor = text.slice(0, rangeToTrim.startOffset);
      const match = beforeCursor.match(/@([a-zA-Z0-9_ -]*)$/);
      if (!match) return;

      rangeToTrim.setStart(
        startContainer,
        rangeToTrim.startOffset - match[0].length,
      );
    }

    if (range && editor.contains(range.commonAncestorContainer)) {
      trimTypedMention(range);
      range.deleteContents();
      range.insertNode(spacer);
      range.insertNode(mentionNode);
      range.setStartAfter(spacer);
      range.collapse(true);
      selection?.removeAllRanges();
      selection?.addRange(range);
      savedRangeRef.current = range.cloneRange();
    } else if (selection && selection.rangeCount > 0) {
      const liveRange = selection.getRangeAt(0);

      if (editor.contains(liveRange.commonAncestorContainer)) {
        trimTypedMention(liveRange);
        liveRange.deleteContents();
        liveRange.insertNode(spacer);
        liveRange.insertNode(mentionNode);
        liveRange.setStartAfter(spacer);
        liveRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(liveRange);
        savedRangeRef.current = liveRange.cloneRange();
      } else {
        editor.appendChild(mentionNode);
        editor.appendChild(spacer);
      }
    } else {
      editor.appendChild(mentionNode);
      editor.appendChild(spacer);
    }

    const value = serializeTicketEditorContent(editor);

    if (activeEditor === "greeting") setGreeting(value);
    if (activeEditor === "embedTitle") updateEmbedField("title", value);
    if (activeEditor === "embedDescription") updateEmbedField("description", value);
    if (activeEditor === "greetingTitle") updateGreetingEmbedField("title", value);
    if (activeEditor === "greetingDescription") updateGreetingEmbedField("description", value);

    setShowRolePicker(false);
  }
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const greetingRef = useRef<HTMLDivElement | null>(null);
  const embedTitleRef = useRef<HTMLDivElement | null>(null);
  const embedDescriptionRef = useRef<HTMLDivElement | null>(null);
  const greetingTitleRef = useRef<HTMLDivElement | null>(null);
  const greetingDescriptionRef = useRef<HTMLDivElement | null>(null);
  const savedRangeRef = useRef<Range | null>(null);

  function saveCurrentEditorRange(editor: HTMLDivElement | null) {
    if (!editor) return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return;
    savedRangeRef.current = range.cloneRange();
  }

  function handleRoleMentionSearch(editor: HTMLDivElement) {
    saveCurrentEditorRange(editor);

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      setShowRolePicker(false);
      setRoleSearch("");
      return;
    }

    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) {
      setShowRolePicker(false);
      setRoleSearch("");
      return;
    }

    const textBeforeCursor =
      range.startContainer.textContent?.slice(0, range.startOffset) ?? "";
    const match = textBeforeCursor.match(/@([a-zA-Z0-9_ -]*)$/);

    if (!match) {
      setShowRolePicker(false);
      setRoleSearch("");
      return;
    }

    setShowEmojiPicker(false);
    setRoleSearch(match[1] ?? "");
    setShowRolePicker(true);
  }

  const postChannels = channels.filter((channel) =>
    [0, 5, 15].includes(Number(channel.type)),
  );
  const categoryChannels = channels.filter(
    (channel) => Number(channel.type) === 4,
  );
  const transcriptChannels = channels.filter((channel) =>
    [0, 5].includes(Number(channel.type)),
  );

  useEffect(() => {
    async function loadData() {
      const [channelsRes, rolesRes, emojiRes] = await Promise.all([
        fetch(`/api/guilds/${guildId}/channels`),
        fetch(`/api/guilds/${guildId}/roles`),
        fetch("/api/emojis"),
      ]);

      const channelsData = await channelsRes.json();
      const rolesData = await rolesRes.json();
      const emojiData = await emojiRes.json();

      const nextChannels: GuildChannel[] = Array.isArray(channelsData.channels)
        ? channelsData.channels
        : [];
      const nextRoles: GuildRole[] = Array.isArray(rolesData.roles)
        ? rolesData.roles
        : [];

      const nextPostChannels = nextChannels.filter((channel) =>
        [0, 5, 15].includes(Number(channel.type)),
      );
      const nextCategoryChannels = nextChannels.filter(
        (channel) => Number(channel.type) === 4,
      );
      const nextTranscriptChannels = nextChannels.filter((channel) =>
        [0, 5].includes(Number(channel.type)),
      );

      setChannels(nextChannels);
      setRoles(nextRoles);
      setEmojis(Array.isArray(emojiData.emojis) ? emojiData.emojis : []);

      setPostChannelId((current) => current || nextPostChannels[0]?.id || "");
      setTicketCategoryId(
        (current) => current || nextCategoryChannels[0]?.id || "",
      );
      setTranscriptChannelId(
        (current) => current || nextTranscriptChannels[0]?.id || "",
      );
    }

    loadData();
  }, [guildId]);

  useEffect(() => {
    const editor = greetingRef.current;
    if (!editor) return;
    if (document.activeElement === editor) return;
    syncDiscordEditorContent(editor, greeting);
    renderRoleMentionsInsideEditor(editor, roles);
  }, [greeting, roles]);

  useEffect(() => {
    const editor = embedTitleRef.current;
    if (!editor) return;
    if (document.activeElement === editor) return;
    syncDiscordEditorContent(editor, embed.title ?? "");
    renderRoleMentionsInsideEditor(editor, roles);
  }, [embed.title, roles]);

  useEffect(() => {
    const editor = embedDescriptionRef.current;
    if (!editor) return;
    if (document.activeElement === editor) return;
    syncDiscordEditorContent(editor, embed.description ?? "");
    renderRoleMentionsInsideEditor(editor, roles);
  }, [embed.description, roles]);

  useEffect(() => {
    const editor = greetingTitleRef.current;
    if (!editor) return;
    if (document.activeElement === editor) return;
    syncDiscordEditorContent(editor, greetingEmbed.title ?? "");
    renderRoleMentionsInsideEditor(editor, roles);
  }, [greetingEmbed.title, roles]);

  useEffect(() => {
    const editor = greetingDescriptionRef.current;
    if (!editor) return;
    if (document.activeElement === editor) return;
    syncDiscordEditorContent(editor, greetingEmbed.description ?? "");
    renderRoleMentionsInsideEditor(editor, roles);
  }, [greetingEmbed.description, roles]);

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
      insertEmojiNodeAtCursor(greetingRef.current, tag, setGreeting, savedRangeRef);
      setShowEmojiPicker(false);
      return;
    }

    if (activeEditor === "embedTitle") {
      insertEmojiNodeAtCursor(
        embedTitleRef.current,
        tag,
        (value) => updateEmbedField("title", value),
        savedRangeRef,
      );
      setShowEmojiPicker(false);
      return;
    }

    if (activeEditor === "embedDescription") {
      insertEmojiNodeAtCursor(
        embedDescriptionRef.current,
        tag,
        (value) => updateEmbedField("description", value),
        savedRangeRef,
      );
      setShowEmojiPicker(false);
      return;
    }

    if (activeEditor === "greetingTitle") {
      insertEmojiNodeAtCursor(
        greetingTitleRef.current,
        tag,
        (value) => updateGreetingEmbedField("title", value),
        savedRangeRef,
      );
      setShowEmojiPicker(false);
      return;
    }

    if (activeEditor === "greetingDescription") {
      insertEmojiNodeAtCursor(
        greetingDescriptionRef.current,
        tag,
        (value) => updateGreetingEmbedField("description", value),
        savedRangeRef,
      );
      setShowEmojiPicker(false);
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

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primaryLink}
              onClick={() => router.push(`/dashboard/${guildId}/tickets`)}
            >
              Back
            </button>
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
                    {postChannels.map((channel) => (
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
                    {categoryChannels.map((channel) => (
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
                  <select
                    className={styles.glassSelect}
                    value={roleToPing}
                    onChange={(e) => setRoleToPing(e.target.value)}
                  >
                    <option value="">No role</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        @{role.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Transcript Channel</label>
                  <select
                    className={styles.glassSelect}
                    value={transcriptChannelId}
                    onChange={(e) => setTranscriptChannelId(e.target.value)}
                  >
                    <option value="">No transcript channel</option>
                    {transcriptChannels.map((channel) => (
                      <option key={channel.id} value={channel.id}>
                        #{channel.name}
                      </option>
                    ))}
                  </select>
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
                    onFocus={(e) => {
                      setActiveEditor("greeting");
                      saveCurrentEditorRange(e.currentTarget);
                    }}
                    onMouseUp={(e) => saveCurrentEditorRange(e.currentTarget)}
                    onKeyUp={(e) => saveCurrentEditorRange(e.currentTarget)}
                    onInput={(e) => {
                      setGreeting(
                        serializeTicketEditorContent(e.currentTarget)
                      );
                      handleRoleMentionSearch(e.currentTarget);
                    }}
                    onBlur={(e) =>
                      setGreeting(
                        serializeTicketEditorContent(e.currentTarget)
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
                  <button
                    type="button"
                    className={styles.emojiButton}
                    onClick={() => {
                      setActiveEditor("greeting");
                      saveCurrentEditorRange(greetingRef.current);
                      setRoleSearch("");
                      setShowEmojiPicker(false);
                      setShowRolePicker((current) => !current);
                    }}
                  >
                    @
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
            setRoleSearch={setRoleSearch}
            setShowEmojiPicker={setShowEmojiPicker}
            setShowRolePicker={setShowRolePicker}
            handleRoleMentionSearch={handleRoleMentionSearch}
            saveCurrentEditorRange={saveCurrentEditorRange}
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
            setRoleSearch={setRoleSearch}
            setShowEmojiPicker={setShowEmojiPicker}
            setShowRolePicker={setShowRolePicker}
            handleRoleMentionSearch={handleRoleMentionSearch}
            saveCurrentEditorRange={saveCurrentEditorRange}
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
                      <RenderDiscordText
                        text={renderRoleMentionsForPreview(embed.title, roles)}
                      />
                    </p>
                  ) : null}

                  {embed.description ? (
                    <p className={styles.previewDescription}>
                      <RenderDiscordText
                        text={renderRoleMentionsForPreview(embed.description, roles)}
                      />
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
          {showRolePicker ? (
            <RoleMentionPicker
              roles={roles}
              search={roleSearch}
              onPick={(role) => insertRoleMentionAtCursor(role)}
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
  setRoleSearch: React.Dispatch<React.SetStateAction<string>>;
  setShowEmojiPicker: React.Dispatch<React.SetStateAction<boolean>>;
  setShowRolePicker: React.Dispatch<React.SetStateAction<boolean>>;
  handleRoleMentionSearch: (editor: HTMLDivElement) => void;
  saveCurrentEditorRange: (editor: HTMLDivElement | null) => void;
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
  setRoleSearch,
  setShowEmojiPicker,
  setShowRolePicker,
  handleRoleMentionSearch,
  saveCurrentEditorRange,
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
              onFocus={(e) => {
                setActiveEditor(titleEditorKey);
                saveCurrentEditorRange(e.currentTarget);
              }}
              onMouseUp={(e) => saveCurrentEditorRange(e.currentTarget)}
              onKeyUp={(e) => saveCurrentEditorRange(e.currentTarget)}
              onInput={(e) => {
                updateEmbed(
                  "title",
                  serializeTicketEditorContent(e.currentTarget),
                );
                handleRoleMentionSearch(e.currentTarget);
              }}
              onBlur={(e) =>
                updateEmbed(
                  "title",
                  serializeTicketEditorContent(e.currentTarget),
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
            <button
              type="button"
              className={styles.emojiButton}
              onClick={() => {
                setActiveEditor(titleEditorKey);
                saveCurrentEditorRange(titleRef.current);
                setRoleSearch("");
                setShowEmojiPicker(false);
                setShowRolePicker((current) => !current);
              }}
            >
              @
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
              onFocus={(e) => {
                setActiveEditor(descriptionEditorKey);
                saveCurrentEditorRange(e.currentTarget);
              }}
              onMouseUp={(e) => saveCurrentEditorRange(e.currentTarget)}
              onKeyUp={(e) => saveCurrentEditorRange(e.currentTarget)}
              onInput={(e) => {
                updateEmbed(
                  "description",
                  serializeTicketEditorContent(e.currentTarget),
                );
                handleRoleMentionSearch(e.currentTarget);
              }}
              onBlur={(e) =>
                updateEmbed(
                  "description",
                  serializeTicketEditorContent(e.currentTarget),
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
            <button
              type="button"
              className={styles.emojiButton}
              onClick={() => {
                setActiveEditor(descriptionEditorKey);
                saveCurrentEditorRange(descriptionRef.current);
                setRoleSearch("");
                setShowEmojiPicker(false);
                setShowRolePicker((current) => !current);
              }}
            >
              @
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
