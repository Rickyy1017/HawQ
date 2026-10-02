import type {
  ProtocolTVL,
  ChainTVL,
  StablecoinSignal,
  ChainActivity,
  PricePoint,
  MarketInsight,
} from '../../types';

export function getTopProtocolsByTVL(p: ProtocolTVL[], n = 10): ProtocolTVL[] {
  return [...p].sort((a, b) => b.tvl - a.tvl).slice(0, n);
}

export function getTotalTVL(p: ProtocolTVL[]): number {
  return p.reduce((a, x) => a + x.tvl, 0);
}

export function detectStablecoinDemandTrend(signals: StablecoinSignal[]): {
  direction: "rising" | "falling" | "stable";
  delta: number;
} {
  if (signals.length < 2) return { direction: "stable", delta: 0 };
  const recent = signals.slice(-7);
  const delta =
    recent[recent.length - 1].usdtDominance - recent[0].usdtDominance;
  return {
    direction: delta > 0.4 ? "rising" : delta < -0.4 ? "falling" : "stable",
    delta: +delta.toFixed(2),
  };
}

/** Rule-based market intelligence summary. */
export function detectMarketSignal(input: {
  protocols: ProtocolTVL[];
  chains: ChainTVL[];
  signals: StablecoinSignal[];
  activity: ChainActivity[];
  prices: PricePoint[];
}): MarketInsight[] {
  const { chains, signals, activity, prices } = input;
  const insights: MarketInsight[] = [];

  if (chains.length) {
    const lead = chains[0];
    insights.push({
      id: "chain-lead",
      title: `${lead.chain} leads with ${lead.share.toFixed(0)}% of tracked TVL`,
      detail: `${lead.chain} dominates multi-chain liquidity, signalling concentrated capital and deeper markets on this network.`,
      tone: "neutral",
    });
  }

  const stable = detectStablecoinDemandTrend(signals);
  if (stable.direction === "rising") {
    insights.push({
      id: "stable-rising",
      title: "Stablecoin inflows increasing (bullish liquidity expansion)",
      detail: `USDT dominance is up ${stable.delta}% over the last week — risk-on stablecoin flow increasing into DeFi.`,
      tone: "positive",
    });
  } else if (stable.direction === "falling") {
    insights.push({
      id: "stable-falling",
      title: "Stablecoin demand cooling (liquidity contraction)",
      detail: `USDT dominance fell ${Math.abs(stable.delta)}% this week, hinting at capital rotating out of on-chain markets.`,
      tone: "warning",
    });
  }

  const eth = activity.find((a) => a.chain === "Ethereum");
  if (eth && eth.gasGwei > 25) {
    insights.push({
      id: "eth-gas",
      title: "Network activity surge on Ethereum",
      detail: `Gas at ~${eth.gasGwei} gwei with ${(eth.txCount24h / 1e6).toFixed(2)}M daily txs — elevated demand for blockspace.`,
      tone: "warning",
    });
  }

  const bsc = activity.find((a) => a.chain === "BSC");
  if (bsc && bsc.txCount24h > 3_000_000) {
    insights.push({
      id: "bsc-retail",
      title: "BSC showing increased retail activity signals",
      detail: `${(bsc.txCount24h / 1e6).toFixed(1)}M daily transactions at low gas — characteristic of high retail throughput.`,
      tone: "neutral",
    });
  }

  const ethPrice = prices.find((p) => p.symbol === "ETH");
  if (ethPrice && ethPrice.change24h > 2) {
    insights.push({
      id: "eth-price",
      title: "ETH momentum positive over 24h",
      detail: `ETH up ${ethPrice.change24h}% in the last day, supportive of risk appetite across DeFi assets.`,
      tone: "positive",
    });
  }

  return insights.slice(0, 5);
}
