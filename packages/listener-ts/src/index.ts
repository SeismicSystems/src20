import { type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sanvil, seismicDevnet1 } from "seismic-viem";

import { attachEventListener } from "./listener";
import { requireEnv } from "./util/config";
import { createInterface } from "./util/tx";

async function main() {
  const privKey = requireEnv("ALICE_PRIVATE_KEY") as Hex;
  const aesKey = requireEnv("INTELLIGENCE_AES_KEY") as Hex;
  const mode = requireEnv("MODE");

  const chain = mode === "local" ? sanvil : seismicDevnet1;
  const account = privateKeyToAccount(privKey);

  const { client } = await createInterface(chain, account);
  attachEventListener(client, aesKey);

  console.log("Listening for events on network:", chain.name, "\n");
}

main();
