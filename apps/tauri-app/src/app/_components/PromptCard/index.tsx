"use client";

import type { Dispatch, PointerEvent, SetStateAction } from "react";
import type { IconType } from "react-icons/lib";
import React, {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useMemo,
} from "react";
import Image from "next/image";
import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MdOutlineImageNotSupported } from "react-icons/md";

import type { ClassValue } from "@acme/ui";
import { cn } from "@acme/ui";
import { Button } from "@acme/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@acme/ui/tooltip";

import type { WallpaperSourceState } from "~/lib/WallpaperFile";
import Spinner from "../Spinner";

export const VARIABLE_REGEX = /\$([\w_]+)/g;

export type PromptCardData = {
  id: string;
  prompt: string;
  source: WallpaperSourceState["sources"][string] | null;
};

const PromptContext = createContext<PromptCardData>(null as never);

export const usePromptContext = () => {
  return useContext(PromptContext);
};

const Box: React.FC<React.PropsWithChildren> = ({ children }) => {
  return (
    <div
      className="w-max rounded-md bg-zinc-900/75"
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
};

type DraggableCardProps = React.PropsWithChildren<{
  id: string;
  onMoving?: (isMoved: boolean) => void;
}>;

export const DraggableCard: React.FC<DraggableCardProps> = ({
  id,
  children,
  onMoving: onDragChange,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const isMoved = useMemo(
    () => transform !== null && (transform.x !== 0 || transform.y !== 0),
    [transform],
  );

  useEffect(() => {
    onDragChange?.(isMoved);
  }, [isMoved, onDragChange]);

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 1 : undefined,
      }}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
};

type PromptCardProps = PromptCardData & {
  className?: {
    root?: ClassValue;
  };
  actions: React.ReactNode;
  onSelect?: () => void;
};

export const PromptCard = forwardRef<HTMLDivElement, PromptCardProps>(
  ({ id, source, prompt, className, actions, onSelect }, ref) => {
    return (
      <PromptContext.Provider value={{ id, prompt, source }}>
        <div
          ref={ref}
          id={id}
          className={cn(
            "relative col-span-1 flex aspect-video flex-col rounded-md border border-zinc-800 bg-transparent bg-zinc-950 px-2 py-4 transition",
            className?.root,
            onSelect && "cursor-pointer",
          )}
          onClick={() => onSelect?.()}
        >
          <span className="absolute bottom-0 left-0 right-0 top-0 flex h-full w-full flex-col items-center justify-center text-sm">
            {source?.src ? (
              <Image
                src={source?.src}
                alt=""
                fill
                className="rounded-md object-cover"
              />
            ) : !source || source.status === "loading" ? (
              <Spinner />
            ) : (
              <div className="text-center">
                {source?.status === "failed" ? (
                  <p>Failed to load the wallpaper</p>
                ) : (
                  <>
                    <div className="flex items-center justify-center gap-1">
                      <MdOutlineImageNotSupported />
                      <p>No Image Yet.</p>
                    </div>
                    <p>Generate one to show here</p>
                  </>
                )}
              </div>
            )}
          </span>

          <div className="absolute right-0 top-0 z-50 m-2 flex w-max cursor-default justify-end gap-1">
            <Box>{actions}</Box>
          </div>

          <div
            className={cn(
              "absolute bottom-0 left-0 z-10 mt-auto h-max w-full rounded-b-md px-2 pb-4 pt-32",
              source?.src && "bg-gradient-to-t from-black/90 to-transparent",
            )}
          >
            <p className="line-clamp-3 text-center text-xs">
              {prompt.split(VARIABLE_REGEX).map((word, i) =>
                i % 2 === 1 ? (
                  <span key={i} className="font-mono text-zinc-400">
                    ${word}
                  </span>
                ) : (
                  <span key={i}>{word}</span>
                ),
              )}
            </p>
          </div>
        </div>
      </PromptContext.Provider>
    );
  },
);

PromptCard.displayName = "PromptCard";

type PromptsGridProps = React.PropsWithChildren<
  | {
      orders: string[];
      setOrders: Dispatch<SetStateAction<string[]>>;
      sortable?: true;
    }
  | { sortable: false }
>;

const handler = (e: PointerEvent) => {
  let cur = e.nativeEvent.target as HTMLElement | null;

  while (cur) {
    if (cur.dataset?.noDnd) {
      return false;
    }
    cur = cur.parentElement;
  }

  return true;
};

class LibPointerSensor extends PointerSensor {
  static activators = [{ eventName: "onPointerDown", handler } as const];
}

export const PromptsGrid: React.FC<PromptsGridProps> = ({
  children,
  ...props
}) => {
  const sensors = useSensors(
    useSensor(LibPointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={
        props.sortable !== false
          ? (event) => {
              const { active, over } = event;

              if (over && active.id !== over.id) {
                props.setOrders((items) => {
                  const oldIndex = items.indexOf(active.id.toString());
                  const newIndex = items.indexOf(over.id.toString());

                  return arrayMove(items, oldIndex, newIndex);
                });
              }
            }
          : undefined
      }
    >
      <div className="grid h-max grid-cols-2 gap-2 lg:grid-cols-3 lg:gap-5">
        {props.sortable !== false ? (
          <SortableContext items={props.orders}>{children}</SortableContext>
        ) : (
          children
        )}
      </div>
    </DndContext>
  );
};

type ButtonProps = {
  Icon: IconType;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  tooltip?: React.ReactNode;
};

export const ActionButton = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ Icon, className, onClick, disabled, tooltip }, ref) => {
    return (
      <TooltipProvider>
        <Tooltip open={typeof tooltip === "undefined" ? false : undefined}>
          <TooltipTrigger ref={ref} asChild>
            <Button
              size="icon"
              className={cn(
                "cursor-pointer bg-transparent shadow-none transition-all hover:bg-zinc-950/30",
                className,
                disabled && "cursor-default opacity-25",
              )}
              onClick={disabled ? undefined : onClick}
            >
              <Icon size={18} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{tooltip}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  },
);

ActionButton.displayName = "ActionButton";
