import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { GlassCard } from "../components/GlassCard";
import { Search, Zap } from "lucide-react";
import {
  useSuiWallet,
  useSuiTransactions,
  useGenerateSignal,
  useStoreWalletAnalysis,
  useWalrusBlob,
} from "../hooks/useSuiWallet";

export const Route = createFileRoute("/sui")({
  component: SuiPage,
});

function SuiPage() {
  const [input, setInput] = useState("");
  const [address, setAddress] = useState<string | null>(null);

  const walletQ = useSuiWallet(address ?? "");
  const txQ = useSuiTransactions(address ?? "");
  const genSignal = useGenerateSignal();
  const storeAnalysis = useStoreWalletAnalysis();

  const handleSearch = () => {
    if (input.length > 10) setAddress(input.trim());
  };

  const handleGenerate = async () => {
    if (!address || !walletQ.data) return;
    await genSignal.mutateAsync({
      address,
      chain: "sui",
      suiBalance: walletQ.data.suiBalance,
      recentTxCount: walletQ.data.recentTxCount,
    });
  };

  const handleStoreAnalysis = async () => {
    if (!address || !walletQ.data) return;
    await storeAnalysis.mutateAsync({
      address,
      chain: "sui",
      analysis: `Snapshot: ${walletQ.data.tokens.length} tokens, ${walletQ.data.suiBalance.toFixed(3)} SUI`,
      suiBalance: walletQ.data.suiBalance,
      tokenCount: walletQ.data.tokens.length,
    });
  };

  const walrusBlobId = genSignal.data?.walrusBlobId ?? storeAnalysis.data?.blobId;
  const walrusQ = useWalrusBlob(walrusBlobId);

  return (
    <div className="space-y-6 py-6">
      <header>
        <h1 className="mb-1 text-3xl font-bold">
          <span className="text-gradient">Sui Intelligence</span>
        </h1>
        <p className="text-sm text-muted-foreground">Wallet analytics · AI signals · On-chain insights</p>
      </header>

      <GlassCard className="p-5">
        <div className="flex gap-3">
          <input
            className="flex-1 rounded-xl border border-border bg-background/60 px-4 py-2.5 text-sm outline-none focus:border-primary"
            placeholder="Enter Sui wallet address (0x...)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <button
            onClick={handleSearch}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"
          >
            <Search className="h-4 w-4" /> Analyze
          </button>
        </div>
      </GlassCard>

      {!address && (
        <GlassCard className="p-8 text-center">
          <Zap className="mx-auto mb-3 h-10 w-10 text-primary/40" />
          <p className="text-sm text-muted-foreground">Enter a Sui wallet address to get started</p>
        </GlassCard>
      )}

      {address && (
        <GlassCard className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Wallet Snapshot</h2>
              <p className="text-sm text-muted-foreground">{address}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleGenerate}
                disabled={genSignal.isLoading}
                className="rounded-md bg-primary px-3 py-1 text-sm text-primary-foreground"
              >
                Generate Signal
              </button>
              <button
                onClick={handleStoreAnalysis}
                disabled={storeAnalysis.isLoading}
                className="rounded-md border border-input px-3 py-1 text-sm"
              >
                Store Analysis
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">SUI Balance</div>
              <div className="font-mono text-foreground">{walletQ.isLoading ? "..." : `${walletQ.data?.suiBalance ?? 0} SUI`}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Tokens</div>
              <div className="font-mono text-foreground">{walletQ.isLoading ? "..." : walletQ.data?.tokens.length ?? 0}</div>
            </div>
          </div>

          {genSignal.data && (
            <div className="mt-4 text-sm">
              Signal stored: <a className="text-primary underline" href={genSignal.data.verifyUrl}>{genSignal.data.walrusBlobId}</a>
            </div>
          )}

          {walrusQ.data && (
            <div className="mt-4 text-sm text-muted-foreground">Walrus blob fetched — {JSON.stringify(walrusQ.data).slice(0, 200)}…</div>
          )}
        </GlassCard>
      )}
    </div>
  );
}
