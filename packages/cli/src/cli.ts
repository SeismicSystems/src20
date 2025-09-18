import { http, type AbiEvent, type Chain } from 'viem';
import type { Account } from 'viem/accounts';
import {
  createShieldedWalletClient,
  getShieldedContract,
  type ShieldedWalletClient,
} from 'seismic-viem';

import { SRC20Abi } from './util/abi';
import DeployOut from '../../contracts/out/deploy.json';

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

export async function attachTransferListener(
  client: ShieldedWalletClient
) {
  const transferEvent = SRC20Abi.find(
    (item: any) => item.type === 'event' && item.name === 'Transfer'
  ) as AbiEvent;
  
  client.watchEvent({
    address: DeployOut.MockSRC20 as `0x${string}`,
    events: [transferEvent],
    onLogs: (logs: any[]) => {
      logs.forEach(async (log) => {
        console.log(log);
      })
    }
  })
}
