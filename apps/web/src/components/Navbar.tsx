import { useEffect, useState } from "react";
import { cn } from "../lib/utils";
import { Menu, Search } from "lucide-react";
import { usePrices } from "../hooks/useDefiData";
import { formatUSD, formatPct } from "../lib/format";
import { ThemeToggle } from "./ThemeToggle";
import { ConnectWallet } from "./ConnectWallet";

export function Navbar({
  query,
  onQuery,
  onMenu,
}: {
  query: string;
  onQuery: (v: string) => void;
  onMenu?: () => void;
}) {
  const [scrolled, setScrolled] = useState(false);
  const { data: prices } = usePrices();

  useEffect(() => {
    const el = document.getElementById("main-scroll");
    const handler = () => setScrolled((el?.scrollTop ?? 0) > 8);
    el?.addEventListener("scroll", handler);
    return () => el?.removeEventListener("scroll", handler);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex items-center gap-3 px-4 py-3.5 transition-all duration-300 sm:gap-4 sm:px-5",
        scrolled ? "glass border-b" : "border-b border-transparent",
      )}
    >
      {onMenu && (
        <button
          type="button"
          onClick={onMenu}
          aria-label="Open menu"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border bg-secondary/40 text-foreground lg:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>
      )}
      <div className="relative min-w-0 flex-1 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search protocols…"
          className="w-full rounded-xl border border-border bg-secondary/40 py-2 pl-9 pr-3 text-sm outline-none transition-all placeholder:text-muted-foreground focus:border-primary/50 focus:bg-secondary/70 focus:shadow-[0_0_0_3px] focus:shadow-primary/15"
        />
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-4">
        <div className="hidden items-center gap-4 lg:flex">
          {prices?.map((p) => (
            <div key={p.symbol} className="flex items-center gap-1.5 text-xs">
              <span
                className="font-semibold text-muted-foreground"
                title={`Price: ${p.source ?? "Unknown"}; 24h change: CoinGecko or fallback`}
              >
                {p.symbol}
              </span>
              <span className="font-medium">
                {formatUSD(p.price, { compact: false })}
              </span>
              <span
                className={
                  p.change24h >= 0 ? "text-success" : "text-destructive"
                }
              >
                {formatPct(p.change24h)}
              </span>
            </div>
          ))}
        </div>
        <ConnectWallet />
        <ThemeToggle />
      </div>
    </header>
  );
}
