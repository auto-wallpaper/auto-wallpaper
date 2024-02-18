import { useEffect, useState } from "react";
import { create } from "zustand";

import { toBase64 } from "~/utils/strConvertors";
import { getWallpaperOf } from "~/utils/wallpapers";

type WallpapersSourceState = {
  wallpapers: Record<string, string>;
  setWallpaperSource: (promptId: string, source: string) => void;
};

const useWallpapersSourceStore = create<WallpapersSourceState>((set) => ({
  wallpapers: {},
  setWallpaperSource(promptId: string, source: string) {
    set((prev) => ({
      wallpapers: { ...prev.wallpapers, [promptId]: source },
    }));
  },
}));

export const setWallpaperSource = async (promptId: string) => {
  const imageData = await getWallpaperOf(promptId);
  if (!imageData) {
    return;
  }

  const base64 = await toBase64(imageData);

  useWallpapersSourceStore.getState().setWallpaperSource(promptId, base64);
};

export const useWallpaperSource = (promptId: string) => {
  const source = useWallpapersSourceStore(
    (state) => state.wallpapers[promptId] ?? null,
  );
  const setSource = useWallpapersSourceStore(
    (state) => state.setWallpaperSource,
  );
  const [status, setStatus] = useState<"loading" | "error" | "finished">(
    "loading",
  );

  useEffect(() => {
    const handler = async () => {
      try {
        setStatus("loading");
        const imageData = await getWallpaperOf(promptId);

        if (!imageData) {
          setStatus("finished");
          return;
        }

        const base64 = await toBase64(imageData);
        setSource(promptId, base64);
        setStatus("finished");
      } catch (e) {
        setStatus("error");
        throw e;
      }
    };

    void handler();
  }, [promptId, setSource]);

  return {
    source,
    status,
  };
};
