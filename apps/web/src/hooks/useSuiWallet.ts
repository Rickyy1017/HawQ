import { useMutation, useQuery } from "@tanstack/react-query";
import type {
  AiSignal,
  SuiTransaction,
  SuiWalletData,
  WalrusBlob,
} from "../types";

function buildDemoWallet(address: string): SuiWalletData {
  const normalized = address.trim();
  const seed = normalized.length
    ? [...normalized].reduce((total, ch) => total + ch.charCodeAt(0), 0)
    : 0;
  const suiBalance = Number(((seed % 5000) / 10 + 42.5).toFixed(2));
  const tokenCount = Math.max(1, (seed % 6) + 2);

  return {
    address: normalized,
    suiBalance,
    recentTxCount: (seed % 18) + 6,
    fetchedAt: Date.now(),
    lastTxDigest: `0x${normalized.slice(-8) || "demo"}`,
    tokens: Array.from({ length: tokenCount }, (_, index) => ({
      coinType: `0x2::coin::${["USDC", "SUI", "APT", "ETH", "BTC", "MOVE"][index % 6]}`,
      symbol: ["USDC", "SUI", "APT", "ETH", "BTC", "MOVE"][index % 6],
      balance: Number((((seed * (index + 1)) % 1800) / 12 + 30).toFixed(2)),
    })),
  };
}

function buildDemoTransactions(address: string): SuiTransaction[] {
  const normalized = address.trim();
  const seed = normalized.length
    ? [...normalized].reduce((total, ch) => total + ch.charCodeAt(0), 0)
    : 0;
  return Array.from({ length: Math.max(3, (seed % 7) + 4) }, (_, index) => ({
    digest: `0x${String(seed + index + 1).padStart(16, "0")}`,
    timestampMs: Date.now() - (index + 1) * 60_000,
    type: ["Transfer", "Swap", "Staking", "Mint"][index % 4],
    status: "success",
  }));
}

function createWalrusResult(blobId: string) {
  return {
    blobId,
    verifyUrl: `https://suiscan.xyz/testnet/object/${blobId}`,
    sizeBytes: 512,
  };
}

export function useSuiWallet(address: string) {
  return useQuery({
    queryKey: ["sui-wallet", address],
    enabled: address.length > 0,
    queryFn: async (): Promise<SuiWalletData> => buildDemoWallet(address),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}

export function useSuiTransactions(address: string) {
  return useQuery({
    queryKey: ["sui-transactions", address],
    enabled: address.length > 0,
    queryFn: async (): Promise<SuiTransaction[]> =>
      buildDemoTransactions(address),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}

export function useGenerateSignal() {
  return useMutation({
    mutationFn: async (input: {
      address: string;
      chain: string;
      suiBalance?: number;
      recentTxCount?: number;
      priceChange?: number;
    }): Promise<AiSignal> => {
      const blobId = `sig_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      const walrus = createWalrusResult(blobId);
      const signal: AiSignal = {
        id: `signal_${Date.now()}`,
        chain: input.chain,
        asset: input.chain === "sui" ? "SUI" : "ETH",
        signal:
          (input.priceChange ?? 0) > 2
            ? "BULLISH"
            : (input.priceChange ?? 0) < -2
              ? "BEARISH"
              : "NEUTRAL",
        confidence: Math.min(
          0.95,
          Math.max(
            0.5,
            (input.suiBalance ?? 0) / 1000 + (input.recentTxCount ?? 0) / 80,
          ),
        ),
        reasoning: `Wallet ${input.address.slice(0, 8)}... shows ${input.recentTxCount ?? 0} recent transactions and ${(input.suiBalance ?? 0).toFixed(2)} SUI in the account.`,
        walletRefs: [input.address],
        generatedAt: Date.now(),
        walrusBlobId: walrus.blobId,
        verifyUrl: walrus.verifyUrl,
      };
      return signal;
    },
  });
}

export function useStoreWalletAnalysis() {
  return useMutation({
    mutationFn: async (input: {
      address: string;
      chain: string;
      analysis: string;
      suiBalance?: number;
      tokenCount?: number;
    }): Promise<{ blobId: string; verifyUrl: string }> => {
      const blobId = `analysis_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      return createWalrusResult(blobId);
    },
  });
}

export function useWalrusBlob(blobId?: string | null) {
  return useQuery({
    queryKey: ["walrus-blob", blobId],
    enabled: Boolean(blobId),
    queryFn: async (): Promise<WalrusBlob> => ({
      blobId: blobId ?? "",
      type: "wallet_analysis",
      platform: "DeFi Hawk",
      storedAt: Date.now(),
      summary: "Blob data loaded from demo storage.",
    }),
  });
}
