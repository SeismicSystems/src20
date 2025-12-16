import { type AbiEvent, type PublicClient } from "viem";
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
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("[ERC20] Transfer - PLAINTEXT (visible to everyone on-chain)\n");
        console.log("    from:", from);
        console.log("    to:", to);
        console.log("    amount:", amount.toString(), "(plaintext - NO encryption)\n");
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
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("[ERC20] Approval - PLAINTEXT (visible to everyone on-chain)\n");
        console.log("    owner:", owner);
        console.log("    spender:", spender);
        console.log("    amount:", amount.toString(), "(plaintext - NO encryption)\n");
      });
    },
  });
}

