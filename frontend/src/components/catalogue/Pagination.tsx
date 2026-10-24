import type { PageMeta } from '../../types/models';
import { Button } from '../ui/Button';

export function Pagination({
  meta,
  onPageChange,
}: {
  meta: PageMeta;
  onPageChange: (page: number) => void;
}) {
  if (meta.totalPages <= 1) return null;

  return (
    <nav aria-label="Pagination" className="mt-10 flex items-center justify-between gap-4">
      <Button
        variant="secondary"
        size="sm"
        disabled={meta.page <= 1}
        onClick={() => onPageChange(meta.page - 1)}
      >
        ← Previous
      </Button>
      <p className="text-sm text-ink-500" aria-live="polite">
        Page {meta.page} of {meta.totalPages}
      </p>
      <Button
        variant="secondary"
        size="sm"
        disabled={meta.page >= meta.totalPages}
        onClick={() => onPageChange(meta.page + 1)}
      >
        Next →
      </Button>
    </nav>
  );
}
