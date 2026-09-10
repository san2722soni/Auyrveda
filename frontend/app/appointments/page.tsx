"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronDown, MessageSquareText, Search } from "lucide-react";
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
import { Button, buttonClassName } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
type DateCategory = "all" | "today" | "upcoming" | "past";

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

async function copyPhoneNumber(phoneNumber: string) {
  try {
    await navigator.clipboard.writeText(phoneNumber);
    toast.success("Phone number copied.");
  } catch {
    toast.error("Could not copy phone number.");
  }
}

function PhoneNumberCell({ phoneNumber }: { phoneNumber: string }) {
  return (
    <button
      type="button"
      title="Click to copy the number"
      onClick={() => copyPhoneNumber(phoneNumber)}
      className="min-h-11 break-all rounded-md px-2 py-1 text-left font-medium hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-8"
    >
      {phoneNumber}
    </button>
  );
}

function AppointmentStatusSelect({
  appointment,
  pending,
  onChange,
}: {
  appointment: Appointment;
  pending: boolean;
  onChange: (isCompleted: boolean) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending || !appointment._id}
          className="min-w-32 justify-between"
        >
          {appointment.isCompleted ? "Done" : "Not Done"}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        <DropdownMenuCheckboxItem
          checked={!appointment.isCompleted}
          onCheckedChange={() => onChange(false)}
        >
          Not Done
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={appointment.isCompleted}
          onCheckedChange={() => onChange(true)}
        >
          Done
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function AppointmentsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<AppointmentStatus>("all");
  const [dateCategory, setDateCategory] = useState<DateCategory>("all");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);

  useEffect(() => {
    setPage(1);
  }, [dateCategory, debouncedSearch, status]);

  const appointmentsQuery = useQuery({
    refetchInterval: 5000,
    queryKey: [
      "appointments",
      { page, limit: LIMIT, status, dateCategory, search: debouncedSearch },
    ],
    queryFn: () =>
      getAppointments({
        page,
        limit: LIMIT,
        status,
        dateCategory,
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
  const hasFilters = Boolean(
    debouncedSearch || status !== "all" || dateCategory !== "all"
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Appointments"
        description="Review and manage patient appointment requests."
      />

      <Card>
        <div className="grid grid-cols-2 gap-2 border-b p-3 sm:gap-3 sm:p-4 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
          <div className="relative col-span-2 min-w-0 lg:col-span-1">
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
            <option value="pending">Not Done</option>
            <option value="done">Done</option>
          </Select>
          <Select
            aria-label="Filter requested date"
            value={dateCategory}
            onChange={(event) => setDateCategory(event.target.value as DateCategory)}
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="upcoming">Upcoming</option>
            <option value="past">Past</option>
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
                    const updateStatus = (isCompleted: boolean) => {
                      if (
                        appointment._id &&
                        isCompleted !== appointment.isCompleted
                      ) {
                        statusMutation.mutate({
                          id: appointment._id,
                          isCompleted,
                        });
                      }
                    };

                    return (
                      <TableRow key={id}>
                        <TableCell className="font-medium">
                          {appointment.patientName}
                        </TableCell>
                        <TableCell>
                          <PhoneNumberCell phoneNumber={appointment.phoneNumber} />
                        </TableCell>
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
                          <AppointmentStatusSelect
                            appointment={appointment}
                            pending={pending}
                            onChange={updateStatus}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="divide-y lg:hidden">
              {appointments.map((appointment) => {
                const id = getAppointmentId(appointment);
                const pending =
                  statusMutation.isPending && statusMutation.variables?.id === id;
                const updateStatus = (isCompleted: boolean) => {
                  if (
                    appointment._id &&
                    isCompleted !== appointment.isCompleted
                  ) {
                    statusMutation.mutate({
                      id: appointment._id,
                      isCompleted,
                    });
                  }
                };

                return (
                  <div key={id} className="min-w-0 p-3 sm:p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium">{appointment.patientName}</div>
                        <PhoneNumberCell phoneNumber={appointment.phoneNumber} />
                      </div>
                      <AppointmentStatusBadge appointment={appointment} />
                    </div>
                    <div className="mt-2 grid gap-2 text-sm">
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
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <AppointmentStatusSelect
                        appointment={appointment}
                        pending={pending}
                        onChange={updateStatus}
                      />
                      <Link
                        className={buttonClassName({ variant: "outline", size: "sm" })}
                        href={`/conversations?phoneNumber=${encodeURIComponent(appointment.phoneNumber)}`}
                      >
                        <MessageSquareText className="h-4 w-4" />
                        Chat
                      </Link>
                    </div>
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
