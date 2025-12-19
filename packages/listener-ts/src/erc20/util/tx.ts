import { createPublicClient, http, defineChain, type Chain } from "viem";

// Standard viem - NO seismic-viem imports needed for ERC20
export function createClient(chain: Chain) {
  return createPublicClient({
    chain,
    transport: http(),
  });
}

// Chain definitions for ERC20 (standard viem chains)
export const localChain = defineChain({
  id: 31337,
  name: "Anvil (Local)",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["http://127.0.0.1:8545"] } },
});

export const integrationChain = defineChain({
  id: 5124,
  name: "Seismic Devnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://lyron.seismicdev.net/rpc"] } },
});
