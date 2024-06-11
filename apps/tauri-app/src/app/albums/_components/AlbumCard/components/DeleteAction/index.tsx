import React from "react";
import { MdOutlineDeleteOutline } from "react-icons/md";

import { Button } from "@acme/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@acme/ui/dialog";

import Action from "~/app/_components/PromptsGrid/components/PromptCard/components/Actions/components/Action";
import { AlbumsStore } from "~/stores/albums";
import { useAlbumContext } from "../../contexts";

const DeleteAction: React.FC = () => {
  const { id } = useAlbumContext();

  return (
    <Action
      Icon={MdOutlineDeleteOutline}
      className={{ trigger: "text-red-400", content: "border-red-500" }}
    >
      <DialogHeader>
        <DialogTitle>Are you absolutely sure?</DialogTitle>
        <DialogDescription>
          This action cannot be undone. Are you sure you want to permanently
          delete this album? (the added prompts will not be deleted)
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button
          variant="destructive"
          onClick={async (e) => {
            e.stopPropagation();

            void AlbumsStore.albums.set((prev) =>
              prev.filter((album) => album.id !== id),
            );
          }}
        >
          Confirm
        </Button>
      </DialogFooter>
    </Action>
  );
};

export default DeleteAction;
