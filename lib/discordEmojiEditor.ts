export function getDiscordEmojiSrc(
  emojiId: string,
  animated?: boolean,
  size = 64,
): string {
  const ext = animated ? "gif" : "png";
  return `https://cdn.discordapp.com/emojis/${emojiId}.${ext}?size=${size}&quality=lossless`;
}

export function escapeDiscordEditorHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderDiscordEditorHtml(text: string): string {
  const lines = text.split("\n");
  const emojiRegex = /<(a)?:([a-zA-Z0-9_]+):(\d+)>/g;

  return lines
    .map((line) => {
      let lastIndex = 0;
      let html = "";
      let match: RegExpExecArray | null;

      while ((match = emojiRegex.exec(line)) !== null) {
        const [fullMatch, animatedFlag, name, id] = match;
        const start = match.index;

        if (start > lastIndex) {
          html += escapeDiscordEditorHtml(line.slice(lastIndex, start));
        }

        const src = getDiscordEmojiSrc(id, Boolean(animatedFlag));
        html += `<span contenteditable="false" data-emoji-tag="${escapeDiscordEditorHtml(fullMatch)}" style="display:inline-flex;align-items:center;vertical-align:-0.2em;"><img src="${src}" alt=":${escapeDiscordEditorHtml(name)}:" title=":${escapeDiscordEditorHtml(name)}:" width="22" height="22" style="display:block;" /></span>\u200B`;
        lastIndex = start + fullMatch.length;
      }

      if (lastIndex < line.length) {
        html += escapeDiscordEditorHtml(line.slice(lastIndex));
      }

      return html.length > 0 ? `<div>${html}</div>` : `<div><br></div>`;
    })
    .join("");
}

export function serializeDiscordEditorNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return (node.textContent ?? "").replace(/\u200B/g, "");
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return "";
  }

  const element = node as HTMLElement;

  if (element.tagName === "BR") {
    return "\n";
  }

  const emojiTag = element.getAttribute("data-emoji-tag");
  if (emojiTag) {
    return emojiTag;
  }

  const children = Array.from(element.childNodes)
    .map(serializeDiscordEditorNode)
    .join("");

  if (element.tagName === "DIV" || element.tagName === "P") {
    return `${children}\n`;
  }

  return children;
}

export function serializeDiscordEditorContent(editor: HTMLDivElement): string {
  return Array.from(editor.childNodes)
    .map(serializeDiscordEditorNode)
    .join("")
    .replace(/\n+$/g, "");
}

export function syncDiscordEditorContent(
  editor: HTMLDivElement | null,
  value: string,
) {
  if (!editor) return;

  const currentSerialized = serializeDiscordEditorContent(editor);
  if (currentSerialized !== value) {
    editor.innerHTML = renderDiscordEditorHtml(value);
  }
}

export function insertDiscordEmojiTagIntoEditor(
  editor: HTMLDivElement | null,
  currentValue: string,
  setValue: (value: string) => void,
  tag: string,
  onDone?: () => void,
) {
  if (!editor) return;

  editor.focus();

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    const next = `${currentValue}${tag}`;
    setValue(next);
    editor.innerHTML = renderDiscordEditorHtml(next);
    onDone?.();
    return;
  }

  const range = selection.getRangeAt(0);
  range.deleteContents();

  const textNode = document.createTextNode(tag);
  range.insertNode(textNode);

  range.setStartAfter(textNode);
  range.collapse(true);

  selection.removeAllRanges();
  selection.addRange(range);

  const nextValue = serializeDiscordEditorContent(editor);
  setValue(nextValue);
  editor.innerHTML = renderDiscordEditorHtml(nextValue);
  onDone?.();
}
