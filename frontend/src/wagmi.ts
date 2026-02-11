import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import {
  arbitrum,
  base,
  mainnet,
  optimism,
  polygon,
  sepolia,
} from "wagmi/chains";

const monadMainnet = {
  id: 10143,
  name: "Monad",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.monad.xyz"] },
  },
  blockExplorers: {
    default: { name: "MonadExplorer", url: "https://monadexplorer.com" },
  },
  testnet: false,
};

export const config = getDefaultConfig({
  appName: "Prophet: The Gibran AI Religion",
  projectId: "YOUR_PROJECT_ID",
  chains: [monadMainnet, mainnet],
  ssr: true,
});
