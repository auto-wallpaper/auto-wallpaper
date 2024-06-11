import { z } from "zod";

import { makeField, makeStore } from "./makeStore";

const defaultAlbums = [
  {
    id: crypto.randomUUID(),
    name: "Favorites",
    prompts: [],
  }
]

export const AlbumsStore = makeStore(".albums.dat", {
  albums: makeField({
    schema: z.object({
      id: z.string().uuid().default(() => crypto.randomUUID()),
      name: z.string().min(3),
      prompts: z.string().uuid().array().default(() => []),
      selectionType: z.enum(["sequential", "random"]).default("sequential"),
      createdAt: z.coerce.date().default(() => new Date())
    }).array(),
    defaultValue: defaultAlbums
  }),
});