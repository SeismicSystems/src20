import {
  type AbiEvent,
  type PublicClient,
  type Address,
  formatUnits,
} from "viem";
import { ERC20Abi } from "./util/abi";
import DeployOut from "../../../contracts/out/deploy.json";

// Standard viem event watching - NO encryption, NO AES keys needed
export function attachEventListener(client: PublicClient) {
  const transferEvent = ERC20Abi.find(
    (item) => item.type === "event" && item.name === "Transfer",
  ) as AbiEvent;

  const approvalEvent = ERC20Abi.find(
    (item) => item.type === "event" && item.name === "Approval",
  ) as AbiEvent;

  // Watch Transfer events - values are PLAINTEXT
  client.watchEvent({
    address: DeployOut.MockERC20 as `0x${string}`,
    event: transferEvent,
    onLogs: (logs) => {
      logs.forEach((log: any) => {
        const { from, to, amount } = log.args;
        console.log(
          "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        );
        console.log(
          "[ERC20] Transfer - PLAINTEXT (visible to everyone on-chain)\n",
        );
        console.log("    from:", from);
        console.log("    to:", to);
        console.log(
          "    amount:",
          amount.toString(),
          "(plaintext - NO encryption)\n",
        );
      });
    },
  });

  // Watch Approval events - values are PLAINTEXT
  client.watchEvent({
    address: DeployOut.MockERC20 as `0x${string}`,
    event: approvalEvent,
    onLogs: (logs) => {
      logs.forEach((log: any) => {
        const { owner, spender, amount } = log.args;
        console.log(
          "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        );
        console.log(
          "[ERC20] Approval - PLAINTEXT (visible to everyone on-chain)\n",
        );
        console.log("    owner:", owner);
        console.log("    spender:", spender);
        console.log(
          "    amount:",
          amount.toString(),
          "(plaintext - NO encryption)\n",
        );
      });
    },
  });
}

/**
 * Periodically reads Alice's balance using a standard read.
 *
 * In ERC20: Anyone can call balanceOf(address) to see ANY account's balance
 * This is PUBLIC information - no signature required!
 */
export async function startBalancePolling(
  client: PublicClient,
  address: Address,
  intervalMs: number = 30000,
) {
  const pollBalance = async () => {
    try {
      // ERC20: Standard readContract - anyone can read anyone's balance!
      const balance = await client.readContract({
        abi: ERC20Abi,
        address: DeployOut.MockERC20 as `0x${string}`,
        functionName: "balanceOf",
        args: [address],
      });

      console.log(
        "┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓",
      );
      console.log(
        "┃  [ERC20] Balance Check (PUBLIC - anyone can read)          ┃",
      );
      console.log(
        "┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫",
      );
      console.log(`┃  Address: ${address}`);
      console.log(`┃  Balance: ${formatUnits(balance as bigint, 18)} sTKN`);
      console.log("┃");
      console.log("┃  Note: This balance is PUBLIC - anyone can read it!");
      console.log(
        "┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n",
      );
    } catch (error) {
      console.error("Failed to read balance:", error);
    }
  };

  await pollBalance();
  setInterval(pollBalance, intervalMs);
}
