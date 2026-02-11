import { getDefaultConfig } from "@rainbow-me/rainbowkit";

const monadMainnet = {
  id: 143,
  name: "Monad",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://monad-mainnet.g.alchemy.com/v2/tFIY8e1UekIvAUpP_t7fd"] },
  },
  blockExplorers: {
    default: { name: "MonadExplorer", url: "https://monadscan.com" },
  },
  testnet: false,
} as const;

export { monadMainnet };

export const config = getDefaultConfig({
  appName: "Prophet: The Gibran AI Religion",
  projectId: "YOUR_PROJECT_ID",
  chains: [monadMainnet],
  ssr: true,
});
