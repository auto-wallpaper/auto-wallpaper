import { z } from "zod";

import { makeField, makeStore } from "./makeStore";

export const TempStore = makeStore(".temp.dat", {
    lastGenerationTimestamp: makeField({
        schema: z.coerce.date(),
    })
});