import { http, type Chain } from 'viem';
import type { Account } from 'viem/accounts';
import { createShieldedWalletClient, getShieldedContract } from 'seismic-viem';

import { SRC20Abi } from './abi';
import DeployOut from '../../../contracts/out/deploy.json';

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
