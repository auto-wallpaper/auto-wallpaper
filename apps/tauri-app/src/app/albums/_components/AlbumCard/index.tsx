import React, { useCallback, useMemo } from "react";
import Link from "next/link";
import { MdPlaylistPlay } from "react-icons/md";

import type { AlbumsStore } from "~/stores/albums";
import { DraggableCard, PromptCard } from "~/app/_components/PromptCard";
import { useWallpaperSource } from "~/lib/WallpaperFile";
import { UserStore } from "~/stores/user";
import AlbumActions from "./components/Actions";
import { AlbumContext } from "./contexts";
import { readFile } from "@tauri-apps/plugin-fs";

type AlbumCardProps = {
  album: (typeof AlbumsStore.albums.$inferOutput)[number];
};

const AlbumCard: React.FC<AlbumCardProps> = ({ album }) => {
  const prompts = UserStore.prompts.useValue();

  const mostRecentGeneratedPrompt = useMemo(
    () =>
      prompts
        ?.filter((prompt) => album.prompts.includes(prompt.id))
        .sort((a, b) => {
          if (!a.generatedAt) return 1;
          if (!b.generatedAt) return -1;

          return b.generatedAt.getTime() - a.generatedAt.getTime();
        })[0],
    [album.prompts, prompts],
  );

  const { source } = useWallpaperSource(mostRecentGeneratedPrompt?.id);
  const selectedPrompt = UserStore.selectedPrompt.useValue();

  return (
    <AlbumContext.Provider value={album}>
      <DraggableCard id={album.id}>
        <div className="relative pt-2">
          <div className="absolute bottom-2 left-1/2 -z-20 h-[calc(100%-theme(spacing.2))] w-[90%] -translate-x-1/2 rounded-md border border-zinc-800 bg-zinc-700 opacity-60 shadow-sm" />
          <div className="absolute bottom-1 left-1/2 -z-10 h-[calc(100%-theme(spacing.2))] w-[95%] -translate-x-1/2 rounded-md border border-zinc-800 bg-zinc-700 opacity-80 shadow-sm" />

          <PromptCard
            id={album.id}
            prompt={album.name}
            actions={<AlbumActions />}
            imageLoader={useCallback(async () => source === null ? null : await readFile(source), [source])}
            onSelect={() => {
              void UserStore.selectedPrompt.set({
                id: album.id,
                type: "album",
              });
            }}
            className={{
              root:
                selectedPrompt?.type === "album" &&
                selectedPrompt.id === album.id &&
                "border-zinc-200",
            }}
          />

          <p className="absolute bottom-3 right-3 z-10 rounded-md bg-zinc-900/70 px-2 py-1 text-xs">
            <MdPlaylistPlay className="inline" size={15} />{" "}
            {album.prompts.length > 0
              ? `${album.prompts.length} prompt${
                  album.prompts.length > 1 ? "s" : ""
                }`
              : "empty"}
          </p>

          <Link
            href={{
              pathname: "/album",
              search: new URLSearchParams({ id: album.id }).toString(),
            }}
            className="absolute bottom-3 left-3 z-10 px-2 py-1 text-xs text-zinc-400 underline-offset-2 hover:underline"
            data-no-dnd
          >
            View full album
          </Link>
        </div>
      </DraggableCard>
    </AlbumContext.Provider>
  );
};

export default AlbumCard;
