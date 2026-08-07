import { LucideIcon } from "lucide-react";
import CountUp from "react-countup";
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
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>{title}</CardTitle>
        <div className={`rounded-md p-2 ${tones[tone]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">
          <CountUp end={value} duration={0.9} separator="," preserveValue />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
      </CardContent>
    </Card>
  );
}
