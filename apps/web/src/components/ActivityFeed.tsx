import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight, Repeat, Zap, Fish, Loader2 } from "lucide-react";
import { cn } from '../lib/utils';
import { formatUSD, timeAgo, shortenAddress } from '../lib/format';
import { EVENT_META, EVENT_TYPES } from '../lib/analytics/evens';
import type { EventType, ProtocolEvent } from '../types';

const ICONS: Record<EventType, typeof Repeat> = {
  deposit: ArrowDownLeft,
  withdrawal: ArrowUpRight,
  swap: Repeat,
  tvl_spike: Zap,
  whale_move: Fish,
};

const TONE_CLASS = {
  positive: "bg-success/15 text-success ring-success/30",
  warning: "bg-destructive/15 text-destructive ring-destructive/30",
  neutral: "bg-primary/15 text-primary ring-primary/30",
} as const;

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1.5 text-xs font-medium transition-all",
        active
          ? "bg-primary/20 text-foreground ring-1 ring-primary/40"
          : "bg-secondary/40 text-muted-foreground hover:bg-secondary/70 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function ActivityFeed({
  events,
  limit,
  showFilters = true,
}: {
  events: ProtocolEvent[];
  limit?: number;
  showFilters?: boolean;
}) {
  const [chain, setChain] = useState("All");
  const [type, setType] = useState<EventType | "All">("All");
  const PAGE_SIZE = 15;
  const [visible, setVisible] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const chains = useMemo(
    () => ["All", ...Array.from(new Set(events.map((e) => e.chain))).sort()],
    [events],
  );

  const matched = useMemo(() => {
    let out = events;
    if (chain !== "All") out = out.filter((e) => e.chain === chain);
    if (type !== "All") out = out.filter((e) => e.type === type);
    return out;
  }, [events, chain, type]);

  // Reset paging when filters change.
  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [chain, type]);

  // Fixed limit (embedded preview) skips pagination entirely.
  const paginated = limit !== undefined;
  const filtered = limit !== undefined ? matched.slice(0, limit) : matched.slice(0, visible);
  const hasMore = limit === undefined && visible < matched.length;

  // Infinite scroll via IntersectionObserver.
  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisible((v) => Math.min(v + PAGE_SIZE, matched.length));
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, matched.length]);

  return (
    <div className="space-y-4">
      {showFilters && (
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Chain</span>
            {chains.map((c) => (
              <FilterPill key={c} active={chain === c} onClick={() => setChain(c)}>
                {c}
              </FilterPill>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Type</span>
            <FilterPill active={type === "All"} onClick={() => setType("All")}>
              All
            </FilterPill>
            {EVENT_TYPES.map((t) => (
              <FilterPill key={t} active={type === t} onClick={() => setType(t)}>
                {EVENT_META[t].label}
              </FilterPill>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {filtered.map((e) => {
            const meta = EVENT_META[e.type];
            const Icon = ICONS[e.type];
            return (
              <motion.div
                key={e.id}
                layout
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="flex items-center gap-3 rounded-xl border border-border/60 bg-secondary/20 px-3 py-2.5 transition-colors hover:bg-secondary/40"
              >
                <span
                  className={cn(
                    "grid h-9 w-9 shrink-0 place-items-center rounded-lg ring-1",
                    TONE_CLASS[meta.tone],
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">
                    <span className="font-mono text-xs text-muted-foreground">
                      {shortenAddress(e.address)}
                    </span>{" "}
                    <span className="text-muted-foreground">{meta.verb}</span>{" "}
                    <Link
                      to="/protocol/$slug"
                      params={{ slug: e.slug }}
                      className="font-medium hover:text-primary"
                    >
                      {e.protocol}
                    </Link>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {e.chain} · {timeAgo(e.timestamp)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold">{formatUSD(e.amountUSD)}</p>
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {meta.label}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No events match the selected filters.
          </p>
        )}
      </div>

      {paginated ? null : (
        <div className="pt-1">
          {hasMore ? (
            <div ref={sentinelRef} className="flex flex-col items-center gap-2 py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <button
                onClick={() => setVisible((v) => Math.min(v + PAGE_SIZE, matched.length))}
                className="rounded-full bg-secondary/50 px-4 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary/80 hover:text-foreground"
              >
                Load older events
              </button>
            </div>
          ) : (
            matched.length > PAGE_SIZE && (
              <p className="py-4 text-center text-xs text-muted-foreground">
                Showing all {matched.length} events
              </p>
            )
          )}
        </div>
      )}
    </div>
  );
}
