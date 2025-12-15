import { type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sanvil } from "seismic-viem";

import { logger } from "./util/logger";
import { requireEnv } from "./util/config";
import { createInterface, waitForTx, sleep, integrationChain } from "./util/tx";

async function main() {
  const privKeys = {
    alice: requireEnv("ALICE_PRIVATE_KEY") as Hex,
    bob: requireEnv("BOB_PRIVATE_KEY") as Hex,
    charlie: requireEnv("CHARLIE_PRIVATE_KEY") as Hex,
  };
  const mode = requireEnv("MODE");

  const chain = mode === "local" ? sanvil : integrationChain;
  const accounts = Object.fromEntries(
    Object.entries(privKeys).map(([name, privKey]) => [
      name,
      privateKeyToAccount(privKey as Hex),
    ])
  );
  const interfaces = Object.fromEntries(
    await Promise.all(
      Object.entries(accounts).map(async ([name, account]) => [
        name,
        await createInterface(chain, account),
      ])
    )
  );
  const addresses = Object.fromEntries(
    Object.entries(accounts).map(([name, account]) => [name, account.address])
  );

  logger.info(`Running on on network: ${chain.name}\n`);

  // Pay a random amount, cycle from Alice -> Bob -> Charlie -> Alice -> ...
  // Also randomly insert approvals between users
  while (true) {
    try {
      const amount = BigInt(Math.floor(Math.random() * (Number(1e2) - 1) + 1));
      logger.info(`Sampled amount: ${amount}`);

      await waitForTx(
        interfaces["alice"].contract.write.transfer([addresses["bob"], amount]),
        interfaces["alice"].client
      );
      logger.info("    Finished Alice -> Bob");
      await sleep(5000);

      // Random approval: Alice approves Charlie
      if (Math.random() > 0.5) {
        const approvalAmount = BigInt(Math.floor(Math.random() * (Number(1e3) - 1) + 1));
        logger.info(`    [Approval] Alice approving Charlie for ${approvalAmount}`);
        await waitForTx(
          interfaces["alice"].contract.write.approve([addresses["charlie"], approvalAmount]),
          interfaces["alice"].client
        );
        logger.info("    Finished Alice approves Charlie");
        await sleep(5000);
      }

      await waitForTx(
        interfaces["bob"].contract.write.transfer([
          addresses["charlie"],
          amount,
        ]),
        interfaces["bob"].client
      );
      logger.info("    Finished Bob -> Charlie");
      await sleep(5000);

      // Random approval: Bob approves Alice
      if (Math.random() > 0.5) {
        const approvalAmount = BigInt(Math.floor(Math.random() * (Number(1e3) - 1) + 1));
        logger.info(`    [Approval] Bob approving Alice for ${approvalAmount}`);
        await waitForTx(
          interfaces["bob"].contract.write.approve([addresses["alice"], approvalAmount]),
          interfaces["bob"].client
        );
        logger.info("    Finished Bob approves Alice");
        await sleep(5000);
      }

      await waitForTx(
        interfaces["charlie"].contract.write.transfer([
          addresses["alice"],
          amount,
        ]),
        interfaces["charlie"].client
      );
      logger.info("    Finished Charlie -> Alice\n");
      await sleep(5000);

      // Random approval: Charlie approves Bob
      if (Math.random() > 0.5) {
        const approvalAmount = BigInt(Math.floor(Math.random() * (Number(1e3) - 1) + 1));
        logger.info(`    [Approval] Charlie approving Bob for ${approvalAmount}`);
        await waitForTx(
          interfaces["charlie"].contract.write.approve([addresses["bob"], approvalAmount]),
          interfaces["charlie"].client
        );
        logger.info("    Finished Charlie approves Bob");
        await sleep(5000);
      }
    } catch (error) {
      logger.error("Error in transaction loop:", error);
      logger.info("Continuing in 10 seconds.\n");
      await sleep(10000);
    }
  }
}

main().catch((error) => {
  logger.error("Fatal error:", error);
  process.exit(1);
});
