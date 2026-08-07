"use client";

import { Suspense, UIEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Bot, MessageSquareText, Search, User, Users } from "lucide-react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { getMessagesByPhoneNumber, getUsers } from "@/lib/api/users";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DataPagination } from "@/components/data-pagination";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatDateTime, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

const USER_LIMIT = 10;
const MESSAGE_LIMIT = 50;

function ConversationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedPhoneNumber = searchParams.get("phoneNumber") ?? "";
  const [userPage, setUserPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);

  useEffect(() => {
    setUserPage(1);
  }, [debouncedSearch]);

  const usersQuery = useQuery({
    queryKey: ["users", { page: userPage, limit: USER_LIMIT, search: debouncedSearch }],
    queryFn: () =>
      getUsers({
        page: userPage,
        limit: USER_LIMIT,
        search: debouncedSearch,
      }),
  });

  const messagesQuery = useInfiniteQuery({
    queryKey: ["messages", selectedPhoneNumber, { limit: MESSAGE_LIMIT }],
    queryFn: ({ pageParam }) =>
      getMessagesByPhoneNumber({
        phoneNumber: selectedPhoneNumber,
        page: pageParam,
        limit: MESSAGE_LIMIT,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.page < lastPage.pagination.totalPages
        ? lastPage.pagination.page + 1
        : undefined,
    enabled: Boolean(selectedPhoneNumber),
  });

  function selectUser(phoneNumber: string) {
    router.push(`/conversations?phoneNumber=${encodeURIComponent(phoneNumber)}`);
  }

  function handleMessageScroll(event: UIEvent<HTMLDivElement>) {
    const target = event.currentTarget;

    if (
      target.scrollTop < 80 &&
      messagesQuery.hasNextPage &&
      !messagesQuery.isFetchingNextPage
    ) {
      messagesQuery.fetchNextPage();
    }
  }

  const usersPage = usersQuery.data;
  const users = usersPage?.data ?? [];
  const messages = useMemo(
    () =>
      messagesQuery.data?.pages
        .slice()
        .reverse()
        .flatMap((page) => page.data) ?? [],
    [messagesQuery.data]
  );
  const showConversationOnMobile = Boolean(selectedPhoneNumber);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Conversations"
        description="Inspect stored WhatsApp conversation history."
      />

      <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
        <Card className={cn("overflow-hidden", showConversationOnMobile && "hidden xl:block")}>
          <div className="border-b p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                aria-label="Search conversation users"
                placeholder="Search phone number"
                className="pl-9"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>

          {usersQuery.isLoading && (
            <div className="space-y-3 p-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-16 w-full" />
              ))}
            </div>
          )}

          {usersQuery.isError && (
            <div className="p-4">
              <ErrorState
                description="Conversation users could not be loaded."
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
              <div className="divide-y">
                {users.map((user) => {
                  const active = user.phoneNumber === selectedPhoneNumber;

                  return (
                    <button
                      key={user.phoneNumber}
                      type="button"
                      className={cn(
                        "flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/70",
                        active && "bg-accent"
                      )}
                      onClick={() => selectUser(user.phoneNumber)}
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          {user.phoneNumber}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Last active {formatDateTime(user.lastActiveAt)}
                        </div>
                      </div>
                      <Badge variant="outline">
                        {formatNumber(user.totalMessages)}
                      </Badge>
                    </button>
                  );
                })}
              </div>
              <DataPagination
                pagination={usersPage.pagination}
                onPageChange={setUserPage}
              />
            </>
          )}
        </Card>

        <Card className={cn("min-h-[680px] overflow-hidden shadow-lg", !showConversationOnMobile && "hidden xl:block")}>
          {!selectedPhoneNumber && (
            <div className="flex h-full min-h-[680px] items-center justify-center p-6">
              <EmptyState
                icon={MessageSquareText}
                title="No conversation selected"
                description="Choose a WhatsApp user to inspect their stored conversation history."
              />
            </div>
          )}

          {selectedPhoneNumber && (
            <div className="flex min-h-[680px] flex-col">
              <div className="flex items-center justify-between gap-3 border-b bg-gradient-to-r from-emerald-500/10 to-amber-500/10 p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="xl:hidden"
                      aria-label="Back to user list"
                      onClick={() => router.push("/conversations")}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                      <div className="text-sm font-semibold">
                        {selectedPhoneNumber}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Scroll upward to load older messages
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div
                className="flex max-h-[calc(100vh-230px)] min-h-[560px] flex-1 flex-col gap-4 overflow-y-auto p-4"
                onScroll={handleMessageScroll}
              >
                {messagesQuery.isFetchingNextPage && (
                  <div className="mx-auto rounded-md border bg-card px-3 py-1 text-xs text-muted-foreground">
                    Loading older messages
                  </div>
                )}

                {messagesQuery.isLoading && (
                  <div className="space-y-4">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <Skeleton
                        key={index}
                        className={cn(
                          "h-16 max-w-[80%]",
                          index % 2 ? "ml-auto" : "mr-auto"
                        )}
                      />
                    ))}
                  </div>
                )}

                {messagesQuery.isError && (
                  <ErrorState
                    description="Messages could not be loaded."
                    onRetry={() => messagesQuery.refetch()}
                  />
                )}

                {messagesQuery.data && messages.length === 0 && (
                  <EmptyState
                    icon={MessageSquareText}
                    title="No messages"
                    description="No stored conversation messages were found for this user."
                  />
                )}

                {messages.map((message, index) => {
                  const isAssistant = message.role === "assistant";
                  const Icon = isAssistant ? Bot : User;

                  return (
                    <div
                      key={`${message.createdAt}-${index}`}
                      className={cn("flex gap-2", isAssistant ? "justify-end" : "justify-start")}
                    >
                      {!isAssistant && (
                        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-300">
                          <Icon className="h-4 w-4" />
                        </div>
                      )}
                      <div
                        className={cn(
                          "max-w-[86%] rounded-2xl border px-4 py-3 shadow-sm",
                          isAssistant
                            ? "bg-emerald-600 text-white"
                            : "bg-card text-foreground"
                        )}
                      >
                        <div
                          className={cn(
                            "mb-1 text-[11px] font-semibold uppercase",
                            isAssistant ? "text-white/75" : "text-muted-foreground"
                          )}
                        >
                          {isAssistant ? "AI Assistant" : "Patient"}
                        </div>
                        <div className="whitespace-pre-wrap break-words text-sm leading-6">
                          {message.content || "(empty message)"}
                        </div>
                        <div
                          className={cn(
                            "mt-2 text-[11px]",
                            isAssistant ? "text-white/75" : "text-muted-foreground"
                          )}
                        >
                          {formatDateTime(message.createdAt)}
                        </div>
                      </div>
                      {isAssistant && (
                        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                          <Icon className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function ConversationsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[640px] w-full" />}>
      <ConversationsContent />
    </Suspense>
  );
}
