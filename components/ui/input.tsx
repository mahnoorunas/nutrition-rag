import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<
  HTMLInputElement,
  React.ComponentPropsWithoutRef<"input">
>(({ className, type = "text", ...props }, ref) => (
  <input
    type={type}
    className={cn(
      "flex h-11 w-full rounded-3xl border border-gray-700 bg-[#1f2937] px-4 py-3 text-sm text-white placeholder:text-gray-500 outline-none transition focus:border-purple-400 focus:ring-4 focus:ring-purple-500/20",
      className
    )}
    ref={ref}
    {...props}
  />
));
Input.displayName = "Input";

export { Input };
