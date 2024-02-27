import type { IconType } from "react-icons/lib";
import React from "react";
import { save } from "@tauri-apps/api/dialog";
import { copyFile } from "@tauri-apps/api/fs";
import { downloadDir, join } from "@tauri-apps/api/path";
import { IoStopOutline } from "react-icons/io5";
import { LuDownload, LuRefreshCcw } from "react-icons/lu";

import { cn } from "@acme/ui";

import { ActionButton, usePromptContext } from "~/app/_components/PromptCard";
import Spinner from "~/app/_components/Spinner";
import { useWallpaperEngineStore } from "~/lib/WallpaperGenerator";
import { UserStore } from "~/stores/user";
import { getWallpaperPathOf } from "~/utils/wallpapers";
import DeleteAction from "./components/DeleteAction";
import EditAction from "./components/EditAction";

const SpinningStopIcon: IconType = (props) => {
  return (
    <IoStopOutline
      {...props}
      className={cn("animate-spinning-stroke", props.className)}
    />
  );
};

type ActionsProps = {
  hasImage: boolean;
};

const Actions: React.FC<ActionsProps> = ({ hasImage }) => {
  const prompts = UserStore.prompts.useValue();
  const { id } = usePromptContext();
  const { cancel, generateByPromptId, status, usingPrompt } =
    useWallpaperEngineStore();

  const isIdle = status === "IDLE";
  const isThisGenerating = !isIdle && usingPrompt?.id === id;
  const isAnotherGenerating = !isIdle && usingPrompt?.id !== id;

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
          onClick={() => generateByPromptId(id)}
          disabled={isAnotherGenerating}
          tooltip={
            isAnotherGenerating ? (
              <p>Another prompt is currently being generated</p>
            ) : undefined
          }
        />
      )}
      {hasImage && (
        <ActionButton
          Icon={LuDownload}
          onClick={async () => {
            const destinationPath = await save({
              filters: [
                {
                  name: "Image",
                  extensions: ["jpeg", "jpg"],
                },
              ],
              title: "Save the wallpaper",
              defaultPath: await join(await downloadDir(), id),
            });

            if (!destinationPath) return;

            const sourcePath = await getWallpaperPathOf(id);

            if (!sourcePath) return;

            await copyFile(sourcePath, destinationPath);
          }}
        />
      )}
      <EditAction />
      {prompts.length > 1 && <DeleteAction />}
    </>
  );
};

export default Actions;
