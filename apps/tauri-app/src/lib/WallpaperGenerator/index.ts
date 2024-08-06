"use client";

import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { create } from "zustand";

import { UserStore } from "~/stores/user";
import { useWallpaperSourceStore } from "../WallpaperFile";
import { AlbumsStore } from "~/stores/albums";
import type { z } from "zod";
import { getWallpaperPathOf } from "~/utils/wallpapers";

const UsingPromptSchema = UserStore.prompts.schema.element.extend({
  albumId: AlbumsStore.albums.schema.element.shape.id.nullish()
})

type WallpaperEngineState = {
  status: WallpaperEngineStatus;
  usingPrompt: z.output<typeof UsingPromptSchema> | null;
  generateSelectedPrompt: () => Promise<void>;
  generateByPromptId: (promptId: string) => Promise<void>;
  generateByAlbumId: (promptId: string) => Promise<void>;
  cancel: () => Promise<void>;
};

export const WallpaperEngineStatus = {
  INITIALIZING: "INITIALIZING",
  GENERATING: "GENERATING",
  UPSCALING: "UPSCALING",
  FINALIZING: "FINALIZING",
  IDLE: "IDLE",
  CANCELLING: "CANCELLING",
} as const;

export type WallpaperEngineStatus = keyof typeof WallpaperEngineStatus;

export const useWallpaperEngineStore = create<WallpaperEngineState>(
  (set) => {
    const initUsingPrompt = async () => {
      const prompt: z.input<typeof UsingPromptSchema> | null =
        await invoke("get_using_prompt");

      const usingPrompt =
        prompt && (await UsingPromptSchema.parseAsync(prompt));

      set({
        usingPrompt,
      });
    };

    const initStatus = async () => {
      const status: WallpaperEngineStatus = await invoke(
        "get_status",
      );

      set({
        status,
      });
    };

    void initUsingPrompt();

    void initStatus();

    void listen<{
      usingPrompt: z.input<typeof UsingPromptSchema>;
    }>(
      "wallpaper-engine-finish",
      async ({ payload }) => {
        const usingPrompt = await UsingPromptSchema.parseAsync(payload.usingPrompt);

        const path = await getWallpaperPathOf(usingPrompt.id)
        if (path) {
          await useWallpaperSourceStore.getState().load(usingPrompt.id, path)
        }
      },
    );

    void listen<{ status: WallpaperEngineStatus }>(
      "wallpaper-engine-status-change",
      ({ payload: { status } }) => {
        set({
          status,
        });
      },
    );

    void listen<{
      usingPrompt: z.input<typeof UsingPromptSchema> | null;
    }>("wallpaper-engine-using-prompt-change", async ({ payload }) => {
      const { usingPrompt } = payload;

      set({
        usingPrompt:
          usingPrompt &&
          (await UsingPromptSchema.parseAsync(usingPrompt)),
      });
    });

    return {
      status: WallpaperEngineStatus.IDLE,
      cancel: async () => {
        await invoke("cancel");
      },
      usingPrompt: null,
      generateSelectedPrompt: async () => {
        await invoke("generate_selected_prompt")
      },
      generateByPromptId: async (promptId: string) => {
        await invoke("generate_by_prompt_id", {
          promptId,
        })
      },
      generateByAlbumId: async (albumId: string) => {
        await invoke("generate_by_album_id", {
          albumId,
        })
      },
    };
  },
);
