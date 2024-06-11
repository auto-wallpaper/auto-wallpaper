import React from "react";
import dynamic from "next/dynamic";

const Albums = dynamic(() => import("./_components/Albums"), {
  ssr: false,
});

const Page = () => {
  return (
    <>
      <Albums />
    </>
  );
};

export default Page;
