"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Search } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getAppointments,
  updateAppointmentStatus,
} from "@/lib/api/appointments";
import { Appointment, AppointmentStatus } from "@/types/appointment";
import { PageHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableSkeleton } from "@/components/table-skeleton";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { DataPagination } from "@/components/data-pagination";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatDateTime } from "@/lib/format";

const LIMIT = 20;

function getAppointmentId(appointment: Appointment) {
  return appointment._id ?? `${appointment.phoneNumber}-${appointment.createdAt}`;
}

function AppointmentStatusBadge({ appointment }: { appointment: Appointment }) {
  return appointment.isCompleted ? (
    <Badge variant="success">Done</Badge>
  ) : (
    <Badge variant="pending">Pending</Badge>
  );
}

function ContactMethodBadge({ method }: { method: Appointment["preferredContactMethod"] }) {
  return <Badge variant="secondary">{method === "call" ? "Call" : "WhatsApp"}</Badge>;
}

export default function AppointmentsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<AppointmentStatus>("all");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status]);

  const appointmentsQuery = useQuery({
    queryKey: ["appointments", { page, limit: LIMIT, status, search: debouncedSearch }],
    queryFn: () =>
      getAppointments({
        page,
        limit: LIMIT,
        status,
        search: debouncedSearch,
      }),
  });

  const statusMutation = useMutation({
    mutationFn: ({
      id,
      isCompleted,
    }: {
      id: string;
      isCompleted: boolean;
    }) => updateAppointmentStatus(id, isCompleted),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "stats"] });
      toast.success(
        variables.isCompleted
          ? "Appointment marked as done."
          : "Appointment marked as pending."
      );
    },
    onError: () => {
      toast.error("Could not update appointment. Please try again.");
    },
  });

  const appointmentsPage = appointmentsQuery.data;
  const appointments = appointmentsPage?.data ?? [];
  const hasFilters = Boolean(debouncedSearch || status !== "all");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Appointments"
        description="Review and manage patient appointment requests."
      />

      <Card>
        <div className="flex flex-col gap-3 border-b p-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              aria-label="Search appointments"
              placeholder="Search patient or phone"
              className="pl-9"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <Select
            aria-label="Filter appointment status"
            value={status}
            onChange={(event) => setStatus(event.target.value as AppointmentStatus)}
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="done">Done</option>
          </Select>
        </div>

        {appointmentsQuery.isLoading && <TableSkeleton />}

        {appointmentsQuery.isError && (
          <div className="p-4">
            <ErrorState
              description="Appointments could not be loaded."
              onRetry={() => appointmentsQuery.refetch()}
            />
          </div>
        )}

        {appointmentsQuery.data && appointments.length === 0 && (
          <div className="p-4">
            <EmptyState
              icon={CalendarDays}
              title={hasFilters ? "No matching appointments" : "No appointments yet"}
              description={
                hasFilters
                  ? "Try changing your search or status filter."
                  : "Appointment requests from WhatsApp will appear here."
              }
            />
          </div>
        )}

        {appointmentsPage && appointments.length > 0 && (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Phone Number</TableHead>
                    <TableHead>Preferred Date</TableHead>
                    <TableHead>Preferred Time</TableHead>
                    <TableHead>Contact Method</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested At</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appointments.map((appointment) => {
                    const id = getAppointmentId(appointment);
                    const pending =
                      statusMutation.isPending &&
                      statusMutation.variables?.id === id;

                    return (
                      <TableRow key={id}>
                        <TableCell className="font-medium">
                          {appointment.patientName}
                        </TableCell>
                        <TableCell>{appointment.phoneNumber}</TableCell>
                        <TableCell>{appointment.preferredDate}</TableCell>
                        <TableCell>{appointment.preferredTime}</TableCell>
                        <TableCell>
                          <ContactMethodBadge method={appointment.preferredContactMethod} />
                        </TableCell>
                        <TableCell
                          className="max-w-56 truncate"
                          title={appointment.reason}
                        >
                          {appointment.reason}
                        </TableCell>
                        <TableCell>
                          <AppointmentStatusBadge appointment={appointment} />
                        </TableCell>
                        <TableCell>{formatDateTime(appointment.createdAt)}</TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            size="sm"
                            variant={appointment.isCompleted ? "outline" : "default"}
                            disabled={pending || !appointment._id}
                            onClick={() =>
                              appointment._id &&
                              statusMutation.mutate({
                                id: appointment._id,
                                isCompleted: !appointment.isCompleted,
                              })
                            }
                          >
                            {pending
                              ? "Updating"
                              : appointment.isCompleted
                                ? "Mark Pending"
                                : "Mark Done"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="grid gap-3 p-4 lg:hidden">
              {appointments.map((appointment) => {
                const id = getAppointmentId(appointment);
                const pending =
                  statusMutation.isPending && statusMutation.variables?.id === id;

                return (
                  <div key={id} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium">{appointment.patientName}</div>
                        <div className="text-sm text-muted-foreground">
                          {appointment.phoneNumber}
                        </div>
                      </div>
                      <AppointmentStatusBadge appointment={appointment} />
                    </div>
                    <div className="mt-4 grid gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Date:</span>{" "}
                        {appointment.preferredDate}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Time:</span>{" "}
                        {appointment.preferredTime}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Contact:</span>{" "}
                        <ContactMethodBadge method={appointment.preferredContactMethod} />
                      </div>
                      <div>
                        <span className="text-muted-foreground">Reason:</span>{" "}
                        {appointment.reason}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Requested:</span>{" "}
                        {formatDateTime(appointment.createdAt)}
                      </div>
                    </div>
                    <Button
                      type="button"
                      className="mt-4 w-full"
                      variant={appointment.isCompleted ? "outline" : "default"}
                      disabled={pending || !appointment._id}
                      onClick={() =>
                        appointment._id &&
                        statusMutation.mutate({
                          id: appointment._id,
                          isCompleted: !appointment.isCompleted,
                        })
                      }
                    >
                      {pending
                        ? "Updating"
                        : appointment.isCompleted
                          ? "Mark Pending"
                          : "Mark Done"}
                    </Button>
                  </div>
                );
              })}
            </div>

            <DataPagination
              pagination={appointmentsPage.pagination}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>
    </div>
  );
}
