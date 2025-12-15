import { type Hex, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sanvil } from "seismic-viem";
import { parseArgs } from "util";
import * as readline from "readline";

import { attachEventListener, attachRecipientListener } from "./listener";
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
    },
  });

  const privKey = requireEnv("ALICE_PRIVATE_KEY") as Hex;
  const mode = requireEnv("MODE");

  const chain = mode === "local" ? sanvil : integrationChain;
  const account = privateKeyToAccount(privKey);
  const { client } = await createInterface(chain, account);

  if (values.recipient) {
    // Recipient mode: listen using your own registered key
    const aesKey = optionalEnv("RECIPIENT_AES_KEY") as Hex | undefined; // AES key corresponding to the wallet address for ALICE

    // Check if user is registered
    let isRegistered = await checkRegistration(client, account.address);

    console.log("isRegistered", isRegistered);

    if (!isRegistered) {
      console.warn("⚠️  WARNING: You are not registered as a recipient in the Directory.");
      
      if (aesKey) {
        const shouldRegister = await promptYesNo(
          "Would you like to register your key now? (y/n): "
        );
        if (shouldRegister) {
          console.log("Registering your key...");
          const txHash = await registerKey(client, aesKey);
          console.log(`✅ Registration tx submitted: ${txHash}`);
          await client.waitForTransactionReceipt({ hash: txHash });
          console.log("✅ Key registered successfully!\n");
          isRegistered = true; // Update after successful registration
        } else {
          console.log("Continuing without registration. You won't receive recipient-specific events.\n");
        }
      } else {
        console.log("Set RECIPIENT_AES_KEY in .env to enable registration.\n");
      }
    } else {
      console.log("✅ You are registered in the Directory.\n");
    }

    // Get the key hash for listening
    if (aesKey) {
      const keyHash = computeKeyHash(aesKey);
      console.log(`Listening for events encrypted to your key: ${keyHash}\n`);
      if (isRegistered) {
        attachRecipientListener(client, aesKey, account.address);
      } else {
        attachRecipientListener(client, null, account.address);
      }
    } else {
      console.error("RECIPIENT_AES_KEY is required in --recipient mode");
      process.exit(1);
    }
  } else if (values.intelligence) {
    // Intelligence provider mode
    const aesKey = requireEnv("INTELLIGENCE_AES_KEY") as Hex;
    console.log("Running as Intelligence Provider\n");
    attachEventListener(client, aesKey, "intelligence");
  } else {
    console.error("Please specify --recipient or --intelligence flag");
    console.log("\nUsage:");
    console.log("  bun run dev -- --recipient      Listen as a recipient");
    console.log("  bun run dev -- --intelligence   Listen as an intelligence provider");
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
