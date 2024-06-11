import { z } from "zod";

import { makeField, makeStore } from "./makeStore";
import { refreshWallpaper, validatePrompt } from "~/utils/commands";
import { enable, isEnabled, disable } from "@tauri-apps/plugin-autostart";

const defaultPrompts = [
  {
    id: crypto.randomUUID(),
    prompt: "Speeding car on the Mars planet during raining weather",
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
      admin1_id: z.number().optional(),
      admin2_id: z.number().optional(),
      admin3_id: z.number().optional(),
      admin4_id: z.number().optional(),
      timezone: z.string(),
      population: z.number().optional(),
      postcodes: z.string().array().optional(),
      country_id: z.number(),
      country: z.string(),
      admin1: z.string().optional(),
      admin2: z.string().optional(),
      admin3: z.string().optional(),
      admin4: z.string().optional(),
    }).nullable()
  }),
  prompts: makeField({
    schema: z.object({
      id: z.string().uuid().default(() => crypto.randomUUID()),
      prompt: z.string().min(3).max(1000).superRefine(async (v, ctx) => {
        try {
          await validatePrompt(v)
        } catch (e) {
          ctx.addIssue({
            code: z.ZodIssueCode.invalid_string,
            message: e as string,
            validation: "regex"
          })

          return e
        }
      }),
      generatedAt: z.coerce.date().nullish(), 
      createdAt: z.coerce.date().default(() => new Date()),
    })
      .array(),
    defaultValue: defaultPrompts
  }),
  selectedPrompt: makeField({
    schema: z.object({
      id: z.string().uuid(),
      type: z.enum(["prompt", "album"])
    }),
    defaultValue: {
      id: defaultPrompts[0]!.id,
      type: "prompt"
    },
    async onChange() {
      await refreshWallpaper()
    },
    version: "1",
    up(prev, defaultValue){
      if(typeof prev === "string") {
        return {
          id: prev,
          type: "prompt"
        } as const
      }

      return defaultValue
    }
  }),
  interval: makeField({
    schema: z.enum([
      "OFF",
      "FIVE_MINS",
      "TEN_MINS",
      "FIFTEEN_MINS",
      "THIRTEENS",
      "ONE_HOUR",
      "TWO_HOURS",
      "SIX_HOURS",
      "TWELVE_HOURS",
      "ONE_DAY"
    ]),
    defaultValue: "FIFTEEN_MINS"
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
          throw e
        }
      }

      if (!shouldEnable && enabled) {
        try {
          await disable()
        } catch (e) {
          await UserStore.autostart.set(true)
          throw e
        }
      }
    },
  }),
  screenSize: makeField({
    schema: z.object({
      x: z.number(),
      y: z.number(),
    }),
    defaultValue: {
      x: 1,
      y: 1
    },
  })
});

export const IntervalTexts: Record<typeof UserStore.interval.$inferOutput, string> = {
  "OFF": "Off - The wallpaper will not be generated automatically",
  "FIVE_MINS": "5 Minutes",
  "TEN_MINS": "10 Minutes",
  "FIFTEEN_MINS": "15 Minutes",
  "THIRTEENS": "30 Minutes",
  "ONE_HOUR": "1 Hour",
  "TWO_HOURS": "2 Hours",
  "SIX_HOURS": "6 Hours",
  "TWELVE_HOURS": "12 Hours",
  "ONE_DAY": "1 Day"
}

export const IntervalsInMinute: Record<
  Exclude<typeof UserStore.interval.$inferOutput, "OFF">,
  number
> = {
  "FIVE_MINS": 5,
  "TEN_MINS": 10,
  "FIFTEEN_MINS": 15,
  "THIRTEENS": 30,
  "ONE_HOUR": 60,
  "TWO_HOURS": 60 * 2,
  "SIX_HOURS": 60 * 6,
  "TWELVE_HOURS": 60 * 12,
  "ONE_DAY": 60 * 24,
};