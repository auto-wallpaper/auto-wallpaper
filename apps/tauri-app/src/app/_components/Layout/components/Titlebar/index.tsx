"use client";

import React, { useEffect, useState } from "react";
import { appWindow } from "@tauri-apps/api/window";
import { IoCloseOutline } from "react-icons/io5";
import { LuMaximize, LuMinimize, LuRefreshCcw } from "react-icons/lu";
import { VscChromeMinimize } from "react-icons/vsc";

import { Button } from "@acme/ui/button";

import type { WallpaperEngineStatus } from "~/lib/WallpaperGenerator";
import Spinner from "~/app/_components/Spinner";
import { useWallpaperEngineStore } from "~/lib/WallpaperGenerator";
import { TempStore } from "~/stores/temp";
import { IntervalsInMinute, UserStore } from "~/stores/user";
import { calculateRemainingTime } from "~/utils/time";

const Titlebar = () => {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    let unlisten: (() => void) | null = null;

    const handler = async () => {
      unlisten = await appWindow.listen("tauri://resize", async () => {
        setIsMaximized(await appWindow.isMaximized());
      });
    };

    void handler();

    return () => {
      unlisten?.();
    };
  }, []);

  const [status, setStatus] = useState<React.ReactNode>(null);

  useEffect(() => {
    const intrvl = setInterval(async () => {
      const interval = await UserStore.interval.get();
      const lastGenerationTimestamp =
        await TempStore.lastGenerationTimestamp.get();
      const status = useWallpaperEngineStore.getState().status;

      let result: React.ReactNode = null;

      const withSpinnersMap = {
        INITIALIZING: "Initializing",
        GENERATING_IMAGE: "Generating Wallpaper",
        UPSCALING: "Upscaling the Wallpaper",
        FINALIZING: "Finalizing",
        CANCELING: "Canceling",
      } satisfies Partial<Record<WallpaperEngineStatus, string>>;

      switch (status) {
        case "INITIALIZING":
        case "GENERATING_IMAGE":
        case "UPSCALING":
        case "FINALIZING":
        case "CANCELING":
          result = (
            <>
              <Spinner /> {withSpinnersMap[status]}
            </>
          );
          break;
        case "IDLE": {
          if (interval === "OFF") {
            result = <>Idle</>;
            break;
          }

          if (!lastGenerationTimestamp) {
            result = (
              <>
                You have not generated anything yet. generate one using the{" "}
                <LuRefreshCcw /> button
              </>
            );
            break;
          }

          const leftSeconds =
            lastGenerationTimestamp.getTime() +
            IntervalsInMinute[interval] * 60_000 -
            Date.now();

          if (leftSeconds <= 0) {
            result = (
              <>
                <Spinner />
              </>
            );
            break;
          }

          result = (
            <>
              Wallpaper generation will begin{" "}
              {calculateRemainingTime(
                new Date(
                  lastGenerationTimestamp.getTime() +
                    IntervalsInMinute[interval] * 60_000,
                ),
              )}
            </>
          );
        }
      }

      setStatus(result);
    }, 1000);

    return () => {
      clearInterval(intrvl);
    };
  }, []);

  return (
    <div className="flex w-full bg-transparent">
      <div className="flex-1 border-l-4 border-t-4 border-transparent">
        <div
          className="flex h-full w-full items-center gap-2 px-2 text-sm text-zinc-600"
          data-tauri-drag-region
          onClick={async () => {
            await appWindow.startDragging();
          }}
        >
          {status}
        </div>
      </div>
      <div className="ml-auto flex">
        <Button
          variant="link"
          className="rounded-none duration-100 hover:bg-zinc-500/10"
          onClick={() => appWindow.minimize()}
        >
          <VscChromeMinimize size={16} />
        </Button>
        <Button
          variant="link"
          className="rounded-none duration-100 hover:bg-zinc-500/10"
          onClick={() => appWindow.toggleMaximize()}
        >
          {isMaximized ? <LuMinimize size={13} /> : <LuMaximize size={13} />}
        </Button>
        <Button
          variant="link"
          className="rounded-none duration-100 hover:bg-red-500/10"
          onClick={() => appWindow.hide()}
        >
          <IoCloseOutline size={18} />
        </Button>
      </div>
    </div>
  );
};

export default Titlebar;
