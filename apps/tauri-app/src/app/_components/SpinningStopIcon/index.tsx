import type { IconType } from "react-icons/lib";
import { IoStopOutline } from "react-icons/io5";

import { cn } from "@acme/ui";

const SpinningStopIcon: IconType = (props) => {
  return (
    <IoStopOutline
      {...props}
      className={cn("animate-spinning-stroke", props.className)}
    />
  );
};

export default SpinningStopIcon;
