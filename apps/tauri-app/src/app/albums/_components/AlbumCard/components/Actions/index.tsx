import React from "react";
import { LuRefreshCcw } from "react-icons/lu";

import { ActionButton } from "~/app/_components/PromptCard";
import { useWallpaperEngineStore } from "~/lib/WallpaperGenerator";
import { useAlbumContext } from "../../contexts";
import DeleteAction from "../DeleteAction";
import EditAction from "../EditAction";
import SpinningStopIcon from "~/app/_components/SpinningStopIcon";
import Spinner from "~/app/_components/Spinner";

const AlbumActions: React.FC = () => {
  const { id } = useAlbumContext();
  const { cancel, generateByAlbumId, status, usingPrompt } =
    useWallpaperEngineStore();

  const isIdle = status === "IDLE";
  const isThisGenerating = !isIdle && usingPrompt?.albumId === id;
  const isAnotherGenerating = !isIdle && usingPrompt?.albumId !== id;

  return (
    <>
      {isThisGenerating && (
        <ActionButton
          Icon={status === "CANCELLING" ? Spinner : SpinningStopIcon}
          onClick={() => cancel()}
        />
      )}
      {!isThisGenerating && (
        <ActionButton
          Icon={LuRefreshCcw}
          onClick={() => generateByAlbumId(id)}
          disabled={isAnotherGenerating}
          tooltip={
            isAnotherGenerating ? (
              <p>Another prompt is currently being generated</p>
            ) : undefined
          }
        />
      )}
      <EditAction />
      <DeleteAction />
    </>
  );
};

export default AlbumActions;
