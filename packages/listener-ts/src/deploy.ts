import { createShieldedWalletClient, createSeismicDevnet } from "seismic-viem";
import { http, createWalletClient, encodeFunctionData, encodeDeployData, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { readFileSync } from "fs";
import { join } from "path";

// Load contract artifacts
const contractsPath = join(__dirname, "../../contracts/out");
const mockSRC20Artifact = JSON.parse(
  readFileSync(join(contractsPath, "MockSRC20.sol/MockSRC20.json"), "utf-8")
);
const mockERC20Artifact = JSON.parse(
  readFileSync(join(contractsPath, "MockERC20.sol/MockERC20.json"), "utf-8")
);

// Use gcp-2
const chain = createSeismicDevnet({
  nodeHost: "gcp-2.seismictest.net",
});

// ABI for mint functions
const SRC20MintAbi = [
  {
    type: "function",
    name: "mint",
    inputs: [
      { name: "to", type: "address" },
      { name: "value", type: "suint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

const ERC20MintAbi = parseAbi([
  "function mint(address to, uint256 value) external",
]);

async function main() {
  const deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY;
  const alicePrivateKey = process.env.ALICE_PRIVATE_KEY;
  const bobPrivateKey = process.env.BOB_PRIVATE_KEY;
  const charliePrivateKey = process.env.CHARLIE_PRIVATE_KEY;

  if (!deployerPrivateKey) {
    throw new Error("Missing DEPLOYER_PRIVATE_KEY in environment");
  }

  const account = privateKeyToAccount(deployerPrivateKey as `0x${string}`);
  console.log("Deployer address:", account.address);

  // Derive addresses from private keys
  const alice = alicePrivateKey
    ? privateKeyToAccount(alicePrivateKey as `0x${string}`).address
    : account.address;
  const bob = bobPrivateKey
    ? privateKeyToAccount(bobPrivateKey as `0x${string}`).address
    : account.address;
  const charlie = charliePrivateKey
    ? privateKeyToAccount(charliePrivateKey as `0x${string}`).address
    : account.address;

  console.log("Alice:", alice);
  console.log("Bob:", bob);
  console.log("Charlie:", charlie);

  // Create clients
  const shieldedClient = await createShieldedWalletClient({
    chain,
    account,
    transport: http(),
  });

  const client = createWalletClient({
    chain,
    account,
    transport: http(),
  });

  const MINT_AMOUNT = 2n * 10n ** 27n; // 2e27

  // ============================================
  // Deploy MockSRC20 (Confidential Token)
  // ============================================
  console.log("\n📦 Deploying MockSRC20...");

  const src20DeployData = encodeDeployData({
    abi: mockSRC20Artifact.abi,
    bytecode: mockSRC20Artifact.bytecode.object as `0x${string}`,
    args: ["Confidential Token", "cTKN", 18],
  });

  const src20DeployTx = await client.sendTransaction({
    data: src20DeployData,
    gas: 5000000n,
  });
  console.log("   Deploy tx:", src20DeployTx);

  const src20Receipt = await shieldedClient.waitForTransactionReceipt({
    hash: src20DeployTx,
  });
  const src20Address = src20Receipt.contractAddress!;
  console.log("   ✅ MockSRC20 deployed at:", src20Address);

  // Mint to alice, bob, charlie (uses suint256 - needs shielded client)
  console.log("\n🪙 Minting SRC20 tokens...");

  for (const [name, addr] of [["alice", alice], ["bob", bob], ["charlie", charlie]] as const) {
    console.log(`   Minting to ${name} (${addr})...`);
    const mintTx = await shieldedClient.writeContract({
      address: src20Address,
      abi: SRC20MintAbi,
      functionName: "mint",
      args: [addr, MINT_AMOUNT],
      gas: 500000n,
    });
    await shieldedClient.waitForTransactionReceipt({ hash: mintTx });
    console.log(`   ✅ Minted to ${name}`);
  }

  // ============================================
  // Deploy MockERC20 (Standard Token)
  // ============================================
  console.log("\n📦 Deploying MockERC20...");

  const erc20DeployData = encodeDeployData({
    abi: mockERC20Artifact.abi,
    bytecode: mockERC20Artifact.bytecode.object as `0x${string}`,
    args: ["Standard Token", "sTKN", 18],
  });

  const erc20DeployTx = await client.sendTransaction({
    data: erc20DeployData,
    gas: 3000000n,
  });
  console.log("   Deploy tx:", erc20DeployTx);

  const erc20Receipt = await shieldedClient.waitForTransactionReceipt({
    hash: erc20DeployTx,
  });
  const erc20Address = erc20Receipt.contractAddress!;
  console.log("   ✅ MockERC20 deployed at:", erc20Address);

  // Mint to alice, bob, charlie (regular uint256)
  console.log("\n🪙 Minting ERC20 tokens...");

  for (const [name, addr] of [["alice", alice], ["bob", bob], ["charlie", charlie]] as const) {
    console.log(`   Minting to ${name} (${addr})...`);
    const mintData = encodeFunctionData({
      abi: ERC20MintAbi,
      functionName: "mint",
      args: [addr, MINT_AMOUNT],
    });
    const mintTx = await client.sendTransaction({
      to: erc20Address,
      data: mintData,
      gas: 100000n,
    });
    await shieldedClient.waitForTransactionReceipt({ hash: mintTx });
    console.log(`   ✅ Minted to ${name}`);
  }

  // ============================================
  // Summary
  // ============================================
  console.log("\n" + "=".repeat(50));
  console.log("🎉 Deployment Complete!");
  console.log("=".repeat(50));
  console.log("MockSRC20 (cTKN):", src20Address);
  console.log("MockERC20 (sTKN):", erc20Address);
}

main().catch(console.error);
