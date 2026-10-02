import type { ProtocolTVL, ProtocolEvent, EventType, WalletBalance } from '../../types';

export const EVENT_TYPES: EventType[] = [
  "deposit",
  "withdrawal",
  "swap",
  "tvl_spike",
  "whale_move",
];

export const EVENT_META: Record<
  EventType,
  { label: string; verb: string; tone: "positive" | "warning" | "neutral" }
> = {
  deposit: { label: "Deposit", verb: "deposited into", tone: "positive" },
  withdrawal: { label: "Withdrawal", verb: "withdrew from", tone: "warning" },
  swap: { label: "Swap", verb: "swapped on", tone: "neutral" },
  tvl_spike: { label: "TVL Spike", verb: "TVL surged on", tone: "positive" },
  whale_move: { label: "Whale Move", verb: "large transfer on", tone: "neutral" },
};

/** Deterministic PRNG (mulberry32) so a given seed yields reproducible output. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Build a plausible EVM-style address from a numeric seed. */
export function pseudoAddress(seed: number): string {
  const rand = mulberry32(seed);
  let hex = "0x";
  for (let i = 0; i < 40; i++) hex += Math.floor(rand() * 16).toString(16);
  return hex;
}

/** Basic EVM address validation. */
export function isValidAddress(addr: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(addr.trim());
}

const CHAIN_POOL = ["Ethereum", "BSC", "Polygon", "Avalanche"];

/**
 * Generate a realistic stream of protocol/wallet events derived from live TVL
 * data. `seed` lets callers refresh the feed (e.g. on an interval) for a
 * real-time feel while keeping each render stable.
 */
export function generateProtocolEvents(
  protocols: ProtocolTVL[],
  count = 50,
  seed = 0,
): ProtocolEvent[] {
  if (!protocols.length) return [];
  const rand = mulberry32((seed % 100000) + 7);
  const now = Date.now();
  const events: ProtocolEvent[] = [];

  for (let i = 0; i < count; i++) {
    // Weight selection toward higher-TVL protocols.
    const idx = Math.floor(rand() ** 1.6 * protocols.length);
    const p = protocols[Math.min(idx, protocols.length - 1)];
    const chains = p.chains.length ? p.chains : [p.chain];
    const chain = chains[Math.floor(rand() * chains.length)] ?? CHAIN_POOL[0];
    const type = EVENT_TYPES[Math.floor(rand() * EVENT_TYPES.length)];
    const base = Math.max(p.tvl * 0.0008, 50000);
    const amountUSD = Math.round(base * (0.4 + rand() * 14));
    const timestamp = now - Math.floor(rand() ** 2 * 24 * 3600 * 1000);
    events.push({
      id: `${p.slug}-${i}-${seed}`,
      protocol: p.name,
      slug: p.slug,
      chain,
      type,
      amountUSD,
      address: pseudoAddress(hashStr(p.slug) + i + seed),
      timestamp,
    });
  }

  return events.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Derive a deterministic-yet-live wallet balance snapshot for a watched
 * address using current protocol data. `tick` nudges values so the UI can show
 * real-time fluctuations on an interval.
 */
export function computeWalletBalance(
  address: string,
  protocols: ProtocolTVL[],
  tick = 0,
): WalletBalance {
  const base = hashStr(address.toLowerCase());
  const rand = mulberry32(base);
  const drift = mulberry32(base + tick);

  const positionCount = 2 + Math.floor(rand() * 4);
  const pool = [...protocols].sort((a, b) => b.tvl - a.tvl).slice(0, 20);
  const chosen = new Set<number>();
  const positions = [];
  for (let i = 0; i < positionCount && pool.length; i++) {
    let pi = Math.floor(rand() * pool.length);
    while (chosen.has(pi) && chosen.size < pool.length) pi = (pi + 1) % pool.length;
    chosen.add(pi);
    const p = pool[pi];
    const chains = p.chains.length ? p.chains : [p.chain];
    // live drift +/- 2%
    const liveFactor = 1 + (drift() - 0.5) * 0.04;
    const valueUSD = Math.round((10000 + rand() * 4_000_000) * liveFactor);
    positions.push({
      protocol: p.name,
      slug: p.slug,
      chain: chains[Math.floor(rand() * chains.length)] ?? "Ethereum",
      valueUSD,
    });
  }

  const totalUSD = positions.reduce((a, p) => a + p.valueUSD, 0);
  const change24h = +((drift() - 0.45) * 12).toFixed(2);
  const lastActivity = Date.now() - Math.floor(rand() * 6 * 3600 * 1000);

  // Recent events attributed to this address against its positions.
  const recentEvents: WalletBalance["recentEvents"] = positions
    .map((pos, i) => ({
      id: `${address}-${pos.slug}-${tick}-${i}`,
      protocol: pos.protocol,
      slug: pos.slug,
      chain: pos.chain,
      type: EVENT_TYPES[Math.floor(rand() * EVENT_TYPES.length)],
      amountUSD: Math.round(pos.valueUSD * (0.05 + rand() * 0.4)),
      address,
      timestamp: Date.now() - Math.floor(rand() * 12 * 3600 * 1000),
    }))
    .sort((a, b) => b.timestamp - a.timestamp);

  return { address, totalUSD, change24h, positions, lastActivity, recentEvents };
}
