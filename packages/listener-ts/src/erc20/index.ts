import { createClient, localChain, integrationChain } from "./util/tx";
import { attachEventListener } from "./listener";
import { requireEnv } from "./util/config";

async function main() {
  const mode = requireEnv("MODE");
  const chain = mode === "local" ? localChain : integrationChain;

  // Standard viem client - NO seismic-viem, NO shielded client
  const client = createClient(chain);

  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║           ERC20 LISTENER (Standard viem)                     ║");
  console.log("║   All transfer amounts are VISIBLE to anyone watching       ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log(`\nNetwork: ${chain.name}`);
  console.log("Listening for Transfer and Approval events...\n");

  // No AES key needed - events are plaintext
  attachEventListener(client);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

