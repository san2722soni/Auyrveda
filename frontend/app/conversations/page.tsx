"use client";

import {
  FormEvent,
  Suspense,
  UIEvent,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Bot,
  CalendarPlus,
  MessageSquareText,
  Search,
  Send,
  User,
  Users,
} from "lucide-react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getMessagesByPhoneNumber,
  getUsers,
  sendUserMessage,
  startAppointmentBooking,
  updateUserReplyMode,
  getUser,
} from "@/lib/api/users";
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
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedPhoneNumber = searchParams.get("phoneNumber") ?? "";
  const [userPage, setUserPage] = useState(1);
  const [search, setSearch] = useState("");
  const [manualMessage, setManualMessage] = useState("");
  const messageList = useRef<HTMLDivElement>(null);
  const chatPanel = useRef<HTMLDivElement>(null);
  const followLatest = useRef(true);
  const previousPhone = useRef("");
  const olderScroll = useRef<{ height: number; top: number } | null>(null);
  const debouncedSearch = useDebouncedValue(search);

  useEffect(() => {
    setUserPage(1);
  }, [debouncedSearch]);

  const usersQuery = useQuery({
    refetchInterval: 5000,
    queryKey: ["users", { page: userPage, limit: USER_LIMIT, search: debouncedSearch }],
    queryFn: () =>
      getUsers({
        page: userPage,
        limit: USER_LIMIT,
        search: debouncedSearch,
      }),
  });

  const messagesQuery = useInfiniteQuery({
    refetchInterval: 3000,
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
    router.push(`/conversations?phoneNumber=${encodeURIComponent(phoneNumber)}`, { scroll: false });
  }

  function handleMessageScroll(event: UIEvent<HTMLDivElement>) {
    const target = event.currentTarget;
    followLatest.current = target.scrollHeight - target.scrollTop - target.clientHeight < 80;

    if (
      target.scrollTop < 80 &&
      messagesQuery.hasNextPage &&
      !messagesQuery.isFetchingNextPage
    ) {
      olderScroll.current = { height: target.scrollHeight, top: target.scrollTop };
      messagesQuery.fetchNextPage();
    }
  }

  const usersPage = usersQuery.data;
  const users = usersPage?.data ?? [];
  const selectedUserQuery = useQuery({
    queryKey: ["users", "detail", selectedPhoneNumber],
    queryFn: () => getUser(selectedPhoneNumber),
    enabled: Boolean(selectedPhoneNumber),
    refetchInterval: 3000,
  });
  const selectedUser = selectedUserQuery.data?.data;
  const selectedReplyMode = selectedUser?.replyMode ?? "ai";
  const controlsDisabled =
    !selectedPhoneNumber ||
    selectedUserQuery.isLoading ||
    !selectedUser;
  const messages = useMemo(
    () =>
      messagesQuery.data?.pages
        .slice()
        .reverse()
        .flatMap((page) => page.data) ?? [],
    [messagesQuery.data]
  );
  const showConversationOnMobile = Boolean(selectedPhoneNumber);
  useEffect(() => { setManualMessage(""); }, [selectedPhoneNumber]);

  useLayoutEffect(() => {
    const list = messageList.current;
    if (!list) return;
    if (previousPhone.current !== selectedPhoneNumber) {
      previousPhone.current = selectedPhoneNumber;
      followLatest.current = true;
      olderScroll.current = null;
    }
    if (olderScroll.current && !messagesQuery.isFetchingNextPage) {
      list.scrollTop = olderScroll.current.top + list.scrollHeight - olderScroll.current.height;
      olderScroll.current = null;
    } else if (followLatest.current) {
      list.scrollTop = list.scrollHeight;
    }
  }, [messages, selectedPhoneNumber, messagesQuery.isFetchingNextPage]);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport || !selectedPhoneNumber) return;
    let followOnResize = false;
    const observer = new ResizeObserver(() => {
      if (followOnResize && messageList.current) {
        messageList.current.scrollTop = messageList.current.scrollHeight;
        followOnResize = false;
      }
    });
    if (messageList.current) observer.observe(messageList.current);
    // Keep the reply box above phone keyboards that overlay the layout viewport.
    const resize = () => {
      const panel = chatPanel.current;
      if (!panel) return;
      const list = messageList.current;
      const wasAtBottom = list && list.scrollHeight - list.scrollTop - list.clientHeight < 80;
      followOnResize = Boolean(wasAtBottom);
      const keyboardOpen = viewport.scale === 1 && window.innerHeight - viewport.height > 120;
      panel.dataset.keyboardOpen = String(keyboardOpen);
      panel.style.height = keyboardOpen
        ? `${Math.max(0, viewport.height - panel.getBoundingClientRect().top + viewport.offsetTop - 8)}px`
        : "";
    };
    resize();
    viewport.addEventListener("resize", resize);
    viewport.addEventListener("scroll", resize);
    return () => {
      observer.disconnect();
      viewport.removeEventListener("resize", resize);
      viewport.removeEventListener("scroll", resize);
    };
  }, [selectedPhoneNumber]);

  const replyModeMutation = useMutation({
    mutationFn: (replyMode: "ai" | "manual") =>
      updateUserReplyMode(selectedPhoneNumber, replyMode),
    onSuccess: (_, replyMode) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(replyMode === "manual" ? "Staff mode enabled." : "AI mode enabled.");
    },
    onError: () => {
      toast.error("Could not update reply mode.");
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: (message: string) => sendUserMessage(selectedPhoneNumber, message),
    onSuccess: () => {
      setManualMessage("");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["messages", selectedPhoneNumber] });
      toast.success("Message sent.");
    },
    onError: () => {
      toast.error("Could not send message.");
    },
  });

  const appointmentMutation = useMutation({
    mutationFn: () => startAppointmentBooking(selectedPhoneNumber),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["messages", selectedPhoneNumber] });
      toast.success("Appointment details requested.");
    },
    onError: () => {
      toast.error("Could not start appointment booking.");
    },
  });

  function handleManualSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const message = manualMessage.trim();

    if (!message || controlsDisabled) {
      return;
    }

    sendMessageMutation.mutate(message);
  }

  return (
    <div className="conversation-page space-y-4 sm:space-y-6">
      <div className={cn(selectedPhoneNumber && "conversation-page-header")}>
        <PageHeader
          title="Conversations"
          description="Inspect stored WhatsApp conversation history."
        />
      </div>

      <div className={cn("grid min-w-0 gap-4 xl:grid-cols-[320px_minmax(0,1fr)] 2xl:grid-cols-[380px_minmax(0,1fr)]", selectedPhoneNumber && "conversation-layout")}>
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
                      {(user.replyMode === "manual" ||
                        user.appointmentAssistantActive) && (
                        <Badge variant="secondary">
                          {user.appointmentAssistantActive ? "Booking" : "Staff"}
                        </Badge>
                      )}
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

        <Card ref={chatPanel} className={cn("chat-workspace overflow-hidden", !showConversationOnMobile && "hidden xl:block")}>
          {!selectedPhoneNumber && (
            <div className="flex h-full items-center justify-center p-6">
              <EmptyState
                icon={MessageSquareText}
                title="No conversation selected"
                description="Choose a WhatsApp user to inspect their stored conversation history."
              />
            </div>
          )}

          {selectedPhoneNumber && (
            <div className="flex h-full min-h-0 flex-col">
              <div className="flex shrink-0 items-center justify-between gap-2 border-b bg-muted/50 p-2 sm:p-4">
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
                    <div className="min-w-0">
                      <div className="break-all text-sm font-semibold">
                        {selectedPhoneNumber}
                      </div>
                      <Badge
                        variant={
                          selectedUser?.appointmentAssistantActive
                            ? "pending"
                            : selectedReplyMode === "manual"
                              ? "secondary"
                              : "success"
                        }
                      >
                        {selectedUser?.appointmentAssistantActive
                          ? "Booking"
                          : selectedReplyMode === "manual"
                            ? "Staff Mode"
                            : "AI Active"}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="shrink-0">
                  <Button
                    type="button"
                    size="sm"
                    variant={selectedReplyMode === "manual" ? "outline" : "secondary"}
                    disabled={controlsDisabled || replyModeMutation.isPending}
                    onClick={() =>
                      replyModeMutation.mutate(
                        selectedReplyMode === "manual" ? "ai" : "manual"
                      )
                    }
                  >
                    {selectedReplyMode === "manual" ? "Return to AI" : "Take over"}
                  </Button>
                </div>
              </div>

              <div
                ref={messageList}
                aria-label="Conversation messages"
                className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain p-3 sm:p-4"
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
                  const label = isAssistant
                    ? message.sentBy === "staff"
                      ? "Staff"
                      : "AI Assistant"
                    : "Patient";
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
                          "min-w-0 max-w-[calc(100%-2.5rem)] rounded-lg border px-3 py-2 shadow-sm sm:max-w-[80%] sm:px-4 sm:py-3",
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
                          {label}
                        </div>
                        <div className="whitespace-pre-wrap [overflow-wrap:anywhere] text-sm leading-6">
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
              <form
                className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto_auto] gap-2 border-t bg-background p-2 sm:p-3"
                onSubmit={handleManualSend}
              >
                <Input
                  aria-label="Staff reply"
                  placeholder="Type staff reply"
                  value={manualMessage}
                  onChange={(event) => setManualMessage(event.target.value)}
                  disabled={controlsDisabled || sendMessageMutation.isPending}
                />
                <Button
                  type="submit"
                  size="icon"
                  aria-label="Send reply"
                  title="Send reply"
                  disabled={
                    controlsDisabled ||
                    !manualMessage.trim() ||
                    sendMessageMutation.isPending
                  }
                >
                  <Send className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="booking-button w-11 px-0 sm:w-auto sm:px-4"
                  aria-label="Book Appointment"
                  title="Book appointment"
                  disabled={controlsDisabled || appointmentMutation.isPending}
                  onClick={() => appointmentMutation.mutate()}
                >
                  <CalendarPlus className="h-4 w-4" />
                  <span className="booking-label hidden sm:inline">Book Appointment</span>
                </Button>
              </form>
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
