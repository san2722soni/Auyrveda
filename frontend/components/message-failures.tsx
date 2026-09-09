"use client";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { apiRequest } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

interface Failure { _id: string; incoming: { from: string }; state: "failed" | "uncertain" }
export function MessageFailures() {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["message-failures"], refetchInterval: 5000,
    queryFn: () => apiRequest<{ data: Failure[] }>("/api/message-failures") });
  const mutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "retry" | "reviewed" }) =>
      apiRequest(`/api/message-failures/${encodeURIComponent(id)}`, { method: "POST", body: JSON.stringify({ action }) }),
    onSuccess: () => { client.invalidateQueries({ queryKey: ["message-failures"] }); client.invalidateQueries({ queryKey: ["dashboard"] }); },
    onError: () => toast.error("Could not update delivery review."),
  });
  if (query.isError) return <p role="alert">Delivery reviews could not be loaded.</p>;
  return <div className="divide-y">{query.data?.data.map(item => (
    <div key={item._id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
      <Link className="underline" href={`/conversations?phoneNumber=${encodeURIComponent(item.incoming.from)}`}>{item.incoming.from}</Link>
      <span>{item.state === "uncertain" ? "Delivery unconfirmed: check the conversation before marking reviewed." : "Reply failed"}</span>
      {item.state === "failed" && <Button size="sm" variant="outline" disabled={mutation.isPending}
        onClick={() => mutation.mutate({ id: item._id, action: "retry" })}><RotateCcw className="h-4 w-4" />Retry</Button>}
      <Button size="sm" variant="outline" disabled={mutation.isPending}
        onClick={() => mutation.mutate({ id: item._id, action: "reviewed" })}><Check className="h-4 w-4" />Mark reviewed</Button>
    </div>
  ))}</div>;
}
