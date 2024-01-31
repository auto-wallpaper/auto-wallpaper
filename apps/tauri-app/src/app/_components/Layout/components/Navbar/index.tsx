"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@acme/ui";
import { Button } from "@acme/ui/button";

type ItemProps = {
  href: string;
  label: string;
};

const Item: React.FC<ItemProps> = ({ href, label }) => {
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
      <Link href={href}>{label}</Link>
    </Button>
  );
};

const Navbar: React.FC = () => {
  return (
    <div className="w-full border-b border-zinc-800 bg-transparent">
      <div className="grid w-max grid-cols-2 bg-transparent text-white">
        <Item href="/" label="Prompts" />
        <Item href="/settings" label="Settings" />
      </div>
    </div>
  );
};

export default Navbar;
