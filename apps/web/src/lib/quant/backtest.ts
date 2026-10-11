import type { QuantCandle, QuantFundingRate } from "../api/hawq";

export type StrategyId = "ema" | "rsi";
export type PositionSide = "Long" | "Short";

export type QuantTrade = {
  entryTime: number;
  exitTime: number;
  entryPrice: number;
  exitPrice: number;
  side: PositionSide;
  pnlUsd: number;
  returnPct: number;
  feesUsd: number;
  fundingUsd: number;
};

export type EquityPoint = {
  time: number;
  strategy: number;
  buyAndHold: number;
  drawdown: number;
};

export type BacktestResult = {
  trades: QuantTrade[];
  equity: EquityPoint[];
  currentSignal: -1 | 0 | 1;
  finalEquity: number;
  buyAndHoldEquity: number;
  totalReturnPct: number;
  cagrPct: number;
  maxDrawdownPct: number;
  volatilityPct: number;
  sharpeRatio: number;
  sortinoRatio: number;
  winRatePct: number;
  profitFactor: number | null;
  expectancyUsd: number;
  exposurePct: number;
  totalFeesUsd: number;
  totalFundingUsd: number;
};

export type BacktestOptions = {
  strategy: StrategyId;
  fastPeriod: number;
  slowPeriod: number;
  rsiPeriod: number;
  rsiLower: number;
  rsiUpper: number;
  initialCapital: number;
  feeBps: number;
  slippageBps: number;
  barsPerYear: number;
  intervalMs: number;
  evaluationStartIndex?: number;
};

function ema(values: number[], period: number): number[] {
  const alpha = 2 / (period + 1);
  const result = new Array<number>(values.length);
  result[0] = values[0] ?? 0;
  for (let i = 1; i < values.length; i += 1) {
    result[i] = values[i]! * alpha + result[i - 1]! * (1 - alpha);
  }
  return result;
}

function rsi(values: number[], period: number): number[] {
  const result = new Array<number>(values.length).fill(50);
  if (values.length <= period) return result;
  let averageGain = 0;
  let averageLoss = 0;
  for (let i = 1; i <= period; i += 1) {
    const delta = values[i]! - values[i - 1]!;
    averageGain += Math.max(delta, 0) / period;
    averageLoss += Math.max(-delta, 0) / period;
  }
  result[period] = averageLoss === 0 ? 100 : 100 - 100 / (1 + averageGain / averageLoss);
  for (let i = period + 1; i < values.length; i += 1) {
    const delta = values[i]! - values[i - 1]!;
    averageGain = (averageGain * (period - 1) + Math.max(delta, 0)) / period;
    averageLoss = (averageLoss * (period - 1) + Math.max(-delta, 0)) / period;
    result[i] = averageLoss === 0 ? 100 : 100 - 100 / (1 + averageGain / averageLoss);
  }
  return result;
}

function makeSignals(candles: QuantCandle[], options: BacktestOptions): Array<-1 | 0 | 1> {
  const closes = candles.map((bar) => bar.close);
  if (options.strategy === "ema") {
    const fast = ema(closes, options.fastPeriod);
    const slow = ema(closes, options.slowPeriod);
    return closes.map((_, i) => i < options.slowPeriod ? 0 : fast[i]! > slow[i]! ? 1 : -1);
  }

  const values = rsi(closes, options.rsiPeriod);
  let state: -1 | 0 | 1 = 0;
  return values.map((value, i) => {
    if (i < options.rsiPeriod) return 0;
    if (state === 0 && value <= options.rsiLower) state = 1;
    else if (state === 0 && value >= options.rsiUpper) state = -1;
    else if ((state === 1 && value >= 50) || (state === -1 && value <= 50)) state = 0;
    return state;
  });
}

