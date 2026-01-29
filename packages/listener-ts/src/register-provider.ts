import { createShieldedWalletClient, createSeismicDevnet } from "seismic-viem";
import { http, encodeFunctionData, createWalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const DIRECTORY_ADDRESS = "0xfd323feA82e93DF2aB57625b8980732aBBf5e4a7" as const;
const INTELLIGENCE_ADDRESS = "0x47FD3881aef7B690313CB1562e91aCe42E7d3DA5" as const;

// Use gcp-2 explicitly (same as your earlier tests)
const chain = createSeismicDevnet({
  nodeHost: "gcp-2.seismictest.net",
});

const DirectoryAbi = [
  {
    type: "function",
    name: "setKey",
    inputs: [{ name: "_key", type: "suint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

const IntelligenceAbi = [
  {
    type: "function",
    name: "addProvider",
    inputs: [{ name: "_provider", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

async function main() {
  const deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY;
  const intelligenceAesKey = process.env.INTELLIGENCE_AES_KEY;

  if (!deployerPrivateKey || !intelligenceAesKey) {
    throw new Error("Missing DEPLOYER_PRIVATE_KEY or INTELLIGENCE_AES_KEY in environment");
  }

  const account = privateKeyToAccount(deployerPrivateKey as `0x${string}`);
  console.log("Deployer address:", account.address);

  const client = await createShieldedWalletClient({
    chain,
    account,
    transport: http(),
  });

  const nonshieldedClient = await createWalletClient({
    chain,
    account,
    transport: http(),
  });

  // Step 1: Register AES key in Directory
  console.log("\n1. Registering AES key in Directory...");
  const setKeyTx = await client.writeContract({
    address: DIRECTORY_ADDRESS,
    abi: DirectoryAbi,
    functionName: "setKey",
    args: [BigInt(intelligenceAesKey)],
    gas: 200000n, // Manual gas to skip estimation
  });
  console.log("   setKey tx:", setKeyTx);
  
  // Wait for tx to be mined
  console.log("   Waiting for confirmation...");
  await client.waitForTransactionReceipt({ hash: setKeyTx });
  console.log("   Confirmed!");

  // Step 2: Add deployer as provider in Intelligence
  // Use sendTransaction with manually encoded data since writeContract produces empty calldata
  console.log("\n2. Adding deployer as provider in Intelligence...");
  const addProviderData = encodeFunctionData({
    abi: IntelligenceAbi,
    functionName: "addProvider",
    args: [account.address],
  });
  console.log("   Encoded calldata:", addProviderData);
  
  const addProviderTx = await nonshieldedClient.sendTransaction({
    to: INTELLIGENCE_ADDRESS,
    data: addProviderData,
    gas: 200000n,
  });
  console.log("   addProvider tx:", addProviderTx);

  console.log("   Waiting for confirmation...");
  await client.waitForTransactionReceipt({ hash: addProviderTx });
  console.log("   Confirmed!");

  console.log("\n✅ Done! Provider registered successfully.");
}

main().catch(console.error);
