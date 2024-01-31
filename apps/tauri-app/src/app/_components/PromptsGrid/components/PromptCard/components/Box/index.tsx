import React from "react";

const Box: React.FC<React.PropsWithChildren> = ({ children }) => {
  return (
    <div
      className="rounded-md bg-zinc-900/75 w-max"
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
};

export default Box;