export function runBacktest(
  candles: QuantCandle[],
  fundingRates: QuantFundingRate[],
  options: BacktestOptions,
): BacktestResult | null {
  const { initialCapital, feeBps, slippageBps, barsPerYear, intervalMs } = options;
  const warmup = options.strategy === "ema" ? options.slowPeriod : options.rsiPeriod;
  const startIndex = Math.max(warmup, options.evaluationStartIndex ?? 0);
  if (
    candles.length < warmup + 3 ||
    !Number.isInteger(warmup) ||
    !Number.isFinite(initialCapital) || initialCapital <= 0 ||
    !Number.isFinite(feeBps) || feeBps < 0 ||
    !Number.isFinite(slippageBps) || slippageBps < 0 ||
    !Number.isFinite(barsPerYear) || barsPerYear <= 0 ||
    !Number.isFinite(intervalMs) || intervalMs <= 0 ||
    candles.some((bar) => ![bar.open, bar.high, bar.low, bar.close].every((value) => Number.isFinite(value) && value > 0))
  ) return null;

  const signals = makeSignals(candles, options);
  const feeRate = feeBps / 10_000;
  const slippageRate = slippageBps / 10_000;
  const benchmarkEntry = candles[startIndex]!.open * (1 + slippageRate);
  const benchmarkQuantity = initialCapital / (benchmarkEntry * (1 + feeRate));
  const trades: QuantTrade[] = [];
  const equity: EquityPoint[] = [];
  let cash = initialCapital;
  let direction: -1 | 0 | 1 = 0;
  let quantity = 0;
  let entryPrice = 0;
  let entryTime = 0;
  let entryCapital = initialCapital;
  let tradeFees = 0;
  let tradeFunding = 0;
  let totalFeesUsd = 0;
  let totalFundingUsd = 0;
  let fundingIndex = 0;
  let benchmarkFundingIndex = 0;
  let benchmarkFundingCost = 0;
  let exposureBars = 0;
  let peak = initialCapital;
  let maxDrawdown = 0;

  const closePosition = (time: number, rawPrice: number) => {
    if (direction === 0) return;
    const exitPrice = rawPrice * (1 - direction * slippageRate);
    const pnlBeforeExitFee = direction * quantity * (exitPrice - entryPrice);
    const exitFee = Math.abs(quantity * exitPrice) * feeRate;
    cash += pnlBeforeExitFee - exitFee;
    tradeFees += exitFee;
    totalFeesUsd += exitFee;
    const pnlUsd = cash - entryCapital;
    trades.push({
      entryTime, exitTime: time, entryPrice, exitPrice,
      side: direction === 1 ? "Long" : "Short",
      pnlUsd,
      returnPct: (pnlUsd / entryCapital) * 100,
      feesUsd: tradeFees,
      fundingUsd: tradeFunding,
    });
    direction = 0;
    quantity = 0;
    tradeFees = 0;
    tradeFunding = 0;
  };

  for (let i = startIndex; i < candles.length; i += 1) {
    const bar = candles[i]!;
    while (benchmarkFundingIndex < fundingRates.length && fundingRates[benchmarkFundingIndex]!.time <= bar.time) {
      const event = fundingRates[benchmarkFundingIndex]!;
      if (event.time > candles[startIndex]!.time) benchmarkFundingCost += benchmarkQuantity * bar.open * event.rate;
      benchmarkFundingIndex += 1;
    }
    if (i > 0) {
      const previousOpenTime = candles[i - 1]!.time;
      while (fundingIndex < fundingRates.length && fundingRates[fundingIndex]!.time <= bar.time) {
        const event = fundingRates[fundingIndex]!;
        if (direction !== 0 && event.time > previousOpenTime) {
          const charge = direction * quantity * bar.open * event.rate;
          cash -= charge;
          tradeFunding += charge;
          totalFundingUsd += charge;
        }
        fundingIndex += 1;
      }
    }

    const desired = i > 0 ? signals[i - 1]! : 0;
    if (desired !== direction) {
      if (direction !== 0) closePosition(bar.time, bar.open);
      if (desired !== 0 && cash > 0) {
        direction = desired;
        entryPrice = bar.open * (1 + direction * slippageRate);
        entryTime = bar.time;
        entryCapital = cash;
        quantity = cash / entryPrice;
        const entryFee = Math.abs(quantity * entryPrice) * feeRate;
        cash -= entryFee;
        tradeFees = entryFee;
      }
    }

    if (i === candles.length - 1) {
      const finalTime = bar.time + intervalMs;
      while (benchmarkFundingIndex < fundingRates.length && fundingRates[benchmarkFundingIndex]!.time <= finalTime) {
        const event = fundingRates[benchmarkFundingIndex]!;
        if (event.time > bar.time) benchmarkFundingCost += benchmarkQuantity * bar.close * event.rate;
        benchmarkFundingIndex += 1;
      }
      while (fundingIndex < fundingRates.length && fundingRates[fundingIndex]!.time <= finalTime) {
        const event = fundingRates[fundingIndex]!;
        if (direction !== 0 && event.time > bar.time) {
          const charge = direction * quantity * bar.close * event.rate;
          cash -= charge;
          tradeFunding += charge;
          totalFundingUsd += charge;
        }
        fundingIndex += 1;
      }
    }

    if (direction !== 0) exposureBars += 1;
    const markedEquity = cash + direction * quantity * (bar.close - entryPrice);
    peak = Math.max(peak, markedEquity);
    maxDrawdown = Math.max(maxDrawdown, peak > 0 ? (peak - markedEquity) / peak : 0);
    equity.push({
      time: bar.time,
      strategy: markedEquity,
      buyAndHold: benchmarkQuantity * bar.close * (1 - slippageRate) * (1 - feeRate) - benchmarkFundingCost,
      drawdown: peak > 0 ? -((peak - markedEquity) / peak) * 100 : 0,
    });

    if (i === candles.length - 1 && direction !== 0) {
      closePosition(bar.time + intervalMs, bar.close);
      const finalDrawdown = peak > 0 ? (peak - cash) / peak : 0;
      maxDrawdown = Math.max(maxDrawdown, finalDrawdown);
      equity[equity.length - 1] = {
        ...equity[equity.length - 1]!,
        strategy: cash,
        drawdown: -finalDrawdown * 100,
      };
    }
  }

  const returns = equity.slice(1).map((point, i) => point.strategy / Math.max(equity[i]!.strategy, 1e-12) - 1);
  const mean = returns.length ? returns.reduce((sum, value) => sum + value, 0) / returns.length : 0;
  const variance = returns.length ? returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / returns.length : 0;
  const deviation = Math.sqrt(variance);
  const downsideDeviation = Math.sqrt(returns.reduce((sum, value) => sum + Math.min(value, 0) ** 2, 0) / Math.max(returns.length, 1));
  const finalEquity = equity.at(-1)?.strategy ?? initialCapital;
  const elapsedYears = Math.max((candles.at(-1)!.time - candles[startIndex]!.time) / (365.25 * 24 * 60 * 60_000), 1 / 365.25);
  const grossWins = trades.filter((trade) => trade.pnlUsd > 0).reduce((sum, trade) => sum + trade.pnlUsd, 0);
  const grossLosses = Math.abs(trades.filter((trade) => trade.pnlUsd < 0).reduce((sum, trade) => sum + trade.pnlUsd, 0));
  const wins = trades.filter((trade) => trade.pnlUsd > 0).length;

  return {
    trades,
    equity,
    currentSignal: signals.at(-1) ?? 0,
    finalEquity,
    buyAndHoldEquity: equity.at(-1)?.buyAndHold ?? initialCapital,
    totalReturnPct: (finalEquity / initialCapital - 1) * 100,
    cagrPct: (Math.pow(Math.max(finalEquity / initialCapital, 1e-12), 1 / elapsedYears) - 1) * 100,
    maxDrawdownPct: maxDrawdown * 100,
    volatilityPct: deviation * Math.sqrt(barsPerYear) * 100,
    sharpeRatio: deviation > 0 ? (mean / deviation) * Math.sqrt(barsPerYear) : 0,
    sortinoRatio: downsideDeviation > 0 ? (mean / downsideDeviation) * Math.sqrt(barsPerYear) : 0,
    winRatePct: trades.length ? (wins / trades.length) * 100 : 0,
    profitFactor: grossLosses > 0 ? grossWins / grossLosses : grossWins > 0 ? null : 0,
    expectancyUsd: trades.length ? trades.reduce((sum, trade) => sum + trade.pnlUsd, 0) / trades.length : 0,
    exposurePct: (exposureBars / (candles.length - startIndex)) * 100,
    totalFeesUsd,
    totalFundingUsd,
  };
}
