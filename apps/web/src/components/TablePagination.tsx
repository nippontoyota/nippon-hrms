interface TablePaginationProps {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
}

export default function TablePagination({ page, limit, total, onPageChange }: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  if (total <= limit) return null;

  return (
    <div className="flex items-center justify-between px-2 py-3 text-sm text-slate-600 dark:text-slate-300">
      <span>
        Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          className="px-3 py-1 border border-slate-300 dark:border-slate-600 rounded disabled:opacity-40"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </button>
        <span className="px-2 py-1">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          className="px-3 py-1 border border-slate-300 dark:border-slate-600 rounded disabled:opacity-40"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
