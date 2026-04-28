"use client";

import React from "react";
import Image from "next/image";

type Props = {
  text: string;
  emojiSize?: number;
  className?: string;
};

export function getDiscordEmojiSrc(
  emojiId: string,
  animated?: boolean,
  size = 64,
): string {
  const ext = animated ? "gif" : "png";
  return `https://cdn.discordapp.com/emojis/${emojiId}.${ext}?size=${size}&quality=lossless`;
}

function renderInlineMarkdown(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const regex = /(\*\*([^*]+)\*\*|\*([^*]+)\*|__([^_]+)__|_([^_]+)_|`([^`]+)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = regex.exec(text)) !== null) {
    const start = match.index;

    if (start > lastIndex) {
      nodes.push(text.slice(lastIndex, start));
    }

    const boldText = match[2] ?? match[4];
    const italicText = match[3] ?? match[5];
    const codeText = match[6];

    if (boldText) {
      nodes.push(
        <strong key={`${keyPrefix}-bold-${index}`}>{boldText}</strong>,
      );
    } else if (italicText) {
      nodes.push(<em key={`${keyPrefix}-italic-${index}`}>{italicText}</em>);
    } else if (codeText) {
      nodes.push(<code key={`${keyPrefix}-code-${index}`}>{codeText}</code>);
    }

    lastIndex = start + match[0].length;
    index += 1;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

function renderDiscordTextParts(text: string, emojiSize: number): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const emojiRegex = /<(a)?:([a-zA-Z0-9_]+):(\d+)>/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let textIndex = 0;

  while ((match = emojiRegex.exec(text)) !== null) {
    const [fullMatch, animatedFlag, name, id] = match;
    const start = match.index;

    if (start > lastIndex) {
      parts.push(
        ...renderInlineMarkdown(
          text.slice(lastIndex, start),
          `text-${textIndex}`,
        ),
      );
      textIndex += 1;
    }

    parts.push(
      <Image
        key={`${id}-${start}-${fullMatch}`}
        src={getDiscordEmojiSrc(id, Boolean(animatedFlag))}
        alt={`:${name}:`}
        title={`:${name}:`}
        width={emojiSize}
        height={emojiSize}
        unoptimized
        style={{
          display: "inline-block",
          verticalAlign: "-0.2em",
          marginRight: 4,
        }}
      />,
    );

    lastIndex = start + fullMatch.length;
  }

  if (lastIndex < text.length) {
    parts.push(
      ...renderInlineMarkdown(text.slice(lastIndex), `text-${textIndex}`),
    );
  }

  return parts.flatMap((part, index) => {
    if (typeof part !== "string") return part;

    return part.split("\n").flatMap((line, i, arr) => {
      if (i < arr.length - 1) {
        return [line, <br key={`br-${index}-${i}`} />];
      }

      return line;
    });
  });
}

export default function RenderDiscordText({
  text,
  emojiSize = 20,
  className,
}: Props) {
  const rendered = renderDiscordTextParts(text, emojiSize);

  if (className) {
    return <span className={className}>{rendered}</span>;
  }

  return <>{rendered}</>;
}
