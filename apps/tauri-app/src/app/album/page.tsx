import React from "react";
import dynamic from "next/dynamic";

const Album = dynamic(() => import("./_components/Album"), {
  ssr: false,
});

const page = () => {
  return (
    <>
      <Album />
    </>
  );
};

export default page;
