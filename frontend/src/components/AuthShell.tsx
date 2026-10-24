import type { ReactNode } from 'react';

const PERKS = [
  'Live stock levels, updated with every sale',
  'Search by make, model, category and budget',
  'Secure checkout with no double charges',
];

/** Two-panel frame shared by the sign-in and registration pages. */
export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
      <div className="grid overflow-hidden rounded-3xl bg-white shadow-lift ring-1 ring-ink-900/5 md:grid-cols-[1.05fr_1fr]">
        <aside className="relative hidden overflow-hidden bg-ink-950 p-10 text-white md:block">
          <svg
            className="absolute inset-0 h-full w-full opacity-60"
            viewBox="0 0 400 520"
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="auth-glow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#ee6118" stopOpacity="0.35" />
                <stop offset="1" stopColor="#0b0e13" stopOpacity="0" />
              </linearGradient>
            </defs>
            <rect width="400" height="520" fill="url(#auth-glow)" />
            <path
              d="M120 520 L196 250 M280 520 L204 250"
              stroke="#f9ad77"
              strokeWidth="2"
              opacity="0.7"
            />
            {[0, 1, 2, 3, 4].map((step) => (
              <rect
                key={step}
                x={198.5}
                y={290 + step * 46}
                width={3}
                height={18 + step * 4}
                fill="white"
                opacity={0.25 + step * 0.12}
              />
            ))}
          </svg>
          <div className="relative flex h-full flex-col">
            <p className="text-xs font-semibold tracking-[0.2em] text-ember-300 uppercase">
              Northlane Motors
            </p>
            <h2 className="mt-4 text-3xl leading-tight font-semibold">Inventory, refined.</h2>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-300">
              Every vehicle on the lot, with honest pricing and stock you can trust.
            </p>
            <ul className="mt-auto space-y-3 pt-16 text-sm text-ink-200">
              {PERKS.map((perk) => (
                <li key={perk} className="flex items-center gap-3">
                  <span className="grid size-5 place-items-center rounded-full bg-ember-500/20 text-[0.65rem] text-ember-300">
                    ✓
                  </span>
                  {perk}
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <section className="p-7 sm:p-10">
          <h1 className="text-2xl font-semibold text-ink-950 sm:text-3xl">{title}</h1>
          <p className="mt-2 text-sm text-ink-500">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </section>
      </div>
    </div>
  );
}
