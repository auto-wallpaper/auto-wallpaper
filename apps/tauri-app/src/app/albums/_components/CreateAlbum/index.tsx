import React, { useEffect, useState } from "react";
import { MdOutlinePlaylistAdd } from "react-icons/md";

import { Button } from "@acme/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

import { AlbumsStore } from "~/stores/albums";

const CreateAlbum: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const form = useForm({
    schema: AlbumsStore.albums.schema.element.pick({
      name: true,
      selectionType: true,
    }),
    defaultValues: {
      name: "",
      selectionType: "sequential",
    },
    mode: "all",
  });

  const { reset } = form;

  useEffect(() => {
    isOpen && reset();
  }, [reset, isOpen]);

  return (
    <Dialog onOpenChange={setIsOpen} open={isOpen}>
      <DialogTrigger asChild>
        <Button
          size="lg"
          className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 border-teal-500 bg-teal-500/20 text-teal-500 backdrop-blur-md hover:bg-opacity-30"
          variant="outline"
        >
          <MdOutlinePlaylistAdd size={18} />
          Create Album
        </Button>
      </DialogTrigger>

      <DialogContent className={"max-w-[35rem]"}>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(async (values) => {
              await AlbumsStore.albums.set((prev) => [...prev, values]);
              setIsOpen(false);
            })}
          >
            <DialogHeader>
              <DialogTitle>Create Album</DialogTitle>
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
                      <Input
                        placeholder="Write the album's name..."
                        {...field}
                      />
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
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="capitalize ring-inset focus:ring-1 focus:ring-zinc-700 focus:ring-offset-0">
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
                Save
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateAlbum;
