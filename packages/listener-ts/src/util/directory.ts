import type { Abi, Address, Hex } from "viem";
import { shieldedWriteContract, type ShieldedWalletClient } from "seismic-viem";
import { keccak256 } from "ethers";

const DIRECTORY_ADDRESS =
  "0x1000000000000000000000000000000000000004" as Address;
const TX_TIMEOUT_MS = 30_000;

const DirectoryAbi = [
  {
    inputs: [{ name: "_addr", type: "address" }],
    name: "checkHasKey",
    outputs: [{ type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "to", type: "address" }],
    name: "keyHash",
    outputs: [{ type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getKey",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "_key", type: "suint256" }],
    name: "setKey",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const satisfies Abi;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error(`Transaction timed out after ${ms}ms`)),
      ms,
    ),
  );
  return Promise.race([promise, timeout]);
}

export async function checkRegistration(
  client: ShieldedWalletClient,
  address: Address,
): Promise<boolean> {
  const hasKey = await client.readContract({
    address: DIRECTORY_ADDRESS,
    abi: DirectoryAbi,
    functionName: "checkHasKey",
    args: [address],
  });
  return hasKey as boolean;
}

export async function getKeyHash(
  client: ShieldedWalletClient,
  address: Address,
): Promise<Hex> {
  const keyHash = await client.readContract({
    address: DIRECTORY_ADDRESS,
    abi: DirectoryAbi,
    functionName: "keyHash",
    args: [address],
  });
  return keyHash as Hex;
}

export async function registerKey(
  client: ShieldedWalletClient,
  aesKey: Hex,
): Promise<Hex> {
  const txPromise = shieldedWriteContract(client, {
    chain: client.chain,
    address: DIRECTORY_ADDRESS,
    abi: DirectoryAbi,
    functionName: "setKey",
    args: [BigInt(aesKey)],
  });

  return withTimeout(txPromise, TX_TIMEOUT_MS);
}

export function computeKeyHash(aesKey: Hex): Hex {
  return keccak256(aesKey) as Hex;
}
