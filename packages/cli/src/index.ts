import { privateKeyToAccount } from 'viem/accounts';
import { sanvil, seismicDevnet1 } from 'seismic-viem';

import { attachTransferListener, createInterface } from './cli';
import { requireEnv } from './util/config';
import { waitForTx } from './util/tx';

async function main() {
  const privKey = requireEnv('ALICE_PRIVATE_KEY');
  const aesKey = requireEnv('INTELLIGENCE_AES_KEY');
  const mode = requireEnv('MODE');

  const chain = mode === 'local' ? sanvil : seismicDevnet1;
  const account = privateKeyToAccount(privKey as `0x${string}`);
  const aesKeyBuffer = Buffer.from(aesKey.slice(2), 'hex');

  const { client, contract } = await createInterface(chain, account);
  attachTransferListener(client, aesKeyBuffer);

  contract.write.transfer([client.account.address, 1e18]);
}

main();
