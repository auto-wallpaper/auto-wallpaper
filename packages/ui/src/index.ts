import type { CxOptions } from "class-variance-authority";
import { cx } from "class-variance-authority";
import { twMerge } from "tailwind-merge";

export type { ClassValue } from "class-variance-authority/types";

function cn(...inputs: CxOptions) {
  return twMerge(cx(inputs));
}

export { cn };
