import { createContext, useContext } from "react";
import type { AlbumsStore } from "~/stores/albums";

export const AlbumContext = createContext<typeof AlbumsStore.albums.$inferOutput[number]>(null as never)

export const useAlbumContext = () => useContext(AlbumContext)