import * as React from "react";
import { cn } from "@/lib/utils";

export function ChartContainer({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("h-80 w-full rounded-md bg-background/60 p-2", className)}
      {...props}
    />
  );
}
