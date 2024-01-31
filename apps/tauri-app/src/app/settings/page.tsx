import React from "react";
import dynamic from "next/dynamic";

const SettingsForm = dynamic(() => import("./_components/Form"), {
  ssr: false,
});

const Page = () => {
  return <SettingsForm />;
};

export default Page;
