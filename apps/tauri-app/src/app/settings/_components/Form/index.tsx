"use client";

import React, { useEffect } from "react";
import { z } from "zod";

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@acme/ui/select";

import { useUpdateStore } from "~/app/_components/Layout/components/UpdateBox";
import { IntervalTexts, UserStore } from "~/stores/user";
import Geocoding from "./components/Geocoding";

type FieldProps = {
  label: string;
  control: React.ReactNode;
  notes?: React.ReactNode[];
};

const Field: React.FC<FieldProps> = ({ label, control, notes = [] }) => {
  return (
    <FormItem className="flex flex-col">
      <FormLabel>{label}</FormLabel>

      <div className="flex max-w-3xl flex-col gap-x-5 gap-y-2">
        <FormControl>
          <div className="flex-1">{control}</div>
        </FormControl>

        {notes.length > 0 && (
          <FormDescription className="flex-1">
            {notes.length > 1 && (
              <ul className="list-inside list-disc">
                {notes.map((note, i) => (
                  <li key={i}>{note}</li>
                ))}
              </ul>
            )}

            {notes.length === 1 && <p>{notes[0]}</p>}
          </FormDescription>
        )}
      </div>
      <FormMessage />
    </FormItem>
  );
};

const SettingsForm: React.FC = () => {
  const location = UserStore.location.useValue();

  const form = useForm({
    schema: z.object({
      interval: UserStore.interval.schema,
      location: UserStore.location.schema.nullable(),
    }),
    values: {
      interval: UserStore.interval.useValue() ?? "FIFTEEN_MINS",
      location: UserStore.location.useValue(),
    },
    mode: "all",
  });

  const watchedFormFields = form.watch();

  useEffect(() => {
    if (watchedFormFields.location) {
      void UserStore.location.set(watchedFormFields.location);
    }
  }, [watchedFormFields.location]);

  useEffect(
    () => void UserStore.interval.set(watchedFormFields.interval),
    [watchedFormFields.interval],
  );

  const checkForUpdate = useUpdateStore((state) => state.check);

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(async (values) => {
          form.reset(values);
        })}
      >
        <div className="flex flex-col gap-10 py-4">
          <FormField
            control={form.control}
            name="location"
            render={() => (
              <Field
                label="Location"
                control={
                  <Geocoding
                    onChange={(location) => form.setValue("location", location)}
                    value={location}
                  />
                }
                notes={[
                  "This location will be used to fetch the weather condition and the timezone",
                ]}
              />
            )}
          />

          <FormField
            control={form.control}
            name="interval"
            render={({ field }) => (
              <Field
                label="Interval"
                control={
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="ring-inset focus:ring-1 focus:ring-zinc-700 focus:ring-offset-0">
                        <SelectValue placeholder="Select an interval..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {UserStore.interval.schema.options.map((item) => (
                        <SelectItem key={item} value={item}>
                          {IntervalTexts[item]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                }
                notes={[
                  "Select the duration of waiting time between each wallpaper generation",
                ]}
              />
            )}
          />

          <Field
            label="Auto-start on Launch"
            control={
              <Select
                onValueChange={(value) =>
                  UserStore.autostart.set(value === "enable")
                }
                value={UserStore.autostart.useValue() ? "enable" : "disable"}
              >
                <FormControl>
                  <SelectTrigger className="ring-inset focus:ring-1 focus:ring-zinc-700 focus:ring-offset-0">
                    <SelectValue placeholder="Select an option" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="enable">Enable</SelectItem>
                  <SelectItem value="disable">Disable</SelectItem>
                </SelectContent>
              </Select>
            }
          />

          <button
            className="-mt-4 w-max text-sm text-zinc-400 underline-offset-1 hover:underline"
            onClick={() => checkForUpdate()}
          >
            check for updates
          </button>
        </div>
      </form>
    </Form>
  );
};

export default SettingsForm;
