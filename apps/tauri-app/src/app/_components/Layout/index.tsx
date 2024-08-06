"use client";

import React, { useEffect, useRef } from "react";
import { useElementSize } from "@mantine/hooks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { primaryMonitor } from "@tauri-apps/api/window";
import { attachConsole } from "@tauri-apps/plugin-log";

import { ScrollArea } from "@acme/ui/scroll-area";

import { UserStore } from "~/stores/user";
import { log } from "~/utils/log";
import Navbar from "./components/Navbar";
import Titlebar from "./components/Titlebar";
import UpdateBox from "./components/UpdateBox";

addEventListener("unhandledrejection", (e) => {
  const message = (e.reason?.message || e.reason || e).toString();

  log.error("[promise_rejected]", message);
});

window.addEventListener("error", (e) => {
  log.error("[js_error]", e.message);
});

void attachConsole();

const queryClient = new QueryClient();

const Layout: React.FC<React.PropsWithChildren> = ({ children }) => {
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.location.hostname !== "tauri.localhost") {
      return;
    }

    const listener = (e: Event) => {
      e.preventDefault();
      return false;
    };

    document.addEventListener("contextmenu", listener, { capture: true });
    document.addEventListener("selectstart", listener, { capture: true });

    return () => {
      document.removeEventListener("contextmenu", listener, { capture: true });
      document.removeEventListener("selectstart", listener, { capture: true });
    };
  }, []);

  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const listener = () => {
      if (!scrollAreaRef.current) return;

      scrollAreaRef.current.style.height = "0px";
      scrollAreaRef.current.style.height = `${
        viewportRef.current?.clientHeight ?? 0
      }px`;
    };

    listener();

    window.addEventListener("resize", listener);
    window.addEventListener("orientationchange", listener);

    return () => {
      window.removeEventListener("resize", listener);
      window.removeEventListener("orientationchange", listener);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Titlebar />
      <Navbar />

      <div ref={viewportRef} className="flex-1 px-4 pt-6 lg:px-8">
        <ScrollArea ref={scrollAreaRef} className="pb-10">
          {children}
        </ScrollArea>
      </div>

      <UpdateBox />
    </QueryClientProvider>
  );
};

export default Layout;
