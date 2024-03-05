import React, { useEffect, useState } from "react";
import { IoCreateOutline, IoInformationCircleOutline } from "react-icons/io5";

import { Button } from "@acme/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@acme/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useForm,
} from "@acme/ui/form";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@acme/ui/hover-card";
import { Textarea } from "@acme/ui/textarea";

// import { promptEngine } from "~/lib/PromptEngine";
import { UserStore } from "~/stores/user";
import { generatePrompt } from "~/utils/commands";

const NewPrompt: React.FC = () => {
  const [builtPrompt, setBuiltPrompt] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const form = useForm({
    schema: UserStore.prompts.schema.element.pick({
      prompt: true,
    }),
    defaultValues: {
      prompt: "",
    },
    mode: "all",
  });

  const formValues = form.getValues();

  const { reset } = form;

  useEffect(() => {
    isOpen && reset();
  }, [reset, isOpen]);

  useEffect(() => {
    const handler = async () => {
      if (!form.formState.isValid || form.formState.isValidating) return;

      // const builtPrompt = await promptEngine.build(formValues.prompt);

      setBuiltPrompt(await generatePrompt(formValues.prompt));
    };

    void handler();
  }, [formValues.prompt, form.formState.isValid, form.formState.isValidating]);

  return (
    <Dialog onOpenChange={setIsOpen} open={isOpen}>
      <DialogTrigger asChild>
        <Button
          size="lg"
          className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 border-teal-500 bg-teal-500/20 text-teal-500 backdrop-blur-md hover:bg-opacity-30"
          variant="outline"
        >
          <IoCreateOutline size={18} />
          New Prompt
        </Button>
      </DialogTrigger>

      <DialogContent className={"max-w-[35rem]"}>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(async (values) => {
              await UserStore.prompts.set((prev) => [...prev, values]);
              setIsOpen(false);
            })}
          >
            <DialogHeader>
              <DialogTitle>Create Prompt</DialogTitle>
              <DialogDescription>
                Some of the actions can be done through the settings tab
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <FormField
                control={form.control}
                name="prompt"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-1">
                      <FormLabel>Prompt</FormLabel>
                      <HoverCard>
                        <HoverCardTrigger>
                          <IoInformationCircleOutline />
                        </HoverCardTrigger>
                        <HoverCardContent
                          side="top"
                          align="start"
                          className="w-max max-w-[30rem] p-4"
                        >
                          <p className="text-sm">
                            You can use these variables in the prompt that will
                            be replaced by the real values while generating the
                            wallpaper:
                          </p>

                          <ul className="mt-1 list-inside list-disc whitespace-pre-wrap text-xs text-zinc-300 marker:text-zinc-300">
                            <li>
                              $WEATHER: A brief text of weather condition based
                              on the selected country and city
                            </li>
                            <li>
                              $COUNTRY: The country&apos;s name of the select
                              location
                            </li>
                            <li>
                              $LOCATION_NAME: The name of the select location
                            </li>
                          </ul>
                        </HoverCardContent>
                      </HoverCard>
                    </div>
                    <FormControl>
                      <Textarea
                        placeholder="Write a prompt here..."
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      <p>{builtPrompt}</p>
                    </FormDescription>
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

export default NewPrompt;
