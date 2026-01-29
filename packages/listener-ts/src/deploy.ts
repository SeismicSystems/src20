import { config } from "dotenv";
import { createShieldedWalletClient, seismicTestnetGcp2, signedReadContract } from "seismic-viem";
import { http, createWalletClient, encodeFunctionData, encodeDeployData, parseAbi, formatUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const contractsPath = join(__dirname, "../../contracts/out");

// Load .env from contracts directory
config({ path: join(__dirname, "../../contracts/.env") });
const deployJsonPath = join(contractsPath, "deploy.json");
const mockSRC20Artifact = JSON.parse(
  readFileSync(join(contractsPath, "MockSRC20.sol/MockSRC20.json"), "utf-8")
);
const mockERC20Artifact = JSON.parse(
  readFileSync(join(contractsPath, "MockERC20.sol/MockERC20.json"), "utf-8")
);

const chain = seismicTestnetGcp2;

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

const SRC20BalanceAbi = [
  {
    type: "function",
    name: "balance",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
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

  const deployerAccount = privateKeyToAccount(deployerPrivateKey as `0x${string}`);
  const aliceAccount = alicePrivateKey ? privateKeyToAccount(alicePrivateKey as `0x${string}`) : null;
  const bobAccount = bobPrivateKey ? privateKeyToAccount(bobPrivateKey as `0x${string}`) : null;
  const charlieAccount = charliePrivateKey ? privateKeyToAccount(charliePrivateKey as `0x${string}`) : null;

  console.log("Deployer:", deployerAccount.address);
  if (aliceAccount) console.log("Alice:", aliceAccount.address);
  if (bobAccount) console.log("Bob:", bobAccount.address);
  if (charlieAccount) console.log("Charlie:", charlieAccount.address);

  const shieldedClient = await createShieldedWalletClient({
    chain,
    account: deployerAccount,
    transport: http(),
  });

  const client = createWalletClient({
    chain,
    account: deployerAccount,
    transport: http(),
  });

  const MINT_AMOUNT = 2n * 10n ** 27n;

  // Deploy MockSRC20
  console.log("\nDeploying MockSRC20...");
  const src20DeployData = encodeDeployData({
    abi: mockSRC20Artifact.abi,
    bytecode: mockSRC20Artifact.bytecode.object as `0x${string}`,
    args: ["Confidential Token", "cTKN", 18],
  });

  const src20DeployTx = await client.sendTransaction({
    data: src20DeployData,
    gas: 5000000n,
  });
  console.log("  tx:", src20DeployTx);

  const src20Receipt = await shieldedClient.waitForTransactionReceipt({
    hash: src20DeployTx,
  });
  const src20Address = src20Receipt.contractAddress!;
  console.log("  MockSRC20 deployed at:", src20Address);

  // Mint SRC20 tokens
  const mintTargets = [
    ["alice", aliceAccount?.address ?? deployerAccount.address],
    ["bob", bobAccount?.address ?? deployerAccount.address],
    ["charlie", charlieAccount?.address ?? deployerAccount.address],
  ] as const;

  console.log("\nMinting SRC20 tokens...");
  for (const [name, addr] of mintTargets) {
    const mintTx = await shieldedClient.writeContract({
      address: src20Address,
      abi: SRC20MintAbi,
      functionName: "mint",
      args: [addr, MINT_AMOUNT],
      gas: 500000n,
    });
    await shieldedClient.waitForTransactionReceipt({ hash: mintTx });
    console.log(`  Minted to ${name}`);
  }

  // Deploy MockERC20
  console.log("\nDeploying MockERC20...");
  const erc20DeployData = encodeDeployData({
    abi: mockERC20Artifact.abi,
    bytecode: mockERC20Artifact.bytecode.object as `0x${string}`,
    args: ["Standard Token", "sTKN", 18],
  });

  const erc20DeployTx = await client.sendTransaction({
    data: erc20DeployData,
    gas: 3000000n,
  });
  console.log("  tx:", erc20DeployTx);

  const erc20Receipt = await shieldedClient.waitForTransactionReceipt({
    hash: erc20DeployTx,
  });
  const erc20Address = erc20Receipt.contractAddress!;
  console.log("  MockERC20 deployed at:", erc20Address);

  // Mint ERC20 tokens
  console.log("\nMinting ERC20 tokens...");
  for (const [name, addr] of mintTargets) {
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
    console.log(`  Minted to ${name}`);
  }

  // Verify balances using signed reads
  console.log("\nVerifying SRC20 balances (signed reads)...");
  
  const userClients = [
    { name: "alice", account: aliceAccount },
    { name: "bob", account: bobAccount },
    { name: "charlie", account: charlieAccount },
  ];

  for (const { name, account } of userClients) {
    if (!account) {
      console.log(`  ${name}: skipped (no private key)`);
      continue;
    }

    const userClient = await createShieldedWalletClient({
      chain,
      account,
      transport: http(),
    });

    const balance = await signedReadContract(userClient, {
      abi: SRC20BalanceAbi,
      address: src20Address,
      functionName: "balance",
      args: [],
    });

    console.log(`  ${name}: ${formatUnits(balance as bigint, 18)} cTKN`);
  }

  // Write addresses to deploy.json
  const deployOutput = {
    MockSRC20: src20Address,
    MockERC20: erc20Address,
  };
  writeFileSync(deployJsonPath, JSON.stringify(deployOutput, null, 2));
  console.log("\nWrote addresses to:", deployJsonPath);

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("Deployment Complete!");
  console.log("=".repeat(50));
  console.log("MockSRC20 (cTKN):", src20Address);
  console.log("MockERC20 (sTKN):", erc20Address);
}

main().catch(console.error);
