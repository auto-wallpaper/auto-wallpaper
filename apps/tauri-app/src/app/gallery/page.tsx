import React from "react";
import dynamic from "next/dynamic";

const Prompts = dynamic(() => import("./_components/Prompts"), {
  ssr: false,
});

const Page = () => {
  return <Prompts />;
};

export default Page;
