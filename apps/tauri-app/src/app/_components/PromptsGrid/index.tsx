"use client";

import React, { useMemo } from "react";

import { UserStore } from "~/stores/user";
import { sortByDate } from "~/utils/sort";
import NewPrompt from "./components/NewPrompt";
import PromptCard from "./components/PromptCard";

const PromptsGrid: React.FC = () => {
  const prompts = UserStore.prompts.useValue();

  const sortedPrompts = useMemo(
    () => [...prompts].sort((a, b) => sortByDate(a.createdAt, b.createdAt)),
    [prompts],
  );

  return (
    <div className="grid h-max grid-cols-2 gap-2 lg:grid-cols-3 lg:gap-5">
      {sortedPrompts.map((data) => (
        <PromptCard key={data.id} data={data} />
      ))}

      <NewPrompt />
    </div>
  );
};

export default PromptsGrid;
