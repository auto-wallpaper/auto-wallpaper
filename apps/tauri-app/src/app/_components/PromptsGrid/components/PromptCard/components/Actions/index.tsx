import type { IconType } from "react-icons/lib";
import React from "react";
import { save } from "@tauri-apps/api/dialog";
import { writeBinaryFile } from "@tauri-apps/api/fs";
import { downloadDir, join } from "@tauri-apps/api/path";
import { IoStopOutline } from "react-icons/io5";
import { LuDownload, LuRefreshCcw } from "react-icons/lu";

import { cn } from "@acme/ui";

import Spinner from "~/app/_components/Spinner";
import { useWallpaperEngineStore } from "~/lib/WallpaperGenerator/hooks";
import { UserStore } from "~/stores/user";
import { getWallpaperOf } from "~/utils/wallpapers";
import DeleteAction from "./components/DeleteAction";
import EditAction from "./components/EditAction";
import { ActionButton, usePromptContext } from "~/app/_components/PromptCard";

const SpinningStopIcon: IconType = (props) => {
  return (
    <IoStopOutline
      {...props}
      className={cn("animate-spinning-stroke", props.className)}
    />
  );
};

const Actions: React.FC = () => {
  const prompts = UserStore.prompts.useValue();
  const { id } = usePromptContext();
  const { cancel, generate, status, usingPrompt } = useWallpaperEngineStore();
  const isThisGenerating = usingPrompt?.id === id && status !== "IDLE";
  const isAnotherGenerating = usingPrompt?.id !== id && status !== "IDLE";

  return (
    <>
      {isThisGenerating && (
        <ActionButton
          Icon={status === "CANCELING" ? Spinner : SpinningStopIcon}
          onClick={() => cancel()}
        />
      )}
      {!isThisGenerating && (
        <ActionButton
          Icon={LuRefreshCcw}
          onClick={() => generate(id)}
          disabled={isAnotherGenerating}
          tooltip={
            isAnotherGenerating ? (
              <p>Another prompt is currently being generated</p>
            ) : undefined
          }
        />
      )}
      <ActionButton
        Icon={LuDownload}
        onClick={async () => {
          const filePath = await save({
            filters: [
              {
                name: "Image",
                extensions: ["jpeg", "jpg"],
              },
            ],
            title: "Save the wallpaper",
            defaultPath: await join(await downloadDir(), id),
          });

          if (!filePath) return;

          const data = await getWallpaperOf(id);

          if (!data) return;

          await writeBinaryFile(filePath, data);
        }}
      />
      <EditAction />
      {prompts.length > 1 && <DeleteAction />}
    </>
  );
};

export default Actions;
