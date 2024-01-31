import type { IconType } from "react-icons/lib";
import React, { forwardRef } from "react";

import { cn } from "@acme/ui";
import { Button as MainButton } from "@acme/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@acme/ui/tooltip";

type ButtonProps = {
  Icon: IconType;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  tooltip?: React.ReactNode;
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ Icon, className, onClick, disabled, tooltip }, ref) => {
    return (
      <TooltipProvider>
        <Tooltip open={typeof tooltip === "undefined" ? false : undefined}>
          <TooltipTrigger ref={ref} className="cursor-pointer" asChild>
            <MainButton
              size="icon"
              className={cn(
                "bg-transparent shadow-none transition-all hover:bg-zinc-950/30 disabled:cursor-default disabled:opacity-25",
                className,
              )}
              onClick={onClick}
              disabled={disabled}
            >
              <Icon size={18} />
            </MainButton>
          </TooltipTrigger>
          <TooltipContent>{tooltip}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  },
);

Button.displayName = "Button"

export default Button;
