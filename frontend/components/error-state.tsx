import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ErrorState({
  title = "Something went wrong",
  description,
  onRetry,
}: {
  title?: string;
  description: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
      <AlertCircle className="h-9 w-9 text-destructive" />
      <h3 className="mt-4 text-sm font-semibold">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        {description}
      </p>
      {onRetry && (
        <Button type="button" className="mt-4" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
