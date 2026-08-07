"use client";

import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { BookOpen, Copy, Save } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getKnowledge, updateKnowledge } from "@/lib/api/knowledge";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { cn } from "@/lib/utils";

type KnowledgeMode = "edit" | "preview";

export default function KnowledgePage() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<KnowledgeMode>("edit");
  const [content, setContent] = useState("");
  const [initialContent, setInitialContent] = useState("");

  const knowledgeQuery = useQuery({
    queryKey: ["knowledge"],
    queryFn: getKnowledge,
  });

  const dirty = content !== initialContent;

  useEffect(() => {
    if (knowledgeQuery.data && !dirty) {
      setContent(knowledgeQuery.data.content);
      setInitialContent(knowledgeQuery.data.content);
    }
  }, [knowledgeQuery.data, dirty]);

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (!dirty) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  const saveMutation = useMutation({
    mutationFn: updateKnowledge,
    onSuccess: (_, savedContent) => {
      setInitialContent(savedContent);
      queryClient.invalidateQueries({ queryKey: ["knowledge"] });
      toast.success("Knowledge updated successfully.");
    },
    onError: () => {
      toast.error("Could not update knowledge. Your changes were not saved.");
    },
  });

  const canSave = useMemo(
    () => dirty && content.trim().length > 0 && !saveMutation.isPending,
    [content, dirty, saveMutation.isPending]
  );

  async function copyKnowledge() {
    try {
      await navigator.clipboard.writeText(content);
      toast.success("Knowledge copied.");
    } catch {
      toast.error("Could not copy knowledge.");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Knowledge"
        description="Manage the clinic information used by the AI assistant."
        actions={
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              disabled={!content}
              onClick={copyKnowledge}
            >
              <Copy className="h-4 w-4" />
              Copy
            </Button>
            <Button
              type="button"
              disabled={!canSave}
              onClick={() => saveMutation.mutate(content)}
            >
              <Save className="h-4 w-4" />
              {saveMutation.isPending ? "Saving" : "Save Changes"}
            </Button>
          </div>
        }
      />

      {knowledgeQuery.isLoading && (
        <Card className="p-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="mt-4 h-[520px] w-full" />
        </Card>
      )}

      {knowledgeQuery.isError && (
        <ErrorState
          description="Knowledge content could not be loaded."
          onRetry={() => knowledgeQuery.refetch()}
        />
      )}

      {knowledgeQuery.data && (
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={mode === "edit" ? "default" : "outline"}
                onClick={() => setMode("edit")}
              >
                Edit
              </Button>
              <Button
                type="button"
                variant={mode === "preview" ? "default" : "outline"}
                onClick={() => setMode("preview")}
              >
                Preview
              </Button>
            </div>
            {dirty ? (
              <Badge variant="pending">Unsaved changes</Badge>
            ) : (
              <Badge variant="success">Saved</Badge>
            )}
          </div>

          <div className="p-4">
            {mode === "edit" && (
              <Textarea
                aria-label="Knowledge markdown editor"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                className="min-h-[560px] resize-y font-mono leading-6"
                placeholder="Add clinic knowledge markdown..."
              />
            )}

            {mode === "preview" && (
              <div
                className={cn(
                  "min-h-[560px] rounded-md border bg-background p-5 text-sm leading-7",
                  "markdown-preview max-w-none"
                )}
              >
                {content.trim() ? (
                  <ReactMarkdown>{content}</ReactMarkdown>
                ) : (
                  <EmptyState
                    icon={BookOpen}
                    title="Knowledge is empty"
                    description="Switch to Edit and add the clinic information used by the assistant."
                  />
                )}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
