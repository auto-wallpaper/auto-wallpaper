"use client";

import React, { useEffect, useRef } from "react";
import { useHash } from "@mantine/hooks";

import { PromptCard } from "~/app/_components/PromptCard";
import { useWallpaperSource } from "~/lib/WallpaperFile";
import { UserStore } from "~/stores/user";
import Actions from "./components/Actions";

type PromptCardProps = {
  data: (typeof UserStore.prompts.$inferOutput)[number];
};

const UserPromptCard: React.FC<PromptCardProps> = ({
  data: { id, prompt },
}) => {
  const selectedPromptId = UserStore.selectedPrompt.useValue();
  const { source, status } = useWallpaperSource(id);
  const [hash] = useHash();
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (hash.slice(1) === id) {
      cardRef.current?.scrollIntoView({});
    }
  }, [hash, id, cardRef]);

  return (
    <PromptCard
      ref={cardRef}
      id={id}
      prompt={prompt}
      image={{ source, status }}
      className={{
        root: selectedPromptId === id && "border-zinc-200",
      }}
      actions={<Actions />}
      onSelect={() => UserStore.selectedPrompt.set(id)}
    />
  );
};

export default UserPromptCard;
