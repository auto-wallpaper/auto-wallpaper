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
import { UserStore } from "~/stores/user";
import { sortByDate } from "~/utils/sort";
import { removeWallpaperFiles } from "~/utils/wallpapers";
import Action from "../Action";

const DeleteAction: React.FC = () => {
  const { id } = usePromptContext();

  return (
    <Action
      Icon={MdOutlineDeleteOutline}
      className={{ trigger: "text-red-400", content: "border-red-500" }}
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

            const selectedPromptId = await UserStore.selectedPrompt.get();

            void UserStore.prompts.set((prev) => {
              if (selectedPromptId === id) {
                const sorted = [...prev].sort((a, b) =>
                  sortByDate(a.createdAt, b.createdAt),
                );
                const index = sorted.findIndex((prompt) => prompt.id === id);
                const newSelectedPrompt = sorted[index + 1] ?? sorted[0];

                if (newSelectedPrompt) {
                  void UserStore.selectedPrompt.set(newSelectedPrompt?.id);
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
