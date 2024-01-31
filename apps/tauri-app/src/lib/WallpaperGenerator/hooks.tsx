"use client";

import { create } from "zustand";

import type { StatusEnum } from ".";
import { TempStore } from "~/stores/temp";
import { UserStore } from "~/stores/user";
import { changeWallpaper } from "~/utils/commands";
import { log } from "~/utils/log";
import { saveWallpaperFiles } from "~/utils/wallpapers";
import {
  CancelException,
  MoreThanOneGenerationException,
  WallpaperEngine,
} from ".";
import { setWallpaperSource } from "../WallpaperFile";

type BaseWallpaperEngineState = {
  status: StatusEnum;
  usingPrompt: (typeof UserStore.prompts.$inferOutput)[number] | null;
  generate: (promptId?: string) => Promise<{ promptId: string } | null>;
  cancel: () => Promise<void>;
};

export const useWallpaperEngineStore = create<BaseWallpaperEngineState>(
  (set) => {
    const engine = new WallpaperEngine();

    engine.on("statusChange", (status) => {
      set({
        status,
      });
    });

    engine.on("prompt", (usingPrompt) => {
      set({
        usingPrompt,
      });
    });

    return {
      status: engine.status,
      cancel: async () => {
        engine.cancel();
        await TempStore.lastGenerationTimestamp.set(new Date());
      },
      usingPrompt: null,
      generate: async (promptId) => {
        try {
          const usingPromptId =
            promptId ?? (await UserStore.selectedPrompt.get());

          const data = await engine.generate(usingPromptId);

          await saveWallpaperFiles({ ...data, promptId: usingPromptId });

          await Promise.allSettled([
            setWallpaperSource(usingPromptId),
            (async () => {
              const selectedPromptId = await UserStore.selectedPrompt.get();

              if (selectedPromptId === usingPromptId) {
                await changeWallpaper({ promptId: usingPromptId });
              }
            })(),
          ]);

          return { promptId: usingPromptId };
        } catch (e) {
          if (e instanceof CancelException) {
            void log.wallpaperGeneration.info(
              `Generation wallpaper has been canceled`,
            );
          } else if (e instanceof MoreThanOneGenerationException) {
            void log.wallpaperGeneration.info(
              `Exited generate() function because a prompt is already being generated`,
            );
          } else {
            throw e;
          }
        } finally {
          await TempStore.lastGenerationTimestamp.set(new Date());
        }

        return null;
      },
    };
  },
);
