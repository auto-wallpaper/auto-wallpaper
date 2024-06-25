import { useCallback, useEffect, useMemo } from "react";
import { readFile } from "@tauri-apps/plugin-fs";
import Compressor from "compressorjs";
import { create } from "zustand";

import { log } from "~/utils/log";
import { getWallpaperPathOf } from "~/utils/wallpapers";

export type WallpaperSourceState = {
  sources: Record<
    string,
    | {
        src: string | null;
        status: "loaded" | "loading";
      }
    | {
        src: null;
        status: "failed";
      }
  >;
  load: (
    promptId: string,
    url: string | null,
    optimization?: {
      quality: number;
      maxWidth: number;
    },
  ) => Promise<void>;
  exists: (promptId: string) => boolean;
};

export const useWallpaperSourceStore = create<WallpaperSourceState>(
  (set, get) => ({
    sources: {},
    async load(promptId, url, optimization = { maxWidth: 800, quality: 0.8 }) {
      const prev = get().sources[promptId];

      if (prev && prev.status === "loading") {
        return;
      }

      if (!url) {
        return set((prev) => ({
          sources: {
            ...prev.sources,
            [promptId]: {
              src: null,
              status: "loaded",
            },
          },
        }));
      }

      try {
        set((prev) => ({
          sources: {
            ...prev.sources,
            [promptId]: {
              src: prev.sources[promptId]?.src ?? null,
              status: "loading",
            },
          },
        }));

        const urlPattern = /^(https?:\/\/)/i;

        let data: Uint8Array | null = null;

        if (urlPattern.test(url)) {
          const resp = await fetch(url);

          const arrayBuffer = await resp.arrayBuffer();

          data = new Uint8Array(arrayBuffer);
        } else {
          data = await readFile(url);
        }

        if (!data) {
          set((prev) => ({
            sources: {
              ...prev.sources,
              [promptId]: {
                src: null,
                status: "failed",
              },
            },
          }));

          throw new Error(`no image data has been created with url: ${url}`);
        }

        const file = new File([data], "file.jpeg", {
          type: "image/jpeg",
        });

        if (optimization) {
          new Compressor(file, {
            quality: optimization.quality,
            maxWidth: optimization.maxWidth,
            async success(result) {
              set((prev) => ({
                sources: {
                  ...prev.sources,
                  [promptId]: {
                    src: URL.createObjectURL(result),
                    status: "loaded",
                  },
                },
              }));
            },
            error(err) {
              set((prev) => ({
                sources: {
                  ...prev.sources,
                  [promptId]: {
                    src: null,
                    status: "failed",
                  },
                },
              }));
              void log.error(err.message);
            },
          });
        } else {
          set((prev) => ({
            sources: {
              ...prev.sources,
              [promptId]: {
                src: URL.createObjectURL(file),
                status: "loaded",
              },
            },
          }));
        }
      } catch (e) {
        set((prev) => ({
          sources: {
            ...prev.sources,
            [promptId]: {
              src: null,
              status: "failed",
            },
          },
        }));

        throw e;
      }
    },
    exists(promptId) {
      return promptId in get().sources;
    },
  }),
);

export const useWallpaperSource = (promptId?: string) => {
  const load = useWallpaperSourceStore((state) => state.load);
  const exists = useWallpaperSourceStore((state) => state.exists);
  const source = useWallpaperSourceStore(
    (state) => (promptId ? state.sources[promptId] : null) ?? null,
  );

  const refresh = useCallback(async () => {
    if (promptId && !exists(promptId)) {
      const path = await getWallpaperPathOf(promptId);

      void load(promptId, path);
    }
  }, [promptId, load, exists]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    source,
    refresh,
  };
};
