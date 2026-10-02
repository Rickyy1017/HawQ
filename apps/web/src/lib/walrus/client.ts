import type { WalrusArtifact, WalrusArtifactKind } from "./config";

const STORAGE_KEY = "defiwolf:walrus:track-record";

export type PublishInput = {
  kind: WalrusArtifactKind;
  subject: string;
  summary: string;
  payload: unknown;
};

/** Store an artifact on Walrus + anchor on Sui via the server route. */
export async function publishToWalrus(
  input: PublishInput,
): Promise<WalrusArtifact> {
  const res = await fetch("/api/walrus/store", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`Publish failed: HTTP ${res.status}`);
  const artifact = (await res.json()) as WalrusArtifact;
  saveToTrackRecord(artifact);
  return artifact;
}

/** Fetch an immutable blob back from Walrus by its blobId. */
export async function fetchWalrusBlob(blobId: string): Promise<{
  ok: boolean;
  status: number;
  text: string;
}> {
  const res = await fetch(`/api/walrus/${encodeURIComponent(blobId)}`);
  const text = await res.text();
  return { ok: res.ok, status: res.status, text };
}

/** Persistent, per-browser record of everything the analyst has anchored. */
export function getTrackRecord(): WalrusArtifact[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return (JSON.parse(raw) as WalrusArtifact[]).sort(
      (a, b) => b.storedAt - a.storedAt,
    );
  } catch {
    return [];
  }
}

export function saveToTrackRecord(artifact: WalrusArtifact): void {
  if (typeof window === "undefined") return;
  const existing = getTrackRecord().filter((a) => a.blobId !== artifact.blobId);
  const next = [artifact, ...existing].slice(0, 100);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function clearTrackRecord(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function proofUrl(blobId: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/proof/${blobId}`;
}
