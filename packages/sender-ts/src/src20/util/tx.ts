import {
  createSeismicDevnet,
  type ShieldedWalletClient,
} from "seismic-viem";

import { http, type Chain } from "viem";
import type { Account } from "viem/accounts";
import { createShieldedWalletClient, getShieldedContract } from "seismic-viem";

import { SRC20Abi } from "./abi";
import DeployOut from "../../../../contracts/out/deploy.json";
import { logger } from "./logger";

export const integrationChain = createSeismicDevnet({
  nodeHost: "lyron.seismicdev.net",
});

// Type for the interface returned by createInterface (inferred from function)
export type SRC20Interface = Awaited<ReturnType<typeof createInterface>>;

export async function createInterface(chain: Chain, account: Account) {
  // seismic-viem: createShieldedWalletClient for encrypted transactions
  const client = await createShieldedWalletClient({
    chain,
    account,
    transport: http(),
  });
  // seismic-viem: getShieldedContract for automatic encryption of suint256 params
  const contract = getShieldedContract({
    abi: SRC20Abi,
    address: DeployOut.MockSRC20 as `0x${string}`,
    client,
  });
  return { client, contract };
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
  client: ShieldedWalletClient,
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
        client.waitForTransactionReceipt({
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
