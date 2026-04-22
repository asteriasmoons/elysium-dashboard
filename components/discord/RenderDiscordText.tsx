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

export default function RenderDiscordText({
  text,
  emojiSize = 20,
  className,
}: Props) {
  const parts: React.ReactNode[] = [];
  const regex = /<(a)?:([a-zA-Z0-9_]+):(\d+)>/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const [fullMatch, animatedFlag, name, id] = match;
    const start = match.index;

    if (start > lastIndex) {
      parts.push(text.slice(lastIndex, start));
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
    parts.push(text.slice(lastIndex));
  }

  const rendered = parts.flatMap((part, index) => {
    if (typeof part !== "string") return part;

    return part.split("\n").flatMap((line, i, arr) => {
      if (i < arr.length - 1) {
        return [line, <br key={`br-${index}-${i}`} />];
      }
      return line;
    });
  });

  if (className) {
    return <span className={className}>{rendered}</span>;
  }

  return <>{rendered}</>;
}
