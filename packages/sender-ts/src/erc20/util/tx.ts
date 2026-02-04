import {
  createWalletClient,
  createPublicClient,
  http,
  getContract,
  defineChain,
  type Chain,
  type PublicClient,
} from "viem";
import type { Account } from "viem/accounts";
import { seismicTestnetGcp1 } from "seismic-viem";

// Standard viem imports - NO seismic-viem needed for ERC20
import { ERC20Abi } from "./abi";
import DeployOut from "../../../../contracts/out/deploy.json";
import { logger } from "./logger";

// Chain definitions for ERC20 (standard viem chains)
export const localChain = defineChain({
  id: 31337,
  name: "Anvil (Local)",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["http://127.0.0.1:8545"] } },
});

export const integrationChain = seismicTestnetGcp1;

// Type for the interface returned by createInterface
export type ERC20Interface = ReturnType<typeof createInterface>;

export function createInterface(chain: Chain, account: Account) {
  // Standard viem: createWalletClient (NOT createShieldedWalletClient)
  const walletClient = createWalletClient({
    chain,
    account,
    transport: http(),
  });

  // Standard viem: createPublicClient for reading
  const publicClient = createPublicClient({
    chain,
    transport: http(),
  });

  // Standard viem: getContract (NOT getShieldedContract)
  // No automatic encryption - amounts are sent in PLAINTEXT
  const contract = getContract({
    abi: ERC20Abi,
    address: DeployOut.MockERC20 as `0x${string}`,
    client: { wallet: walletClient, public: publicClient },
  });

  return { walletClient, publicClient, contract };
}

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs),
    ),
  ]);
}

export async function waitForTx(
  txPromise: Promise<`0x${string}`>,
  publicClient: PublicClient,
) {
  const TX_HASH_TIMEOUT = 60000;
  const RECEIPT_TIMEOUT = 300000;
  const MAX_ATTEMPTS = 2;
  const RETRY_DELAY = 5000;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const hash = await withTimeout(
        txPromise,
        TX_HASH_TIMEOUT,
        `Transaction hash timeout after ${TX_HASH_TIMEOUT}ms`,
      );

      const receipt = await withTimeout(
        publicClient.waitForTransactionReceipt({
          hash,
          timeout: RECEIPT_TIMEOUT,
        }),
        RECEIPT_TIMEOUT + 10000,
        `Transaction receipt timeout after ${RECEIPT_TIMEOUT}ms for hash ${hash}`,
      );

      return receipt;
    } catch (error) {
      if (attempt === MAX_ATTEMPTS) {
        logger.error(`Error after ${MAX_ATTEMPTS} attempts:`, error);
        throw error;
      }
      logger.error(
        `Attempt ${attempt} failed, retrying in ${RETRY_DELAY}ms:`,
        error,
      );
      await sleep(RETRY_DELAY);
    }
  }
}

export async function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
