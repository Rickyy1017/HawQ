import { safeFetch } from "../http";
import type { PredictionMarket, PredictionCategory } from "@hawq/types";

/**
 * Polymarket's Gamma API is public (no key required for reads). This
 * adapter only reads market discovery/pricing data — HawQ never places a
 * real order against Polymarket; predictions are demo/simulated-only (see
 * SimulatedPositionSchema). Verify current endpoint shape against
 * https://docs.polymarket.com before relying on this in production.
 */
const GAMMA_URL = "https://gamma-api.polymarket.com/markets";

type GammaMarket = {
  conditionId: string;
  question: string;
  category?: string;
  endDate?: string;
  volume?: string;
  liquidity?: string;
  outcomePrices?: string; // JSON-encoded string array, e.g. "[\"0.62\",\"0.38\"]"
  tags?: string[];
};

const SPORTS_KEYWORDS = ["nfl", "nba", "soccer", "football", "match", "vs.", "championship", "boxing", "ufc"];
const POLITICS_KEYWORDS = ["election", "president", "senate", "vote", "minister", "government", "party"];
const NIGERIA_KEYWORDS = ["nigeria", "naija", "tinubu", "lagos", "abuja", "buhari", "cbn", "naira"];

function classify(question: string, tags: string[] = []): PredictionCategory {
  const text = `${question} ${tags.join(" ")}`.toLowerCase();
  if (SPORTS_KEYWORDS.some((k) => text.includes(k))) return "sports";
  if (POLITICS_KEYWORDS.some((k) => text.includes(k))) return "politics";
  if (/\b(fed|rate|inflation|gdp|stock|crypto price|btc|eth)\b/.test(text)) return "finance";
  return "other";
}

function regionTag(question: string, tags: string[] = []): string | null {
  const text = `${question} ${tags.join(" ")}`.toLowerCase();
  return NIGERIA_KEYWORDS.some((k) => text.includes(k)) ? "nigeria" : null;
}

export async function fetchPolymarketMarkets(limit = 200): Promise<PredictionMarket[]> {
  const raw = await safeFetch<GammaMarket[]>(
    `${GAMMA_URL}?active=true&closed=false&limit=${limit}&order=volume&ascending=false`,
  );

  return raw
    .map((m): PredictionMarket | null => {
      let yes = 0.5;
      let no = 0.5;
      try {
        const prices = JSON.parse(m.outcomePrices ?? "[]") as string[];
        if (prices.length >= 2) {
          yes = Number(prices[0]);
          no = Number(prices[1]);
        }
      } catch {
        // leave defaults if the field is missing/malformed
      }

      if (!m.conditionId || !m.question) return null;

      return {
        id: m.conditionId,
        venue: "polymarket" as const,
        question: m.question,
        category: classify(m.question, m.tags),
        regionTag: regionTag(m.question, m.tags),
        endDate: m.endDate ? new Date(m.endDate).getTime() : null,
        yesPrice: yes,
        noPrice: no,
        volume: Number(m.volume ?? 0),
        liquidity: Number(m.liquidity ?? 0),
      };
    })
    .filter((m): m is PredictionMarket => m !== null);
}
