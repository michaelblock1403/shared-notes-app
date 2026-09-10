import { cn } from "@/lib/utils";

export function BrandMark({
  className,
  withWordmark = true,
}: {
  className?: string;
  withWordmark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        aria-hidden
        className="grid size-9 place-items-center rounded-xl bg-primary/15 ring-1 ring-primary/30"
      >
        <svg viewBox="0 0 24 24" className="size-5 text-primary" fill="none" strokeWidth={1.8}>
          <path
            d="M6 3.5h7.5L18 8v12.5H6z"
            stroke="currentColor"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <path d="M13.5 3.5V8H18" stroke="currentColor" strokeLinejoin="round" />
          <path
            d="M9 12.5l1.8 1.8 3.4-3.6"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="10" cy="17.2" r="1.1" fill="currentColor" />
          <circle cx="14" cy="17.2" r="1.1" fill="currentColor" />
        </svg>
      </span>
      {withWordmark ? (
        <span className="font-display text-lg font-semibold tracking-tight">Notizraum</span>
      ) : null}
    </span>
  );
}
