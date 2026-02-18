# SRC20 vs ERC20 Demo

This repository demonstrates the differences between standard ERC20 tokens and SRC20 (Seismic's confidential ERC20 variant) with private balances and encrypted transfer amounts.

## Directory Overview

```bash
packages/
├── contracts/           # Solidity contracts (SRC20 + ERC20 + Multicall)
├── listener-ts/
│   ├── src/erc20/       # ERC20 listener (standard viem)
│   └── src/src20/       # SRC20 listener (seismic-viem)
├── sender-ts/
│   ├── src/erc20/       # ERC20 sender (standard viem)
│   └── src/src20/       # SRC20 sender (seismic-viem)
├── batch-read-ts/       # SRC20 batch balance reader (multicall demo)
└── listener-go/         # Go listener (SRC20 only)
```

---

## ERC20 vs SRC20: Key Differences

### Functions

| Function                         | ERC20                        | SRC20                                                  |
| -------------------------------- | ---------------------------- | ------------------------------------------------------ |
| `transfer(to, amount)`           | `uint256 amount` - plaintext | `suint256 amount` - **shielded type**                  |
| `approve(spender, amount)`       | `uint256 amount` - plaintext | `suint256 amount` - **shielded type**                  |
| `transferFrom(from, to, amount)` | `uint256 amount` - plaintext | `suint256 amount` - **shielded type**                  |
| `balanceOf(account)`             | Returns `uint256` - public   | N/A - use `balance()` for own balance only             |
| `balance()`                      | N/A                          | Returns caller's own balance (private to caller)       |
| `allowance(owner, spender)`      | Returns `uint256` - public   | `allowance(spender)` - returns caller's allowance only |
| `mint(to, amount)`               | `uint256 amount` - plaintext | `suint256 amount` - **shielded type**                  |
| `burn(from, amount)`             | `uint256 amount` - plaintext | `suint256 amount` - **shielded type**                  |

### Events

| Event        | ERC20                              | SRC20                                                       |
| ------------ | ---------------------------------- | ----------------------------------------------------------- |
| **Transfer** | `Transfer(from, to, amount)`       | `Transfer(from, to, encryptKeyHash, encryptedAmount)`       |
| **Approval** | `Approval(owner, spender, amount)` | `Approval(owner, spender, encryptKeyHash, encryptedAmount)` |

**Key difference:** SRC20 events emit **encrypted amounts** with a key hash identifier, allowing only authorized parties to decrypt.

### Storage Types

| Storage      | ERC20                                             | SRC20                                              |
| ------------ | ------------------------------------------------- | -------------------------------------------------- |
| Balances     | `mapping(address => uint256)`                     | `mapping(address => suint256)`                     |
| Allowances   | `mapping(address => mapping(address => uint256))` | `mapping(address => mapping(address => suint256))` |
| Total Supply | `uint256 public totalSupply`                      | `suint256 internal supply` (private)               |

---

## Client-Side: viem vs seismic-viem

### Client Creation

| Library                              | Client Type                                                                  | Code                                                                                    |
| ------------------------------------ | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **viem** (ERC20)                     | `WalletClient`                                                               | [`createWalletClient({...})`](packages/sender-ts/src/erc20/util/tx.ts#L37-L41)          |
| **seismic-viem** (SRC20)             | [`ShieldedWalletClient`](https://client.seismic.systems/viem/clients/wallet) | [`createShieldedWalletClient({...})`](packages/sender-ts/src/src20/util/tx.ts#L21-L27)  |
| **seismic-viem** (SRC20 - read-only) | [`ShieldedPublicClient`](https://client.seismic.systems/viem/clients/public) | [`createShieldedPublicClient({...})`](packages/listener-ts/src/src20/index.ts#L97-L100) |

```typescript
// ERC20: Standard viem
import { createWalletClient, createPublicClient, http } from "viem";
const walletClient = createWalletClient({ chain, account, transport: http() });
const publicClient = createPublicClient({ chain, transport: http() });

// SRC20: seismic-viem (async - performs key derivation)
import {
  createShieldedWalletClient,
  createShieldedPublicClient,
} from "seismic-viem";
const walletClient = await createShieldedWalletClient({
  chain,
  account,
  transport: http(),
});
const publicClient = createShieldedPublicClient({ chain, transport: http() });
```

### Contract Instantiation

| Library                  | Function                                                                              | Code                                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **viem** (ERC20)         | `getContract({...})`                                                                  | [`getContract({abi, address, client})`](packages/sender-ts/src/erc20/util/tx.ts#L51-L55)         |
| **seismic-viem** (SRC20) | [`getShieldedContract({...})`](https://client.seismic.systems/viem/contract/instance) | [`getShieldedContract({abi, address, client})`](packages/sender-ts/src/src20/util/tx.ts#L28-L33) |

```typescript
// ERC20: Standard viem - amounts sent in PLAINTEXT
import { getContract } from "viem";
const contract = getContract({
  abi: ERC20Abi,
  address: contractAddress,
  client: { wallet: walletClient, public: publicClient },
});

// SRC20: seismic-viem - automatic encryption of suint256 params
import { getShieldedContract } from "seismic-viem";
const contract = getShieldedContract({
  abi: SRC20Abi,
  address: contractAddress,
  client: walletClient,
});
```

### Side-by-Side Code Comparison

| Operation           | ERC20 (viem)                                                      | SRC20 (seismic-viem)                                              |
| ------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------- |
| **Sender entry**    | [`erc20/index.ts`](packages/sender-ts/src/erc20/index.ts)         | [`src20/index.ts`](packages/sender-ts/src/src20/index.ts)         |
| **Sender tx utils** | [`erc20/util/tx.ts`](packages/sender-ts/src/erc20/util/tx.ts)     | [`src20/util/tx.ts`](packages/sender-ts/src/src20/util/tx.ts)     |
| **Sender ABI**      | [`erc20/util/abi.ts`](packages/sender-ts/src/erc20/util/abi.ts)   | [`src20/util/abi.ts`](packages/sender-ts/src/src20/util/abi.ts)   |
| **Listener entry**  | [`erc20/index.ts`](packages/listener-ts/src/erc20/index.ts)       | [`src20/index.ts`](packages/listener-ts/src/src20/index.ts)       |
| **Listener logic**  | [`erc20/listener.ts`](packages/listener-ts/src/erc20/listener.ts) | [`src20/listener.ts`](packages/listener-ts/src/src20/listener.ts) |

### Reading Private Balances: Signed Reads

A key difference between ERC20 and SRC20 is how balances are read:

| Aspect           | ERC20                       | SRC20                                                                   |
| ---------------- | --------------------------- | ----------------------------------------------------------------------- |
| **Function**     | `balanceOf(address)`        | `balance()`                                                             |
| **Who can read** | Anyone can read ANY balance | Only owner can read their OWN balance                                   |
| **Method**       | Standard `eth_call`         | [Signed Read](https://client.seismic.systems/viem/contract/signed-read) |
| **Privacy**      | ❌ Zero privacy             | ✅ Full privacy                                                         |

#### Why Signed Reads?

In Ethereum, anyone can make an `eth_call` and specify any `from` address to impersonate that account. On Seismic, this is blocked—any **standard** `eth_call` has its `from` address overridden to zero.

To read data that depends on `msg.sender` (like your private balance), use a **[Signed Read](https://client.seismic.systems/viem/contract/signed-read)**. This sends a signed message proving your identity, allowing the contract to return your private data.

```typescript
import { signedReadContract } from "seismic-viem";

// SRC20: Read your own private balance (requires signature)
const myBalance = await signedReadContract(client, {
  abi: SRC20Abi,
  address: contractAddress,
  functionName: "balance",
  args: [],
});
```

Compare to ERC20 where anyone can read anyone's balance:

```typescript
// ERC20: Read ANY address's balance (no signature needed)
const anyoneBalance = await client.readContract({
  abi: ERC20Abi,
  address: contractAddress,
  functionName: "balanceOf",
  args: [targetAddress], // Can be ANY address!
});
```

The listener periodically polls balances to demonstrate this difference. See [`listener.ts`](packages/listener-ts/src/src20/listener.ts) for the SRC20 implementation using `signedReadContract`.

---

## Watching SRC20 Events

seismic-viem provides two helper functions for watching SRC20 events with automatic decryption:

| Function                  | Client Type            | Key Source                           | Use Case                                                                 |
| ------------------------- | ---------------------- | ------------------------------------ | ------------------------------------------------------------------------ |
| `watchSRC20Events`        | `ShieldedWalletClient` | Auto-fetches from Directory contract | Registered recipients listening for their own events                     |
| `watchSRC20EventsWithKey` | `ShieldedPublicClient` | Explicit viewing key parameter       | Designated listeners (e.g., intelligence providers) with a known AES key |

- **`watchSRC20Events`**: Automatically retrieves the user's AES key from the Directory contract via a signed read, then filters and decrypts events encrypted to that key. See usage in [`attachWalletEventListener`](packages/listener-ts/src/src20/listener.ts#L21-L60).

- **`watchSRC20EventsWithKey`**: Takes an explicit viewing key as a parameter, acting as a "designated" event listener for that key. Useful when you have the AES key directly (e.g., intelligence providers). See usage in [`attachPublicEventListener`](packages/listener-ts/src/src20/listener.ts#L66-L106).

---

## Event Encryption in SRC20

### How It Works

When an SRC20 transfer or approval occurs, the contract emits **multiple encrypted events**:

1. **To Intelligence Providers**: The amount is encrypted to each registered intelligence provider's AES key
2. **To the Recipient/Spender**: The amount is encrypted to the recipient's (for transfers) or spender's (for approvals) registered AES key

```
┌─────────────────────────────────────────────────────────────────┐
│                     SRC20 Transfer Event                        │
├─────────────────────────────────────────────────────────────────┤
│  Event 1: Transfer(from, to, providerKeyHash, encryptedAmount)  │
│           └─ Decryptable by: Intelligence Provider              │
│                                                                 │
│  Event 2: Transfer(from, to, recipientKeyHash, encryptedAmount) │
│           └─ Decryptable by: Recipient only                     │
└─────────────────────────────────────────────────────────────────┘
```

### Who Can Decrypt What?

| Role                      | Can Decrypt Transfers | Can Decrypt Approvals |
| ------------------------- | --------------------- | --------------------- |
| **Intelligence Provider** | ✅ ALL transfers      | ✅ ALL approvals      |
| **Recipient**             | ✅ Transfers TO them  | ✅ Approvals TO them  |
| **Random Observer**       | ❌                    | ❌                    |

---

## System Contracts: Directory & Intelligence

SRC20 relies on two predeployed system contracts:

### [Directory Contract](https://github.com/SeismicSystems/seismic-contracts/blob/intelligence-contracts/src/directory/Directory.sol) (`0x1000000000000000000000000000000000000004`)

The Directory contract maintains a mapping of addresses to their AES encryption keys:

```solidity
interface IDirectory {
    function checkHasKey(address _addr) external view returns (bool); // checks if an address has a key registered
    function keyHash(address to) external view returns (bytes32); // returns the hash for the key of an address
    function encrypt(address to, bytes memory _plaintext) external returns (bytes memory); // encrypts the plaintext using the key corresponding to the `to` address
    function setKey(suint256 _key) external;  // Register your AES key
}
```

**Purpose:** Allows users to register their AES keys so they can receive encrypted event data.

### [Intelligence Contract](https://github.com/SeismicSystems/seismic-contracts/blob/intelligence-contracts/src/intelligence/Intelligence.sol) (`0x1000000000000000000000000000000000000005`)

The Intelligence contract manages intelligence providers who can decrypt all transfer/approval amounts:

```solidity
interface IIntelligence {
    function encryptToProviders(bytes memory _plaintext) external returns (bytes32[] memory, bytes[] memory); // encrypts data to all providers registered in the Intelligence contract
    function addProvider(address _provider) external; // adds a provider
    function removeProvider(address _provider) external; // removes a provider
    function numProviders() external view returns (uint256); // returns number of providers
}
```

**Purpose:** Intelligence providers (e.g., compliance services, analytics) can be granted access to decrypt all transaction amounts for regulatory or monitoring purposes.

---

## Prerequisites

You need our fork of the `foundry` development suite (`sfoundry`), specifically `sforge`, our tool to help build, test, deploy and debug Seismic smart contracts, to run `contracts/`, `listener-ts`, and `sender-ts`. See [here](https://docs.seismic.systems/getting-started/publish-your-docs) for the installation command.

You then need to run `bun install:all` from the root to install all dependencies.

All packages read from a `.env` file in `packages/contracts/`. See [`packages/contracts/.env.example`](packages/contracts/.env.example) for the required variables.

---

## Quick Start: 4-Terminal Demo

### Terminal 1: Deploy Contracts

```bash
bun run deploy
```

This deploys both `MockSRC20` and `MockERC20` and writes their addresses to `packages/contracts/out/deploy.json`.

### Terminal 2: SRC20 Sender

```bash
bun run sender:src20
```

Output:

```
╔══════════════════════════════════════════════════════════════╗
║           SRC20 SENDER (seismic-viem)                        ║
║   All amounts are ENCRYPTED before sending                   ║
╚══════════════════════════════════════════════════════════════╝
```

### Terminal 3: ERC20 Sender

```bash
bun run sender:erc20
```

Output:

```
╔══════════════════════════════════════════════════════════════╗
║           ERC20 SENDER (Standard viem)                       ║
║   All amounts are sent in PLAINTEXT                          ║
╚══════════════════════════════════════════════════════════════╝
```

### Terminal 4: SRC20 Listener (Intelligence Mode)

```bash
bun run listener:src20
```

### Terminal 5: ERC20 Listener

```bash
bun run listener:erc20
```

---

## Sender Script Behavior

The sender scripts cycle through the following operations between Alice, Bob, and Charlie:

| Operation    | Probability | Description                                        |
| ------------ | ----------- | -------------------------------------------------- |
| **Transfer** | 100%        | Alice → Bob → Charlie → Alice cycle                |
| **Approval** | 50%         | Random approvals between users                     |
| **Mint**     | 40%         | Alice mints to herself, Charlie mints to Bob       |
| **Burn**     | 30%         | Bob burns from himself, Charlie burns from herself |

---

## How the SRC20 Listener Works

The SRC20 listener uses the `encryptKeyHash` field in events to filter and decrypt relevant transactions:

### Event Filtering by Key Hash

1. **Compute key hash**: The listener computes `keccak256(AES_KEY)` from your AES key
2. **Filter events**: Events are indexed by `encryptKeyHash`, so the listener only receives events encrypted to your key
3. **Decrypt amount**: The `encryptedAmount` is decrypted using your AES key via `AesGcmCrypto`

```
┌───────────────────────────────────────────────────────────────────┐
│                      SRC20 Listener Flow                          │
├───────────────────────────────────────────────────────────────────┤
│  1. AES_KEY (from .env) ──► keccak256() ──► keyHash               │
│     • INTELLIGENCE_AES_KEY for intelligence mode                  │
│     • RECIPIENT_AES_KEY for recipient mode                        │
│                                                                   │
│  2. watchEvent({ args: { encryptKeyHash: keyHash } })             │
│     └─ Only receives events where encryptKeyHash matches          │
│                                                                   │
│  3. For each matching event:                                      │
│     encryptedAmount ──► AesGcmCrypto.decrypt() ──► plaintext      │
└───────────────────────────────────────────────────────────────────┘
```

### Key Used by Mode

| Mode             | Environment Variable   | What It Decrypts                         |
| ---------------- | ---------------------- | ---------------------------------------- |
| `--intelligence` | `INTELLIGENCE_AES_KEY` | All transfers & approvals (provider key) |
| `--recipient`    | `RECIPIENT_AES_KEY`    | Only events TO your address              |

See [`listener.ts`](packages/listener-ts/src/src20/listener.ts) for the implementation.

---

## Listener Modes (SRC20)

### Intelligence Provider Mode

```bash
bun run listener:src20
# or
cd packages/listener-ts && bun dev:src20 -- --intelligence
```

- Requires `INTELLIGENCE_AES_KEY` in `.env`
- Decrypts **all** transfer and approval amounts across all users

### Recipient Mode

```bash
cd packages/listener-ts && bun dev:src20 -- --recipient
```

- Requires `RECIPIENT_AES_KEY` in `.env` (this will be Alice's AES encryption/decryption key since listener uses Alice's private key to initialize the shielded wallet client)
- Only decrypts transfers **TO** you and approvals **FOR** you as spender
- Prompts to register your key in the Directory if not already registered

### Daemon Mode

For running without interactive prompts (e.g., with supervisor):

```bash
bun dev:src20 -- --recipient --no-prompt
```

---

## Available Scripts

| Script                     | Description                              |
| -------------------------- | ---------------------------------------- |
| `bun run deploy`           | Deploy both ERC20 and SRC20 contracts   |
| `bun run deploy:batch-read`| Deploy multicall + 50 tokens for batch demo |
| `bun run sender:src20`     | Run SRC20 sender (encrypted amounts)    |
| `bun run sender:erc20`     | Run ERC20 sender (plaintext amounts)    |
| `bun run listener:src20`   | Run SRC20 listener (intelligence mode)  |
| `bun run listener:erc20`   | Run ERC20 listener (plaintext events)   |
| `bun run batch-read`       | Run batch balance reading demo           |

---

## Go Listener (SRC20 only)

```bash
cd packages/listener-go
go run ./
```

---

## Expected Output

### ERC20 Listener (Plaintext)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[ERC20] Transfer - PLAINTEXT (visible to everyone on-chain)

    from: 0xAlice...
    to: 0xBob...
    amount: 42 (plaintext - NO encryption)
```

### SRC20 Listener (Encrypted → Decrypted)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Intelligence Provider] [SRC20] Transfer - ENCRYPTED (decrypted with AES key)

    from: 0xAlice...
    to: 0xBob...
    amount: 42 (decrypted from encrypted bytes)
```

---

## Batch Balance Reading

For efficient reading of multiple SRC20 token balances, this repository includes a multicall implementation that demonstrates significant performance improvements:

### Performance Comparison

| Approach           | 50 Tokens | Speedup |
| ------------------ | --------- | ------- |
| Individual reads   | ~76s      | 1x      |
| Interface batch    | ~2.3s     | 33x     |
| Staticcall batch   | ~1.4s     | 55x     |
| RPC batch calls    | ~2.2s     | 35x     |

### Usage

```bash
# Deploy multicall contracts and 50 test tokens
bun run deploy:batch-read

# Run batch balance comparison
bun run batch-read
```
