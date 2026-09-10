import { LucideIcon } from "lucide-react";
import { formatNumber } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function StatCard({
  title,
  value,
  helper,
  icon: Icon,
  tone = "emerald",
}: {
  title: string;
  value: number;
  helper: string;
  icon: LucideIcon;
  tone?: "emerald" | "amber" | "sky" | "rose";
}) {
  const tones = {
    emerald: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    amber: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    sky: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
    rose: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  };

  return (
    <Card className="overflow-hidden shadow-md shadow-emerald-950/10">
      <CardHeader className="flex flex-row items-start justify-between gap-1 space-y-0 p-3 sm:p-5">
        <CardTitle className="min-h-8 min-w-0 text-xs leading-4 sm:min-h-10 sm:text-sm sm:leading-5">{title}</CardTitle>
        <div className={`shrink-0 rounded-md p-1 sm:p-2 ${tones[tone]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0 sm:p-5 sm:pt-0">
        <div className="break-all text-xl font-semibold tabular-nums sm:text-2xl">
          {formatNumber(value)}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
      </CardContent>
    </Card>
  );
}
