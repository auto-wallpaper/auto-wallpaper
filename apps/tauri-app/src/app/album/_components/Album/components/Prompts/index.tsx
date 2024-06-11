import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";

import { Alert, AlertDescription } from "@acme/ui/alert";

import { PromptsGrid } from "~/app/_components/PromptCard";
import UserPromptCard from "~/app/_components/PromptsGrid/components/PromptCard";
import { AlbumsStore } from "~/stores/albums";
import { UserStore } from "~/stores/user";
import { useAlbumContext } from "../../../contexts";

const Prompts: React.FC = () => {
  const { id, prompts: promptIds } = useAlbumContext();
  const allPrompts = UserStore.prompts.useValue();

  const prompts = useMemo(
    () => allPrompts?.filter((prompt) => promptIds.includes(prompt.id)) ?? [],
    [promptIds, allPrompts],
  );

  const [orders, setOrders] = useState(prompts.map((prompt) => prompt.id));

  useEffect(() => {
    setOrders((prev) => {
      const newOrders = prompts?.map((prompt) => prompt.id) ?? [];
      return prev.toString() === newOrders.toString() ? prev : newOrders;
    });
  }, [prompts]);

  useLayoutEffect(() => {
    void AlbumsStore.albums.set((prev) =>
      prev.map((album) =>
        album.id === id
          ? {
              ...album,
              prompts:
                album.prompts.length === orders.length ? orders : album.prompts,
            }
          : album,
      ),
    );
  }, [id, orders]);

  if (!prompts.length) {
    return (
      <Alert>
        <AlertDescription>
          There are no prompts in this album yet.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <PromptsGrid orders={orders} setOrders={setOrders}>
      {orders.map((promptId) => {
        const prompt = prompts.find((prompt) => prompt.id === promptId);

        if (!prompt) return null;

        return <UserPromptCard key={prompt.id} data={prompt} />;
      })}
    </PromptsGrid>
  );
};

export default Prompts;
