import React from "react";
import { MdOutlineDeleteOutline } from "react-icons/md";

import { Button } from "@acme/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@acme/ui/dialog";

import { usePromptContext } from "~/app/_components/PromptCard";
import { useWallpaperEngineStore } from "~/lib/WallpaperGenerator";
import { UserStore } from "~/stores/user";
import { sortByDate } from "~/utils/sort";
import { removeWallpaperFiles } from "~/utils/wallpapers";
import Action from "../Action";

type DeleteActionProps = {
  disabled?: boolean;
};

const DeleteAction: React.FC<DeleteActionProps> = ({ disabled }) => {
  const { id } = usePromptContext();

  return (
    <Action
      Icon={MdOutlineDeleteOutline}
      className={{ trigger: "text-red-400", content: "border-red-500" }}
      disabled={disabled}
    >
      <DialogHeader>
        <DialogTitle>Are you absolutely sure?</DialogTitle>
        <DialogDescription>
          This action cannot be undone. Are you sure you want to permanently
          delete this prompt?
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button
          variant="destructive"
          onClick={async (e) => {
            e.stopPropagation();

            const selectedPrompt = await UserStore.selectedPrompt.get();

            const { usingPrompt, status, cancel } =
              useWallpaperEngineStore.getState();

            if (
              status !== "IDLE" &&
              status !== "CANCELING" &&
              usingPrompt?.id === id
            ) {
              void cancel();
            }

            void UserStore.prompts.set((prev) => {
              if (
                selectedPrompt.type === "prompt" &&
                selectedPrompt.id === id
              ) {
                const sorted = [...prev].sort((a, b) =>
                  sortByDate(a.createdAt, b.createdAt),
                );
                const index = sorted.findIndex((prompt) => prompt.id === id);
                const newSelectedPrompt =
                  sorted[index + 1] ?? sorted[index - 1];

                if (newSelectedPrompt) {
                  void UserStore.selectedPrompt.set({
                    id: newSelectedPrompt.id,
                    type: "prompt",
                  });
                }
              }

              return prev.filter((prompt) => prompt.id !== id);
            });

            void removeWallpaperFiles(id);
          }}
        >
          Confirm
        </Button>
      </DialogFooter>
    </Action>
  );
};

export default DeleteAction;
