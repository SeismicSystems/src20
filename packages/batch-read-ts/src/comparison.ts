import { type BatchResult } from "./batch-readers";

export interface ComparisonResults {
  individual: BatchResult;
  interfaceBatch: BatchResult;
  staticcallBatch: BatchResult;
  rpcBatch: BatchResult;
}

export function calculateSpeedup(baseline: number, optimized: number): number {
  return Math.round(baseline / optimized);
}

export function verifyConsistency(
  baseline: bigint[],
  ...comparisons: bigint[][]
): boolean {
  return comparisons.every(
    (comparison) =>
      comparison.length === baseline.length &&
      comparison.every((balance, i) => balance === baseline[i]),
  );
}

export function displayResults(results: ComparisonResults): void {
  const { individual, interfaceBatch, staticcallBatch, rpcBatch } = results;

  // Display sample balances
  console.log("\n=== SAMPLE RESULTS ===");
  const sampleSize = Math.min(5, individual.balances.length);
  for (let i = 0; i < sampleSize; i++) {
    const balance = Number(individual.balances[i]) / 1e18;
    console.log(`Token ${i + 1}: ${balance.toFixed(2)} ETH`);
  }

  const totalBalance = individual.balances.reduce(
    (sum, balance) => sum + balance,
    0n,
  );
  console.log(`Total tokens: ${individual.balances.length}`);
  console.log(`Total balance: ${Number(totalBalance) / 1e18} ETH`);

  // Performance comparison
  console.log("\n=== PERFORMANCE COMPARISON ===");
  console.log(
    `Individual reads: ${individual.duration}ms (${(individual.duration / 1000).toFixed(1)}s)`,
  );
  console.log(
    `Interface batch: ${interfaceBatch.duration}ms (${(interfaceBatch.duration / 1000).toFixed(1)}s)`,
  );
  console.log(
    `Staticcall batch: ${staticcallBatch.duration}ms (${(staticcallBatch.duration / 1000).toFixed(1)}s)`,
  );
  console.log(
    `RPC batch calls: ${rpcBatch.duration}ms (${(rpcBatch.duration / 1000).toFixed(1)}s)`,
  );

  // Speedup factors
  console.log("\n=== SPEEDUP FACTORS ===");
  console.log(
    `Interface batch: ${calculateSpeedup(individual.duration, interfaceBatch.duration)}x faster`,
  );
  console.log(
    `Staticcall batch: ${calculateSpeedup(individual.duration, staticcallBatch.duration)}x faster`,
  );
  console.log(
    `RPC batch calls: ${calculateSpeedup(individual.duration, rpcBatch.duration)}x faster`,
  );

  // Find fastest
  const durations = [
    interfaceBatch.duration,
    staticcallBatch.duration,
    rpcBatch.duration,
  ];
  const methods = ["Interface batch", "Staticcall batch", "RPC batch calls"];
  const fastestIndex = durations.indexOf(Math.min(...durations));
  console.log(`\nFastest approach: ${methods[fastestIndex]}`);

  // Consistency check
  const consistent = verifyConsistency(
    individual.balances,
    interfaceBatch.balances,
    staticcallBatch.balances,
    rpcBatch.balances,
  );

  console.log(`\nConsistency check: ${consistent ? "PASS" : "FAIL"}`);
}
