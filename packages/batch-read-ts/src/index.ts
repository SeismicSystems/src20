import { type Hex } from "viem";

import { createClient, signBalanceRead, createExpiry } from "./util/signature";
import {
  readInterfaceBatch,
  readStaticcallBatch,
  readRpcBatch,
  readIndividual,
} from "./batch-readers";
import { displayResults, type ComparisonResults } from "./comparison";
import DeployOut from "../../contracts/out/batch-read-deploy.json";
import "./util/config";

async function main() {
  console.log("Starting SRC20 Batch Balance Read Demo\n");

  const alicePrivateKey = process.env.ALICE_PRIVATE_KEY as Hex;
  const mode = process.env.MODE || "local";

  if (!alicePrivateKey) {
    console.error("Missing ALICE_PRIVATE_KEY environment variable");
    process.exit(1);
  }
  const multicallAddress = DeployOut.multicall as `0x${string}`;
  const tokenAddresses = DeployOut.tokens as `0x${string}`[];

  const { client, account } = await createClient(alicePrivateKey, mode);
  const expiry = createExpiry(1);
  const signature = await signBalanceRead(
    alicePrivateKey,
    account.address,
    expiry,
  );

  console.log(`Network: ${mode}`);
  console.log(`Alice: ${account.address}`);
  console.log(`Tokens: ${tokenAddresses.length}`);
  console.log(`Signature expires: ${new Date(Number(expiry) * 1000)}\n`);

  // Validate deployment
  if (!multicallAddress || tokenAddresses.length === 0) {
    console.error("Please deploy contracts first: bun run deploy:batch-read");
    process.exit(1);
  }

  // Run all approaches
  console.log("Running batch comparisons...");

  const interfaceBatch = await readInterfaceBatch(
    client,
    multicallAddress,
    account.address,
    tokenAddresses,
    expiry,
    signature,
  );
  console.log(`Interface batch: ${interfaceBatch.duration}ms`);

  const staticcallBatch = await readStaticcallBatch(
    client,
    multicallAddress,
    account.address,
    tokenAddresses,
    expiry,
    signature,
  );
  console.log(`Staticcall batch: ${staticcallBatch.duration}ms`);

  const rpcBatch = await readRpcBatch(
    client,
    account.address,
    tokenAddresses,
    expiry,
    signature,
  );
  console.log(`RPC batch: ${rpcBatch.duration}ms`);

  console.log("\nRunning individual reads for comparison...");
  const individual = await readIndividual(
    client,
    account.address,
    tokenAddresses,
    expiry,
    signature,
  );
  console.log(`Individual reads: ${individual.duration}ms`);

  // Display comprehensive results
  const results: ComparisonResults = {
    individual,
    interfaceBatch,
    staticcallBatch,
    rpcBatch,
  };

  displayResults(results);
}

main().catch(console.error);
