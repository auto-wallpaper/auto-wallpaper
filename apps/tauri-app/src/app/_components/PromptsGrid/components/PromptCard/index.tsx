"use client";

import React from "react";
import Image from "next/image";
import { MdOutlineImageNotSupported } from "react-icons/md";

import { cn } from "@acme/ui";

import { VARIABLE_REGEX } from "~/lib/PromptEngine";
import { useWallpaperSource } from "~/lib/WallpaperFile";
import { UserStore } from "~/stores/user";
import Actions from "./components/Actions";
import { PromptContext } from "./contexts";

type PromptCardProps = {
  data: (typeof UserStore.prompts.$inferOutput)[number];
};

const PromptCard: React.FC<PromptCardProps> = ({ data }) => {
  const { id, prompt } = data;
  const selectedPromptId = UserStore.selectedPrompt.useValue();
  const { source, status } = useWallpaperSource(id);

  return (
    <PromptContext.Provider value={data}>
      <div
        className={cn(
          "relative col-span-1 flex aspect-video cursor-pointer flex-col rounded-md border border-zinc-800 bg-transparent bg-zinc-950 px-2 py-4 transition",
          selectedPromptId === id && "border-zinc-200",
        )}
        onClick={() => UserStore.selectedPrompt.set(id)}
      >
        <span className="absolute bottom-0 left-0 right-0 top-0 flex h-full w-full flex-col items-center justify-center text-sm">
          {source ? (
            <Image
              src={source}
              alt=""
              fill
              className="rounded-md object-cover"
            />
          ) : status === "loading" ? (
            <div className="text-center">
              <p>Loading the Image</p>
            </div>
          ) : status === "finish" ? (
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <MdOutlineImageNotSupported />
                <p>No Image Yet.</p>
              </div>
              <p>Generate one to show here</p>
            </div>
          ) : (
            <div className="text-center">
              <p>Unexpected Error</p>
              <p>during loading image</p>
            </div>
          )}
        </span>

        <div className="absolute right-0 top-0 z-50 flex w-full cursor-default justify-end gap-1 p-2">
          <Actions />
        </div>

        <div
          className={cn(
            "absolute bottom-0 left-0 z-10 mt-auto h-max w-full rounded-b-md px-2 pb-4 pt-32",
            source && "bg-gradient-to-t from-black/90 to-transparent",
          )}
        >
          <p className="line-clamp-3 text-center text-xs">
            {prompt.split(VARIABLE_REGEX).map((word, i) =>
              i % 2 === 1 ? (
                <span key={i} className="font-mono text-zinc-400">
                  ${word}
                </span>
              ) : (
                <span key={i}>{word}</span>
              ),
            )}
          </p>
        </div>
      </div>
    </PromptContext.Provider>
  );
};

export default PromptCard;
