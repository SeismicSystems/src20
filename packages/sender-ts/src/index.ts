import { type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sanvil } from 'seismic-viem';

import { requireEnv } from './util/config';
import { createInterface, waitForTx, sleep, integrationChain } from './util/tx';

async function main() {
  const privKeys = {
    alice: requireEnv('ALICE_PRIVATE_KEY') as Hex,
    bob: requireEnv('BOB_PRIVATE_KEY') as Hex,
    charlie: requireEnv('CHARLIE_PRIVATE_KEY') as Hex,
  };
  const mode = requireEnv('MODE');

  const chain = mode === 'local' ? sanvil : integrationChain;
  const accounts = Object.fromEntries(
    Object.entries(privKeys).map(([name, privKey]) => [
      name,
      privateKeyToAccount(privKey as Hex)
    ])
  );
  const interfaces = Object.fromEntries(
    await Promise.all(
      Object.entries(accounts).map(async ([name, account]) => [
        name,
        await createInterface(chain, account)
      ])
    )
  );
  const addresses = Object.fromEntries(
    Object.entries(accounts).map(([name, account]) => [
      name,
      account.address
    ])
  );

  console.log("Sending transactions on network:", chain.name);

  // Pay a random amount, cycle from Alice -> Bob -> Charlie -> Alice -> ...
  while (true) {
    const amount = BigInt(Math.floor(Math.random() * (Number(1e18) - 1) + 1));

    await waitForTx(
      interfaces['alice'].contract.write.transfer([addresses['bob'], amount]),
      interfaces['alice'].client
    );
    await sleep(5000);

    await waitForTx(
      interfaces['bob'].contract.write.transfer([addresses['charlie'], amount]),
      interfaces['bob'].client
    );
    await sleep(5000);

    await waitForTx(
      interfaces['charlie'].contract.write.transfer([addresses['alice'], amount]),
      interfaces['charlie'].client
    );
    await sleep(5000);
  }
}

main();
