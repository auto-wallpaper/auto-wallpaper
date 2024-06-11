"use client";

import React, { useState } from "react";
import { LuCheck } from "react-icons/lu";
import { MdOutlinePlaylistAddCheck } from "react-icons/md";

import { Button } from "@acme/ui/button";
import { Input } from "@acme/ui/input";
import { Label } from "@acme/ui/label";

import { usePromptContext } from "~/app/_components/PromptCard";
import { AlbumsStore } from "~/stores/albums";
import Action from "../Action";

const AlbumAction: React.FC = () => {
  const { id } = usePromptContext();
  const albums = AlbumsStore.albums.useValue();
  const [newAlbumName, setNewAlbumName] = useState("");

  return (
    <Action
      Icon={MdOutlinePlaylistAddCheck}
      onOpenChange={() => setNewAlbumName("")}
    >
      <h3>Albums</h3>

      <hr className="py-0 opacity-10" />

      <form
        className="flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault()

          await AlbumsStore.albums.set((prev) => [
            ...prev,
            {
              name: newAlbumName,
            },
          ]);

          setNewAlbumName("");
        }}
      >
        <Input
          placeholder="Create new album..."
          onChange={(e) => setNewAlbumName(e.target.value)}
          value={newAlbumName}
        />
        <Button>Create</Button>
      </form>

      <div className="flex flex-col gap-1">
        {albums?.map((album) => {
          const isAdded = album.prompts.includes(id);
          return (
            <Button
              key={album.id}
              className="flex items-center justify-start gap-2 bg-transparent text-left shadow-none"
              onClick={() =>
                AlbumsStore.albums.set((prev) => {
                  return prev.map((prevAlbum) =>
                    prevAlbum.id === album.id
                      ? {
                          ...prevAlbum,
                          prompts: isAdded
                            ? prevAlbum.prompts.filter(
                                (promptId) => promptId !== id,
                              )
                            : [...prevAlbum.prompts, id],
                        }
                      : prevAlbum,
                  );
                })
              }
            >
              <div className="flex aspect-square w-5 items-center justify-center rounded-full border border-zinc-700">
                {isAdded ? <LuCheck className="text-xs" /> : ""}
              </div>
              <Label className="cursor-pointer">{album.name}</Label>
            </Button>
          );
        })}
      </div>
    </Action>
  );
};

export default AlbumAction;
