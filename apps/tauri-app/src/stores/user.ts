import { z } from "zod";

import { makeField, makeStore } from "./makeStore";
import { promptEngine } from "~/lib/PromptEngine";
import { changeWallpaper } from "~/utils/commands";
import { enable, isEnabled, disable } from "tauri-plugin-autostart-api";
import { log } from "~/utils/log";

const defaultPrompts = [
  {
    id: crypto.randomUUID(),
    prompt: "Paris during the $DAY_TIME with $WEATHER, capturing scenes of people and cars.",
  }
]

export const UserStore = makeStore(".user.dat", {
  location: makeField({
    schema: z.object({
      id: z.number(),
      name: z.string(),
      latitude: z.number(),
      longitude: z.number(),
      elevation: z.number(),
      feature_code: z.string(),
      country_code: z.string(),
      admin1_id: z.number(),
      admin2_id: z.number().optional(),
      admin3_id: z.number().optional(),
      admin4_id: z.number().optional(),
      timezone: z.string(),
      population: z.number().optional(),
      postcodes: z.number().array().optional(),
      country_id: z.number(),
      country: z.string(),
      admin1: z.string(),
      admin2: z.string().optional(),
      admin3: z.string().optional(),
      admin4: z.string().optional(),
    })
  }),
  prompts: makeField({
    schema: z.object({
      id: z.string().uuid().default(() => crypto.randomUUID()),
      prompt: z.string().min(3).max(1000).superRefine((v, ctx) => {
        try {
          promptEngine.validate(v)
        } catch (e) {
          if (e && typeof e === "object" && "message" in e) {
            ctx.addIssue({
              code: z.ZodIssueCode.invalid_string,
              message: e.message as string,
              validation: "regex"
            })
            return e.message
          }

          void log.wallpaperGeneration.error(e)
          throw e
        }
      }),
      createdAt: z.coerce.date().default(() => new Date()),
    })
      .array(),
    defaultValue: defaultPrompts
  }),
  selectedPrompt: makeField({
    schema: z.string().uuid(),
    defaultValue: defaultPrompts[0]!.id,
    async onChange(promptId) {
      await changeWallpaper({ promptId })
    }
  }),
  interval: makeField({
    schema: z.enum([
      "off",
      "immediately",
      "1m",
      "2m",
      "5m",
      "10m",
      "15m",
      "30m",
      "1h",
      "2h",
      "6h",
      "12h",
      "1d"
    ]),
    defaultValue: "15m"
  }),
  autostart: makeField({
    schema: z.boolean(),
    defaultValue: false,
    async onChange(shouldEnable) {
      const enabled = await isEnabled().catch(() => false)

      if (shouldEnable && !enabled) {
        try {
          await enable()
        } catch (e) {
          await UserStore.autostart.set(false)

          void log.wallpaperGeneration.error(e)
          throw e
        }
      }

      if (!shouldEnable && enabled) {
        try {
          await disable()
        } catch (e) {
          await UserStore.autostart.set(true)

          void log.wallpaperGeneration.error(e)
          throw e
        }
      }
    },
  })
});

export const IntervalTexts: Record<typeof UserStore.interval.$inferOutput, string> = {
  "off": "Off - The wallpaper will not be generated automatically",
  "immediately": "Immediately",
  "1m": "1 Minute",
  "2m": "2 Minutes",
  "5m": "5 Minutes",
  "10m": "10 Minutes",
  "15m": "15 Minutes",
  "30m": "30 Minutes",
  "1h": "1 Hour",
  "2h": "2 Hours",
  "6h": "6 Hours",
  "12h": "12 Hours",
  "1d": "1 Day"
}

export const IntervalsInMinute: Record<
  Exclude<typeof UserStore.interval.$inferOutput, "off" | "immediately">,
  number
> = {
  "1m": 1,
  "2m": 2,
  "5m": 5,
  "10m": 10,
  "15m": 15,
  "30m": 30,
  "1h": 60,
  "2h": 60 * 2,
  "6h": 60 * 6,
  "12h": 60 * 12,
  "1d": 60 * 24,
};