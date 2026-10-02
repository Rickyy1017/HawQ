import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck, Trash2, ExternalLink, Inbox } from "lucide-react";
import { GlassCard } from "../components/GlassCard";
import { WalrusBadge } from "../components/WalrusBadge";
import {
  getTrackRecord,
  clearTrackRecord,
} from "../lib/walrus/client";
import type { WalrusArtifact } from "../lib/walrus/config";

export const Route = createFileRoute("/track-record")({
  head: () => ({
    meta: [
      { title: "Track Record — DeFi-Wolf" },
      {
        name: "description",
        content:
          "An immutable, Walrus-anchored history of every signal and report you have generated.",
      },
    ],
  }),
  component: TrackRecordPage,
});

const KIND_LABEL: Record<string, string> = {
  signal: "Trading Signal",
  "wallet-report": "Wallet Report",
  "whale-report": "Whale Report",
  "token-report": "Token Report",
};

function TrackRecordPage() {
  const [items, setItems] = useState<WalrusArtifact[]>([]);

  useEffect(() => {
    setItems(getTrackRecord());
  }, []);

  const clear = () => {
    clearTrackRecord();
    setItems([]);
  };

  return (
    <div className="space-y-6 py-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="mb-1 flex items-center gap-2 text-3xl font-bold">
            <ShieldCheck className="h-7 w-7 text-primary" />
            <span className="text-gradient">Track Record</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Every signal and report you publish is permanently anchored — a
            provable, tamper-proof reputation layer for your DeFi alpha.
          </p>
        </div>
        {items.length > 0 && (
          <button
            onClick={clear}
            className="inline-flex items-center gap-1.5 rounded-xl bg-secondary/50 px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear local record
          </button>
        )}
      </header>

      {items.length === 0 ? (
        <GlassCard className="flex flex-col items-center gap-3 p-10 text-center">
          <Inbox className="h-10 w-10 text-muted-foreground" />
          <p className="font-display text-lg font-semibold">No anchored records yet</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Publish a wallet, whale, or token report from the Tools page to
            create your first Walrus-verified, Sui-anchored proof.
          </p>
          <Link
            to="/tools"
            className="mt-1 rounded-xl bg-primary/20 px-4 py-2 text-sm font-medium ring-1 ring-primary/40 transition-colors hover:bg-primary/30"
          >
            Go to Tools
          </Link>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <GlassCard key={a.blobId} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-accent/20 px-2 py-0.5 text-[10px] font-semibold text-accent">
                      {KIND_LABEL[a.kind] ?? a.kind}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(a.storedAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="truncate font-display text-base font-semibold">
                    {a.subject}
                  </p>
                  {a.summary && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {a.summary}
                    </p>
                  )}
                  <p className="truncate font-mono text-[11px] text-muted-foreground">
                    blob: {a.blobId}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <WalrusBadge anchored={a.anchored} />
                  <Link
                    to="/proof/$blobId"
                    params={{ blobId: a.blobId }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary/20 px-3 py-1.5 text-xs font-medium ring-1 ring-primary/40 transition-colors hover:bg-primary/30"
                  >
                    View proof <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
