import type { IconType } from "react-icons/lib";
import React from "react";

import { cn } from "@acme/ui";
import { Dialog, DialogContent, DialogTrigger } from "@acme/ui/dialog";

import Button from "../../../Button";

type ActionProps = React.PropsWithChildren<{
  Icon: IconType;
  className?: {
    trigger?: string;
    content?: string;
  };
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
}>;

const Action: React.FC<ActionProps> = ({
  Icon,
  children,
  className,
  onOpenChange,
  open,
}) => {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogTrigger asChild>
        <Button className={className?.trigger} Icon={Icon} />
      </DialogTrigger>
      <DialogContent
        className={cn("max-w-[35rem]", className?.content)}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {children}
      </DialogContent>
    </Dialog>
  );
};

export default Action;
