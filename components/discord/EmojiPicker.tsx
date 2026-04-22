"use client";

import Image from "next/image";
import { getDiscordEmojiSrc } from "@/lib/discordEmojiEditor";

export type DiscordEmoji = {
  id: string;
  name: string;
  animated?: boolean;
};

type Props = {
  emojis: DiscordEmoji[];
  onPick: (emojiTag: string) => void;
  className?: string;
  itemClassName?: string;
};

export default function EmojiPicker({
  emojis,
  onPick,
  className,
  itemClassName,
}: Props) {
  return (
    <div className={className} onMouseDown={(e) => e.preventDefault()}>
      {emojis.map((emoji) => {
        const emojiTag = `<${emoji.animated ? "a" : ""}:${emoji.name}:${emoji.id}>`;

        return (
          <button
            key={emoji.id}
            type="button"
            className={itemClassName}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onPick(emojiTag)}
            title={emoji.name}
          >
            <Image
              src={getDiscordEmojiSrc(emoji.id, emoji.animated)}
              alt={emoji.name}
              width={28}
              height={28}
              unoptimized
            />
          </button>
        );
      })}
    </div>
  );
}
