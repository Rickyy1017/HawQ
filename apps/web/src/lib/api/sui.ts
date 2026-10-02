import { safeFetch, cached } from "./client";
import type { SuiWalletData, SuiTransaction } from "../../types";

const SUI_RPC = "https://sui-mainnet.tatum.io";
const MIST_PER_SUI = 1_000_000_000;

function tatumHeaders(): Record<string, string> {
  // In server functions, process.env works fine.
  // In client-side code, this file should never be imported directly —
  // always call through a createServerFn wrapper.
  const key = process.env.TATUM_API_KEY ?? import.meta.env?.VITE_TATUM_API_KEY ?? "";
  return {
    "Content-Type": "application/json",
    ...(key ? { "x-api-key": key } : {}),
  };
}

async function suiRpc<T>(method: string, params: unknown[]): Promise<T> {
  const res = await fetch(SUI_RPC, {
    method: "POST",
    headers: tatumHeaders(),
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`Tatum RPC ${method} failed: HTTP ${res.status}`);
  const json = (await res.json()) as { result: T; error?: { message: string } };
  if (json.error) throw new Error(`Tatum RPC error: ${json.error.message}`);
  return json.result;
}

export async function fetchSuiWallet(address: string): Promise<SuiWalletData> {
  return cached(`sui-wallet-${address}`, 5 * 60_000, async () => {
    const [balanceResult, txResult] = await Promise.allSettled([
      suiRpc<{ totalBalance: string }>("suix_getBalance", [address, "0x2::sui::SUI"]),
      suiRpc<{ data: Array<{ digest: string }> }>("suix_queryTransactionBlocks", [
        { filter: { FromAddress: address } },
        null,
        10,
        true,
      ]),
    ]);

    const suiBalance =
      balanceResult.status === "fulfilled"
        ? Number(balanceResult.value.totalBalance) / MIST_PER_SUI
        : 0;

    const txData = txResult.status === "fulfilled" ? txResult.value.data : [];
    const lastTxDigest = txData[0]?.digest;

    // Fetch all coin balances
    let tokens: SuiWalletData["tokens"] = [];
    try {
        const allBalances = await suiRpc<Array<{ coinType: string; totalBalance: string }>>(
          "suix_getAllBalances",
          [address]
        );

      tokens = allBalances
        .filter((b) => b.coinType !== "0x2::sui::SUI")
        .map((b) => ({
          coinType: b.coinType,
          symbol: b.coinType.split("::").pop() ?? "UNKNOWN",
          balance: Number(b.totalBalance) / MIST_PER_SUI,
        }))
        .slice(0, 10);
    } catch {
      // non-fatal — SUI balance still valid
    }

    return {
      address,
      suiBalance,
      tokens,
      recentTxCount: txData.length,
      lastTxDigest,
      fetchedAt: Date.now(),
    };
  });
}

export async function fetchSuiTransactions(address: string): Promise<SuiTransaction[]> {
  return cached(`sui-txns-${address}`, 3 * 60_000, async () => {
    const result = await suiRpc<{
      data: Array<{
        digest: string;
        timestampMs?: string;
        transaction?: { data?: { transaction?: { kind: string } } };
      }>;
    }>("suix_queryTransactionBlocks", [
      { filter: { FromAddress: address } },
      null,
      25,
      true,
    ]);

    return result.data.map((tx) => ({
      digest: tx.digest,
      timestampMs: tx.timestampMs ? Number(tx.timestampMs) : Date.now(),
      type: tx.transaction?.data?.transaction?.kind ?? "Unknown",
      status: "success" as const,
    }));
  });
}

export async function fetchSuiWhaleMovements(): Promise<
  Array<{ address: string; amountSui: number; digest: string; timestampMs: number }>
> {
  // Known Sui ecosystem whale addresses for demo purposes
  const WHALE_ADDRESSES = [
    "0x6f3b4c8d2e1a9b7c5d3f2e8a1c6b4d9e7f3a2b8c",
    "0x9a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b",
  ];

  const results = await Promise.allSettled(
    WHALE_ADDRESSES.map((addr) => fetchSuiWallet(addr))
  );

  return results
    .filter((r): r is PromiseFulfilledResult<SuiWalletData> => r.status === "fulfilled")
    .map((r) => ({
      address: r.value.address,
      amountSui: r.value.suiBalance,
      digest: r.value.lastTxDigest ?? "",
      timestampMs: r.value.fetchedAt,
    }));
}
