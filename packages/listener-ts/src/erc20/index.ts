import { type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { createClient, localChain, integrationChain } from "./util/tx";
import { attachEventListener, startBalancePolling } from "./listener";
import { requireEnv } from "./util/config";

async function main() {
  const mode = requireEnv("MODE");
  const chain = mode === "local" ? localChain : integrationChain;

  // Get Alice's address to demonstrate public balance reads
  const alicePrivKey = requireEnv("ALICE_PRIVATE_KEY") as Hex;
  const aliceAddress = privateKeyToAccount(alicePrivKey).address;

  // Standard viem client - NO seismic-viem, NO shielded client
  const client = createClient(chain);

  console.log(
    "╔══════════════════════════════════════════════════════════════╗",
  );
  console.log(
    "║           ERC20 LISTENER (Standard viem)                     ║",
  );
  console.log(
    "║   All transfer amounts are VISIBLE to anyone watching       ║",
  );
  console.log(
    "╚══════════════════════════════════════════════════════════════╝",
  );
  console.log(`\nNetwork: ${chain.name}`);
  console.log("Listening for Transfer and Approval events...\n");

  // No AES key needed - events are plaintext
  attachEventListener(client);

  // Start periodic balance polling (every 30 seconds)
  // Demonstrates that ERC20 balances are PUBLIC - anyone can read anyone's balance
  await startBalancePolling(client, aliceAddress, 30000);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
