import { safeFetch } from "../http";
import type { WalletSnapshot, ChainNetworkStats } from "@hawq/types";

const RPC = process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com";
const LAMPORTS_PER_SOL = 1_000_000_000;

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const json = await safeFetch<{ result: T; error?: { message: string } }>(RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (json.error) throw new Error(`Solana RPC ${method} error: ${json.error.message}`);
  return json.result;
}

/** Balance + recent signature count for a tracked address. */
export async function fetchSolanaWallet(address: string): Promise<WalletSnapshot> {
  const [balanceRes, sigsRes] = await Promise.allSettled([
    rpc<{ value: number }>("getBalance", [address]),
    rpc<Array<{ signature: string }>>("getSignaturesForAddress", [address, { limit: 25 }]),
  ]);

  const nativeBalance =
    balanceRes.status === "fulfilled" ? balanceRes.value.value / LAMPORTS_PER_SOL : 0;
  const txCountRecent = sigsRes.status === "fulfilled" ? sigsRes.value.length : 0;

  return {
    chain: "solana",
    address,
    nativeBalance,
    txCountRecent,
    fetchedAt: Date.now(),
  };
}

/** Network-level stats (slot height, epoch info) for the chain overview page. */
export async function fetchSolanaNetworkStats(): Promise<ChainNetworkStats> {
  const [slot, epochInfo] = await Promise.all([
    rpc<number>("getSlot", []),
    rpc<{ epoch: number; slotIndex: number; slotsInEpoch: number; transactionCount: number | null }>(
      "getEpochInfo",
      [],
    ),
  ]);

  return {
    chain: "solana",
    blockHeight: slot,
    metrics: {
      epoch: epochInfo.epoch,
      slotIndex: epochInfo.slotIndex,
      slotsInEpoch: epochInfo.slotsInEpoch,
      transactionCount: epochInfo.transactionCount,
    },
    fetchedAt: Date.now(),
  };
}
