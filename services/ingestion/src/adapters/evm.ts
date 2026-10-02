import { safeFetch } from "../http";
import type { WalletSnapshot, ChainNetworkStats, WalletTrackableChain } from "@hawq/types";

/**
 * One adapter for every EVM chain HawQ supports, since Base, Arbitrum, and
 * Robinhood Chain all speak standard Ethereum JSON-RPC. Robinhood Chain is
 * an Arbitrum Orbit chain and is fully EVM-compatible — same code path,
 * just a different RPC URL and chain ID. Swap safeFetch's raw JSON-RPC
 * calls for viem if/when contract-level reads (not just balance/tx count)
 * are needed.
 */
export type EvmChainConfig = {
  key: Extract<WalletTrackableChain, "base" | "arbitrum" | "robinhood">;
  chainId: number;
  rpcUrl: string;
};

export const EVM_CHAINS: EvmChainConfig[] = [
  {
    key: "base",
    chainId: 8453,
    rpcUrl: process.env.BASE_RPC_URL ?? "https://mainnet.base.org",
  },
  {
    key: "arbitrum",
    chainId: 42161,
    rpcUrl: process.env.ARBITRUM_RPC_URL ?? "https://arb1.arbitrum.io/rpc",
  },
  {
    key: "robinhood",
    chainId: 4663,
    rpcUrl: process.env.ROBINHOOD_RPC_URL ?? "https://rpc.mainnet.chain.robinhood.com",
  },
];

async function rpc<T>(rpcUrl: string, method: string, params: unknown[]): Promise<T> {
  const json = await safeFetch<{ result: T; error?: { message: string } }>(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (json.error) throw new Error(`EVM RPC ${method} error: ${json.error.message}`);
  return json.result;
}

/** Native (ETH) balance + tx count for a tracked address on a given EVM chain. */
export async function fetchEvmWallet(
  cfg: EvmChainConfig,
  address: string,
): Promise<WalletSnapshot> {
  const [balanceHex, txCountHex] = await Promise.all([
    rpc<string>(cfg.rpcUrl, "eth_getBalance", [address, "latest"]),
    rpc<string>(cfg.rpcUrl, "eth_getTransactionCount", [address, "latest"]),
  ]);

  return {
    chain: cfg.key,
    address,
    nativeBalance: Number(BigInt(balanceHex)) / 1e18,
    txCountRecent: parseInt(txCountHex, 16),
    fetchedAt: Date.now(),
  };
}

/** Block height + gas price for the chain overview page. */
export async function fetchEvmNetworkStats(cfg: EvmChainConfig): Promise<ChainNetworkStats> {
  const [blockHex, gasPriceHex] = await Promise.all([
    rpc<string>(cfg.rpcUrl, "eth_blockNumber", []),
    rpc<string>(cfg.rpcUrl, "eth_gasPrice", []),
  ]);

  return {
    chain: cfg.key,
    blockHeight: parseInt(blockHex, 16),
    metrics: {
      chainId: cfg.chainId,
      gasPriceGwei: Number(BigInt(gasPriceHex)) / 1e9,
    },
    fetchedAt: Date.now(),
  };
}
