import type { SetRequired } from "type-fest";
import type { UserStore } from "~/stores/user";

export type GalleryPromptData = SetRequired<
    (typeof UserStore.prompts.$inferInput)[number],
    "id"
>;

export type GalleryPromptsData = {
    prompts: GalleryPromptData[];
    minVersion: string;
};