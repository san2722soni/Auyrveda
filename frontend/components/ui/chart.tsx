import * as React from "react";
import { cn } from "@/lib/utils";

export function ChartContainer({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("h-60 min-w-0 w-full sm:h-80", className)}
      {...props}
    />
  );
}
