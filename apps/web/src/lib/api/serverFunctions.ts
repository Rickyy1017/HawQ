import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { fetchSuiWallet, fetchSuiTransactions } from "./sui";
import { writeToWalrus, readFromWalrus, buildSignalBlob, buildWalletAnalysisBlob } from "./walrus";
import type { AiSignal } from "../../types";

// ── Sui wallet server function ─────────────────────────────────────────────
export const getSuiWallet = createServerFn({ method: "GET" })
  .inputValidator(z.object({ address: z.string().min(10) }))
  .handler(async ({ data }) => {
    return fetchSuiWallet(data.address);
  });

export const getSuiTransactions = createServerFn({ method: "GET" })
  .inputValidator(z.object({ address: z.string().min(10) }))
  .handler(async ({ data }) => {
    return fetchSuiTransactions(data.address);
  });

// ── Walrus write server function ───────────────────────────────────────────
export const storeSignalOnWalrus = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string(),
      chain: z.string(),
      asset: z.string(),
      signal: z.enum(["BULLISH", "BEARISH", "NEUTRAL"]),
      confidence: z.number(),
      reasoning: z.string(),
      walletRefs: z.array(z.string()).default([]),
      generatedAt: z.number(),
    })
  )
  .handler(async ({ data }) => {
    const blob = buildSignalBlob(data);
    const result = await writeToWalrus(blob);
    return result;
  });

export const storeWalletAnalysisOnWalrus = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      address: z.string(),
      chain: z.string(),
      analysis: z.string(),
      suiBalance: z.number().optional(),
      tokenCount: z.number().optional(),
    })
  )
  .handler(async ({ data }) => {
    const blob = buildWalletAnalysisBlob(data.address, data.chain, data.analysis, {
      suiBalance: data.suiBalance,
      tokenCount: data.tokenCount,
    });
    const result = await writeToWalrus(blob);
    return result;
  });

// ── Walrus read server function ────────────────────────────────────────────
export const retrieveFromWalrus = createServerFn({ method: "GET" })
  .inputValidator(z.object({ blobId: z.string().min(5) }))
  .handler(async ({ data }) => {
    return readFromWalrus(data.blobId);
  });

// ── AI signal generation + auto-store on Walrus ────────────────────────────
export const generateAndStoreSignal = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      address: z.string(),
      chain: z.string(),
      suiBalance: z.number().optional(),
      recentTxCount: z.number().optional(),
      priceChange: z.number().optional(),
    })
  )
  .handler(async ({ data }) => {
    // Deterministic AI signal generation (no LLM key required for hackathon demo)
    // Swap this for a real LLM call if you have an OpenAI/Anthropic key
    const score =
      (data.suiBalance ?? 0) > 10000
        ? 0.78
        : (data.recentTxCount ?? 0) > 15
          ? 0.65
          : 0.52;

    const trend = (data.priceChange ?? 0) > 2 ? "BULLISH" : (data.priceChange ?? 0) < -2 ? "BEARISH" : "NEUTRAL";

    const signal: Omit<AiSignal, "walrusBlobId" | "verifyUrl"> = {
      id: `sig_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      chain: data.chain,
      asset: data.chain === "sui" ? "SUI" : "ETH",
      signal: trend as AiSignal["signal"],
      confidence: score,
      reasoning: `Wallet ${data.address.slice(0, 8)}... shows ${data.recentTxCount ?? 0} recent transactions with ${data.suiBalance?.toFixed(2) ?? "unknown"} SUI balance. On-chain activity ${score > 0.7 ? "strongly supports" : score > 0.6 ? "moderately supports" : "is neutral for"} a ${trend} position. Confidence derived from balance concentration, transaction velocity, and chain momentum.`,
      walletRefs: [data.address],
      generatedAt: Date.now(),
    };

    // Store on Walrus — this is the core hackathon integration
    const walrusResult = await writeToWalrus(buildSignalBlob(signal));

    return {
      ...signal,
      walrusBlobId: walrusResult.blobId,
      verifyUrl: walrusResult.verifyUrl,
    } satisfies AiSignal;
  });
