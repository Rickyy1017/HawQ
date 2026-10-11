import { ExchangeClient, InfoClient, HttpTransport } from "@nktkas/hyperliquid";
import type { AbstractWallet } from "@nktkas/hyperliquid/signing";
import type { WalletClient } from "viem";

// Hyperliquid TESTNET only. Non-custodial: every order is signed in the
// user's own wallet (MetaMask etc.) -- HawQ never holds keys or funds.

interface AssetMeta {
  index: number;
  szDecimals: number;
}

let assetMetaCache: Map<string, AssetMeta> | null = null;

export function getInfoClient() {
  return new InfoClient({ transport: new HttpTransport({ isTestnet: true }) });
}

export function getExchangeClient(wallet: WalletClient) {
  return new ExchangeClient({
    transport: new HttpTransport({ isTestnet: true }),
    // The wallet is created with an explicit account in WalletProvider; the
    // SDK's narrower viem signer interface doesn't preserve that generic type.
    wallet: wallet as unknown as AbstractWallet,
    // Hyperliquid EIP-712 signatures use Arbitrum's chain ID on both networks.
    signatureChainId: "0xa4b1",
  });
}

async function loadAssetMeta(): Promise<Map<string, AssetMeta>> {
  if (!assetMetaCache) {
    const meta = await getInfoClient().meta();
    assetMetaCache = new Map(
      meta.universe.map(
        (a: { name: string; szDecimals: number }, i: number) => [
          a.name,
          { index: i, szDecimals: a.szDecimals },
        ],
      ),
    );
  }
  return assetMetaCache;
}

export async function getAssetMeta(coin: string): Promise<AssetMeta> {
  const map = await loadAssetMeta();
  const found = map.get(coin);
  if (!found) {
    throw new Error(`Unknown Hyperliquid asset: ${coin}`);
  }
  return found;
}

export function clearAssetMetaCache() {
  assetMetaCache = null;
}

function roundPrice(price: number, szDecimals: number): string {
  const maxDecimals = Math.max(0, 6 - szDecimals);
  const sig = Number(price.toPrecision(5));
  return sig.toFixed(maxDecimals);
}

function roundSize(size: number, szDecimals: number): string {
  return size.toFixed(szDecimals);
}

interface PlaceMarketOrderArgs {
  wallet: WalletClient;
  coin: string;
  isBuy: boolean;
  usdSize: number;
  markPrice: number;
  slippage?: number;
}

export async function placeMarketOrder({
  wallet,
  coin,
  isBuy,
  usdSize,
  markPrice,
  slippage = 0.05,
}: PlaceMarketOrderArgs) {
  const { index, szDecimals } = await getAssetMeta(coin);
  const exchange = getExchangeClient(wallet);

  const rawSize = usdSize / markPrice;
  const size = roundSize(rawSize, szDecimals);
  const limitPrice = isBuy
    ? markPrice * (1 + slippage)
    : markPrice * (1 - slippage);
  const price = roundPrice(limitPrice, szDecimals);

  return exchange.order({
    orders: [
      {
        a: index,
        b: isBuy,
        p: price,
        s: size,
        r: false,
        t: { limit: { tif: "Ioc" } },
      },
    ],
    grouping: "na",
  });
}
