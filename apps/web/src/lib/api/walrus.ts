import type { WalrusWriteResult, AiSignal, WalrusBlob } from "../../types";

const PUBLISHER = process.env.WALRUS_PUBLISHER_URL ?? "https://publisher.walrus-testnet.walrus.space";
const AGGREGATOR = process.env.WALRUS_AGGREGATOR_URL ?? "https://aggregator.walrus-testnet.walrus.space";
const EPOCHS = 5;

/**
 * Write any JSON-serializable payload to Walrus.
 * Returns the blobId and a verification URL.
 * Must only be called from server functions (createServerFn) — never client code.
 */
export async function writeToWalrus(
  payload: Record<string, unknown>,
  epochs = EPOCHS
): Promise<WalrusWriteResult> {
  const body = JSON.stringify(payload);
  const sizeBytes = new TextEncoder().encode(body).length;

  const res = await fetch(`${PUBLISHER}/v1/blobs?epochs=${epochs}`, {
    method: "PUT",
    headers: { "Content-Type": "application/octet-stream" },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Walrus write failed: HTTP ${res.status} — ${text}`);
  }

  const json = (await res.json()) as {
    newlyCreated?: { blobObject: { blobId: string } };
    alreadyCertified?: { blobId: string };
  };

  const blobId =
    json.newlyCreated?.blobObject?.blobId ??
    json.alreadyCertified?.blobId;

  if (!blobId) throw new Error("Walrus returned no blobId: " + JSON.stringify(json));

  return {
    blobId,
    verifyUrl: `https://suiscan.xyz/testnet/object/${blobId}`,
    sizeBytes,
  };
}

/**
 * Read a blob back from Walrus by its blobId.
 */
export async function readFromWalrus<T = unknown>(blobId: string): Promise<T> {
  const res = await fetch(`${AGGREGATOR}/v1/blobs/${blobId}`);
  if (!res.ok) throw new Error(`Walrus read failed: HTTP ${res.status} for blob ${blobId}`);
  return (await res.json()) as T;
}

/**
 * Build the standard blob payload for an AI signal.
 */
export function buildSignalBlob(signal: Omit<AiSignal, "walrusBlobId" | "verifyUrl">): Record<string, unknown> {
  return {
    version: "1.0",
    type: "defi_hawk_signal",
    ...signal,
    platform: "DeFi Hawk",
    storedAt: Date.now(),
  };
}

/**
 * Build a wallet analysis blob payload.
 */
export function buildWalletAnalysisBlob(
  address: string,
  chain: string,
  analysis: string,
  metadata: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    version: "1.0",
    type: "defi_hawk_wallet_analysis",
    address,
    chain,
    analysis,
    metadata,
    platform: "DeFi Hawk",
    storedAt: Date.now(),
  };
}
