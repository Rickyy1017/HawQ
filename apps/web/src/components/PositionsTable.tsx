import { GlassCard } from "./GlassCard";
import { Badge } from "./ui/badge";
import type { Position } from "../lib/api/hawq";

export function PositionsTable({
  positions,
  title = "Positions",
  isLoading = false,
  error,
}: {
  positions: Position[];
  title?: string;
  isLoading?: boolean;
  error?: Error | null;
}) {
  return (
    <GlassCard className="min-w-0 p-5" hover={false}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        <span className="text-xs text-muted-foreground">
          {positions.length} entries
        </span>
      </div>
      {isLoading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Loading positions…
        </p>
      ) : error ? (
        <p className="py-8 text-center text-sm text-destructive">
          Could not load positions. Please try again later.
        </p>
      ) : positions.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No logged positions yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <th className="py-2 pr-4">Product</th>
                <th className="py-2 pr-4">Venue</th>
                <th className="py-2 pr-4">Symbol / market</th>
                <th className="py-2 pr-4">Side</th>
                <th className="py-2 pr-4 text-right">Size</th>
                <th className="py-2 pr-4 text-right">Entry</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 text-right">Created</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-border/50 last:border-0"
                >
                  <td className="py-3 pr-4 font-medium capitalize">
                    {p.product}
                  </td>
                  <td className="py-3 pr-4 capitalize">{p.venue}</td>
                  <td
                    className="max-w-[280px] truncate py-3 pr-4"
                    title={p.symbolOrMarket}
                  >
                    {p.symbolOrMarket}
                  </td>
                  <td className="py-3 pr-4 font-semibold uppercase">
                    {p.side}
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums">
                    ${p.sizeUsd.toLocaleString()}
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums">
                    {p.entryPrice == null
                      ? "—"
                      : p.product === "prediction"
                        ? `${(p.entryPrice * 100).toFixed(1)}%`
                        : `$${p.entryPrice.toLocaleString(undefined, { maximumFractionDigits: 4 })}`}
                  </td>
                  <td className="py-3 pr-4">
                    <Badge variant="secondary">{p.status}</Badge>
                  </td>
                  <td className="py-3 text-right whitespace-nowrap text-muted-foreground">
                    {p.createdAt ? new Date(p.createdAt).toLocaleString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </GlassCard>
  );
}
