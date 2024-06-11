"use client";

import React, { useEffect, useLayoutEffect, useState } from "react";

import { UserStore } from "~/stores/user";
import { PromptsGrid } from "../PromptCard";
import NewPrompt from "./components/NewPrompt";
import UserPromptCard from "./components/PromptCard";

const UserPrompts: React.FC = () => {
  const prompts = UserStore.prompts.useValue();
  const [orders, setOrders] = useState<string[]>([]);

  useEffect(() => {
    setOrders((prev) => {
      const newOrders = prompts?.map((prompt) => prompt.id) ?? [];
      return prev.toString() === newOrders.toString() ? prev : newOrders;
    });
  }, [prompts]);

  useLayoutEffect(() => {
    void UserStore.prompts.set((prev) =>
      [...prev].sort((a, b) => orders.indexOf(a.id) - orders.indexOf(b.id)),
    );
  }, [orders]);

  return (
    <PromptsGrid orders={orders} setOrders={setOrders}>
      {orders.map((promptId) => {
        const prompt = prompts?.find((prompt) => prompt.id === promptId);

        if (!prompt) return null;

        return <UserPromptCard key={prompt.id} data={prompt} />;
      })}

      <NewPrompt />
    </PromptsGrid>
  );
};

export default UserPrompts;
