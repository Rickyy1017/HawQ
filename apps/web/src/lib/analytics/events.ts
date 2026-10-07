export const trackEvent = (
  name: string,
  properties?: Record<string, unknown>,
) => {
  console.log("[Analytics]", name, properties);
};

export const EVENTS = {
  PAGE_VIEW: "page_view",
  WALLET_CONNECTED: "wallet_connected",
} as const;

export {
  EVENT_META,
  EVENT_TYPES,
  computeWalletBalance,
  generateProtocolEvents,
  isValidAddress,
  pseudoAddress,
} from "./evens";
