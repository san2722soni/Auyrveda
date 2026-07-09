"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MessageSquareText, Search, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getUsers } from "@/lib/api/users";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { buttonClassName } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataPagination } from "@/components/data-pagination";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { TableSkeleton } from "@/components/table-skeleton";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatDateTime, formatNumber } from "@/lib/format";

const LIMIT = 20;

export default function UsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const usersQuery = useQuery({
    queryKey: ["users", { page, limit: LIMIT, search: debouncedSearch }],
    queryFn: () =>
      getUsers({
        page,
        limit: LIMIT,
        search: debouncedSearch,
      }),
  });

  const usersPage = usersQuery.data;
  const users = usersPage?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="View people who have interacted with the WhatsApp assistant."
      />

      <Card>
        <div className="border-b p-4">
          <div className="relative w-full md:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              aria-label="Search users"
              placeholder="Search by phone number"
              className="pl-9"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>

        {usersQuery.isLoading && <TableSkeleton />}

        {usersQuery.isError && (
          <div className="p-4">
            <ErrorState
              description="Users could not be loaded."
              onRetry={() => usersQuery.refetch()}
            />
          </div>
        )}

        {usersQuery.data && users.length === 0 && (
          <div className="p-4">
            <EmptyState
              icon={Users}
              title={debouncedSearch ? "No matching users" : "No users yet"}
              description={
                debouncedSearch
                  ? "Try searching for a different phone number."
                  : "People who message the WhatsApp assistant will appear here."
              }
            />
          </div>
        )}

        {usersPage && users.length > 0 && (
          <>
            <div className="hidden overflow-x-auto md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Phone Number</TableHead>
                    <TableHead>Total Messages</TableHead>
                    <TableHead>First Seen</TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.phoneNumber}>
                      <TableCell className="font-medium">
                        {user.phoneNumber}
                      </TableCell>
                      <TableCell>{formatNumber(user.totalMessages)}</TableCell>
                      <TableCell>{formatDateTime(user.firstSeenAt)}</TableCell>
                      <TableCell>{formatDateTime(user.lastActiveAt)}</TableCell>
                      <TableCell>
                        <Link
                          href={`/conversations?phoneNumber=${user.phoneNumber}`}
                          className={buttonClassName({
                            variant: "outline",
                            size: "sm",
                          })}
                        >
                          <MessageSquareText className="h-4 w-4" />
                          View Conversation
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="grid gap-3 p-4 md:hidden">
              {users.map((user) => (
                <div key={user.phoneNumber} className="rounded-lg border p-4">
                  <div className="font-medium">{user.phoneNumber}</div>
                  <div className="mt-3 grid gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Messages:</span>{" "}
                      {formatNumber(user.totalMessages)}
                    </div>
                    <div>
                      <span className="text-muted-foreground">First seen:</span>{" "}
                      {formatDateTime(user.firstSeenAt)}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Last active:</span>{" "}
                      {formatDateTime(user.lastActiveAt)}
                    </div>
                  </div>
                  <Link
                    href={`/conversations?phoneNumber=${user.phoneNumber}`}
                    className={buttonClassName({
                      variant: "outline",
                      className: "mt-4 w-full",
                    })}
                  >
                    <MessageSquareText className="h-4 w-4" />
                    View Conversation
                  </Link>
                </div>
              ))}
            </div>

            <DataPagination
              pagination={usersPage.pagination}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>
    </div>
  );
}
