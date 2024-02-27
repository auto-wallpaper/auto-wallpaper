"use client";

import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/tauri";
import { create } from "zustand";

import { UserStore } from "~/stores/user";
import { useWallpaperSourceStore } from "../WallpaperFile";

type WallpaperEngineState = {
  status: WallpaperEngineStatus;
  usingPrompt: (typeof UserStore.prompts.$inferOutput)[number] | null;
  generateSelectedPrompt: () => Promise<void>;
  generateByPromptId: (promptId: string) => Promise<void>;
  cancel: () => Promise<void>;
};

export const WallpaperEngineStatus = {
  INITIALIZING: "INITIALIZING",
  GENERATING_IMAGE: "GENERATING_IMAGE",
  UPSCALING: "UPSCALING",
  FINALIZING: "FINALIZING",
  IDLE: "IDLE",
  CANCELING: "CANCELING",
} as const;

export type WallpaperEngineStatus = keyof typeof WallpaperEngineStatus;

export const useWallpaperEngineStore = create<WallpaperEngineState>(
  (set) => {
    const initUsingPrompt = async () => {
      const prompt: (typeof UserStore.prompts.$inferOutput)[number] | null =
        await invoke("get_using_prompt");

      const usingPrompt =
        prompt && (await UserStore.prompts.schema.element.parseAsync(prompt));

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
      usingPrompt: (typeof UserStore.prompts.$inferInput)[number];
    }>(
      "wallpaper-engine-finish",
      async ({ payload }) => {
        const usingPrompt = await UserStore.prompts.schema.element.parseAsync(payload.usingPrompt);

        await useWallpaperSourceStore.getState().refresh(usingPrompt.id)
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
      usingPrompt: (typeof UserStore.prompts.$inferInput)[number] | null;
    }>("wallpaper-engine-using-prompt-change", async ({ payload }) => {
      const { usingPrompt } = payload;

      set({
        usingPrompt:
          usingPrompt &&
          (await UserStore.prompts.schema.element.parseAsync(usingPrompt)),
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
    };
  },
);
