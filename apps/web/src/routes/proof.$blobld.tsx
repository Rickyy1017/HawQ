import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ShieldCheck,
  Link2,
  Copy,
  Check,
  ArrowLeft,
  FileJson,
  AlertTriangle,
} from "lucide-react";
import { GlassCard } from "../components/GlassCard";
import { WalrusBadge } from "../components/WalrusBadge";
import { Skeleton } from "../components/Skeleton";
import { fetchWalrusBlob, getTrackRecord } from "../lib/walrus/client";
import type { WalrusArtifact } from "../lib/walrus/config";
export const Route = createFileRoute("/proof/$blobld")({
  head: () => ({
    meta: [
      { title: "Proof of Provenance — DeFi Hawk" },
      {
        name: "description",
        content:
          "Immutable Walrus blob and Sui on-chain anchor proving when this DeFi intelligence was generated.",
      },
    ],
  }),
  component: ProofPage,
  errorComponent: () => (
    <div className="py-10 text-center text-sm text-muted-foreground">
      Could not load this proof.
    </div>
  ),
  notFoundComponent: () => (
    <div className="py-10 text-center text-sm text-muted-foreground">
      Proof not found.
    </div>
  ),
});

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border/60 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="break-all font-mono text-xs text-foreground sm:max-w-[60%] sm:text-right">
        {value}
      </span>
    </div>
  );
}

function ProofPage() {
  const { blobId } = Route.useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [ok, setOk] = useState(false);
  const [content, setContent] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const artifact: WalrusArtifact | undefined = useMemo(
    () => getTrackRecord().find((a) => a.blobId === blobId),
    [blobId],
  );

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchWalrusBlob(blobId).then((r) => {
      if (!alive) return;
      setOk(r.ok);
      setContent(r.text);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [blobId]);

  const copy = (label: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  };

  const pretty = useMemo(() => {
    try {
      return JSON.stringify(JSON.parse(content), null, 2);
    } catch {
      return content;
    }
  }, [content]);

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-6">
      <button
        onClick={() => router.history.back()}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <header className="space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <h1 className="font-display text-2xl font-bold">
            <span className="text-gradient">Proof of Provenance</span>
          </h1>
        </div>
        <WalrusBadge anchored={artifact?.anchored} />
        <p className="text-sm text-muted-foreground">
          This record is permanently stored on Walrus decentralized storage and
          its content hash is anchored to the Sui network — it cannot be edited
          or backdated.
        </p>
      </header>

      <GlassCard className="p-5">
        <div className="mb-2 flex items-center gap-2">
          <Link2 className="h-4 w-4 text-primary" />
          <h2 className="font-display text-base font-semibold">
            On-chain Anchor
          </h2>
        </div>
        <Row
          label="Walrus Blob ID"
          value={
            <button
              onClick={() => copy("blob", blobId)}
              className="inline-flex items-center gap-1.5 hover:text-primary"
            >
              {blobId}
              {copied === "blob" ? (
                <Check className="h-3 w-3 text-primary" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </button>
          }
        />
        <Row
          label="Sui Tx / Anchor Digest"
          value={
            artifact?.suiTxDigest ? (
              <button
                onClick={() => copy("digest", artifact.suiTxDigest!)}
                className="inline-flex items-center gap-1.5 hover:text-primary"
              >
                {artifact.suiTxDigest}
                {copied === "digest" ? (
                  <Check className="h-3 w-3 text-primary" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </button>
            ) : (
              <span className="text-muted-foreground">— not in local record —</span>
            )
          }
        />
        {artifact?.suiCheckpoint && (
          <Row label="Sui Checkpoint" value={artifact.suiCheckpoint} />
        )}
        {artifact?.sha256 && <Row label="Content SHA-256" value={artifact.sha256} />}
        {artifact && (
          <Row
            label="Anchored At"
            value={new Date(artifact.storedAt).toLocaleString()}
          />
        )}
      </GlassCard>

      <GlassCard className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <FileJson className="h-4 w-4 text-primary" />
          <h2 className="font-display text-base font-semibold">
            Immutable Blob Contents
          </h2>
        </div>
        {loading ? (
          <Skeleton className="h-48 rounded-xl" />
        ) : ok ? (
          <pre className="max-h-[460px] overflow-auto rounded-xl bg-secondary/30 p-4 font-mono text-xs leading-relaxed text-foreground">
            {pretty}
          </pre>
        ) : (
          <div className="flex items-start gap-2 rounded-xl bg-secondary/30 p-4 text-sm text-muted-foreground">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <span>
              This blob could not be retrieved from the Walrus aggregator. If it
              was published in offline/demo mode it is not retrievable.
            </span>
          </div>
        )}
      </GlassCard>

      <div className="text-center">
        <Link
          to="/track-record"
          className="text-sm text-primary hover:underline"
        >
          View full track record →
        </Link>
      </div>
    </div>
  );
}
