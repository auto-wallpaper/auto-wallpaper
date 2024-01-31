"use client";

import * as React from "react";
import { useElementSize } from "@mantine/hooks";
import { useQuery } from "@tanstack/react-query";
import { fetch } from "@tauri-apps/api/http";
import { LuCheck, LuChevronsUpDown } from "react-icons/lu";

import { cn } from "@acme/ui";
import { Button } from "@acme/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandRawInput,
} from "@acme/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@acme/ui/popover";

import type { UserStore } from "~/stores/user";

type GeocodingResponse = {
  generationtime_ms: number;
  results: (typeof UserStore.location.$inferOutput)[];
};

type GeocodingProps = {
  onChange: (location: typeof UserStore.location.$inferOutput) => void;
  value: typeof UserStore.location.$inferOutput | null;
};

const Geocoding: React.FC<GeocodingProps> = ({ onChange, value }) => {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const buttonSize = useElementSize<HTMLButtonElement>();

  const { data } = useQuery({
    queryKey: ["geocoding", search || value?.name],
    queryFn: async () => {
      const resp = await fetch<GeocodingResponse>(
        "https://geocoding-api.open-meteo.com/v1/search",
        {
          method: "GET",
          query: {
            name: search || value?.name,
            count: "5",
          },
          timeout: 30,
        },
      );

      return resp.data.results;
    },
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={buttonSize.ref}
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between border border-zinc-800 bg-zinc-950 px-3 py-5 font-normal"
        >
          {value?.name ?? "Select a location..."}
          <LuChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        style={{ width: buttonSize.width + 24 }}
        className="w-auto p-0"
      >
        <Command>
          <CommandRawInput
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search a location name or postal code..."
          />
          <CommandEmpty>No location found.</CommandEmpty>
          <CommandGroup>
            {data?.map((item) => (
              <CommandItem
                key={item.id}
                value={item.id.toString()}
                onSelect={() => {
                  onChange(item);
                  setOpen(false);
                }}
                className="flex-col items-start"
              >
                <div className="flex items-center">
                  <LuCheck
                    className={cn(
                      "mr-2 h-4 w-4",
                      value?.id === item.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {item.name}
                </div>
                <p className="px-6 text-sm text-zinc-500">
                  {item.country} · latitude: {item.latitude} · longitude:{" "}
                  {item.longitude}{" "}
                  {item.postcodes &&
                    item.postcodes.length > 0 &&
                    `· postcodes: ${item.postcodes.join(", ")}`}
                </p>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default Geocoding;
