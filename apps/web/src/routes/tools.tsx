import { createFileRoute } from "@tanstack/react-router";
import { GlassCard } from "@/components/GlassCard";
import { Skeleton } from "@/components/Skeleton";
import { useProtocols, usePrices } from "@/hooks/useDefiData";
import { formatUSD } from "@/lib/format";
import {
  Download,
  Calculator,
  FileJson,
  Table2,
  ShieldCheck,
  Loader2,
  Copy,
  Check,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { publishToWalrus, proofUrl } from "../lib/walrus/client";
import { WalrusBadge } from "../components/WalrusBadge";
import type { WalrusArtifact, WalrusArtifactKind } from "../lib/walrus/config";

export const Route = createFileRoute("/tools")({
  head: () => ({
    meta: [
        { title: "Tools — DeFi Hawk" },
      { name: "description", content: "Analyst utilities: export protocol data and run a position value calculator." },
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

  // ---- Publish to Walrus ----
  const [reportKind, setReportKind] = useState<WalrusArtifactKind>("token-report");
  const [reportSubject, setReportSubject] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState<WalrusArtifact | null>(null);
  const [publishErr, setPublishErr] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const buildReportPayload = () => {
    const subject = reportSubject.trim() || "Top DeFi Protocols";
    const top = (protocols ?? []).slice(0, 10).map((p) => ({
      name: p.name,
      chain: p.chain,
      category: p.category,
      tvl: p.tvl,
      change1d: p.change1d,
      change7d: p.change7d,
    }));
    const totalTVL = top.reduce((s, p) => s + (p.tvl ?? 0), 0);
    return {
      subject,
      summary: `${reportKind.replace("-", " ")} covering ${top.length} protocols — combined TVL ${formatUSD(totalTVL)}.`,
      payload: {
        report: reportKind,
        subject,
        totalTVL,
        protocols: top,
        prices: prices ?? [],
      },
    };
  };

  const handlePublish = async () => {
    setPublishing(true);
    setPublishErr(null);
    setPublished(null);
    try {
      const { subject, summary, payload } = buildReportPayload();
      const artifact = await publishToWalrus({
        kind: reportKind,
        subject,
        summary,
        payload,
      });
      setPublished(artifact);
    } catch (e) {
      setPublishErr(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setPublishing(false);
    }
  };

  const copyLink = () => {
    if (!published) return;
    navigator.clipboard.writeText(proofUrl(published.blobId));
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 1500);
  };


  const exportCSV = () => {
    if (!protocols) return;
    const header = "name,slug,category,chain,tvl,change1d,change7d";
    const rows = protocols.map((p) =>
      [p.name, p.slug, p.category ?? "", p.chain, p.tvl, p.change1d ?? "", p.change7d ?? ""]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
      download("defihawk-protocols.csv", [header, ...rows].join("\n"), "text/csv");
  };

  const exportJSON = () => {
    if (!protocols) return;
      download("defihawk-protocols.json", JSON.stringify(protocols, null, 2), "application/json");
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

      <GlassCard className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-semibold">Publish to Walrus</h2>
          </div>
          <Link to="/track-record" className="text-xs text-primary hover:underline">
            View track record →
          </Link>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Serialize a wallet / whale / token report, store it permanently on
          Walrus, and anchor its hash on Sui — producing a shareable, tamper-proof
          proof link.
        </p>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Report type</label>
            <select
              value={reportKind}
              onChange={(e) => setReportKind(e.target.value as WalrusArtifactKind)}
              className="rounded-xl border border-border bg-secondary/40 px-3 py-2 text-sm outline-none"
            >
              <option value="token-report">Token Report</option>
              <option value="wallet-report">Wallet Report</option>
              <option value="whale-report">Whale Report</option>
              <option value="signal">Trading Signal</option>
            </select>
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="mb-1 block text-xs text-muted-foreground">Subject</label>
            <input
              value={reportSubject}
              onChange={(e) => setReportSubject(e.target.value)}
              placeholder="e.g. Aave whale flows — June"
              className="w-full rounded-xl border border-border bg-secondary/40 px-3 py-2 text-sm outline-none focus:border-primary/50"
            />
          </div>
          <button
            onClick={handlePublish}
            disabled={publishing}
            className="inline-flex items-center gap-2 rounded-xl bg-primary/20 px-4 py-2.5 text-sm font-medium text-foreground ring-1 ring-primary/40 transition-colors hover:bg-primary/30 disabled:opacity-50"
          >
            {publishing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            {publishing ? "Anchoring…" : "Publish & Anchor"}
          </button>
        </div>

        {publishErr && (
          <p className="mt-3 text-sm text-destructive">{publishErr}</p>
        )}

        {published && (
          <div className="mt-4 space-y-3 rounded-xl bg-secondary/30 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <WalrusBadge anchored={published.anchored} />
              <Link
                to="/proof/$blobId"
                params={{ blobId: published.blobId }}
                className="text-xs text-primary hover:underline"
              >
                Open proof →
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={proofUrl(published.blobId)}
                className="flex-1 rounded-lg border border-border bg-background/40 px-3 py-2 font-mono text-xs outline-none"
              />
              <button
                onClick={copyLink}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary/20 px-3 py-2 text-xs font-medium ring-1 ring-primary/40 hover:bg-primary/30"
              >
                {linkCopied ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {linkCopied ? "Copied" : "Copy link"}
              </button>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );

}
