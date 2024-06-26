import type { Update } from "@tauri-apps/plugin-updater";
import React, { useEffect, useState } from "react";
import { check as updaterCheck } from "@tauri-apps/plugin-updater";
import { create } from "zustand";

import { cn } from "@acme/ui";
import { Button } from "@acme/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "@acme/ui/dialog";
import { Progress } from "@acme/ui/progress";

type UpdateState = {
  update: Update | null;
  isUpdating: boolean;
  progress: number;
  check: () => Promise<void>;
  startUpdate: () => Promise<void>;
};

export const useUpdateStore = create<UpdateState>((set, get) => ({
  update: null,
  isUpdating: false,
  progress: 0,
  async check() {
    set({ update: await updaterCheck() });
  },
  async startUpdate() {
    const { update, isUpdating } = get();

    if (isUpdating) return;

    set({ isUpdating: true });

    let updateLength = 0;
    let passedLength = 0;

    return update?.downloadAndInstall((progress) => {
      if (progress?.event === "Started") {
        updateLength = progress.data.contentLength ?? 0;
      }

      if (progress?.event === "Progress") {
        passedLength += progress.data.chunkLength;
      }

      set({ progress: Math.round((passedLength * 100) / (updateLength || 1)) });
    });
  },
}));

const UpdateBox: React.FC = () => {
  const { update, isUpdating, progress, startUpdate, check } = useUpdateStore();

  const [open, setOpen] = useState(false);

  useEffect(() => {
    void check();
  }, [check]);

  useEffect(() => {
    if (update?.available) {
      setOpen(true);

      const interval = setInterval(() => {
        setOpen(true);
      }, 600_000);

      return () => {
        clearInterval(interval);
      };
    }

    setOpen(false);
  }, [update]);

  return (
    <Dialog open={isUpdating || open} onOpenChange={setOpen}>
      <DialogContent
        className={cn("z-50 max-w-[35rem]")}
        hideCloseButton={isUpdating}
      >
        {isUpdating ? (
          <>
            <DialogHeader>
              <h2>Updating to version {update?.version}</h2>
            </DialogHeader>

            <div>
              <Progress value={progress} />
              <p className="mt-1 text-xs text-zinc-400">%{progress}</p>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <h2>Update Available: Version {update?.version}</h2>
            </DialogHeader>
            <p className="text-sm text-zinc-400">
              Version {update?.version} is now available. Updating is
              recommended to ensure all features work properly.
            </p>
            <DialogFooter>
              <Button
                variant="secondary"
                onClick={() => {
                  void startUpdate();
                }}
              >
                Update 🚀
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UpdateBox;
