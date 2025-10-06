import { type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sanvil, seismicDevnet1 } from 'seismic-viem';

import { attachEventListener, createInterface } from './cli';
import { requireEnv } from './util/config';
import { waitForTx } from './util/tx';

async function main() {
  const privKey = requireEnv('ALICE_PRIVATE_KEY') as Hex;
  const aesKey = requireEnv('INTELLIGENCE_AES_KEY') as Hex;
  const mode = requireEnv('MODE');

  const chain = mode === 'local' ? sanvil : seismicDevnet1;
  const account = privateKeyToAccount(privKey);

  const { client, contract } = await createInterface(chain, account);
  attachEventListener(client, aesKey);

  const selfAddr = client.account.address;
  await waitForTx(contract.write.transfer([selfAddr, 1e18]), client);
  await waitForTx(contract.write.approve([selfAddr, 123]), client);
  await waitForTx(contract.write.transfer([selfAddr, 8943784378943]), client);
}

main();
