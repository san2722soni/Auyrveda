"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, MessageSquareText, Search, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
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
  const initialPhoneNumber = searchParams.get("phoneNumber") ?? "";
  const [selectedPhoneNumber, setSelectedPhoneNumber] = useState(initialPhoneNumber);
  const [userPage, setUserPage] = useState(1);
  const [messagePage, setMessagePage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);

  useEffect(() => {
    setSelectedPhoneNumber(initialPhoneNumber);
    setMessagePage(1);
  }, [initialPhoneNumber]);

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

  const messagesQuery = useQuery({
    queryKey: [
      "messages",
      selectedPhoneNumber,
      { page: messagePage, limit: MESSAGE_LIMIT },
    ],
    queryFn: () =>
      getMessagesByPhoneNumber({
        phoneNumber: selectedPhoneNumber,
        page: messagePage,
        limit: MESSAGE_LIMIT,
      }),
    enabled: Boolean(selectedPhoneNumber),
  });

  function selectUser(phoneNumber: string) {
    setSelectedPhoneNumber(phoneNumber);
    setMessagePage(1);
    router.push(`/conversations?phoneNumber=${phoneNumber}`);
  }

  const usersPage = usersQuery.data;
  const messagesPage = messagesQuery.data;
  const users = usersPage?.data ?? [];
  const messages = messagesPage?.data ?? [];
  const showConversationOnMobile = Boolean(selectedPhoneNumber);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Conversations"
        description="Inspect stored WhatsApp conversation history."
      />

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <Card className={cn("overflow-hidden", showConversationOnMobile && "hidden lg:block")}>
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

        <Card className={cn("min-h-[620px] overflow-hidden", !showConversationOnMobile && "hidden lg:block")}>
          {!selectedPhoneNumber && (
            <div className="flex h-full min-h-[620px] items-center justify-center p-6">
              <EmptyState
                icon={MessageSquareText}
                title="No conversation selected"
                description="Choose a WhatsApp user to inspect their stored conversation history."
              />
            </div>
          )}

          {selectedPhoneNumber && (
            <div className="flex min-h-[620px] flex-col">
              <div className="flex items-center justify-between gap-3 border-b p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="lg:hidden"
                      aria-label="Back to user list"
                      onClick={() => {
                        setSelectedPhoneNumber("");
                        router.push("/conversations");
                      }}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                      <div className="text-sm font-semibold">
                        {selectedPhoneNumber}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Stored WhatsApp messages
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto p-4">
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

                  return (
                    <div
                      key={`${message.createdAt}-${index}`}
                      className={cn("flex", isAssistant ? "justify-end" : "justify-start")}
                    >
                      <div
                        className={cn(
                          "max-w-[86%] rounded-lg border px-4 py-3",
                          isAssistant
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground"
                        )}
                      >
                        <div className="whitespace-pre-wrap break-words text-sm">
                          {message.content || "(empty message)"}
                        </div>
                        <div
                          className={cn(
                            "mt-2 text-[11px]",
                            isAssistant
                              ? "text-primary-foreground/75"
                              : "text-muted-foreground"
                          )}
                        >
                          {formatDateTime(message.createdAt)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {messagesPage && (
                <DataPagination
                  pagination={messagesPage.pagination}
                  onPageChange={setMessagePage}
                />
              )}
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
