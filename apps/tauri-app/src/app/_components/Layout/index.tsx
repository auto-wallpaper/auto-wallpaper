"use client";

import React, { useEffect } from "react";
import { trackEvent } from "@aptabase/tauri";
import { useElementSize } from "@mantine/hooks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { attachConsole } from "tauri-plugin-log-api";

import { ScrollArea } from "@acme/ui/scroll-area";

import Navbar from "./components/Navbar";
import Titlebar from "./components/Titlebar";

addEventListener("unhandledrejection", (e) => {
  trackEvent("promise_rejected", {
    message: (e.reason?.message || e.reason || e).toString(),
  });
});

window.addEventListener("error", (e) => {
  trackEvent("js_error", {
    message: e.message,
  });
});

void attachConsole();

const queryClient = new QueryClient();

const Layout: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { ref: viewportRef, height } = useElementSize<HTMLDivElement>();

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

  return (
    <QueryClientProvider client={queryClient}>
      <Titlebar />
      <Navbar />

      <div
        ref={viewportRef}
        className="h-full max-h-max min-h-max flex-1 px-4 py-6 lg:px-8"
      >
        <ScrollArea style={{ height }}>{children}</ScrollArea>
      </div>
    </QueryClientProvider>
  );
};

export default Layout;
