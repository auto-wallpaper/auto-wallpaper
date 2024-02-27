import { useEffect, useMemo } from "react";
import { convertFileSrc } from "@tauri-apps/api/tauri";
import { create } from "zustand";

import { getWallpaperPathOf } from "~/utils/wallpapers";

type WallpaperSourceState = {
  sources: Record<string, string | null>;
  refresh: (promptId: string) => Promise<void>;
  exists: (promptId: string) => boolean;
};

export const useWallpaperSourceStore = create<WallpaperSourceState>(
  (set, get) => ({
    sources: {},
    async refresh(promptId) {
      const filePath = await getWallpaperPathOf(promptId);

      set((prev) => ({
        sources: {
          ...prev.sources,
          [promptId]: filePath && `${convertFileSrc(filePath)}?t=${Date.now()}`,
        },
      }));
    },
    exists(promptId) {
      return promptId in get().sources;
    },
  }),
);

export const useWallpaperSource = (promptId: string) => {
  const refresh = useWallpaperSourceStore((state) => state.refresh);
  const exists = useWallpaperSourceStore((state) => state.exists);
  const source = useWallpaperSourceStore(
    (state) => state.sources[promptId] ?? null,
  );

  useEffect(() => {
    if (!exists(promptId)) {
      void refresh(promptId);
    }
  }, [promptId, refresh, exists]);

  return {
    source,
    refresh: useMemo(() => refresh.bind(null, promptId), [promptId, refresh]),
  };
};
