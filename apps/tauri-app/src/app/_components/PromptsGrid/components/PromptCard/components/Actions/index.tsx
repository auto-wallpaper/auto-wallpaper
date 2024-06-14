import React from "react";
import { downloadDir, join } from "@tauri-apps/api/path";
import { save } from "@tauri-apps/plugin-dialog";
import { readFile, writeFile } from "@tauri-apps/plugin-fs";
import { LuDownload, LuRefreshCcw } from "react-icons/lu";

import { ActionButton, usePromptContext } from "~/app/_components/PromptCard";
import Spinner from "~/app/_components/Spinner";
import SpinningStopIcon from "~/app/_components/SpinningStopIcon";
import { useWallpaperEngineStore } from "~/lib/WallpaperGenerator";
import { UserStore } from "~/stores/user";
import { createFilename } from "~/utils/string";
import { getWallpaperPathOf } from "~/utils/wallpapers";
import AlbumAction from "./components/AlbumAction";
import DeleteAction from "./components/DeleteAction";
import EditAction from "./components/EditAction";

type ActionsProps = {
  hasImage: boolean;
};

const Actions: React.FC<ActionsProps> = ({ hasImage }) => {
  const prompts = UserStore.prompts.useValue();
  const { id, prompt } = usePromptContext();
  const { cancel, generateByPromptId, status, usingPrompt } =
    useWallpaperEngineStore();

  const isIdle = status === "IDLE";
  const isThisGenerating = !isIdle && usingPrompt?.id === id;
  const isAnotherGenerating = !isIdle && usingPrompt?.id !== id;

  return (
    <>
      <AlbumAction />
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

      <ActionButton
        Icon={LuDownload}
        disabled={!hasImage}
        onClick={async () => {
          const destinationPath = await save({
            filters: [
              {
                name: "Image",
                extensions: ["jpeg", "jpg"],
              },
            ],
            title: "Save the wallpaper",
            defaultPath: await join(
              await downloadDir(),
              createFilename(prompt),
            ),
          });

          if (!destinationPath) return;

          const sourcePath = await getWallpaperPathOf(id);

          if (!sourcePath) return;

          await writeFile(destinationPath, await readFile(sourcePath));
        }}
      />
      <EditAction />
      <DeleteAction disabled={!(prompts && prompts.length > 1)} />
    </>
  );
};

export default Actions;
