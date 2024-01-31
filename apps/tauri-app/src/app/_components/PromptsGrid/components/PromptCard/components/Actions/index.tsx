import type { IconType } from "react-icons/lib";
import React from "react";
import { IoStopOutline } from "react-icons/io5";
import { LuRefreshCcw } from "react-icons/lu";

import { cn } from "@acme/ui";

import Spinner from "~/app/_components/Spinner";
import { useWallpaperEngineStore } from "~/lib/WallpaperGenerator/hooks";
import { UserStore } from "~/stores/user";
import { usePromptContext } from "../../contexts";
import Box from "../Box";
import Button from "../Button";
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

const Actions: React.FC = () => {
  const prompts = UserStore.prompts.useValue();
  const { id } = usePromptContext();
  const { cancel, generate, status, usingPrompt } = useWallpaperEngineStore();
  const isThisGenerating = usingPrompt?.id === id && status !== "IDLE";
  const isAnotherGenerating = usingPrompt?.id !== id && status !== "IDLE";

  return (
    <Box>
      {isThisGenerating && (
        <Button
          Icon={status === "CANCELING" ? Spinner : SpinningStopIcon}
          onClick={() => cancel()}
        />
      )}
      {!isThisGenerating && (
        <Button
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
      <EditAction />
      {prompts.length > 1 && <DeleteAction />}
    </Box>
  );
};

export default Actions;
