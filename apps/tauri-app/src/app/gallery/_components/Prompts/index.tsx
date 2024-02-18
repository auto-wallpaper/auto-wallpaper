"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getVersion } from "@tauri-apps/api/app";
import { fetch } from "@tauri-apps/api/http";
import { compare } from "compare-versions";
import { error } from "tauri-plugin-log-api";

import { PromptsGrid } from "~/app/_components/PromptCard";
import Card from "./components/Card";

type PromptsData = {
  prompts: { id: string; prompt: string }[];
  minVersion: string;
};

const Prompts: React.FC = () => {
  const [status, setStatus] = useState<
    "loading" | "deprecated" | "success" | "error"
  >("loading");
  const [prompts, setPrompts] = useState<PromptsData["prompts"]>([]);

  useEffect(() => {
    const handler = async () => {
      const { data, ok } = await fetch<PromptsData>(
        "https://raw.githubusercontent.com/auto-wallpaper/auto-wallpaper/gallery/data.json",
      );

      if (!ok) {
        void error(
          `Error during fetching gallery data.json: ${JSON.stringify(
            data,
            null,
            4,
          )}`,
        );
        setStatus("error");
        return;
      }

      setStatus(
        compare(await getVersion(), data.minVersion, ">=")
          ? "success"
          : "deprecated",
      );

      setPrompts(data.prompts);
    };

    void handler();
  }, []);

  if (status === "loading") {
    return null;
  }

  if (status === "error") {
    return (
      <p className="text-center text-sm">
        An unexpected error during getting the data. please report
        the issue in our{" "}
        <Link
          href="https://github.com/auto-wallpaper/auto-wallpaper/issues"
          className="text-zinc-400 underline underline-offset-4 transition hover:text-zinc-500"
        >
          github repository
        </Link>
      </p>
    );
  }

  if (status === "deprecated") {
    return (
      <p className="text-center text-sm">
        Your current version is deprecated. To see the gallery you must update
        your Auto Wallpaper app through the{" "}
        <Link
          href="/settings"
          className="text-zinc-400 underline underline-offset-4 transition hover:text-zinc-500"
        >
          settings
        </Link>
      </p>
    );
  }

  return (
    <PromptsGrid>
      {prompts.map(({ id, prompt }) => (
        <Card key={id} id={id} prompt={prompt} />
      ))}
    </PromptsGrid>
  );
};

export default Prompts;
