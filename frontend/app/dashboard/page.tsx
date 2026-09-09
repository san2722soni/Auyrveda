"use client";

import { useState } from "react";
import {
  CalendarCheck,
  CalendarClock,
  ChevronDown,
  MessageSquareText,
  Users,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getDashboardStats } from "@/lib/api/dashboard";
import { DashboardStats, DashboardTrendPeriod } from "@/types/dashboard";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/error-state";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/format";
import { MessageFailures } from "@/components/message-failures";

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <CardHeader>
              <Skeleton className="h-4 w-28" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20" />
              <Skeleton className="mt-2 h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    </div>
  );
}

function getChartMax(points: DashboardStats["trend"]["points"], dataKey: "users" | "appointments") {
  const maxValue = Math.max(0, ...points.map((point) => point[dataKey]));

  if (maxValue <= 10) {
    return 10;
  }

  const step = maxValue <= 50 ? 10 : 50;

  return Math.ceil(maxValue / step) * step;
}

function MetricChart({
  title,
  description,
  stats,
  dataKey,
  color,
}: {
  title: string;
  description: string;
  stats: DashboardStats;
  dataKey: "users" | "appointments";
  color: string;
}) {
  const latestValue = stats.trend.points.at(-1)?.[dataKey] ?? 0;
  const chartMax = getChartMax(stats.trend.points, dataKey);

  return (
    <Card className="shadow-lg shadow-emerald-950/10">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-base text-foreground">{title}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="rounded-md border bg-background/70 px-3 py-2 text-right">
          <div className="text-xs text-muted-foreground">Current total</div>
          <div className="text-lg font-semibold">{formatNumber(latestValue)}</div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={stats.trend.points}
              margin={{ left: 0, right: 14, top: 16, bottom: 0 }}
            >
              <defs>
                <linearGradient id={`${dataKey}-fill`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.34} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                minTickGap={18}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={36}
                allowDecimals={false}
                domain={[0, chartMax]}
              />
              <Tooltip
                formatter={(value) => formatNumber(Number(value))}
                labelClassName="text-foreground"
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--card))",
                }}
              />
              <Area
                type="monotone"
                dataKey={dataKey}
                stroke={color}
                strokeWidth={3}
                fill={`url(#${dataKey}-fill)`}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [period, setPeriod] = useState<DashboardTrendPeriod>("week");
  const periodLabel = period === "week" ? "This Week" : "This Month";
  const statsQuery = useQuery({
    refetchInterval: 5000,
    queryKey: ["dashboard", "stats", { period }],
    queryFn: () => getDashboardStats({ period }),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description="A quick look at your clinic's WhatsApp activity."
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" className="w-full sm:w-40">
                {periodLabel}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuCheckboxItem
                checked={period === "week"}
                onCheckedChange={() => setPeriod("week")}
              >
                This Week
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={period === "month"}
                onCheckedChange={() => setPeriod("month")}
              >
                This Month
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      {statsQuery.isLoading && <DashboardSkeleton />}

      {statsQuery.isError && (
        <ErrorState
          description="Dashboard statistics could not be loaded."
          onRetry={() => statsQuery.refetch()}
        />
      )}

      {statsQuery.data && (
        <>
          {statsQuery.data.failedMessages > 0 && (
            <div role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive">
              {statsQuery.data.failedMessages} message(s) need delivery review.
              <MessageFailures />
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Total Users"
              value={statsQuery.data.totalUsers}
              helper={`+${formatNumber(statsQuery.data.newUsersThisMonth)} this month`}
              icon={Users}
              tone="emerald"
            />
            <StatCard
              title="Total Messages"
              value={statsQuery.data.totalMessages}
              helper="WhatsApp conversations"
              icon={MessageSquareText}
              tone="sky"
            />
            <StatCard
              title="Pending Appointments"
              value={statsQuery.data.pendingAppointments}
              helper="Need clinic follow-up"
              icon={CalendarClock}
              tone="amber"
            />
            <StatCard
              title="Completed Appointments"
              value={statsQuery.data.completedAppointments}
              helper="Marked done by staff"
              icon={CalendarCheck}
              tone="rose"
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <MetricChart
              title="Users"
              description={`${period === "week" ? "Weekly" : "Monthly"} user growth`}
              stats={statsQuery.data}
              dataKey="users"
              color="#059669"
            />
            <MetricChart
              title="Appointments"
              description={`${period === "week" ? "Weekly" : "Monthly"} appointment growth`}
              stats={statsQuery.data}
              dataKey="appointments"
              color="#f59e0b"
            />
          </div>
        </>
      )}
    </div>
  );
}
