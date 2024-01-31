import type { IconType } from "react-icons/lib";
import { AiOutlineLoading } from "react-icons/ai";

import { cn } from "@acme/ui";

const Spinner: IconType = (props) => {
  return (
    <AiOutlineLoading
      {...props}
      className={cn("animate-spin", props.className)}
    />
  );
};

export default Spinner;
