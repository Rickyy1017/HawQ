import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSuiWallet, getSuiTransactions, generateAndStoreSignal, storeWalletAnalysisOnWalrus, retrieveFromWalrus } from "../lib/api/serverFunctions";

const QO = { staleTime: 5 * 60_000, gcTime: 30 * 60_000, retry: 1 } as const;

export function useSuiWallet(address: string) {
  return useQuery({
    queryKey: ["sui-wallet", address],
    queryFn: () => getSuiWallet({ data: { address } }),
    enabled: Boolean(address && address.length > 10),
    ...QO,
  });
}

export function useSuiTransactions(address: string) {
  return useQuery({
    queryKey: ["sui-txns", address],
    queryFn: () => getSuiTransactions({ data: { address } }),
    enabled: Boolean(address && address.length > 10),
    ...QO,
  });
}

export function useGenerateSignal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      address: string;
      chain: string;
      suiBalance?: number;
      recentTxCount?: number;
      priceChange?: number;
    }) => generateAndStoreSignal({ data: params }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["signal-archive"] });
    },
  });
}

export function useStoreWalletAnalysis() {
  return useMutation({
    mutationFn: (params: {
      address: string;
      chain: string;
      analysis: string;
      suiBalance?: number;
      tokenCount?: number;
    }) => storeWalletAnalysisOnWalrus({ data: params }),
  });
}

export function useWalrusBlob(blobId: string | undefined) {
  return useQuery({
    queryKey: ["walrus-blob", blobId],
    queryFn: () => retrieveFromWalrus({ data: { blobId: blobId! } }),
    enabled: Boolean(blobId),
    staleTime: Infinity, // blobs are immutable
    gcTime: 60 * 60_000,
  });
}
