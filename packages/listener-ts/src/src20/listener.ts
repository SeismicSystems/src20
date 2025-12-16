import { keccak256 } from "ethers";
import { type AbiEvent, type Hex, type Address } from "viem";
import { AesGcmCrypto, type ShieldedWalletClient } from "seismic-viem";

import { SRC20Abi } from "./util/abi";
import DeployOut from "../../../contracts/out/deploy.json";

export const NONCE_LENGTH = 24; // 12 bytes in hex string

const ZERO_KEY_HASH =
  "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;

export type ListenerMode = "intelligence" | "recipient";

export async function attachEventListener(
  client: ShieldedWalletClient,
  aesKey: Hex,
  mode: ListenerMode = "intelligence",
) {
  const keyHash = keccak256(aesKey) as `0x${string}`;
  const aesGcmCrypto = new AesGcmCrypto(aesKey);

  const transferEvent = SRC20Abi.find(
    (item: any) => item.type === "event" && item.name === "Transfer",
  ) as AbiEvent;
  client.watchEvent({
    address: DeployOut.MockSRC20 as `0x${string}`,
    event: transferEvent,
    args: {
      encryptKeyHash: keyHash,
    },
    onLogs: (logs: any[]) => {
      logs.forEach(async (log) => {
        handleEvent(aesGcmCrypto, log, (data) => logTransfer(data, mode));
      });
    },
  });

  const approvalEvent = SRC20Abi.find(
    (item: any) => item.type === "event" && item.name === "Approval",
  ) as AbiEvent;
  client.watchEvent({
    address: DeployOut.MockSRC20 as `0x${string}`,
    event: approvalEvent,
    args: {
      encryptKeyHash: keyHash,
    },
    onLogs: (logs: any[]) => {
      logs.forEach(async (log) => {
        handleEvent(aesGcmCrypto, log, (data) => logApproval(data, mode));
      });
    },
  });
}

export async function attachRecipientListener(
  client: ShieldedWalletClient,
  aesKey: Hex | null,
  recipientAddress: Address,
) {
  const keyHash = aesKey
    ? (keccak256(aesKey) as `0x${string}`) // AES key hash if recipient has a key
    : ZERO_KEY_HASH; // Zero key hash if recipient has no key

  const aesGcmCrypto = aesKey ? new AesGcmCrypto(aesKey) : null;

  const transferEvent = SRC20Abi.find(
    (item: any) => item.type === "event" && item.name === "Transfer",
  ) as AbiEvent;

  // Listen for transfers TO this recipient
  client.watchEvent({
    address: DeployOut.MockSRC20 as `0x${string}`,
    event: transferEvent,
    args: {
      to: recipientAddress,
      encryptKeyHash: keyHash,
    },
    onLogs: (logs: any[]) => {
      logs.forEach(async (log) => {
        handleEvent(aesGcmCrypto, log, (data) =>
          logTransfer(data, "recipient"),
        );
      });
    },
  });

  const approvalEvent = SRC20Abi.find(
    (item: any) => item.type === "event" && item.name === "Approval",
  ) as AbiEvent;

  // Listen for approvals TO this recipient (as spender)
  client.watchEvent({
    address: DeployOut.MockSRC20 as `0x${string}`,
    event: approvalEvent,
    args: {
      spender: recipientAddress,
      encryptKeyHash: keyHash,
    },
    onLogs: (logs: any[]) => {
      logs.forEach(async (log) => {
        handleEvent(aesGcmCrypto, log, (data) =>
          logApproval(data, "recipient"),
        );
      });
    },
  });
}

function parseEncryptedData(encryptedData: Hex): {
  ciphertext: Hex;
  nonce: Hex;
} {
  // Handle empty/zero encrypted data
  if (!encryptedData || encryptedData === "0x" || encryptedData.length <= 2) {
    throw new Error("Empty encrypted data - recipient has no key");
  }

  const nonce = `0x${encryptedData.slice(-NONCE_LENGTH)}` as Hex;
  const ciphertext = encryptedData.slice(0, -NONCE_LENGTH) as Hex;

  return { ciphertext, nonce };
}

async function handleEvent(
  aesGcmCrypto: AesGcmCrypto | null,
  log: any,
  callback: (data: any) => void,
) {
  const { encryptedAmount, encryptKeyHash } = log.args;

  // Handle zero key hash OR no crypto instance (recipient has no registered key)
  if (encryptKeyHash === ZERO_KEY_HASH || !aesGcmCrypto) {
    callback({ ...log.args, amount: 0n, noKey: true });
    return;
  }

  try {
    const { ciphertext, nonce } = parseEncryptedData(encryptedAmount);
    const amountHex = BigInt(await aesGcmCrypto.decrypt(ciphertext, nonce));
    callback({ ...log.args, amount: amountHex });
  } catch (error) {
    callback({ ...log.args, amount: null, decryptionFailed: true });
  }
}

function logTransfer(data: any, mode: ListenerMode) {
  const { from, to, amount, noKey, decryptionFailed } = data;

  const perspective =
    mode === "intelligence" ? "[Intelligence Provider]" : "[Recipient]";
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(
    `${perspective} [SRC20] Transfer - ENCRYPTED (decrypted with AES key)\n`,
  );
  console.log("    from:", from);
  console.log("    to:", to);

  if (noKey) {
    console.log("    amount: <recipient has no key>", "\n");
  } else if (decryptionFailed) {
    console.log("    amount: <decryption failed>", "\n");
  } else {
    console.log("    amount:", amount, "(decrypted from encrypted bytes)\n");
  }
}

function logApproval(data: any, mode: ListenerMode) {
  const { owner, spender, amount, noKey, decryptionFailed } = data;

  const perspective =
    mode === "intelligence" ? "[Intelligence Provider]" : "[Recipient]";
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(
    `${perspective} [SRC20] Approval - ENCRYPTED (decrypted with AES key)\n`,
  );
  console.log("    owner:", owner);
  console.log("    spender:", spender);

  if (noKey) {
    console.log("    amount: <spender has no key>", "\n");
  } else if (decryptionFailed) {
    console.log("    amount: <decryption failed>", "\n");
  } else {
    console.log("    amount:", amount, "(decrypted from encrypted bytes)\n");
  }
}

