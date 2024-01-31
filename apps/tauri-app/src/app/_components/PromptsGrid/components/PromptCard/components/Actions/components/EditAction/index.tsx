import React, { useEffect, useState } from "react";
import { IoInformationCircleOutline } from "react-icons/io5";
import { MdOutlineModeEditOutline } from "react-icons/md";

import { Button } from "@acme/ui/button";
import {
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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

import { promptEngine } from "~/lib/PromptEngine";
import { UserStore } from "~/stores/user";
import { usePromptContext } from "../../../../contexts";
import Action from "../Action";

const EditAction: React.FC = () => {
  const { id, prompt } = usePromptContext();
  const [isOpen, setIsOpen] = useState(false);
  const [builtPrompt, setBuiltPrompt] = useState("");

  const form = useForm({
    schema: UserStore.prompts.schema.element.pick({
      prompt: true,
    }),
    defaultValues: {
      prompt,
    },
    mode: "all",
  });

  const { reset } = form;

  useEffect(() => {
    isOpen && reset();
  }, [reset, isOpen]);

  const formValues = form.getValues();

  useEffect(() => {
    const handler = async () => {
      if (!form.formState.isValid || form.formState.isValidating) return;

      const builtPrompt = await promptEngine.build(formValues.prompt);

      setBuiltPrompt(builtPrompt);
    };

    void handler();
  }, [formValues.prompt, form.formState.isValid, form.formState.isValidating]);

  return (
    <Action
      Icon={MdOutlineModeEditOutline}
      onOpenChange={setIsOpen}
      open={isOpen}
    >
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(async (values) => {
            await UserStore.prompts.set((prev) =>
              prev.map((prompt) =>
                prompt.id === id ? { ...prompt, ...values } : prompt,
              ),
            );

            form.reset(values);
            setIsOpen(false);
          })}
        >
          <DialogHeader>
            <DialogTitle>Editing Prompt</DialogTitle>
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
                          You can use these variables in the prompt that will be
                          replaced by the real values while generating the
                          wallpaper:
                        </p>

                        <ul className="mt-1 list-inside list-disc whitespace-pre-wrap text-xs text-zinc-300 marker:text-zinc-300">
                          <li>
                            $WEATHER: A brief text of weather condition based on
                            the selected country and city
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
                    <Textarea placeholder="Write a prompt here..." {...field} />
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
              Submit Changes
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </Action>
  );
};

export default EditAction;
