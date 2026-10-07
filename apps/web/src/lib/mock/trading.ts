// Mock trading + prediction data. Replace with live APIs later.
export type PerpMarket = {
  symbol: string;
  markPrice: number;
  fundingRate: number; // % per 8h
  openInterest: number; // USD
  volume24h: number; // USD
};

export const PERP_MARKETS: PerpMarket[] = [
  {
    symbol: "BTC-PERP",
    markPrice: 67842.5,
    fundingRate: 0.0102,
    openInterest: 18_420_000_000,
    volume24h: 32_150_000_000,
  },
  {
    symbol: "ETH-PERP",
    markPrice: 3521.18,
    fundingRate: 0.0087,
    openInterest: 9_870_000_000,
    volume24h: 14_620_000_000,
  },
  {
    symbol: "SOL-PERP",
    markPrice: 168.42,
    fundingRate: 0.0154,
    openInterest: 2_310_000_000,
    volume24h: 4_980_000_000,
  },
  {
    symbol: "BNB-PERP",
    markPrice: 592.7,
    fundingRate: 0.0061,
    openInterest: 812_000_000,
    volume24h: 1_240_000_000,
  },
  {
    symbol: "XRP-PERP",
    markPrice: 0.5871,
    fundingRate: -0.0032,
    openInterest: 945_000_000,
    volume24h: 1_870_000_000,
  },
  {
    symbol: "DOGE-PERP",
    markPrice: 0.1342,
    fundingRate: 0.0198,
    openInterest: 1_120_000_000,
    volume24h: 2_340_000_000,
  },
  {
    symbol: "AVAX-PERP",
    markPrice: 34.18,
    fundingRate: -0.0045,
    openInterest: 384_000_000,
    volume24h: 612_000_000,
  },
  {
    symbol: "ARB-PERP",
    markPrice: 0.9124,
    fundingRate: 0.0073,
    openInterest: 241_000_000,
    volume24h: 398_000_000,
  },
];

export type PredictionCategory = "sports" | "politics" | "finance";
export type PredictionMarket = {
  id: string;
  question: string;
  category: PredictionCategory;
  yes: number; // 0-100
  volume: number;
};

export const PREDICTION_MARKETS: PredictionMarket[] = [
  {
    id: "btc-100k",
    question: "Will BTC close above $100k by Dec 31, 2026?",
    category: "finance",
    yes: 42,
    volume: 8_420_000,
  },
  {
    id: "fed-cut",
    question: "Will the Fed cut rates at the next FOMC meeting?",
    category: "finance",
    yes: 63,
    volume: 5_210_000,
  },
  {
    id: "eth-etf-flows",
    question: "Will ETH ETFs see net inflows this month?",
    category: "finance",
    yes: 57,
    volume: 1_930_000,
  },
  {
    id: "us-midterms",
    question: "Will Democrats win the House in the 2026 midterms?",
    category: "politics",
    yes: 54,
    volume: 12_700_000,
  },
  {
    id: "uk-election",
    question: "Will the UK hold a general election before 2027?",
    category: "politics",
    yes: 18,
    volume: 2_150_000,
  },
  {
    id: "ucl-final",
    question: "Will Real Madrid reach the Champions League final?",
    category: "sports",
    yes: 37,
    volume: 3_480_000,
  },
  {
    id: "nba-champ",
    question: "Will the Celtics win the 2027 NBA Championship?",
    category: "sports",
    yes: 22,
    volume: 4_060_000,
  },
  {
    id: "wc-qual",
    question: "Will Nigeria qualify for the next World Cup?",
    category: "sports",
    yes: 48,
    volume: 960_000,
  },
];

export type Position = {
  id: string;
  product: string;
  venue: "Spot" | "Perps" | "Predict";
  side: string;
  size: number;
  entryPrice: number;
  status: "Open" | "Filled" | "Closed";
  createdAt: number;
};

export const SEED_POSITIONS: Position[] = [
  {
    id: "s1",
    product: "ETH/USDC",
    venue: "Spot",
    side: "Buy",
    size: 2500,
    entryPrice: 3488.2,
    status: "Filled",
    createdAt: Date.now() - 86_400_000 * 2,
  },
  {
    id: "s2",
    product: "SOL/USDC",
    venue: "Spot",
    side: "Sell",
    size: 800,
    entryPrice: 171.05,
    status: "Closed",
    createdAt: Date.now() - 86_400_000 * 5,
  },
  {
    id: "p1",
    product: "BTC-PERP",
    venue: "Perps",
    side: "Long",
    size: 5000,
    entryPrice: 66910,
    status: "Open",
    createdAt: Date.now() - 3_600_000 * 6,
  },
  {
    id: "p2",
    product: "ETH-PERP",
    venue: "Perps",
    side: "Short",
    size: 1500,
    entryPrice: 3560.4,
    status: "Closed",
    createdAt: Date.now() - 86_400_000,
  },
  {
    id: "m1",
    product: "Will the Fed cut rates at the next FOMC meeting?",
    venue: "Predict",
    side: "YES",
    size: 200,
    entryPrice: 0.61,
    status: "Open",
    createdAt: Date.now() - 3_600_000 * 20,
  },
  {
    id: "m2",
    product: "Will Real Madrid reach the Champions League final?",
    venue: "Predict",
    side: "NO",
    size: 120,
    entryPrice: 0.65,
    status: "Open",
    createdAt: Date.now() - 86_400_000 * 3,
  },
];
