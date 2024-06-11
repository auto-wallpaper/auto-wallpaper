import { useEffect, useMemo } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { create } from "zustand";

import { getWallpaperPathOf } from "~/utils/wallpapers";

type WallpaperSourceState = {
  sources: Record<string, string | null>;
  refresh: (promptId: string) => Promise<void>;
  exists: (promptId: string) => boolean;
};

const isRefreshing: Record<string, boolean> = {};

export const useWallpaperSourceStore = create<WallpaperSourceState>(
  (set, get) => ({
    sources: {},
    async refresh(promptId) {
      if (isRefreshing[promptId]) {
        return;
      }

      try {
        isRefreshing[promptId] = true;

        const filePath = await getWallpaperPathOf(promptId);

        set((prev) => ({
          sources: {
            ...prev.sources,
            [promptId]:
              filePath && `${convertFileSrc(filePath)}?t=${Date.now()}`,
          },
        }));
      } finally {
        isRefreshing[promptId] = false;
      }
    },
    exists(promptId) {
      return promptId in get().sources;
    },
  }),
);

export const useWallpaperSource = (promptId?: string) => {
  const refresh = useWallpaperSourceStore((state) => state.refresh);
  const exists = useWallpaperSourceStore((state) => state.exists);
  const source = useWallpaperSourceStore(
    (state) => (promptId && state.sources[promptId]) ?? null,
  );

  useEffect(() => {
    if (promptId && !exists(promptId)) {
      void refresh(promptId);
    }
  }, [promptId, refresh, exists]);

  return {
    source,
    refresh: useMemo(
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      () => (promptId ? refresh.bind(null, promptId) : () => {}),
      [promptId, refresh],
    ),
  };
};
