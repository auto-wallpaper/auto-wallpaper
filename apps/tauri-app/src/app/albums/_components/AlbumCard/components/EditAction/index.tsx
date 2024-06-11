import React, { useEffect, useState } from "react";
import { MdOutlineModeEditOutline } from "react-icons/md";

import { Button } from "@acme/ui/button";
import {
  DialogClose,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@acme/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useForm,
} from "@acme/ui/form";
import { Input } from "@acme/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@acme/ui/select";

import Action from "~/app/_components/PromptsGrid/components/PromptCard/components/Actions/components/Action";
import { AlbumsStore } from "~/stores/albums";
import { useAlbumContext } from "../../contexts";

const EditAction: React.FC = () => {
  const { id, name, selectionType } = useAlbumContext();
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm({
    schema: AlbumsStore.albums.schema.element.pick({
      name: true,
      selectionType: true,
    }),
    defaultValues: {
      name,
      selectionType,
    },
    mode: "all",
  });

  const { reset } = form;

  useEffect(() => {
    isOpen && reset();
  }, [reset, isOpen]);

  return (
    <Action
      Icon={MdOutlineModeEditOutline}
      onOpenChange={setIsOpen}
      open={isOpen}
    >
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(async (values) => {
            await AlbumsStore.albums.set((prev) =>
              prev.map((album) =>
                album.id === id ? { ...album, ...values } : album,
              ),
            );
            form.reset(values);
            setIsOpen(false);
          })}
        >
          <DialogHeader>
            <DialogTitle>Edit Album</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-6 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-1">
                    <FormLabel>Name</FormLabel>
                  </div>
                  <FormControl>
                    <Input placeholder="Write the album's name..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="selectionType"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-1">
                    <FormLabel>Selection Type</FormLabel>
                  </div>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="ring-inset focus:ring-1 focus:ring-zinc-700 focus:ring-offset-0 capitalize">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {AlbumsStore.albums.schema.element.shape.selectionType
                          .removeDefault()
                          .options.map((item) => (
                            <SelectItem
                              key={item}
                              value={item}
                              className="capitalize"
                            >
                              {item}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="reset">Cancel</Button>
            </DialogClose>
            <Button type="submit" variant="secondary">
              Submit Changes
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </Action>
  );
};

export default EditAction;
