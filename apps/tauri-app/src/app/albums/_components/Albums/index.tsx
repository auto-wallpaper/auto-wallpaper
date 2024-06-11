"use client";

import React, { useEffect, useLayoutEffect, useState } from "react";

import { Alert, AlertDescription } from "@acme/ui/alert";

import { PromptsGrid } from "~/app/_components/PromptCard";
import { AlbumsStore } from "~/stores/albums";
import AlbumCard from "../AlbumCard";
import CreateAlbum from "../CreateAlbum";

const Albums: React.FC = () => {
  const albums = AlbumsStore.albums.useValue();
  const [orders, setOrders] = useState<string[]>([]);

  useEffect(() => {
    setOrders((prev) => {
      const newOrders = albums?.map((album) => album.id) ?? [];
      return prev.toString() === newOrders.toString() ? prev : newOrders;
    });
  }, [albums]);

  useLayoutEffect(() => {
    void AlbumsStore.albums.set((prev) =>
      [...prev].sort((a, b) => orders.indexOf(a.id) - orders.indexOf(b.id)),
    );
  }, [orders]);

  return (
    <div className="flex flex-col gap-5">
      <Alert>
        <AlertDescription>
          Create multiple albums to organize your prompts for easier management.
          You can then generate them sequentially or at random from any album.
        </AlertDescription>
      </Alert>

      <PromptsGrid orders={orders} setOrders={setOrders}>
        {orders.map((albumId) => {
          const album = albums?.find((album) => album.id === albumId);

          if (!album) return null;

          return <AlbumCard key={album.id} album={album} />;
        })}
      </PromptsGrid>

      <CreateAlbum />
    </div>
  );
};

export default Albums;
