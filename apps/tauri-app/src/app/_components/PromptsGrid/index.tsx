"use client";

import React, { useMemo } from "react";

import { UserStore } from "~/stores/user";
import { sortByDate } from "~/utils/sort";
import { PromptsGrid } from "../PromptCard";
import NewPrompt from "./components/NewPrompt";
import UserPromptCard from "./components/PromptCard";

const UserPrompts: React.FC = () => {
  const prompts = UserStore.prompts.useValue();

  const sortedPrompts = useMemo(
    () =>
      prompts
        ? [...prompts].sort((a, b) => sortByDate(a.createdAt, b.createdAt))
        : [],
    [prompts],
  );

  return (
    <PromptsGrid>
      {sortedPrompts.map((data) => (
        <UserPromptCard key={data.id} data={data} />
      ))}

      <NewPrompt />
    </PromptsGrid>
  );
};

export default UserPrompts;
