"use client";

import React, { useEffect } from "react";
import { useHash } from "@mantine/hooks";

import { useScrollViewportRef } from "@acme/ui/scroll-area";

import { DraggableCard, PromptCard } from "~/app/_components/PromptCard";
import { useWallpaperSource } from "~/lib/WallpaperFile";
import { UserStore } from "~/stores/user";
import Actions from "./components/Actions";

type PromptCardProps = {
  data: (typeof UserStore.prompts.$inferOutput)[number];
};

const UserPromptCard: React.FC<PromptCardProps> = ({
  data: { id, prompt },
}) => {
  const scrollViewportRef = useScrollViewportRef();
  const selectedPrompt = UserStore.selectedPrompt.useValue();
  const { source } = useWallpaperSource(id);
  const [hash] = useHash();

  useEffect(() => {
    if (hash.slice(1) === id && scrollViewportRef.current) {
      scrollViewportRef.current.scrollTo({
        top:
          scrollViewportRef.current.scrollHeight -
          scrollViewportRef.current.clientHeight,
      });
    }
  }, [hash, id, scrollViewportRef]);

  return (
    <DraggableCard id={id}>
      <PromptCard
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
