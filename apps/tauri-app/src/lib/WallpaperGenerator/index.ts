import { fetch, ResponseType } from "@tauri-apps/api/http";
import { currentMonitor } from "@tauri-apps/api/window";

import { UserStore } from "~/stores/user";
import { Leonardo } from "./Leonardo";
import { makeMailbox } from "./mailbox";
import { Upscale } from "./upscaler";
import { generateRandomString, sleep, tryUntilSuccess } from "./utils";
import { promptEngine } from "../PromptEngine";
import EventEmitter from "eventemitter3"
import { log } from "~/utils/log";

export class CancelException extends Error {
  constructor() {
    super("Wallpaper building process has been canceled")
  }
}

export class MoreThanOneGenerationException extends Error {
  constructor() {
    super("A wallpaper is already being generated")
  }
}

export const StatusEnum = {
  INITIALIZING: "INITIALIZING",
  GENERATING_IMAGE: "GENERATING_IMAGE",
  UPSCALING: "UPSCALING",
  FINALIZING: "FINALIZING",
  IDLE: "IDLE",
  CANCELING: "CANCELING",
} as const

export type StatusEnum = keyof typeof StatusEnum

type WallpaperEngineEvents = {
  statusChange: [status: StatusEnum];
  prompt: [typeof UserStore.prompts.$inferOutput[number]]
}

export class WallpaperEngine {
  status: StatusEnum = "IDLE"
  events = new EventEmitter<WallpaperEngineEvents>()

  on = this.events.on.bind(this.events)
  off = this.events.off.bind(this.events)

  private handleStatus(status?: StatusEnum) {
    this.handleCancelation()

    if (status && status !== this.status) {
      this.status = status
      void log.wallpaperGeneration.info(`emitting statusChange: ${this.status}`)
      this.events.emit("statusChange", this.status)
    }
  }

  private handleCancelation() {
    if (this.status === "CANCELING") {
      this.status = "IDLE"
      this.events.emit("statusChange", this.status)
      throw new CancelException()
    }
  }

  cancel = () => {
    this.status = "CANCELING"
    this.events.emit("statusChange", this.status)
  }

  private async generateWallpaper({
    prompt,
    ratio,
  }: {
    prompt: string;
    ratio: { x: number; y: number };
  }) {
    const leonardo = new Leonardo();

    this.handleStatus()

    const mailbox = await makeMailbox();

    this.handleStatus()

    const password = "abcaiafoh!@#$%ASDH1234";

    await leonardo.signup({ email: mailbox.email, password });

    this.handleStatus()

    const code = await tryUntilSuccess({ maxTries: 10, waitBetween: 2_000 })(async () => {
      if (this.status === "CANCELING") return null

      const messages = await mailbox.checkMessages();

      const firstMessage = messages[0];

      if (!firstMessage) {
        void log.wallpaperGeneration.info("no message found")
        throw new Error("no message found")
      };

      const code = firstMessage.body_html.match(/\d{6}/g)?.[0];

      return code;
    });

    this.handleStatus()

    if (!code) {
      void log.wallpaperGeneration.error("code could not found from email message")
      throw new Error("code could not found from email message");
    }

    await leonardo.confirmSignup({
      email: mailbox.email,
      password,
      confirmation_code: code,
    });

    this.handleStatus()

    await leonardo.login({ username: mailbox.email, password });
    this.handleStatus()

    await tryUntilSuccess({ maxTries: 5, waitBetween: 1_000 })(async () => {
      if (this.status === "CANCELING") return null
      await leonardo.updateUsername(generateRandomString(15));
    });

    this.handleStatus()
    await leonardo.updateUserDetails();

    this.handleStatus()
    await leonardo.getUserDetails();

    this.handleStatus()
    await leonardo.startUserAlchemyTrial();

    this.handleStatus("GENERATING_IMAGE")
    const generation = await leonardo.createSDGenerationJob({
      prompt,
      num_images: 1,
      width: ratio.x > ratio.y ? 1536 : (ratio.x * 1536) / ratio.y,
      height: ratio.y > ratio.x ? 1536 : (ratio.y * 1536) / ratio.x,
    });

    // 60s timeout
    // check every 5 seconds
    for (let i = 0; i < 60_000 / 5_000; i++) {
      this.handleStatus()
      await sleep(5_000);

      this.handleStatus()

      const result = await leonardo.getAIGenerationFeed({
        generationId: generation.sdGenerationJob.generationId,
      });

      const generated = result.generations[0];

      if (generated) {
        if (generated.status === "COMPLETE") {
          const { generated_images } = generated;

          return generated_images[0]!;
        }

        void log.wallpaperGeneration.error("Image generation failed in leonardo server")
        throw new Error("Image generation failed in leonardo server");
      }
    }

    void log.wallpaperGeneration.error("Timeout during image generation")
    throw new Error("Timeout during image generation");
  }

  private async coreGenerate(promptId: string) {
    this.handleStatus("INITIALIZING")

    const monitor = await currentMonitor();

    if (!monitor) {
      void log.wallpaperGeneration.error("No monitor found")
      throw new Error("No monitor found");
    }

    this.handleStatus()

    const prompts = await UserStore.prompts.get()

    const prompt = prompts.find(({ id }) => id === promptId)!

    this.handleStatus()
    this.events.emit("prompt", prompt)

    const { url } = await this.generateWallpaper({
      prompt: await promptEngine.build(prompt.prompt),
      ratio: {
        x: monitor.size.width,
        y: monitor.size.height,
      },
    });

    this.handleStatus()
    // const url = "https://cdn.leonardo.ai/users/74d8382e-fd85-402f-bf2c-8ca0bafa1b96/generations/7c9d84f0-035c-4e52-8cbf-964718dc9520/PhotoReal_rainy_and_cloudy_days_in_old_towns_of_Iran_0.jpg"

    const { data: originalImage, ok } = await fetch<Uint8Array>(url, {
      method: "GET",
      responseType: ResponseType.Binary,
    });


    if (!ok) {
      void log.wallpaperGeneration.error(originalImage)
      throw originalImage
    }

    this.handleStatus("UPSCALING")

    const upscale = new Upscale()

    await upscale.init()

    this.handleStatus()
    await upscale.upload(originalImage, "my_image.jpeg")

    this.handleStatus()
    await upscale.upscale()

    this.handleStatus()
    await upscale.process()

    this.handleStatus()
    const upscaleImage = await upscale.download()

    this.handleStatus("IDLE")

    return {
      upscaleImage,
      originalImage
    }
  }

  generate = async (promptId: string) => {
    if (this.status !== "IDLE") throw new MoreThanOneGenerationException()

    let lastErr: unknown;

    for (let i = 0; i < 3; i++) {
      try {
        const data = await this.coreGenerate(promptId)

        return data
      } catch (e) {
        lastErr = e

        if (e instanceof CancelException) {
          break
        }
      }
    }

    this.handleStatus("IDLE")

    void log.wallpaperGeneration.error(lastErr)
    throw lastErr
  }
}