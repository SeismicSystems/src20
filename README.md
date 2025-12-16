# SRC20 vs ERC20 Demo

This repository demonstrates the differences between standard ERC20 tokens and SRC20 (Seismic's confidential ERC20 variant) with private balances and encrypted transfer amounts.

## Directory Overview

```bash
packages/
├── contracts/           # Solidity contracts (SRC20 + ERC20)
├── listener-ts/
│   ├── src/erc20/       # ERC20 listener (standard viem)
│   └── src/src20/       # SRC20 listener (seismic-viem)
├── sender-ts/
│   ├── src/erc20/       # ERC20 sender (standard viem)
│   └── src/src20/       # SRC20 sender (seismic-viem)
└── listener-go/         # Go listener (SRC20 only)
```

---

## ERC20 vs SRC20: Key Differences

### Functions

| Function | ERC20 | SRC20 |
|----------|-------|-------|
| `transfer(to, amount)` | `uint256 amount` - plaintext | `suint256 amount` - **shielded type** |
| `approve(spender, amount)` | `uint256 amount` - plaintext | `suint256 amount` - **shielded type** |
| `transferFrom(from, to, amount)` | `uint256 amount` - plaintext | `suint256 amount` - **shielded type** |
| `balanceOf(account)` | Returns `uint256` - public | N/A - use `balance()` for own balance only |
| `balance()` | N/A | Returns caller's own balance (private to caller) |
| `allowance(owner, spender)` | Returns `uint256` - public | `allowance(spender)` - returns caller's allowance only |
| `mint(to, amount)` | `uint256 amount` - plaintext | `suint256 amount` - **shielded type** |
| `burn(from, amount)` | `uint256 amount` - plaintext | `suint256 amount` - **shielded type** |

### Events

| Event | ERC20 | SRC20 |
|-------|-------|-------|
| **Transfer** | `Transfer(from, to, amount)` | `Transfer(from, to, encryptKeyHash, encryptedAmount)` |
| **Approval** | `Approval(owner, spender, amount)` | `Approval(owner, spender, encryptKeyHash, encryptedAmount)` |

**Key difference:** SRC20 events emit **encrypted amounts** with a key hash identifier, allowing only authorized parties to decrypt.

### Storage Types

| Storage | ERC20 | SRC20 |
|---------|-------|-------|
| Balances | `mapping(address => uint256)` | `mapping(address => suint256)` |
| Allowances | `mapping(address => mapping(address => uint256))` | `mapping(address => mapping(address => suint256))` |
| Total Supply | `uint256 public totalSupply` | `suint256 internal supply` (private) |

---

## Client-Side: viem vs seismic-viem

### Client Creation

| Library | Client Type | Code |
|---------|-------------|------|
| **viem** (ERC20) | `WalletClient` | [`createWalletClient({...})`](packages/sender-ts/src/erc20/util/tx.ts#L34-L38) |
| **seismic-viem** (SRC20) | `ShieldedWalletClient` | [`createShieldedWalletClient({...})`](packages/sender-ts/src/src20/util/tx.ts#L22-L26) |

### Contract Instantiation

| Library | Function | Code |
|---------|----------|------|
| **viem** (ERC20) | `getContract({...})` | [`getContract({abi, address, client})`](packages/sender-ts/src/erc20/util/tx.ts#L48-L52) |
| **seismic-viem** (SRC20) | `getShieldedContract({...})` | [`getShieldedContract({abi, address, client})`](packages/sender-ts/src/src20/util/tx.ts#L28-L32) |

### Side-by-Side Code Comparison

| Operation | ERC20 (viem) | SRC20 (seismic-viem) |
|-----------|--------------|----------------------|
| **Sender entry** | [`erc20/index.ts`](packages/sender-ts/src/erc20/index.ts) | [`src20/index.ts`](packages/sender-ts/src/src20/index.ts) |
| **Sender tx utils** | [`erc20/util/tx.ts`](packages/sender-ts/src/erc20/util/tx.ts) | [`src20/util/tx.ts`](packages/sender-ts/src/src20/util/tx.ts) |
| **Sender ABI** | [`erc20/util/abi.ts`](packages/sender-ts/src/erc20/util/abi.ts) | [`src20/util/abi.ts`](packages/sender-ts/src/src20/util/abi.ts) |
| **Listener entry** | [`erc20/index.ts`](packages/listener-ts/src/erc20/index.ts) | [`src20/index.ts`](packages/listener-ts/src/src20/index.ts) |
| **Listener logic** | [`erc20/listener.ts`](packages/listener-ts/src/erc20/listener.ts) | [`src20/listener.ts`](packages/listener-ts/src/src20/listener.ts) |

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

| Role | Can Decrypt Transfers | Can Decrypt Approvals |
|------|----------------------|----------------------|
| **Intelligence Provider** | ✅ All transfers | ✅ All approvals |
| **Recipient** | ✅ Transfers TO them | ❌ |
| **Spender** | ❌ | ✅ Approvals FOR them |
| **Random Observer** | ❌ | ❌ |

---

## System Contracts: Directory & Intelligence

SRC20 relies on two predeployed system contracts:

### Directory Contract (`0x1000000000000000000000000000000000000004`)

The Directory contract maintains a mapping of addresses to their AES encryption keys:

```solidity
interface IDirectory {
    function checkHasKey(address _addr) external view returns (bool);
    function keyHash(address to) external view returns (bytes32);
    function encrypt(address to, bytes memory _plaintext) external returns (bytes memory);
    function setKey(suint256 _key) external;  // Register your AES key
}
```

**Purpose:** Allows users to register their AES keys so they can receive encrypted event data.

### Intelligence Contract (`0x1000000000000000000000000000000000000005`)

The Intelligence contract manages intelligence providers who can decrypt all transfer/approval amounts:

```solidity
interface IIntelligence {
    function encryptToProviders(bytes memory _plaintext) external returns (bytes32[] memory, bytes[] memory);
    function addProvider(address _provider) external;
    function removeProvider(address _provider) external;
    function numProviders() external view returns (uint256);
}
```

**Purpose:** Intelligence providers (e.g., compliance services, analytics) can be granted access to decrypt all transaction amounts for regulatory or monitoring purposes.

---

## Prerequisites

You need our version of `foundry` (`sfoundry`) to run `contracts/`, `listener-ts`, and `sender-ts`. See [here](https://docs.seismic.systems/getting-started/publish-your-docs) for the installation command.

All packages read from a `.env` file in `packages/contracts/`. See [`packages/contracts/.env.example`](packages/contracts/.env.example) for the required variables.

---

## Quick Start: 4-Terminal Demo

### Terminal 1: Deploy Contracts

```bash
cd packages/contracts
bash script/deploy.sh
```

This deploys both `MockSRC20` and `MockERC20` and writes their addresses to `out/deploy.json`.

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

| Operation | Probability | Description |
|-----------|-------------|-------------|
| **Transfer** | 100% | Alice → Bob → Charlie → Alice cycle |
| **Approval** | 50% | Random approvals between users |
| **Mint** | 40% | Alice mints to herself, Charlie mints to Bob |
| **Burn** | 30% | Bob burns from himself, Charlie burns from herself |

---

## Listener Modes (SRC20)

### Intelligence Provider Mode

```bash
bun run listener:src20
# or
cd packages/listener-ts && bun dev:src20 -- --intelligence
```

- Requires `INTELLIGENCE_AES_KEY` in `.env`
- Decrypts **all** transfer amounts across all users
- Can see all approval amounts

### Recipient Mode

```bash
cd packages/listener-ts && bun dev:src20 -- --recipient
```

- Requires `RECIPIENT_AES_KEY` in `.env` (must be Alice's key since sender uses Alice)
- Only decrypts transfers **TO** you and approvals **FOR** you as spender
- Prompts to register your key in the Directory if not already registered

**Note:** Since the sender cycles transfers between Alice, Bob, and Charlie using `ALICE_PRIVATE_KEY`, set `RECIPIENT_AES_KEY` to Alice's registered AES key to see decrypted amounts in recipient mode.

### Daemon Mode

For running without interactive prompts (e.g., with supervisor):

```bash
bun dev:src20 -- --recipient --no-prompt
```

---

## Available Scripts

| Script | Description |
|--------|-------------|
| `bun run deploy` | Deploy both ERC20 and SRC20 contracts |
| `bun run sender:src20` | Run SRC20 sender (encrypted amounts) |
| `bun run sender:erc20` | Run ERC20 sender (plaintext amounts) |
| `bun run listener:src20` | Run SRC20 listener (intelligence mode) |
| `bun run listener:erc20` | Run ERC20 listener (plaintext events) |

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
