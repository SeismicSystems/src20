import { type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sanvil, seismicDevnet1 } from "seismic-viem";

import { requireEnv } from "./util/config";
import { createInterface, waitForTx, sleep } from "./util/tx";

async function main() {
  const privKey = requireEnv("ALICE_PRIVATE_KEY") as Hex;
  const mode = requireEnv("MODE");

  const chain = mode === "local" ? sanvil : seismicDevnet1;
  chain.id = 5124;
  const account = privateKeyToAccount(privKey);
  const { client, contract } = await createInterface(chain, account);

  const selfAddr = client.account.address;

  await waitForTx(contract.write.transfer([selfAddr, 1e18]), client);
  await sleep(5000);

  await waitForTx(contract.write.approve([selfAddr, 123]), client);
  await sleep(5000);

  await waitForTx(contract.write.transfer([selfAddr, 8943784378943]), client);
  await sleep(5000);
}

main();
