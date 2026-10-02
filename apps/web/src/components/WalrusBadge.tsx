import { ShieldCheck, Link2, Clock } from "lucide-react";
import { cn } from "../lib/utils";

/** "Verified on Walrus ✓ / Anchored on Sui ⛓" trust badge. */
export function WalrusBadge({
  anchored,
  pending,
  className,
}: {
  anchored?: boolean;
  pending?: boolean;
  className?: string;
}) {
  if (pending) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full bg-secondary/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground",
          className,
        )}
      >
        <Clock className="h-3 w-3 animate-pulse" /> Anchoring…
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-primary/20 px-2.5 py-1 text-[11px] font-semibold text-foreground ring-1 ring-primary/40",
        className,
      )}
    >
      <ShieldCheck className="h-3 w-3 text-primary" /> Verified on Walrus
      {anchored && (
        <>
          <span className="mx-0.5 opacity-40">·</span>
          <Link2 className="h-3 w-3 text-accent" /> Anchored on Sui
        </>
      )}
    </span>
  );
}
