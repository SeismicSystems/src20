# SRC20 Batch Balance Reader

This TypeScript project demonstrates efficient batch reading of SRC20 token balances using a multicall contract and signed authorization.

## Features

- 🚀 **Batch Reading**: Read multiple token balances in a single transaction
- 🔐 **Signed Authorization**: Uses cryptographic signatures for privacy-preserving balance disclosure
- ⚡ **Performance Comparison**: Shows speed difference between batch and individual reads
- 🔒 **Time-Limited Access**: Signatures expire for security

## Setup

1. **Install dependencies:**

   ```bash
   bun install
   ```

2. **Configure environment:**

   ```bash
   cp .env.example .env
   # Edit .env with your private keys and network settings
   ```

3. **Deploy contracts first:**

   ```bash
   # In packages/contracts directory
   forge script script/DeployMultiToken.s.sol:DeployMultiToken \
       --rpc-url $RPC_URL \
       --broadcast \
       --unsafe-private-storage
   ```

4. **Update contract addresses:**
   - Copy the deployed multicall address to `MULTICALL_ADDRESS` in `src/index.ts`
   - Copy all 50 token addresses to `TOKEN_ADDRESSES` array in `src/index.ts`

## Usage

```bash
# Run the batch read demo
bun run dev

# Or from the root directory
npm run batch-read
```

## How it Works

1. **Signature Creation**: Creates a time-limited signature authorizing balance reads
2. **Batch Call**: Uses SRC20Multicall to read all token balances in one transaction
3. **Performance Comparison**: Compares batch vs individual read performance
4. **Results Display**: Shows all balances and performance metrics

## Expected Output

```
🚀 Starting SRC20 Batch Balance Read Demo...

ℹ️  Network: Local Anvil
ℹ️  Alice address: 0x...
ℹ️  Multicall address: 0x...
ℹ️  Number of tokens: 50

📝 Created signature valid until: Mon Feb 10 2026 18:38:42 GMT-0800 (PST)
🔑 Signature: 0x...

📊 Reading balances for 50 tokens using batch call...
✅ Batch read completed in 245ms

=== BATCH READ RESULTS ===
Token 01: 1.00 ETH
Token 02: 2.00 ETH
Token 03: 3.00 ETH
...
Token 50: 50.00 ETH

📈 Total tokens: 50
💰 Total balance: 1275.00 ETH

🚀 Batch is approximately 15x faster!
✅ Batch and individual reads are consistent!
```

## Architecture

- **SRC20Multicall**: Solidity contract that batches multiple `balanceOfSigned` calls
- **Signed Authorization**: Uses Ethereum personal sign for privacy-preserving access
- **Seismic Integration**: Uses seismic-viem for shielded/encrypted transactions
- **Performance Optimized**: Single signature reused across all token contracts
