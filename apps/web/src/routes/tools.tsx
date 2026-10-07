import { createFileRoute } from "@tanstack/react-router";
import { GlassCard } from "@/components/GlassCard";
import { Skeleton } from "@/components/Skeleton";
import { useProtocols, usePrices } from "@/hooks/useDefiData";
import { formatUSD } from "@/lib/format";
import { Download, Calculator, FileJson, Table2 } from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/tools")({
  head: () => ({
    meta: [
      { title: "Tools — HawQ" },
      { name: "description", content: "Analyst utilities: export protocol data and run a position value calculator." },
      { property: "og:title", content: "Tools — HawQ" },
      { property: "og:description", content: "Analyst utilities: export protocol data and run a position value calculator."  },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ToolsPage,
});

function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function ToolsPage() {
  const { data: protocols, isLoading } = useProtocols();
  const { data: prices } = usePrices();

  const [tokenAmt, setTokenAmt] = useState("10");
  const [tokenSym, setTokenSym] = useState("ETH");

  const calc = useMemo(() => {
    const amt = parseFloat(tokenAmt) || 0;
    const price = prices?.find((p) => p.symbol === tokenSym)?.price ?? 0;
    return amt * price;
  }, [tokenAmt, tokenSym, prices]);

  const exportCSV = () => {
    if (!protocols) return;
    const header = "name,slug,category,chain,tvl,change1d,change7d";
    const rows = protocols.map((p) =>
      [p.name, p.slug, p.category ?? "", p.chain, p.tvl, p.change1d ?? "", p.change7d ?? ""]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    download("hawq-protocols.csv", [header, ...rows].join("\n"), "text/csv");
  };

  const exportJSON = () => {
    if (!protocols) return;
    download("hawq-protocols.json", JSON.stringify(protocols, null, 2), "application/json");
  };

  if (isLoading) {
    return (
      <div className="space-y-4 py-6">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 py-6">
      <header>
        <h1 className="mb-1 text-3xl font-bold">
          <span className="text-gradient">Tools</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Analyst utilities for exporting indexed data and quick valuation math.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <Table2 className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-semibold">Data Export</h2>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            Export the full normalized dataset of {protocols?.length ?? 0} protocols for offline analysis.
          </p>
          <div className="flex gap-3">
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 rounded-xl bg-primary/20 px-4 py-2.5 text-sm font-medium text-foreground ring-1 ring-primary/40 transition-colors hover:bg-primary/30"
            >
              <Download className="h-4 w-4" /> Export CSV
            </button>
            <button
              onClick={exportJSON}
              className="flex items-center gap-2 rounded-xl bg-secondary/50 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-secondary"
            >
              <FileJson className="h-4 w-4" /> Export JSON
            </button>
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-semibold">Position Calculator</h2>
          </div>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs text-muted-foreground">Amount</label>
              <input
                value={tokenAmt}
                onChange={(e) => setTokenAmt(e.target.value)}
                inputMode="decimal"
                className="w-full rounded-xl border border-border bg-secondary/40 px-3 py-2 text-sm outline-none focus:border-primary/50"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Token</label>
              <select
                value={tokenSym}
                onChange={(e) => setTokenSym(e.target.value)}
                className="rounded-xl border border-border bg-secondary/40 px-3 py-2 text-sm outline-none"
              >
                {(prices ?? []).map((p) => (
                  <option key={p.symbol} value={p.symbol}>{p.symbol}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 rounded-xl bg-secondary/30 p-4">
            <p className="text-xs text-muted-foreground">Estimated value</p>
            <p className="font-display text-2xl font-semibold">{formatUSD(calc, { compact: false })}</p>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
