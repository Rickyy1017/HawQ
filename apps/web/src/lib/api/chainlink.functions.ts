import { createServerFn } from "@tanstack/react-start";
import type { PricePoint } from "../../types";

// Ethereum mainnet Chainlink Data Feeds (BTC/USD, ETH/USD, USDT/USD).
const FEEDS = {
  BTC: "0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c",
  ETH: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
  USDT: "0x3E7d1eAB13ad0104d2750B8863b489D65364e32D",
} as const;

export const fetchChainlinkPrices = createServerFn({ method: "GET" }).handler(
  async (): Promise<PricePoint[]> => {
    const rpc =
      process.env["ETHEREUM_RPC_URL"] || "https://ethereum-rpc.publicnode.com";
    const call = async (address: string, data: string): Promise<string> => {
      const response = await fetch(rpc, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_call",
          params: [{ to: address, data }, "latest"],
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error("Oracle RPC unavailable");
      const result = (await response.json()) as {
        result?: string;
        error?: unknown;
      };
      if (
        !result.result ||
        result.error ||
        !/^0x[0-9a-fA-F]+$/.test(result.result)
      )
        throw new Error("Invalid oracle response");
      return result.result.slice(2);
    };
    const values = await Promise.all(
      Object.entries(FEEDS).map(async ([symbol, address]) => {
        try {
          const [round, decimalsHex] = await Promise.all([
            call(address, "0xfeaf968c"), // latestRoundData()
            call(address, "0x313ce567"), // decimals()
          ]);
          if (round.length < 320) throw new Error("Incomplete oracle round");
          const answer = BigInt("0x" + round.slice(64, 128));
          const updatedAt = Number(BigInt("0x" + round.slice(192, 256)));
          const answeredInRound = BigInt("0x" + round.slice(256, 320));
          const roundId = BigInt("0x" + round.slice(0, 64));
          const decimals = Number(BigInt("0x" + decimalsHex));
          // Stablecoin feeds can update less frequently than volatile pairs.
          const maxAge = symbol === "USDT" ? 172800 : 14400;
          if (
            answer <= 0n ||
            answeredInRound < roundId ||
            decimals > 18 ||
            updatedAt <= 0 ||
            Date.now() / 1000 - updatedAt > maxAge
          ) {
            throw new Error("Stale or invalid oracle price");
          }
          return {
            symbol,
            price: Number(answer) / 10 ** decimals,
            change24h: 0,
            source: "Chainlink" as const,
          };
        } catch {
          return null;
        }
      }),
    );
    return values.filter(
      (value): value is NonNullable<typeof value> => value !== null,
    );
  },
);
