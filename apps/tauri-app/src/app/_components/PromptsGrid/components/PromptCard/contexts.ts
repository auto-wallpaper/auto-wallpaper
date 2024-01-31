import { createContext, useContext } from "react";
import type { UserStore } from "~/stores/user";

export const PromptContext = createContext<typeof UserStore.prompts.$inferOutput[number]>(null as never)

export const usePromptContext = () => {
    return useContext(PromptContext)
}