import { stockLabel, stockLevel } from '../../lib/format';

const TONES = {
  out: 'bg-rose-50 text-rose-700 ring-rose-200',
  low: 'bg-amber-50 text-amber-800 ring-amber-200',
  ok: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
} as const;

const DOTS = { out: 'bg-rose-500', low: 'bg-amber-500', ok: 'bg-emerald-500' } as const;

export function StockBadge({ quantity, className = '' }: { quantity: number; className?: string }) {
  const level = stockLevel(quantity);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${TONES[level]} ${className}`}
    >
      <span aria-hidden="true" className={`size-1.5 rounded-full ${DOTS[level]}`} />
      {stockLabel(quantity)}
    </span>
  );
}
