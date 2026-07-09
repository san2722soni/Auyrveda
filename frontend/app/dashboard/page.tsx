"use client";

import Link from "next/link";
import {
  Activity,
  CalendarCheck,
  CalendarClock,
  MessageSquareText,
  Users,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getDashboardStats } from "@/lib/api/dashboard";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/error-state";
import { buttonClassName } from "@/components/ui/button";
import { formatNumber } from "@/lib/format";

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
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

export default function DashboardPage() {
  const statsQuery = useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: getDashboardStats,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description="A quick look at your clinic's WhatsApp activity."
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
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Total Users"
              value={statsQuery.data.totalUsers}
              helper={`+${formatNumber(statsQuery.data.newUsersThisMonth)} this month`}
              icon={Users}
            />
            <StatCard
              title="Total Messages"
              value={statsQuery.data.totalMessages}
              helper="WhatsApp conversations"
              icon={MessageSquareText}
            />
            <StatCard
              title="Pending Appointments"
              value={statsQuery.data.pendingAppointments}
              helper="Need clinic follow-up"
              icon={CalendarClock}
            />
            <StatCard
              title="Completed Appointments"
              value={statsQuery.data.completedAppointments}
              helper="Marked done by staff"
              icon={CalendarCheck}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <Card>
              <CardHeader>
                <CardTitle className="text-base text-foreground">
                  Activity Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-md border p-4">
                    <div className="text-sm text-muted-foreground">
                      New users this week
                    </div>
                    <div className="mt-2 text-xl font-semibold">
                      {formatNumber(statsQuery.data.newUsersThisWeek)}
                    </div>
                  </div>
                  <div className="rounded-md border p-4">
                    <div className="text-sm text-muted-foreground">
                      Appointments this week
                    </div>
                    <div className="mt-2 text-xl font-semibold">
                      {formatNumber(statsQuery.data.appointmentsThisWeek)}
                    </div>
                  </div>
                  <div className="rounded-md border p-4">
                    <div className="text-sm text-muted-foreground">
                      Appointments this month
                    </div>
                    <div className="mt-2 text-xl font-semibold">
                      {formatNumber(statsQuery.data.appointmentsThisMonth)}
                    </div>
                  </div>
                  <div className="rounded-md border p-4">
                    <div className="text-sm text-muted-foreground">
                      Total appointments
                    </div>
                    <div className="mt-2 text-xl font-semibold">
                      {formatNumber(statsQuery.data.totalAppointments)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-foreground">
                  <Activity className="h-4 w-4" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link
                  href="/appointments?status=pending"
                  className={buttonClassName({
                    variant: "outline",
                    className: "w-full justify-start",
                  })}
                >
                  View Pending Appointments
                </Link>
                <Link
                  href="/users"
                  className={buttonClassName({
                    variant: "outline",
                    className: "w-full justify-start",
                  })}
                >
                  View Users
                </Link>
                <Link
                  href="/knowledge"
                  className={buttonClassName({
                    variant: "outline",
                    className: "w-full justify-start",
                  })}
                >
                  Edit Knowledge
                </Link>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
