"use client";

import React, { useEffect, useRef } from "react";

import { useWallpaperEngineStore } from "~/lib/WallpaperGenerator/hooks";
import { TempStore } from "~/stores/temp";
import { IntervalsInMinute, UserStore } from "~/stores/user";

const WallpaperGenerationProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const isGeneratingRef = useRef(false);

  useEffect(() => {
    const intrvl = setInterval(async () => {
      if (isGeneratingRef.current) return;

      isGeneratingRef.current = true;

      try {
        const interval = await UserStore.interval.get();

        if (
          interval === "off" ||
          useWallpaperEngineStore.getState().status !== "IDLE"
        ) {
          return (isGeneratingRef.current = false);
        }

        const lastGenerationTimestamp =
          await TempStore.lastGenerationTimestamp.get();

        if (
          interval === "immediately" ||
          !lastGenerationTimestamp ||
          lastGenerationTimestamp.getTime() +
            IntervalsInMinute[interval] * 60_000 <
            Date.now()
        ) {
          await useWallpaperEngineStore.getState().generate();
        }
      } finally {
        isGeneratingRef.current = false;
      }
    }, 1000);

    return () => {
      clearInterval(intrvl);
    };
  }, []);

  return <>{children}</>;
};

export default WallpaperGenerationProvider;
