import type { Abi } from "viem";

// SRC20Multicall ABI
export const SRC20MulticallAbi = [
  {
    type: "function",
    name: "batchBalancesInterface",
    inputs: [
      { name: "owner", type: "address", internalType: "address" },
      { name: "tokens", type: "address[]", internalType: "address[]" },
      { name: "expiry", type: "uint256", internalType: "uint256" },
      { name: "signature", type: "bytes", internalType: "bytes" },
    ],
    outputs: [
      { name: "balances", type: "uint256[]", internalType: "uint256[]" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "batchBalances",
    inputs: [
      { name: "owner", type: "address", internalType: "address" },
      { name: "tokens", type: "address[]", internalType: "address[]" },
      { name: "expiry", type: "uint256", internalType: "uint256" },
      { name: "signature", type: "bytes", internalType: "bytes" },
    ],
    outputs: [
      { name: "balances", type: "uint256[]", internalType: "uint256[]" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "batchBalancesDetailed",
    inputs: [
      { name: "owner", type: "address", internalType: "address" },
      { name: "tokens", type: "address[]", internalType: "address[]" },
      { name: "expiry", type: "uint256", internalType: "uint256" },
      { name: "signature", type: "bytes", internalType: "bytes" },
    ],
    outputs: [
      {
        name: "results",
        type: "tuple[]",
        internalType: "struct SRC20Multicall.BalanceResult[]",
        components: [
          { name: "token", type: "address", internalType: "address" },
          { name: "balance", type: "uint256", internalType: "uint256" },
          { name: "success", type: "bool", internalType: "bool" },
        ],
      },
    ],
    stateMutability: "view",
  },
] as const;

// SRC20 ABI for individual balance reads
export const SRC20Abi = [
  {
    type: "function",
    name: "balanceOfSigned",
    inputs: [
      { name: "owner", type: "address", internalType: "address" },
      { name: "expiry", type: "uint256", internalType: "uint256" },
      { name: "signature", type: "bytes", internalType: "bytes" },
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "name",
    inputs: [],
    outputs: [{ name: "", type: "string", internalType: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "symbol",
    inputs: [],
    outputs: [{ name: "", type: "string", internalType: "string" }],
    stateMutability: "view",
  },
] as const;
