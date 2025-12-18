import { type Hex, type Address, formatUnits } from "viem";
import {
  type ShieldedWalletClient,
  type ShieldedPublicClient,
  signedReadContract,
  watchSRC20Events,
  watchSRC20EventsWithKey,
  type DecryptedTransferLog,
  type DecryptedApprovalLog,
} from "seismic-viem";

import { SRC20Abi } from "./util/abi";
import DeployOut from "../../../contracts/out/deploy.json";

export type ListenerMode = "intelligence" | "recipient";

/**
 * Attach SRC20 event listener for a ShieldedWalletClient.
 * Uses watchSRC20Events which auto-fetches AES key from Directory via signed read.
 */
export function attachWalletEventListener(
  client: ShieldedWalletClient,
  mode: ListenerMode = "recipient",
) {
  const perspective =
    mode === "intelligence" ? "[Intelligence Provider]" : "[Recipient]";

  return watchSRC20Events(client, {
    address: DeployOut.MockSRC20 as Address,
    onTransfer: (log: DecryptedTransferLog) => {
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(
        `${perspective} [SRC20] Transfer - ENCRYPTED (decrypted with AES key)\n`,
      );
      console.log("    from:", log.from);
      console.log("    to:", log.to);
      console.log(
        "    amount:",
        log.decryptedAmount,
        "(decrypted from encrypted bytes)\n",
      );
    },
    onApproval: (log: DecryptedApprovalLog) => {
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(
        `${perspective} [SRC20] Approval - ENCRYPTED (decrypted with AES key)\n`,
      );
      console.log("    owner:", log.owner);
      console.log("    spender:", log.spender);
      console.log(
        "    amount:",
        log.decryptedAmount,
        "(decrypted from encrypted bytes)\n",
      );
    },
    onError: (error: Error) => {
      console.error("Decryption error:", error.message);
    },
  });
}

/**
 * Attach SRC20 event listener for a ShieldedPublicClient with a viewing key.
 * Uses watchSRC20EventsWithKey which takes an explicit AES key.
 */
export function attachPublicEventListener(
  client: ShieldedPublicClient,
  viewingKey: Hex,
  mode: ListenerMode = "intelligence",
) {
  const perspective =
    mode === "intelligence" ? "[Intelligence Provider]" : "[Recipient]";

  return watchSRC20EventsWithKey(client, viewingKey, {
    address: DeployOut.MockSRC20 as Address,
    onTransfer: (log: DecryptedTransferLog) => {
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(
        `${perspective} [SRC20] Transfer - ENCRYPTED (decrypted with AES key)\n`,
      );
      console.log("    from:", log.from);
      console.log("    to:", log.to);
      console.log(
        "    amount:",
        log.decryptedAmount,
        "(decrypted from encrypted bytes)\n",
      );
    },
    onApproval: (log: DecryptedApprovalLog) => {
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(
        `${perspective} [SRC20] Approval - ENCRYPTED (decrypted with AES key)\n`,
      );
      console.log("    owner:", log.owner);
      console.log("    spender:", log.spender);
      console.log(
        "    amount:",
        log.decryptedAmount,
        "(decrypted from encrypted bytes)\n",
      );
    },
    onError: (error: Error) => {
      console.error("Decryption error:", error.message);
    },
  });
}

/**
 * Periodically reads the user's balance using a Signed Read.
 *
 * In ERC20: Anyone can call balanceOf(address) to see any account's balance
 * In SRC20: balance() only returns YOUR OWN balance, requires a Signed Read
 *           to prove you are the owner of the account
 *
 * Note: This requires a ShieldedWalletClient because signing is needed.
 *
 * @param client - ShieldedWalletClient (must have account for signing)
 * @param intervalMs - Polling interval in milliseconds
 * @see https://client.seismic.systems/viem/contract/signed-read
 */
export async function startBalancePolling(
  client: ShieldedWalletClient,
  intervalMs: number = 30000,
) {
  const address = client.account?.address;
  if (!address) {
    console.error("Cannot poll balance: no account on client");
    return;
  }

  const pollBalance = async () => {
    try {
      // SRC20: Uses signedReadContract because balance() checks msg.sender
      // This is different from ERC20's balanceOf(address) which anyone can call
      const balance = await signedReadContract(client, {
        abi: SRC20Abi,
        address: DeployOut.MockSRC20 as `0x${string}`,
        functionName: "balance",
        args: [],
      });

      console.log(
        "┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓",
      );
      console.log(
        "┃  [SRC20] Balance Check (via Signed Read)                   ┃",
      );
      console.log(
        "┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫",
      );
      console.log(`┃  Address: ${address}`);
      console.log(`┃  Balance: ${formatUnits(balance as bigint, 18)} cTKN`);
      console.log("┃");
      console.log(
        "┃  Note: This balance is PRIVATE - only the owner can read it",
      );
      console.log(
        "┃  ERC20 balanceOf() is PUBLIC - anyone can read any balance",
      );
      console.log(
        "┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n",
      );
    } catch (error) {
      console.error("Failed to read balance:", error);
    }
  };

  // Initial read
  await pollBalance();

  // Periodic reads
  setInterval(pollBalance, intervalMs);
}
