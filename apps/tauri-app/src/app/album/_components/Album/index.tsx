"use client";

import React, { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GoChevronLeft } from "react-icons/go";
import { z } from "zod";

import { AlbumsStore } from "~/stores/albums";
import { AlbumContext } from "../contexts";
import Prompts from "./components/Prompts";

const Album: React.FC = () => {
  const searchParams = useSearchParams();

  const id = searchParams.get("id");

  const albumId = useMemo(() => z.string().uuid().parse(id), [id]);
  const albums = AlbumsStore.albums.useValue();
  const album = useMemo(
    () => albums?.find((album) => album.id === albumId),
    [albumId, albums],
  );

  const router = useRouter();

  if (!album) {
    return null;
  }

  return (
    <AlbumContext.Provider value={album}>
      <div className="mb-4 flex items-center gap-2 text-xl text-zinc-400">
        <div
          className="flex aspect-square w-8 cursor-pointer items-center justify-center rounded-full border border-zinc-700 text-zinc-500 hover:border-zinc-600 hover:text-zinc-400 transition duration-100"
          onClick={() => router.back()}
        >
          <GoChevronLeft size={21} />
        </div>

        <h1 className="border-l border-zinc-700/50 pl-3">
          In your{" "}
          <span className="underline underline-offset-4">{album.name}</span>{" "}
          album
        </h1>
      </div>

      <Prompts />
    </AlbumContext.Provider>
  );
};

export default Album;
