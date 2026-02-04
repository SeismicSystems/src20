import { createWalletClient, http, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { createSeismicDevnet } from "seismic-viem";

const RPC_URL = "https://gcp-1.seismictest.net/rpc";

const seismicTestnetGcp1 = createSeismicDevnet({
  nodeHost: "gcp-1.seismictest.net",
});

// Configuration - modify these values as needed
const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x4df46f8c85f955c769c3e8804d3ef09fcece18d31d8308c5cf9f9d769c153ff6";
const TO_ADDRESS = process.env.TO_ADDRESS || "0x84389eC9118D093DCc3865767d60437698996869";
const AMOUNT_ETH = process.env.AMOUNT_ETH || "1000";

async function main() {
  console.log("Setting up wallet client on seismicTestnetGcp1...");
  console.log("RPC URL:", RPC_URL);
  
  const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
  console.log("Sender address:", account.address);
  
  const client = createWalletClient({
    chain: seismicTestnetGcp1,
    account,
    transport: http(RPC_URL),
  });

  console.log(`Sending ${AMOUNT_ETH} ETH to ${TO_ADDRESS}...`);
  
  try {
    const hash = await client.sendTransaction({
      to: TO_ADDRESS as `0x${string}`,
      value: parseEther(AMOUNT_ETH),
    });
    
    console.log("Transaction sent! Hash:", hash);
    console.log(`Explorer: https://explorer-gcp-1.seismictest.net/tx/${hash}`);
  } catch (error) {
    console.error("Error sending transaction:", error);
    throw error;
  }
}

main().catch(console.error);
