import { keccak256 } from "ethers";
import { type AbiEvent, type Hex } from "viem";
import { AesGcmCrypto, type ShieldedWalletClient } from "seismic-viem";

import { SRC20Abi } from "./util/abi";
import DeployOut from "../../contracts/out/deploy.json";

export const NONCE_LENGTH = 24; // 12 bytes in hex string

export async function attachEventListener(
  client: ShieldedWalletClient,
  aesKey: Hex
) {
  const keyHash = keccak256(aesKey) as `0x${string}`;
  const aesGcmCrypto = new AesGcmCrypto(aesKey);

  const transferEvent = SRC20Abi.find(
    (item: any) => item.type === "event" && item.name === "Transfer"
  ) as AbiEvent;
  client.watchEvent({
    address: DeployOut.MockSRC20 as `0x${string}`,
    event: transferEvent,
    args: {
      encryptKeyHash: keyHash,
    },
    onLogs: (logs: any[]) => {
      logs.forEach(async (log) => {
        handleEvent(aesGcmCrypto, log, logTransfer);
      });
    },
  });

  const approvalEvent = SRC20Abi.find(
    (item: any) => item.type === "event" && item.name === "Approval"
  ) as AbiEvent;
  client.watchEvent({
    address: DeployOut.MockSRC20 as `0x${string}`,
    event: approvalEvent,
    args: {
      encryptKeyHash: keyHash,
    },
    onLogs: (logs: any[]) => {
      logs.forEach(async (log) => {
        handleEvent(aesGcmCrypto, log, logApproval);
      });
    },
  });
}

function parseEncryptedData(encryptedData: Hex): {
  ciphertext: Hex;
  nonce: Hex;
} {
  const nonce = `0x${encryptedData.slice(-NONCE_LENGTH)}` as Hex;
  const ciphertext = encryptedData.slice(0, -NONCE_LENGTH) as Hex;

  return { ciphertext, nonce };
}

async function handleEvent(
  aesGcmCrypto: AesGcmCrypto,
  log: any,
  callback: (data: any) => void
) {
  const { encryptedAmount } = log.args;
  const { ciphertext, nonce } = parseEncryptedData(encryptedAmount);
  const amountHex = BigInt(await aesGcmCrypto.decrypt(ciphertext, nonce));
  callback({ ...log.args, amount: amountHex });
}

function logTransfer(data: any) {
  const { from, to, amount } = data;

  console.log("Transfer(address from, address to, uint256 amount)\n");
  console.log("    from:", from);
  console.log("    to:", to);
  console.log("    amount:", amount, "\n");
}

function logApproval(data: any) {
  const { owner, spender, amount } = data;

  console.log("Approval(address owner, address spender, uint256 amount)\n");
  console.log("    owner:", owner);
  console.log("    spender:", spender);
  console.log("    amount:", amount, "\n");
}
