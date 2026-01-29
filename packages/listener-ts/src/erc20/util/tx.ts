import { createPublicClient, http, type Chain } from "viem";
import { seismicTestnetGcp2 } from "seismic-viem";

export function createClient(chain: Chain) {
  return createPublicClient({
    chain,
    transport: http(),
  });
}

export const integrationChain = seismicTestnetGcp2;
