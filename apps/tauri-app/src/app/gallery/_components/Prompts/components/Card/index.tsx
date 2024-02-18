import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { fetch, ResponseType } from "@tauri-apps/api/http";
import { IoAdd } from "react-icons/io5";

import type { PromptCardData } from "~/app/_components/PromptCard";
import { ActionButton, PromptCard } from "~/app/_components/PromptCard";
import Spinner from "~/app/_components/Spinner";
import { UserStore } from "~/stores/user";
import { saveWallpaperFiles } from "~/utils/wallpapers";

export type CardProps = Omit<PromptCardData, "image">;

const Card: React.FC<CardProps> = ({ id, prompt }) => {
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);

  const imageSrc = `https://raw.githubusercontent.com/auto-wallpaper/auto-wallpaper/gallery/${id}.jpeg`;

  return (
    <PromptCard
      id={id}
      image={{
        source: imageSrc,
        status: "loading",
      }}
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
                const { data: imageData } = await fetch<Uint8Array>(imageSrc, {
                  method: "GET",
                  responseType: ResponseType.Binary,
                });

                await saveWallpaperFiles({
                  promptId: last.id,
                  originalImage: imageData,
                  upscaleImage: imageData,
                });
              }

              await UserStore.selectedPrompt.set(last.id);

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
