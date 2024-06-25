"use client";

import React, { useCallback, useEffect, useRef } from "react";
import { useHash } from "@mantine/hooks";

import { DraggableCard, PromptCard } from "~/app/_components/PromptCard";
import { useWallpaperSource } from "~/lib/WallpaperFile";
import { UserStore } from "~/stores/user";
import Actions from "./components/Actions";
import { readFile } from "@tauri-apps/plugin-fs";

type PromptCardProps = {
  data: (typeof UserStore.prompts.$inferOutput)[number];
};

const UserPromptCard: React.FC<PromptCardProps> = ({
  data: { id, prompt },
}) => {
  const selectedPrompt = UserStore.selectedPrompt.useValue();
  const { source } = useWallpaperSource(id);
  const [hash] = useHash();
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (hash.slice(1) === id) {
      cardRef.current?.scrollIntoView({});
    }
  }, [hash, id, cardRef]);

  return (
    <DraggableCard id={id}>
      <PromptCard
        ref={cardRef}
        id={id}
        prompt={prompt}
        source={source}
        className={{
          root:
            selectedPrompt?.type === "prompt" &&
            selectedPrompt.id === id &&
            "border-zinc-200",
        }}
        actions={<Actions hasImage={!!source} />}
        onSelect={() =>
          UserStore.selectedPrompt.set({
            id,
            type: "prompt",
          })
        }
      />
    </DraggableCard>
  );
};

export default UserPromptCard;
