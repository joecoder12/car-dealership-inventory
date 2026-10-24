/** Northlane Motors mark: two converging lane lines with a centre dash. */
export function LogoMark({ className = 'size-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="9" className="fill-ink-800" />
      <path
        d="M9 24 L14 8 M23 24 L18 8"
        className="stroke-ember-300"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path d="M16 12v2.5M16 18v3" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className="font-display text-[1.05rem] leading-none font-semibold tracking-tight">
        Northlane<span className="font-normal text-ink-300"> Motors</span>
      </span>
    </span>
  );
}
