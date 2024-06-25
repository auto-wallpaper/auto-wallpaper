import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetch } from "@tauri-apps/plugin-http";
import { IoAdd } from "react-icons/io5";

import type { PromptCardData } from "~/app/_components/PromptCard";
import { ActionButton, PromptCard } from "~/app/_components/PromptCard";
import Spinner from "~/app/_components/Spinner";
import {
  useWallpaperSource,
  useWallpaperSourceStore,
} from "~/lib/WallpaperFile";
import { UserStore } from "~/stores/user";
import { saveWallpaperFiles } from "~/utils/wallpapers";

export type CardProps = Omit<PromptCardData, "source">;

const Card: React.FC<CardProps> = ({ id, prompt }) => {
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);

  const imageSrc = `https://raw.githubusercontent.com/auto-wallpaper/auto-wallpaper/gallery/${id}.jpeg`;

  const source = useWallpaperSourceStore((state) => state.sources[id] ?? null);
  const load = useWallpaperSourceStore((state) => state.load);

  useEffect(() => {
    void load(id, imageSrc);
  }, [load]);

  return (
    <PromptCard
      id={id}
      source={source}
      prompt={prompt}
      actions={
        <>
          <ActionButton
            Icon={isAdding ? Spinner : IoAdd}
            onClick={async () => {
              setIsAdding(true);
              const prompts = await UserStore.prompts.set((prev) => [
                ...prev,
                {
                  prompt,
                },
              ]);

              const last = prompts[prompts.length - 1]!;

              if (typeof imageSrc === "string") {
                const resp = await fetch(imageSrc, {
                  method: "GET",
                });

                const data = new Uint8Array(await resp.arrayBuffer());

                await saveWallpaperFiles({
                  promptId: last.id,
                  image: data,
                });
              }

              await UserStore.selectedPrompt.set({
                id: last.id,
                type: "prompt",
              });

              setIsAdding(false);

              router.push(`/#${last.id}`);
            }}
          />
        </>
      }
    />
  );
};

export default Card;
