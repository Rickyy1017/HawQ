import { Link } from "@tanstack/react-router";
import { formatUSD, formatPct } from "../lib/format";
import { cn } from "../lib/utils";
import type { ProtocolTVL } from "../types";

export function ProtocolTable({ protocols }: { protocols: ProtocolTVL[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
            <th className="py-2 pl-2 pr-3 font-medium">#</th>
            <th className="px-3 py-2 font-medium">Protocol</th>
            <th className="px-3 py-2 font-medium">Chain</th>
            <th className="hidden px-3 py-2 font-medium md:table-cell">
              Category
            </th>
            <th className="px-3 py-2 text-right font-medium">TVL</th>
            <th className="px-3 py-2 text-right font-medium">1d</th>
            <th className="hidden px-3 py-2 text-right font-medium md:table-cell">
              7d
            </th>
          </tr>
        </thead>
        <tbody>
          {protocols.map((p, i) => (
            <tr
              key={p.slug + i}
              className="group border-t border-border/60 transition-colors hover:bg-secondary/40"
            >
              <td className="py-3 pl-2 pr-3 text-muted-foreground">{i + 1}</td>
              <td className="px-3 py-3">
                <Link
                  to="/protocol/$slug"
                  params={{ slug: p.slug }}
                  className="flex items-center gap-2.5 font-medium transition-colors group-hover:text-primary"
                >
                  {p.logo ? (
                    <img
                      src={p.logo}
                      alt=""
                      className="h-6 w-6 rounded-full ring-1 ring-border"
                      loading="lazy"
                    />
                  ) : (
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-primary/15 text-[10px] text-primary">
                      {p.name.slice(0, 2)}
                    </span>
                  )}
                  {p.name}
                </Link>
              </td>
              <td className="px-3 py-3 text-muted-foreground">{p.chain}</td>
              <td className="hidden px-3 py-3 text-muted-foreground md:table-cell">
                {p.category ?? "—"}
              </td>
              <td className="px-3 py-3 text-right font-medium">
                {formatUSD(p.tvl)}
              </td>
              <td
                className={cn(
                  "px-3 py-3 text-right",
                  (p.change1d ?? 0) >= 0 ? "text-success" : "text-destructive",
                )}
              >
                {formatPct(p.change1d)}
              </td>
              <td
                className={cn(
                  "hidden px-3 py-3 text-right md:table-cell",
                  (p.change7d ?? 0) >= 0 ? "text-success" : "text-destructive",
                )}
              >
                {formatPct(p.change7d)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
