import type { ChainActivity, StablecoinSignal } from "../../types";
import { MOCK_ACTIVITY, buildMockStablecoinSignals } from "../mock/data";

/**
 * Chain transaction signals. Etherscan/BSCScan require API keys, so we expose
 * a simulated-but-realistic generator that mimics a lightweight indexer.
 */
export async function fetchChainActivity(): Promise<ChainActivity[]> {
  return MOCK_ACTIVITY.map((a) => ({
    ...a,
    txCount24h: Math.round(a.txCount24h * (0.9 + Math.random() * 0.2)),
    gasGwei: Math.max(1, Math.round(a.gasGwei * (0.8 + Math.random() * 0.4))),
  }));
}

/** Stablecoin / P2P signal (simulated NGN-USDT spread + USDT dominance). */
export async function fetchStablecoinSignals(): Promise<StablecoinSignal[]> {
  return buildMockStablecoinSignals();
}
