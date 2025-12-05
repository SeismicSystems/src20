import { createSeismicDevnet, type ShieldedWalletClient } from 'seismic-viem';

import { http, type Chain } from 'viem';
import type { Account } from 'viem/accounts';
import { createShieldedWalletClient, getShieldedContract } from 'seismic-viem';

import { SRC20Abi } from './abi';
import DeployOut from '../../../contracts/out/deploy.json';

export const integrationChain = createSeismicDevnet(
  { nodeHost: "lyron.seismicdev.net" }
)

export async function createInterface(chain: Chain, account: Account) {
  const client = await createShieldedWalletClient({
    chain,
    account,
    transport: http(),
  });
  const contract = getShieldedContract({
    abi: SRC20Abi,
    address: DeployOut.MockSRC20 as `0x${string}`,
    client,
  });
  return { client, contract };
}

export async function waitForTx(txPromise: Promise<`0x${string}`>, client: ShieldedWalletClient) {
  try {
    const hash = await txPromise;
    return await client.waitForTransactionReceipt({ hash });
  } catch (error) {
    console.error('Error while waiting for transaction receipt:', error);
    throw error;
  }
}

export async function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
