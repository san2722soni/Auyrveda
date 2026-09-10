import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/types/api";

function getVisiblePages(page: number, totalPages: number) {
  const pages = new Set<number>([1, totalPages, page - 1, page, page + 1]);

  return Array.from(pages)
    .filter((item) => item >= 1 && item <= totalPages)
    .sort((a, b) => a - b);
}

export function DataPagination({
  pagination,
  onPageChange,
}: {
  pagination: Pagination;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, pagination.totalPages);
  const pages = getVisiblePages(pagination.page, totalPages);

  return (
    <div className="flex flex-col gap-3 border-t px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Showing page {pagination.total === 0 ? 0 : pagination.page} of{" "}
        {pagination.totalPages}
      </p>
      <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-start">
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="Previous page"
          disabled={pagination.page <= 1 || pagination.totalPages === 0}
          onClick={() => onPageChange(pagination.page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Previous</span>
        </Button>
        <span className="text-sm tabular-nums sm:hidden">{pagination.page} / {totalPages}</span>
        {pages.map((page, index) => {
          const previous = pages[index - 1];
          const showEllipsis = previous && page - previous > 1;

          return (
            <span key={page} className="hidden items-center gap-2 sm:flex">
              {showEllipsis && (
                <span className="text-sm text-muted-foreground">...</span>
              )}
              <Button
                type="button"
                variant={page === pagination.page ? "default" : "outline"}
                size="sm"
                aria-label={`Go to page ${page}`}
                aria-current={page === pagination.page ? "page" : undefined}
                onClick={() => onPageChange(page)}
              >
                {page}
              </Button>
            </span>
          );
        })}
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="Next page"
          disabled={
            pagination.page >= pagination.totalPages ||
            pagination.totalPages === 0
          }
          onClick={() => onPageChange(pagination.page + 1)}
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
