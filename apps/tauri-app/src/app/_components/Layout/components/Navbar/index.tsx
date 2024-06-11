"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@acme/ui";
import { Button } from "@acme/ui/button";

import { UserStore } from "~/stores/user";

type ItemProps = {
  href: string;
  label: string;
  isActive?: boolean;
};

const Item: React.FC<ItemProps> = ({ href, label, isActive }) => {
  const pathname = usePathname();
  return (
    <Button
      asChild
      value="prompts"
      data-state="active"
      variant="ghost"
      className={cn(
        "rounded-none font-light hover:bg-zinc-500/10",
        pathname === href && "border-b",
      )}
    >
      <Link href={href}>
        <div className="relative">
          {isActive && (
            <div className="absolute -left-1 -top-1 -z-10 aspect-square w-1 rounded-full bg-sky-600" />
          )}
          {label}
        </div>
      </Link>
    </Button>
  );
};

const Navbar: React.FC = () => {
  const selectedPrompt = UserStore.selectedPrompt.useValue();

  return (
    <div className="w-full border-b border-zinc-800 bg-transparent">
      <div className="flex w-max bg-transparent text-white">
        <Item
          href="/"
          label="Prompts"
          isActive={selectedPrompt?.type === "prompt"}
        />
        <Item
          href="/albums"
          label="Albums"
          isActive={selectedPrompt?.type === "album"}
        />
        <Item href="/gallery" label="Gallery" />
        <Item href="/settings" label="Settings" />
      </div>
    </div>
  );
};

export default Navbar;
