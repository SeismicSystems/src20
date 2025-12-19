import { type Hex, type Address, type Chain } from "viem";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import { sanvil } from "seismic-viem";

import { logger } from "./util/logger";
import { requireEnv } from "./util/config";
import {
  createInterface,
  waitForTx,
  sleep,
  integrationChain,
  type SRC20Interface,
} from "./util/tx";

type UserName = "alice" | "bob" | "charlie";

async function main() {
  const privKeys: Record<UserName, Hex> = {
    alice: requireEnv("ALICE_PRIVATE_KEY") as Hex,
    bob: requireEnv("BOB_PRIVATE_KEY") as Hex,
    charlie: requireEnv("CHARLIE_PRIVATE_KEY") as Hex,
  };
  const mode = requireEnv("MODE");

  const chain = mode === "local" ? sanvil : integrationChain;

  const accounts: Record<UserName, PrivateKeyAccount> = {
    alice: privateKeyToAccount(privKeys.alice),
    bob: privateKeyToAccount(privKeys.bob),
    charlie: privateKeyToAccount(privKeys.charlie),
  };

  const interfaces: Record<UserName, SRC20Interface> = {
    alice: await createInterface(chain as Chain, accounts.alice),
    bob: await createInterface(chain as Chain, accounts.bob),
    charlie: await createInterface(chain as Chain, accounts.charlie),
  };

  const addresses: Record<UserName, Address> = {
    alice: accounts.alice.address,
    bob: accounts.bob.address,
    charlie: accounts.charlie.address,
  };

  console.log(
    "╔══════════════════════════════════════════════════════════════╗",
  );
  console.log(
    "║           SRC20 SENDER (seismic-viem)                        ║",
  );
  console.log(
    "║   All amounts are ENCRYPTED before sending                   ║",
  );
  console.log(
    "╚══════════════════════════════════════════════════════════════╝",
  );
  logger.info(`Running on network: ${chain.name}\n`);

  // Cycle through transfers, approvals, mints, and burns
  // All amounts are encrypted via seismic-viem
  while (true) {
    try {
      const amount = BigInt(Math.floor(Math.random() * (Number(1e2) - 1) + 1));
      logger.info(
        `Sampled amount: ${amount} (will be ENCRYPTED before tx submission)`,
      );

      // Transfer: Alice -> Bob
      await waitForTx(
        interfaces.alice.contract.write.transfer([addresses.bob, amount]),
        interfaces.alice.client,
      );
      logger.info("    Finished Alice -> Bob (transfer)");
      await sleep(5000);

      // Random mint: Alice mints to herself
      if (Math.random() > 0.6) {
        const mintAmount = BigInt(
          Math.floor(Math.random() * (Number(1e4) - 1) + 1),
        );
        logger.info(
          `    [Mint] Alice minting ${mintAmount} to herself (ENCRYPTED)`,
        );
        await waitForTx(
          interfaces.alice.contract.write.mint([addresses.alice, mintAmount]),
          interfaces.alice.client,
        );
        logger.info("    Finished Alice mint");
        await sleep(5000);
      }

      // Random approval: Alice approves Charlie
      if (Math.random() > 0.5) {
        const approvalAmount = BigInt(
          Math.floor(Math.random() * (Number(1e3) - 1) + 1),
        );
        logger.info(
          `    [Approval] Alice approving Charlie for ${approvalAmount} (ENCRYPTED)`,
        );
        await waitForTx(
          interfaces.alice.contract.write.approve([
            addresses.charlie,
            approvalAmount,
          ]),
          interfaces.alice.client,
        );
        logger.info("    Finished Alice approves Charlie");
        await sleep(5000);
      }

      // Transfer: Bob -> Charlie
      await waitForTx(
        interfaces.bob.contract.write.transfer([addresses.charlie, amount]),
        interfaces.bob.client,
      );
      logger.info("    Finished Bob -> Charlie (transfer)");
      await sleep(5000);

      // Random burn: Bob burns from himself
      if (Math.random() > 0.7) {
        const burnAmount = BigInt(
          Math.floor(Math.random() * (Number(1e2) - 1) + 1),
        );
        logger.info(
          `    [Burn] Bob burning ${burnAmount} from himself (ENCRYPTED)`,
        );
        await waitForTx(
          interfaces.bob.contract.write.burn([addresses.bob, burnAmount]),
          interfaces.bob.client,
        );
        logger.info("    Finished Bob burn");
        await sleep(5000);
      }

      // Random approval: Bob approves Alice
      if (Math.random() > 0.5) {
        const approvalAmount = BigInt(
          Math.floor(Math.random() * (Number(1e3) - 1) + 1),
        );
        logger.info(
          `    [Approval] Bob approving Alice for ${approvalAmount} (ENCRYPTED)`,
        );
        await waitForTx(
          interfaces.bob.contract.write.approve([
            addresses.alice,
            approvalAmount,
          ]),
          interfaces.bob.client,
        );
        logger.info("    Finished Bob approves Alice");
        await sleep(5000);
      }

      // Transfer: Charlie -> Alice
      await waitForTx(
        interfaces.charlie.contract.write.transfer([addresses.alice, amount]),
        interfaces.charlie.client,
      );
      logger.info("    Finished Charlie -> Alice (transfer)\n");
      await sleep(5000);

      // Random mint: Charlie mints to Bob
      if (Math.random() > 0.6) {
        const mintAmount = BigInt(
          Math.floor(Math.random() * (Number(1e4) - 1) + 1),
        );
        logger.info(
          `    [Mint] Charlie minting ${mintAmount} to Bob (ENCRYPTED)`,
        );
        await waitForTx(
          interfaces.charlie.contract.write.mint([addresses.bob, mintAmount]),
          interfaces.charlie.client,
        );
        logger.info("    Finished Charlie mints to Bob");
        await sleep(5000);
      }

      // Random approval: Charlie approves Bob
      if (Math.random() > 0.5) {
        const approvalAmount = BigInt(
          Math.floor(Math.random() * (Number(1e3) - 1) + 1),
        );
        logger.info(
          `    [Approval] Charlie approving Bob for ${approvalAmount} (ENCRYPTED)`,
        );
        await waitForTx(
          interfaces.charlie.contract.write.approve([
            addresses.bob,
            approvalAmount,
          ]),
          interfaces.charlie.client,
        );
        logger.info("    Finished Charlie approves Bob");
        await sleep(5000);
      }

      // Random burn: Charlie burns from herself
      if (Math.random() > 0.7) {
        const burnAmount = BigInt(
          Math.floor(Math.random() * (Number(1e2) - 1) + 1),
        );
        logger.info(
          `    [Burn] Charlie burning ${burnAmount} from herself (ENCRYPTED)`,
        );
        await waitForTx(
          interfaces.charlie.contract.write.burn([
            addresses.charlie,
            burnAmount,
          ]),
          interfaces.charlie.client,
        );
        logger.info("    Finished Charlie burn\n");
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
