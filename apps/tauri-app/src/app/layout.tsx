import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";

import { cn } from "@acme/ui";
import { Toaster } from "@acme/ui/toast";

import "~/app/globals.css";

import dynamic from "next/dynamic";

const Layout = dynamic(() => import("./_components/Layout"), {
  ssr: false,
});

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "flex h-screen flex-col overflow-hidden bg-zinc-950/90 font-sans text-white antialiased",
          GeistSans.variable,
          GeistMono.variable,
        )}
      >
        <Layout>{props.children}</Layout>
        <Toaster />
      </body>
    </html>
  );
}
