import { type Hex, type Chain, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sanvil, createShieldedPublicClient, type ShieldedPublicClient } from "seismic-viem";
import { parseArgs } from "util";
import * as readline from "readline";

import {
  attachWalletEventListener,
  attachPublicEventListener,
  startBalancePolling,
} from "./listener";
import { requireEnv, optionalEnv } from "./util/config";
import { createInterface, integrationChain } from "./util/tx";
import {
  checkRegistration,
  registerKey,
  computeKeyHash,
} from "./util/directory";

async function main() {
  // Parse CLI args
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      recipient: { type: "boolean", default: false },
      intelligence: { type: "boolean", default: false },
      "no-prompt": { type: "boolean", default: false },
    },
  });

  const privKey = requireEnv("ALICE_PRIVATE_KEY") as Hex;
  const mode = requireEnv("MODE");

  const chain = mode === "local" ? sanvil : integrationChain;

  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║           SRC20 LISTENER (seismic-viem)                      ║");
  console.log("║   Transfer amounts are ENCRYPTED - requires AES key         ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");

  if (values.recipient) {
    // Recipient mode: needs ShieldedWalletClient for signing (balance polling, registration)
    const account = privateKeyToAccount(privKey);
    const { client: walletClient } = await createInterface(chain as Chain, account);

    const aesKey = optionalEnv("RECIPIENT_AES_KEY") as Hex | undefined;

    // Check if user is registered
    let isRegistered = await checkRegistration(walletClient, account.address);

    if (!isRegistered) {
      console.warn(
        "WARNING: You are not registered as a recipient in the Directory.",
      );

      if (aesKey && !values["no-prompt"]) {
        const shouldRegister = await promptYesNo(
          "Would you like to register your key now? (y/n): ",
        );
        if (shouldRegister) {
          console.log("Registering your key...");
          const txHash = await registerKey(walletClient, aesKey);
          console.log(`Registration tx submitted: ${txHash}`);
          await walletClient.waitForTransactionReceipt({ hash: txHash });
          console.log("Key registered successfully!\n");
          isRegistered = true;
        } else {
          console.log(
            "Continuing without registration. You won't receive recipient-specific events.\n",
          );
        }
      } else if (values["no-prompt"]) {
        console.log(
          "Skipping registration prompt (--no-prompt). Listening for unregistered events.\n",
        );
      } else {
        console.log("Set RECIPIENT_AES_KEY in .env to enable registration.\n");
      }
    } else {
      console.log("You are registered in the Directory.\n");
    }

    if (isRegistered) {
      // Use watchSRC20Events - auto-fetches AES key from Directory via signed read
      console.log("Using watchSRC20Events (auto-fetches key from Directory)\n");
      attachWalletEventListener(walletClient, "recipient");

      // Start periodic balance polling (every 30 seconds)
      // Demonstrates that SRC20 balances are PRIVATE - requires a Signed Read
      await startBalancePolling(walletClient, 30000);
    } else {
      console.error("Cannot listen without being registered in Directory");
      process.exit(1);
    }
  } else if (values.intelligence) {
    // Intelligence provider mode: uses ShieldedPublicClient with explicit viewing key
    const publicClient = createShieldedPublicClient({
      chain: chain as any,
      transport: http() as any,
    });

    const viewingKey = requireEnv("INTELLIGENCE_AES_KEY") as Hex;
    const keyHash = computeKeyHash(viewingKey);
    
    console.log("Running as Intelligence Provider\n");
    console.log("Using ShieldedPublicClient + watchSRC20EventsWithKey\n");
    console.log(`Listening for events encrypted to key hash: ${keyHash}\n`);

    // Use watchSRC20EventsWithKey - takes explicit viewing key
    attachPublicEventListener(publicClient as ShieldedPublicClient, viewingKey, "intelligence");

    // Note: Balance polling not available for intelligence mode (requires signing)
  } else {
    console.error("Please specify --recipient or --intelligence flag");
    console.log("\nUsage:");
    console.log(
      "  bun run dev:src20 -- --recipient             Listen as a recipient",
    );
    console.log(
      "  bun run dev:src20 -- --recipient --no-prompt Listen as a recipient (daemon mode)",
    );
    console.log(
      "  bun run dev:src20 -- --intelligence          Listen as an intelligence provider",
    );
    process.exit(1);
  }

  console.log("Listening for events on network:", chain.name, "\n");
}

async function promptYesNo(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const answer = await new Promise<string>((resolve) => {
    rl.question(question, resolve);
  });
  rl.close();

  return answer.toLowerCase() === "y" || answer.toLowerCase() === "yes";
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
