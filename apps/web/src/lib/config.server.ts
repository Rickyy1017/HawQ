import process from "node:process";

export function getServerConfig() {
  return {
    nodeEnv: process.env.NODE_ENV,
  };
}

export function getTatumConfig() {
  const apiKey = process.env.TATUM_API_KEY;
  if (!apiKey) throw new Error("TATUM_API_KEY is not set in environment");
  return {
    apiKey,
    suiRpcUrl: "https://sui-mainnet.tatum.io",
    suiTestnetRpcUrl: "https://sui-testnet.tatum.io",
  };
}

export function getWalrusConfig() {
  return {
    publisherUrl: process.env.WALRUS_PUBLISHER_URL ?? "https://publisher.walrus-testnet.walrus.space",
    aggregatorUrl: process.env.WALRUS_AGGREGATOR_URL ?? "https://aggregator.walrus-testnet.walrus.space",
    defaultEpochs: 5,
  };
}
