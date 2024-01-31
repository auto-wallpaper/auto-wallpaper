import { Body, ResponseType } from "@tauri-apps/api/http";

import fetchCookie from "~/utils/fetchCookie";
import { log } from "~/utils/log";

const TASK_ID_REGEX = /ilovepdfConfig\.taskId = '([\w\d]*)'/;
const TOKEN_REGEX = /"token":"([\w\d._-]*)"/;

export class Upscale {
  private fetch = fetchCookie({
    throwOnFail: true
  })
  private task: string | null = null;
  private server_filename: string | null = null;
  private filename: string | null = null;

  private require(value: unknown): asserts value is NonNullable<typeof value> {
    if (value === null) {
      void log.wallpaperGeneration.error("dependency in Upscale class cannot be null")
      throw new Error("dependency in Upscale class cannot be null")
    }
  }

  async init() {
    const { data: html } = await this.fetch<string>(
      "https://www.iloveimg.com/upscale-image",
      {
        method: "GET",
        responseType: ResponseType.Text,
      },
    );

    this.task = TASK_ID_REGEX.exec(html)?.[1] ?? "";
    const token = TOKEN_REGEX.exec(html)?.[1] ?? "";

    this.fetch.defaults.headers = {
      ...this.fetch.defaults.headers,
      Authorization: `Bearer ${token}`,
    }
  }

  async upload(file: Uint8Array, filename: string) {
    this.require(this.task)

    const {
      data: { server_filename },
    } = await this.fetch<{ server_filename: string }>(
      "https://api3g.iloveimg.com/v1/upload",
      {
        method: "POST",
        headers: {
          "Content-Type": "multipart/form-data",
        },
        body: Body.form({
          file: {
            file,
            mime: "image/jpeg",
            fileName: filename,
          },
          task: this.task,
          name: filename,
        }),
      },
    );

    this.server_filename = server_filename
    this.filename = filename
  }

  async upscale() {
    this.require(this.task)
    this.require(this.server_filename)

    await this.fetch("https://api3g.iloveimg.com/v1/upscale", {
      method: "POST",
      headers: {
        "Content-Type": "multipart/form-data;",
      },
      body: Body.form({
        task: this.task,
        server_filename: this.server_filename,
        scale: "4",
      }),
      throwOnFail: false
    });
  }

  async process() {
    this.require(this.task)
    this.require(this.server_filename)
    this.require(this.filename)

    await this.fetch("https://api3g.iloveimg.com/v1/process", {
      method: "POST",
      body: Body.form({
        packaged_filename: "iloveimg-upscaled",
        multiplier: "4",
        task: this.task,
        tool: "upscaleimage",
        "files[0][server_filename]": this.server_filename,
        "files[0][filename]": this.filename,
      }),
    });
  }

  async download() {
    this.require(this.task)

    const { data } = await this.fetch<Uint8Array>(
      `https://api3g.iloveimg.com/v1/download/${this.task}`,
      {
        method: "GET",
        responseType: ResponseType.Binary,
      },
    );

    return data;
  }
}