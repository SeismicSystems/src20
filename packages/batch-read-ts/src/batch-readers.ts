import { type Address, type Hex } from "viem";
import { type ShieldedWalletClient } from "seismic-viem";
import { SRC20MulticallAbi, SRC20Abi } from "./util/abi";

export interface BatchResult {
  duration: number;
  balances: bigint[];
}

export async function readInterfaceBatch(
  client: ShieldedWalletClient<any, any, any, any>,
  multicallAddress: Address,
  owner: Address,
  tokenAddresses: Address[],
  expiry: bigint,
  signature: Hex,
): Promise<BatchResult> {
  const startTime = Date.now();

  const balances = (await client.readContract({
    abi: SRC20MulticallAbi,
    address: multicallAddress,
    functionName: "batchBalancesInterface",
    args: [owner, tokenAddresses, expiry, signature],
  })) as bigint[];

  return { duration: Date.now() - startTime, balances };
}

export async function readStaticcallBatch(
  client: ShieldedWalletClient<any, any, any, any>,
  multicallAddress: Address,
  owner: Address,
  tokenAddresses: Address[],
  expiry: bigint,
  signature: Hex,
): Promise<BatchResult> {
  const startTime = Date.now();

  const balances = (await client.readContract({
    abi: SRC20MulticallAbi,
    address: multicallAddress,
    functionName: "batchBalances",
    args: [owner, tokenAddresses, expiry, signature],
  })) as bigint[];

  return { duration: Date.now() - startTime, balances };
}

export async function readRpcBatch(
  client: ShieldedWalletClient<any, any, any, any>,
  owner: Address,
  tokenAddresses: Address[],
  expiry: bigint,
  signature: Hex,
): Promise<BatchResult> {
  const startTime = Date.now();

  const promises = tokenAddresses.map((tokenAddress) =>
    client.readContract({
      abi: SRC20Abi,
      address: tokenAddress,
      functionName: "balanceOfSigned",
      args: [owner, expiry, signature],
    }),
  );

  const balances = (await Promise.all(promises)) as bigint[];
  return { duration: Date.now() - startTime, balances };
}

export async function readIndividual(
  client: ShieldedWalletClient<any, any, any, any>,
  owner: Address,
  tokenAddresses: Address[],
  expiry: bigint,
  signature: Hex,
): Promise<BatchResult> {
  const startTime = Date.now();
  const balances: bigint[] = [];

  for (let i = 0; i < tokenAddresses.length; i++) {
    const balance = (await client.readContract({
      abi: SRC20Abi,
      address: tokenAddresses[i],
      functionName: "balanceOfSigned",
      args: [owner, expiry, signature],
    })) as bigint;

    balances.push(balance);

    if ((i + 1) % 10 === 0) {
      console.log(
        `Completed ${i + 1}/${tokenAddresses.length} individual reads`,
      );
    }
  }

  return { duration: Date.now() - startTime, balances };
}
