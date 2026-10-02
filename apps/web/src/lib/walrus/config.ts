// Public Walrus testnet endpoints — no API key required for storing/reading blobs.
// These are the official Mysten Labs operated testnet publisher/aggregator nodes.
export const WALRUS_PUBLISHER =
  "https://publisher.walrus-testnet.walrus.space";
export const WALRUS_AGGREGATOR =
  "https://aggregator.walrus-testnet.walrus.space";

// Number of epochs the blob should be stored for on Walrus.
export const WALRUS_EPOCHS = 5;

// Tatum Sui RPC gateway (mainnet). Used to anchor the blob hash on-chain by
// reading the latest verifiable checkpoint so each artifact references a real
// Sui chain state at publish time.
export const TATUM_SUI_RPC = "https://sui-mainnet.gateway.tatum.io";

export type WalrusArtifactKind =
  | "signal"
  | "wallet-report"
  | "whale-report"
  | "token-report";

export type WalrusArtifact = {
  blobId: string;
  kind: WalrusArtifactKind;
  subject: string;
  summary: string;
  sha256: string;
  suiTxDigest: string | null;
  suiCheckpoint: string | null;
  anchored: boolean;
  storedAt: number;
};
